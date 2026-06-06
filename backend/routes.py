import json
import csv
import io
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, Response
from database import db
from models import Form, FormField, Record, RecordValue, User, Product, Order, OrderItem, OrderTracking, SalesRecord, Automation, GST_SLABS

bp = Blueprint('api', __name__)

def get_user_id():
    return request.args.get('user_id') or (request.json or {}).get('user_id') or 'demo@user.com'

def ensure_orders_form_record(user_id, order):
    """Ensure a default 'Orders' table exists and add one record for this order."""
    if not order:
        return
    form = Form.query.filter_by(user_id=user_id, name='Orders').first()
    if not form:
        form = Form(name='Orders', user_id=user_id)
        db.session.add(form)
        db.session.flush()
        field_names = [
            'Order Number',
            'Customer Name',
            'Customer Email',
            'Customer Phone',
            'Customer Address',
            'Product Summary',
            'Total Amount',
            'Status',
            'Created At',
        ]
        for name in field_names:
            db.session.add(FormField(form_id=form.id, name=name, field_type='text', is_required=False))
        db.session.flush()
    fields = {f.name: f for f in form.fields}
    record = Record(form_id=form.id, user_id=user_id)
    db.session.add(record)
    db.session.flush()

    def add(name, value):
        field = fields.get(name)
        if not field:
            return
        db.session.add(RecordValue(record_id=record.id, field_id=field.id, value=str(value or '')))

    product_lines = []
    for item in order.items:
        product_lines.append(f"{item.product_name} x {item.quantity} @ ₹{item.unit_price:.2f}")
    product_summary = "; ".join(product_lines)

    add('Order Number', order.order_number)
    add('Customer Name', order.customer_name)
    add('Customer Email', order.customer_email)
    add('Customer Phone', order.customer_phone)
    add('Customer Address', (order.customer_address or '').replace("\n", " "))
    add('Product Summary', product_summary)
    add('Total Amount', f"{order.total_amount:.2f}")
    add('Status', order.status)
    add('Created At', order.created_at.isoformat() if order.created_at else '')

def update_orders_form_status(user_id, order):
    """Sync order status change to the Orders form."""
    form = Form.query.filter_by(user_id=user_id, name='Orders').first()
    if not form: return
    status_f = next((f for f in form.fields if f.name == 'Status'), None)
    order_f = next((f for f in form.fields if f.name == 'Order Number'), None)
    if not status_f or not order_f: return

    vals = RecordValue.query.filter_by(field_id=order_f.id, value=order.order_number).all()
    for v in vals:
        rec = Record.query.get(v.record_id)
        if rec and rec.form_id == form.id:
            stat_val = RecordValue.query.filter_by(record_id=rec.id, field_id=status_f.id).first()
            if stat_val:
                stat_val.value = order.status
            else:
                db.session.add(RecordValue(record_id=rec.id, field_id=status_f.id, value=order.status))
    db.session.commit()

def send_order_email(order, status, seller_user):
    """Send email to customer on order status change. Uses seller's login email as sender."""
    if not order.customer_email:
        return
    sender = (seller_user and seller_user.email) or os.environ.get('SENDER_EMAIL')
    pwd = (seller_user and getattr(seller_user, 'sender_password', None)) or os.environ.get('SENDER_APP_PASSWORD') or os.environ.get('SENDER_PASSWORD')
    if not sender or not pwd:
        return
    status_msgs = {
        'accepted': 'Your order has been accepted and is being processed.',
        'rejected': 'Unfortunately your order could not be fulfilled. A refund will be processed to your original payment method within 3-5 business days.',
        'shipped': 'Your order has been shipped and is on its way!',
        'completed': 'Your order has been delivered. Thank you for your purchase!',
    }
    subject = f"Order {order.order_number} - {status.capitalize()}"
    lines = [
        f"Dear {order.customer_name or 'Customer'},",
        "",
        status_msgs.get(status, status),
        "",
        f"Order: {order.order_number}",
        f"Date: {order.created_at.strftime('%d/%m/%Y') if order.created_at else '-'}",
        "",
        "Items:",
    ]
    for item in order.items:
        lines.append(f"  - {item.product_name} x {item.quantity} @ ₹{item.unit_price:.2f} = ₹{item.subtotal:.2f} (GST: ₹{(item.gst_amount or 0):.2f})")
    lines.extend([
        "",
        f"GST Total: ₹{(order.gst_amount or 0):.2f}",
        f"Total: ₹{order.total_amount:.2f}",
        "",
        "Bill To:",
        order.customer_name or "-",
        order.customer_email or "-",
        order.customer_phone or "-",
        (order.customer_address or "-").replace("\n", " "),
        "",
        "Thank you.",
    ])
    body = "\n".join(lines)
    try:
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = order.customer_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as s:
            s.login(sender, pwd)
            s.send_message(msg)
    except Exception:
        pass  # Silent fail for email

