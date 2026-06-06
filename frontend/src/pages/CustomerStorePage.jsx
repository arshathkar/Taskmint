import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, CheckCircle, Package, Search } from 'lucide-react';

const STORE_LAYOUT = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #1a0a2e 0%, #0d0518 50%, #160c28 100%)',
  color: '#e8e0f5',
};

const CustomerStorePage = () => {
  const [searchParams] = useSearchParams();
  const storeUserId = searchParams.get('user') || 'demo@user.com';

  const [storeName, setStoreName] = useState('Store');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState('browse'); // browse | checkout | success
  const [productSearch, setProductSearch] = useState('');
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', customer_address: '' });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/store/info?user_id=${encodeURIComponent(storeUserId)}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setStoreName(d.name || 'Store'))
      .catch(() => setStoreName('Store'));
  }, [storeUserId]);

  useEffect(() => {
    fetch(`/api/store/products?user_id=${storeUserId}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [storeUserId]);

  const matchesSearch = (name, q) => {
    if (!q || !q.trim()) return true;
    const lower = q.trim().toLowerCase();
    return (name || '').toLowerCase().includes(lower);
  };
  const filteredProducts = products.filter((p) => matchesSearch(p.name, productSearch));

  const addToCart = (product, qty = 1) => {
    const existing = cart.find((c) => c.product_id === product.id);
    const newQty = Math.min((existing?.quantity || 0) + qty, product.stock);
    if (newQty <= 0) return;
    if (existing) {
      setCart(cart.map((c) => (c.product_id === product.id ? { ...c, quantity: newQty, gst_slab: c.gst_slab || product.gst_slab || '18', gst_type: c.gst_type || product.gst_type || 'igst' } : c)));
    } else {
      setCart([...cart, { product_id: product.id, product_name: product.name, unit_price: product.price, quantity: newQty, gst_slab: product.gst_slab || '18', gst_type: product.gst_type || 'igst' }]);
    }
  };

  const updateCartQty = (productId, qty) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.product_id !== productId));
      return;
    }
    const product = products.find((p) => p.id === productId);
    const maxQty = product ? product.stock : qty;
    setCart(cart.map((c) => (c.product_id === productId ? { ...c, quantity: Math.min(qty, maxQty), gst_slab: product?.gst_slab || c.gst_slab || '18', gst_type: product?.gst_type || c.gst_type || 'igst' } : c)));
  };

  const GST_SLABS = { '5': 5, '18': 18, '40': 40, '0': 0 };
  const cartWithGst = cart.map((c) => {
    let rate = 18;
    const parsedRate = parseFloat(c.gst_slab);
    if (!isNaN(parsedRate)) {
      rate = parsedRate;
    } else if (GST_SLABS[c.gst_slab] !== undefined) {
      rate = GST_SLABS[c.gst_slab];
    }

    const subtotal = c.unit_price * c.quantity;
    const gstAmt = (subtotal * rate) / 100;
    return { ...c, gst_amount: gstAmt, subtotal: subtotal + gstAmt };
  });
  const totalAmount = cartWithGst.reduce((s, c) => s + c.subtotal, 0);
  const totalGst = cartWithGst.reduce((s, c) => s + c.gst_amount, 0);

  const handlePlaceOrder = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: storeUserId,
          items: cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          customer_address: form.customer_address,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        setCart([]);
        setStep('success');
      } else {
        setError(data.error || 'Failed to place order');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={STORE_LAYOUT} className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#c9bde8' }}>Welcome to {storeName}</h1>
          <p className="opacity-80">Browse products and place your order</p>
        </header>

        {step === 'browse' && (
          <>
            <div className="mb-6 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
                <input
                  type="text"
                  placeholder="Search products (e.g. pen, book)..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-lg bg-black/30 border border-violet-500/30 text-white placeholder:text-violet-300/70"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl p-6 border border-violet-500/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all"
                >
                  <h3 className="text-xl font-bold mb-2">{p.name}</h3>
                  <p className="text-2xl font-bold text-violet-400 mb-4">₹{p.price.toFixed(2)}</p>
                  <p className="text-sm opacity-75 mb-4">In stock: {p.stock}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={p.stock}
                      defaultValue="1"
                      className="w-16 px-2 py-1 rounded bg-black/30 border border-violet-500/30 text-center"
                      id={`qty-${p.id}`}
                    />
                    <button
                      onClick={() => addToCart(p, parseInt(document.getElementById(`qty-${p.id}`)?.value || 1, 10))}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-white font-medium"
                    >
                      <ShoppingCart size={18} /> Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Order Form - Products as dropdown with quantity */}
            {products.length > 0 && (
              <div className="glass-panel rounded-2xl p-6 mb-12 border border-violet-500/20">
                <h3 className="text-lg font-bold mb-4">Quick Order (Dropdown)</h3>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm mb-1">Product</label>
                    <select
                      id="quick-product"
                      className="w-full px-4 py-2 rounded-lg bg-black/30 border border-violet-500/30 text-white"
                    >
                      <option value="">Select product...</option>
                      {filteredProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - ₹{p.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-sm mb-1">Quantity</label>
                    <input
                      type="number"
                      id="quick-qty"
                      min="1"
                      defaultValue="1"
                      className="w-full px-4 py-2 rounded-lg bg-black/30 border border-violet-500/30"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const sel = document.getElementById('quick-product');
                      const qtyInput = document.getElementById('quick-qty');
                      const pid = parseInt(sel?.value);
                      const qty = parseInt(qtyInput?.value || 1);
                      if (pid && qty > 0) {
                        const p = products.find((x) => x.id === pid);
                        if (p && p.stock >= qty) addToCart(p, qty);
                      }
                    }}
                    className="btn-primary flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium"
                  >
                    <ShoppingCart size={18} /> Add to Cart
                  </button>
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur border-t border-violet-500/20">
                <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">Cart: {cart.length} item(s)</p>
                    <p className="text-violet-400 text-lg">₹{cartWithGst.reduce((s, c) => s + c.subtotal, 0).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => setStep('checkout')}
                    className="btn-primary px-6 py-3 rounded-xl text-white font-bold"
                  >
                    Checkout
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {step === 'checkout' && (
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6">Checkout</h2>
            <div className="space-y-2 mb-6">
              {cartWithGst.map((c) => (
                <div key={c.product_id} className="py-2 border-b border-violet-500/20">
                  <div className="flex justify-between">
                    <span>{c.product_name} x {c.quantity}</span>
                    <span>₹{c.subtotal?.toFixed(2)}</span>
                  </div>
                  {c.gst_amount > 0 && <div className="text-sm opacity-75 pl-2">GST: ₹{c.gst_amount?.toFixed(2)}</div>}
                </div>
              ))}
              {totalGst > 0 && <p className="text-sm pt-2">GST Total: ₹{totalGst.toFixed(2)}</p>}
              <p className="text-xl font-bold pt-2">Amount to Pay: ₹{totalAmount.toFixed(2)}</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePlaceOrder();
              }}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Your Name"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-black/30 border border-violet-500/30"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={form.customer_email}
                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-black/30 border border-violet-500/30"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-black/30 border border-violet-500/30"
              />
              <textarea
                placeholder="Address"
                value={form.customer_address}
                onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-black/30 border border-violet-500/30"
                rows={2}
                required
              />
              {error && <p className="text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('browse')} className="flex-1 py-3 rounded-lg border border-violet-500/30">
                  Back
                </button>
                <button type="submit" className="btn-primary flex-1 py-3 rounded-lg text-white font-bold disabled:opacity-50" disabled={loading}>
                  {loading ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'success' && order && (
          <div className="max-w-md mx-auto text-center">
            <CheckCircle size={64} className="mx-auto mb-4 text-green-400" />
            <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
            <p className="text-violet-400 text-xl mb-4">Order # {order.order_number}</p>
            <p className="opacity-80 mb-6">Thank you for your order.</p>
            <button
              onClick={() => { setStep('browse'); setOrder(null); }}
              className="btn-primary px-6 py-3 rounded-lg text-white font-bold"
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerStorePage;
