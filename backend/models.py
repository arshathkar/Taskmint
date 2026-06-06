from database import db
from datetime import datetime

GST_SLABS = {'5': 5, '18': 18, '40': 40, '0': 0}  # Daily essential 5%, Standard 18%, Luxury 40%, Exempt 0

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, default='demo@user.com')
    name = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Float, nullable=False, default=0)
    stock = db.Column(db.Integer, nullable=False, default=0)
    sku = db.Column(db.String(50), nullable=True)
    gst_slab = db.Column(db.String(10), nullable=True, default='18')  # 5, 18, 40, 0
    gst_type = db.Column(db.String(10), nullable=True, default='igst')  # cgst, sgst, igst - only one
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    order_items = db.relationship('OrderItem', backref='product', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'stock': self.stock,
            'sku': self.sku,
            'gst_slab': self.gst_slab,
            'gst_type': self.gst_type or 'igst',
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None
        }

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='pending')  # pending, accepted, shipped, completed, rejected
    customer_name = db.Column(db.String(200), nullable=True)
    customer_email = db.Column(db.String(200), nullable=True)
    customer_phone = db.Column(db.String(50), nullable=True)
    customer_address = db.Column(db.Text, nullable=True)
    total_amount = db.Column(db.Float, default=0)
    gst_amount = db.Column(db.Float, default=0)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    shipped_at = db.Column(db.DateTime, nullable=True)

    items = db.relationship('OrderItem', backref='order', cascade='all, delete-orphan')
    tracking = db.relationship('OrderTracking', backref='order', cascade='all, delete-orphan', order_by='OrderTracking.created_at')

    def to_dict(self):
        return {
            'id': self.id,
            'order_number': self.order_number,
            'status': self.status,
            'customer_name': self.customer_name,
            'customer_email': self.customer_email,
            'customer_phone': self.customer_phone,
            'customer_address': self.customer_address,
            'total_amount': self.total_amount,
            'gst_amount': self.gst_amount,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updated_at': self.updated_at.isoformat() + 'Z' if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() + 'Z' if self.completed_at else None,
            'shipped_at': self.shipped_at.isoformat() + 'Z' if self.shipped_at else None,
            'items': [item.to_dict() for item in self.items],
            'tracking': [t.to_dict() for t in self.tracking]
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit_price = db.Column(db.Float, nullable=False)
    gst_rate = db.Column(db.Float, default=0)
    gst_amount = db.Column(db.Float, default=0)
    gst_type = db.Column(db.String(10), default='igst')  # cgst, sgst, igst
    subtotal = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'gst_rate': self.gst_rate,
            'gst_amount': self.gst_amount,
            'gst_type': self.gst_type or 'igst',
            'subtotal': self.subtotal
        }

class OrderTracking(db.Model):
    __tablename__ = 'order_tracking'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    status = db.Column(db.String(50), nullable=False)  # placed, accepted, processing, shipped, completed
    message = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'status': self.status,
            'message': self.message,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None
        }

class SalesRecord(db.Model):
    __tablename__ = 'sales_records'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    sale_type = db.Column(db.String(50), default='order')  # order, adjustment
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'amount': self.amount,
            'sale_type': self.sale_type,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None
        }

class Automation(db.Model):
    __tablename__ = 'automations'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    trigger_model = db.Column(db.String(50), nullable=False)  # Inventory, Orders, etc.
    condition_field = db.Column(db.String(100), nullable=False)
    condition_operator = db.Column(db.String(10), nullable=False)  # <, >, ==
    condition_value = db.Column(db.String(100), nullable=False)
    action_type = db.Column(db.String(100), nullable=False)  # Send SMS, WhatsApp, etc.
    action_target = db.Column(db.String(200), nullable=True)  # Manager phone, etc.
    action_config = db.Column(db.Text, nullable=True)  # JSON config e.g. {"phone": "123"}
    is_active = db.Column(db.Boolean, default=True)
    last_triggered = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'trigger_model': self.trigger_model,
            'condition_field': self.condition_field,
            'condition_operator': self.condition_operator,
            'condition_value': self.condition_value,
            'action_type': self.action_type,
            'action_target': self.action_target,
            'action_config': self.action_config,
            'is_active': self.is_active,
            'last_triggered': self.last_triggered.isoformat() + 'Z' if self.last_triggered else None,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None
        }

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)  # Company name for signup
    password = db.Column(db.String(200), nullable=True)
    sender_email = db.Column(db.String(200), nullable=True)  # For order notifications
    sender_password = db.Column(db.String(200), nullable=True)
    logo_url = db.Column(db.String(500), nullable=True)  # Company logo for invoice
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'company_name': self.name,
            'logo_url': self.logo_url,
        }

class Form(db.Model):
    __tablename__ = 'forms'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, default='demo@user.com')
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    fields = db.relationship('FormField', backref='form', cascade='all, delete-orphan')
    records = db.relationship('Record', backref='form', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'created_at': self.created_at.isoformat() + 'Z',
            'fields': [field.to_dict() for field in self.fields]
        }

class FormField(db.Model):
    __tablename__ = 'form_fields'
    id = db.Column(db.Integer, primary_key=True)
    form_id = db.Column(db.Integer, db.ForeignKey('forms.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    field_type = db.Column(db.String(50), nullable=False) # e.g., 'text', 'number', 'date'
    is_required = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'field_type': self.field_type,
            'is_required': self.is_required
        }

class Record(db.Model):
    __tablename__ = 'records'
    id = db.Column(db.Integer, primary_key=True)
    form_id = db.Column(db.Integer, db.ForeignKey('forms.id'), nullable=False)
    user_id = db.Column(db.String(100), nullable=False, default='demo@user.com')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    values = db.relationship('RecordValue', backref='record', cascade='all, delete-orphan')

    def to_dict(self):
        data = {
            'id': self.id,
            'form_id': self.form_id,
            'created_at': self.created_at.isoformat() + 'Z'
        }
        for rv in self.values:
             data[rv.field.name] = rv.value
        return data

class RecordValue(db.Model):
    __tablename__ = 'record_values'
    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(db.Integer, db.ForeignKey('records.id'), nullable=False)
    field_id = db.Column(db.Integer, db.ForeignKey('form_fields.id'), nullable=False)
    value = db.Column(db.Text)

    field = db.relationship('FormField')