def _send_manager_email(user, to_email, message):
    """Send an automation email to a manager address using the user's Gmail settings."""
    if not user or not to_email:
        return False
    sender = user.email or os.environ.get('SENDER_EMAIL')
    pwd = getattr(user, 'sender_password', None) or os.environ.get('SENDER_APP_PASSWORD') or os.environ.get('SENDER_PASSWORD')
    if not sender or not pwd:
        return False
    try:
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = to_email
        msg['Subject'] = 'TNImpact Automation Alert'
        body = f"{message}\n\nRegards,\n{user.name or 'Your Store'}"
        msg.attach(MIMEText(body, 'plain'))
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as s:
            s.login(sender, pwd)
            s.send_message(msg)
        return True
    except Exception:
        return False


def check_automations(user_id):
    """Check automation conditions and trigger actions (e.g. low stock -> WhatsApp / Email)"""
    automations = Automation.query.filter_by(user_id=user_id, is_active=True).all()
    user = User.query.filter_by(email=user_id).first()
    for auto in automations:
        if auto.trigger_model == 'Inventory':
            products = Product.query.filter_by(user_id=user_id).all()
            for prod in products:
                try:
                    threshold = float(auto.condition_value)
                    if auto.condition_operator == '<' and prod.stock < threshold:
                        # Trigger action
                        config = json.loads(auto.action_config) if auto.action_config else {}
                        phone = config.get('phone') or auto.action_target or ''
                        manager_email = config.get('manager_email') or auto.action_target or ''
                        msg = f"Low stock alert: {prod.name} has only {prod.stock} units left (threshold: {threshold})"
                        if auto.action_type == 'Send WhatsApp' and phone:
                            auto.last_triggered = datetime.utcnow()
                            db.session.commit()
                            return {'whatsapp_link': f"https://wa.me/{phone.replace('+','').replace(' ','')}?text={msg.replace(' ', '%20')}"}
                        if auto.action_type == 'Send Email' and manager_email and user:
                            sent = _send_manager_email(user, manager_email, msg)
                            if sent:
                                auto.last_triggered = datetime.utcnow()
                                db.session.commit()
                                return {'email_sent': True}
                except (ValueError, TypeError):
                    pass
    return None

# ============ AUTH ============
@bp.route('/auth/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    user = User(
        email=email,
        name=data.get('company_name', data.get('name', 'Company')),
        password=data.get('password'),
        sender_password=data.get('sender_password')
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@bp.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data.get('email'), password=data.get('password')).first()
    if user:
        return jsonify(user.to_dict()), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@bp.route('/auth/google', methods=['POST'])
def google_login():
    data = request.json
    email = data.get('email')
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email, name=data.get('name', 'Google User'))
        db.session.add(user)
        db.session.commit()
    return jsonify(user.to_dict()), 200

# ============ PRODUCTS ============
@bp.route('/products', methods=['GET'])
def get_products():
    user_id = get_user_id()
    products = Product.query.filter_by(user_id=user_id).all()
    return jsonify([p.to_dict() for p in products])

@bp.route('/store/info', methods=['GET'])
def get_store_info():
    """Public store info (e.g. company name for welcome message)."""
    user_id = request.args.get('user_id', 'demo@user.com')
    user = User.query.filter_by(email=user_id).first()
    if not user:
        return jsonify({'name': 'Store'}), 200
    return jsonify({'name': user.name or 'Store'}), 200

@bp.route('/store/products', methods=['GET'])
def get_store_products():
    """Public endpoint for customer store - products by user_id (store owner)"""
    user_id = request.args.get('user_id', 'demo@user.com')
    products = Product.query.filter_by(user_id=user_id).filter(Product.stock > 0).all()
    return jsonify([p.to_dict() for p in products])

@bp.route('/store/orders', methods=['POST'])
def create_store_order():
    """Public - create order from customer store. user_id = store owner."""
    data = request.json
    user_id = data.get('user_id', 'demo@user.com')
    items = data.get('items', [])
    if not items:
        return jsonify({'error': 'Order must have at least one item'}), 400

    order_number = generate_order_number()
    order = Order(
        user_id=user_id,
        order_number=order_number,
        status='pending',
        customer_name=data.get('customer_name'),
        customer_email=data.get('customer_email'),
        customer_phone=data.get('customer_phone'),
        customer_address=data.get('customer_address'),
        notes=data.get('notes')
    )
    db.session.add(order)
    db.session.flush()

    total = 0
    gst_total = 0
    for item in items:
        product = Product.query.get(item.get('product_id'))
        if not product or product.user_id != user_id:
            db.session.rollback()
            return jsonify({'error': f"Product {item.get('product_id')} not found"}), 400
        qty = int(item.get('quantity', 1))
        if qty > product.stock:
            db.session.rollback()
            return jsonify({'error': f"Insufficient stock for {product.name}"}), 400
        try:
            gst_rate = float(product.gst_slab) if product.gst_slab else 18.0
        except ValueError:
            gst_rate = GST_SLABS.get(str(product.gst_slab or '18'), 18.0)
        subtotal_before = product.price * qty
        gst_amt = round(subtotal_before * gst_rate / 100, 2)
        subtotal = subtotal_before + gst_amt
        total += subtotal
        gst_total += gst_amt
        oi = OrderItem(
            order_id=order.id, product_id=product.id, product_name=product.name,
            quantity=qty, unit_price=product.price, gst_rate=gst_rate, gst_amount=gst_amt,
            gst_type=getattr(product, 'gst_type', None) or 'igst',
            subtotal=subtotal
        )
        db.session.add(oi)

    order.total_amount = round(total, 2)
    order.gst_amount = round(gst_total, 2)
    tracking = OrderTracking(order_id=order.id, status='placed', message='Order placed by customer')
    db.session.add(tracking)
    ensure_orders_form_record(user_id, order)
    db.session.commit()
    return jsonify(order.to_dict()), 201

@bp.route('/store/orders/<order_number>/track', methods=['GET'])
def track_store_order(order_number):
    """Public - track order by order_number"""
    order = Order.query.filter_by(order_number=order_number).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    return jsonify({'order_number': order.order_number, 'status': order.status, 'tracking': [t.to_dict() for t in order.tracking]})

@bp.route('/products', methods=['POST'])
def create_product():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    user_id = get_user_id()
    product = Product(
        user_id=user_id,
        name=data['name'],
        price=float(data.get('price', 0)),
        stock=int(data.get('stock', 0)),
        sku=data.get('sku'),
        gst_slab=str(data.get('gst_slab', '18')),
        gst_type=(data.get('gst_type') or 'igst')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201

@bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    user_id = get_user_id()
    product = Product.query.filter_by(id=product_id, user_id=user_id).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify(product.to_dict())

@bp.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.json
    user_id = get_user_id()
    product = Product.query.filter_by(id=product_id, user_id=user_id).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    if 'name' in data: product.name = data['name']
    if 'price' in data: product.price = float(data['price'])
    if 'stock' in data: product.stock = int(data['stock'])
    if 'sku' in data: product.sku = data['sku']
    if 'gst_slab' in data: product.gst_slab = str(data['gst_slab'])
    if 'gst_type' in data: product.gst_type = data['gst_type'] or 'igst'
    db.session.commit()
    return jsonify(product.to_dict())

@bp.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    user_id = get_user_id()
    product = Product.query.filter_by(id=product_id, user_id=user_id).first()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    db.session.delete(product)
    db.session.commit()
    return jsonify({'success': True}), 200

# ============ ORDERS ============
def generate_order_number():
    n = Order.query.count() + 1
    return f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{n:04d}"

@bp.route('/orders', methods=['GET'])
def get_orders():
    user_id = get_user_id()
    status = request.args.get('status')
    q = Order.query.filter_by(user_id=user_id)
    if status:
        q = q.filter_by(status=status)
    orders = q.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])

@bp.route('/orders/clear', methods=['DELETE'])
def clear_orders():
    """Delete all orders for the current user (cascade deletes items/tracking)."""
    user_id = get_user_id()
    orders = Order.query.filter_by(user_id=user_id).all()
    for order in orders:
        db.session.delete(order)
    db.session.commit()
    return jsonify({'cleared': len(orders)}), 200

@bp.route('/orders', methods=['POST'])
def create_order():
    data = request.json
    user_id = get_user_id()
    items = data.get('items', [])
    if not items:
        return jsonify({'error': 'Order must have at least one item'}), 400

    order_number = generate_order_number()
    order = Order(
        user_id=user_id,
        order_number=order_number,
        status='pending',
        customer_name=data.get('customer_name'),
        customer_email=data.get('customer_email'),
        customer_phone=data.get('customer_phone'),
        notes=data.get('notes')
    )
    db.session.add(order)
    db.session.flush()

    total = 0
    gst_total = 0
    for item in items:
        product = Product.query.get(item.get('product_id'))
        if not product or product.user_id != user_id:
            db.session.rollback()
            return jsonify({'error': f"Product {item.get('product_id')} not found"}), 400
        qty = int(item.get('quantity', 1))
        if qty > product.stock:
            db.session.rollback()
            return jsonify({'error': f"Insufficient stock for {product.name}"}), 400
            
        try:
            gst_rate = float(product.gst_slab) if product.gst_slab else 18.0
        except ValueError:
            gst_rate = GST_SLABS.get(str(product.gst_slab or '18'), 18.0)
            
        subtotal_before = product.price * qty
        gst_amt = round(subtotal_before * gst_rate / 100, 2)
        subtotal = subtotal_before + gst_amt
        total += subtotal
        gst_total += gst_amt
        oi = OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=qty,
            unit_price=product.price,
            gst_rate=gst_rate,
            gst_amount=gst_amt,
            gst_type=getattr(product, 'gst_type', None) or 'igst',
            subtotal=subtotal
        )
        db.session.add(oi)

    order.total_amount = round(total, 2)
    order.gst_amount = round(gst_total, 2)
    tracking = OrderTracking(order_id=order.id, status='placed', message='Order placed by customer')
    db.session.add(tracking)
    ensure_orders_form_record(user_id, order)
    db.session.commit()
    return jsonify(order.to_dict()), 201

@bp.route('/orders/<int:order_id>/accept', methods=['POST'])
def accept_order(order_id):
    user_id = get_user_id()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.status != 'pending':
        return jsonify({'error': 'Order already processed'}), 400

    for item in order.items:
        product = Product.query.get(item.product_id)
        if product and product.stock < item.quantity:
            return jsonify({'error': f"Insufficient stock for {item.product_name}"}), 400

    order.status = 'accepted'
    tracking = OrderTracking(order_id=order.id, status='accepted', message='Order accepted by seller')
    db.session.add(tracking)
    update_orders_form_status(user_id, order)
    db.session.commit()
    seller = User.query.filter_by(email=user_id).first()
    if seller:
        send_order_email(order, 'accepted', seller)
    return jsonify(order.to_dict())

@bp.route('/orders/<int:order_id>/reject', methods=['POST'])
def reject_order(order_id):
    user_id = get_user_id()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.status != 'pending':
        return jsonify({'error': 'Order already processed'}), 400
    order.status = 'rejected'
    tracking = OrderTracking(order_id=order.id, status='rejected', message='Order rejected')
    db.session.add(tracking)
    update_orders_form_status(user_id, order)
    db.session.commit()
    seller = User.query.filter_by(email=user_id).first()
    if seller:
        send_order_email(order, 'rejected', seller)
    return jsonify(order.to_dict())

@bp.route('/orders/<int:order_id>/ship', methods=['POST'])
def ship_order(order_id):
    user_id = get_user_id()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.status != 'accepted':
        return jsonify({'error': 'Only accepted orders can be shipped'}), 400
    order.status = 'shipped'
    order.shipped_at = datetime.utcnow()
    tracking = OrderTracking(order_id=order.id, status='shipped', message='Order shipped')
    db.session.add(tracking)
    update_orders_form_status(user_id, order)
    db.session.commit()
    seller = User.query.filter_by(email=user_id).first()
    if seller:
        send_order_email(order, 'shipped', seller)
    return jsonify(order.to_dict())

@bp.route('/orders/<int:order_id>/complete', methods=['POST'])
def complete_order(order_id):
    user_id = get_user_id()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.status != 'shipped':
        return jsonify({'error': 'Only shipped orders can be completed'}), 400

    for item in order.items:
        product = Product.query.get(item.product_id)
        if product:
            product.stock -= item.quantity

    order.status = 'completed'
    order.completed_at = datetime.utcnow()
    tracking = OrderTracking(order_id=order.id, status='completed', message='Order delivered/completed')
    db.session.add(tracking)
    update_orders_form_status(user_id, order)

    sales = SalesRecord(user_id=user_id, order_id=order.id, amount=order.total_amount, sale_type='order')
    db.session.add(sales)
    db.session.commit()

    seller = User.query.filter_by(email=user_id).first()
    if seller:
        send_order_email(order, 'completed', seller)

    alert = check_automations(user_id)
    resp = order.to_dict()
    if alert:
        resp['automation_alert'] = alert
    return jsonify(resp)

@bp.route('/orders/<int:order_id>/track', methods=['GET'])
def get_order_tracking(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    return jsonify({'order_number': order.order_number, 'status': order.status, 'tracking': [t.to_dict() for t in order.tracking]})

# ============ INVOICES ============
@bp.route('/orders/<int:order_id>/invoice', methods=['GET'])
def get_invoice(order_id):
    user_id = get_user_id()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    return jsonify(order.to_dict())

# ============ ANNOUNCEMENTS ============
def send_announcement_email(user, subject, message, recipients):
    sender = user.email or os.environ.get('SENDER_EMAIL')
    pwd = getattr(user, 'sender_password', None) or os.environ.get('SENDER_APP_PASSWORD') or os.environ.get('SENDER_PASSWORD')
    if not sender or not pwd:
        return 0
    sent = 0
    for email, name in recipients:
        if not email:
            continue
        try:
            msg = MIMEMultipart()
            msg['From'] = sender
            msg['To'] = email
            msg['Subject'] = subject
            body = f"Dear {name or 'Customer'},\n\n{message}\n\nRegards,\n{user.name or 'Your Store'}"
            msg.attach(MIMEText(body, 'plain'))
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as s:
                s.login(sender, pwd)
                s.send_message(msg)
            sent += 1
        except Exception:
            continue
    return sent

@bp.route('/announcements/send', methods=['POST'])
def send_announcements():
    data = request.json or {}
    user_id = data.get('user_id') or get_user_id()
    user = User.query.filter_by(email=user_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    subject = data.get('subject') or 'Announcement'
    message = data.get('message') or ''
    # Collect distinct customers who have ordered from this user
    orders = Order.query.filter_by(user_id=user_id).all()
    recipients_map = {}
    for o in orders:
        if o.customer_email:
            recipients_map[o.customer_email] = o.customer_name
    recipients = list(recipients_map.items())
    if not recipients:
        return jsonify({'error': 'No customers with email found'}), 400
    sent = send_announcement_email(user, subject, message, recipients)
    return jsonify({'sent': sent}), 200

# ============ SALES REPORTS ============
@bp.route('/reports/sales', methods=['GET'])
def get_sales_report():
    user_id = get_user_id()
    period = request.args.get('period', 'monthly')  # monthly, yearly
    today = datetime.utcnow().date()

    if period == 'yearly':
        start = today.replace(month=1, day=1)
    else:
        start = today.replace(day=1)

    sales = SalesRecord.query.filter(
        SalesRecord.user_id == user_id,
        SalesRecord.created_at >= datetime.combine(start, datetime.min.time())
    ).all()

    total = sum(s.amount for s in sales)
    return jsonify({
        'period': period,
        'start_date': start.isoformat(),
        'end_date': today.isoformat(),
        'total_sales': total,
        'transaction_count': len(sales),
        'records': [s.to_dict() for s in sales]
    })

@bp.route('/reports/sales/download', methods=['GET'])
def download_sales_report():
    user_id = get_user_id()
    period = request.args.get('period', 'monthly')
    today = datetime.utcnow().date()
    if period == 'yearly':
        start = today.replace(month=1, day=1)
    else:
        start = today.replace(day=1)

    orders = Order.query.filter(
        Order.user_id == user_id,
        Order.status == 'completed',
        Order.completed_at >= datetime.combine(start, datetime.min.time())
    ).order_by(Order.completed_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Date', 'Order Number', 'Customer Name', 'Email', 'Mobile', 'Address',
        'Product', 'Quantity', 'Unit Price (₹)', 'GST Amount (₹)', 'Subtotal (₹)',
        'Total with GST (₹)', 'GST Total (₹)'
    ])
    grand_total = 0
    for order in orders:
        for idx, item in enumerate(order.items):
            row = [
                order.completed_at.strftime('%Y-%m-%d %H:%M') if order.completed_at else '',
                order.order_number,
                order.customer_name or '',
                order.customer_email or '',
                order.customer_phone or '',
                (order.customer_address or '').replace('\n', ' '),
                item.product_name,
                item.quantity,
                item.unit_price,
                getattr(item, 'gst_amount', 0) or 0,
                item.subtotal,
                order.total_amount if idx == 0 else '',
                order.gst_amount or 0 if idx == 0 else ''
            ]
            writer.writerow(row)
            if idx == 0:
                grand_total += order.total_amount
    writer.writerow([])
    writer.writerow(['GRAND TOTAL (₹)', '', '', '', '', '', '', '', '', '', '', grand_total, ''])
    output.seek(0)
    filename = f"sales_report_{period}_{today.strftime('%Y%m%d')}.csv"
    return Response(output.getvalue(), mimetype='text/csv', headers={'Content-Disposition': f'attachment; filename={filename}'})

# ============ AUTOMATIONS ============
@bp.route('/automations', methods=['GET'])
def get_automations():
    user_id = get_user_id()
    automations = Automation.query.filter_by(user_id=user_id).all()
    return jsonify([a.to_dict() for a in automations])

@bp.route('/automations', methods=['POST'])
def create_automation():
    data = request.json
    user_id = get_user_id()
    auto = Automation(
        user_id=user_id,
        name=data.get('name', 'New Automation'),
        trigger_model=data.get('trigger_model', 'Inventory'),
        condition_field=data.get('condition_field', 'Stock Level'),
        condition_operator=data.get('condition_operator', '<'),
        condition_value=str(data.get('condition_value', '10')),
        action_type=data.get('action_type', 'Send WhatsApp'),
        action_target=data.get('action_target'),
        action_config=json.dumps(data.get('action_config', {})) if data.get('action_config') else None,
        is_active=data.get('is_active', True)
    )
    db.session.add(auto)
    db.session.commit()
    return jsonify(auto.to_dict()), 201

@bp.route('/automations/<int:auto_id>', methods=['PUT'])
def update_automation(auto_id):
    data = request.json
    user_id = get_user_id()
    auto = Automation.query.filter_by(id=auto_id, user_id=user_id).first()
    if not auto:
        return jsonify({'error': 'Automation not found'}), 404
    for k in ['name', 'trigger_model', 'condition_field', 'condition_operator', 'condition_value', 'action_type', 'action_target', 'is_active']:
        if k in data:
            setattr(auto, k, data[k])
    if 'action_config' in data:
        auto.action_config = json.dumps(data['action_config']) if data['action_config'] else None
    db.session.commit()
    return jsonify(auto.to_dict())

@bp.route('/users/settings', methods=['GET'])
def get_user_settings():
    user_id = get_user_id()
    user = User.query.filter_by(email=user_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    has_pwd = bool(user.sender_password)
    return jsonify({'sender_email': user.sender_email, 'logo_url': user.logo_url, 'has_sender_password': has_pwd})

@bp.route('/users/settings', methods=['PUT'])
def update_user_settings():
    data = request.json or {}
    user_id = data.get('user_id') or get_user_id()
    user = User.query.filter_by(email=user_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if 'sender_email' in data:
        user.sender_email = data['sender_email']
    if 'sender_password' in data:
        user.sender_password = data['sender_password']
    if 'logo_url' in data:
        user.logo_url = data['logo_url']
    db.session.commit()
    return jsonify(user.to_dict())

@bp.route('/automations/<int:auto_id>', methods=['DELETE'])
def delete_automation(auto_id):
    user_id = get_user_id()
    auto = Automation.query.filter_by(id=auto_id, user_id=user_id).first()
    if not auto:
        return jsonify({'error': 'Automation not found'}), 404
    db.session.delete(auto)
    db.session.commit()
    return jsonify({'success': True}), 200

@bp.route('/automations/check', methods=['POST'])
def trigger_automation_check():
    user_id = get_user_id()
    alert = check_automations(user_id)
    return jsonify({'triggered': alert is not None, 'alert': alert})

# ============ FORMS (existing) ============
@bp.route('/forms', methods=['GET'])
def get_forms():
    user_id = get_user_id()
    forms = Form.query.filter_by(user_id=user_id).all()
    return jsonify([form.to_dict() for form in forms])

@bp.route('/forms', methods=['POST'])
def create_form():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    user_id = get_user_id()
    form = Form(name=data['name'], user_id=user_id)
    db.session.add(form)
    db.session.flush()
    fields_data = data.get('fields', [])
    for fd in fields_data:
        field = FormField(form_id=form.id, name=fd['name'], field_type=fd['field_type'], is_required=fd.get('is_required', False))
        db.session.add(field)
    db.session.commit()
    return jsonify(form.to_dict()), 201

@bp.route('/forms/<int:form_id>', methods=['GET'])
def get_form(form_id):
    user_id = get_user_id()
    form = Form.query.filter_by(id=form_id, user_id=user_id).first()
    if not form:
        return jsonify({'error': 'Form not found'}), 404
    return jsonify(form.to_dict())

@bp.route('/forms/<int:form_id>', methods=['DELETE'])
def delete_form(form_id):
    user_id = get_user_id()
    form = Form.query.filter_by(id=form_id, user_id=user_id).first()
    if not form:
        return jsonify({'error': 'Form not found'}), 404
    RecordValue.query.filter(RecordValue.record.has(form_id=form_id)).delete(synchronize_session=False)
    Record.query.filter_by(form_id=form_id).delete()
    FormField.query.filter_by(form_id=form_id).delete()
    db.session.delete(form)
    db.session.commit()
    return jsonify({'success': True}), 200

@bp.route('/forms/<int:form_id>/records', methods=['GET'])
def get_records(form_id):
    user_id = get_user_id()
    form = Form.query.filter_by(id=form_id, user_id=user_id).first()
    if not form:
        return jsonify({'error': 'Form not found'}), 404
    records = Record.query.filter_by(form_id=form_id, user_id=user_id).all()
    return jsonify([record.to_dict() for record in records])

@bp.route('/forms/<int:form_id>/records', methods=['POST'])
def create_record(form_id):
    data = request.json
    user_id = data.get('user_id', 'demo@user.com')
    form = Form.query.filter_by(id=form_id, user_id=user_id).first()
    if not form:
        return jsonify({'error': 'Form not found'}), 404
    record = Record(form_id=form_id, user_id=user_id)
    db.session.add(record)
    db.session.flush()
    fields = {f.name: f for f in form.fields}
    for key, value in data.items():
        if key in fields:
            rv = RecordValue(record_id=record.id, field_id=fields[key].id, value=str(value) if value is not None else '')
            db.session.add(rv)
    db.session.commit()
    return jsonify(record.to_dict()), 201
