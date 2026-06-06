import React, { useState, useEffect } from 'react';
import { Package, Plus, Pencil, Trash2, DollarSign } from 'lucide-react';

const ProductsPage = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const GST_OPTIONS = [
    { value: '5', label: 'Daily Essential (5%)' },
    { value: '18', label: 'Standard Rate (18%)' },
    { value: '40', label: 'Luxury Tax (40%)' },
    { value: '0', label: 'Exempted/Nil (GST Free)' },
    { value: 'manual', label: 'Manual entry (CGST/SGST/IGST)' },
  ];
  const [form, setForm] = useState({ name: '', price: '', stock: '', gst_slab: '18', cgst: '', sgst: '', igst: '' });

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?user_id=${user?.email || 'demo@user.com'}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editing ? `/api/products/${editing.id}` : '/api/products';
    const method = editing ? 'PUT' : 'POST';
    const price = Number(form.price);
    const stock = Number(form.stock) || 0;
    const effectiveSlab =
      form.gst_slab === 'manual'
        ? String(
          (parseFloat(form.cgst || '0') || 0) +
          (parseFloat(form.sgst || '0') || 0) +
          (parseFloat(form.igst || '0') || 0)
        )
        : form.gst_slab;
    const effectiveType = form.gst_slab === 'manual' ? 'cgst_sgst' : 'igst';
    const body = {
      name: String(form.name || '').trim(),
      price: isNaN(price) ? 0 : price,
      stock,
      gst_slab: effectiveSlab,
      gst_type: effectiveType,
      user_id: user?.email
    };
    if (!body.name) return;
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowModal(false);
        setEditing(null);
        setForm({ name: '', price: '', stock: '', gst_slab: '18', cgst: '', sgst: '', igst: '' });
        fetchProducts();
      } else {
        const err = await res.json();
        console.error(err.error || 'Failed to save product');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/products/${confirmDelete.id}?user_id=${user?.email}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmDelete(null);
    }
  };

  const openEdit = (p) => {
    setEditing(p);
    const slab = String(p.gst_slab || '18');
    const isManual = p.gst_type === 'cgst_sgst' || p.gst_type === 'intra' || !['5', '18', '40', '0'].includes(slab);

    setForm({
      name: p.name,
      price: p.price,
      stock: p.stock,
      gst_slab: isManual ? 'manual' : slab,
      cgst: isManual && slab !== '0' ? String(parseFloat(slab) / 2) : '',
      sgst: isManual && slab !== '0' ? String(parseFloat(slab) / 2) : '',
      igst: '',
    });
    setShowModal(true);
  };

  return (
    <div className="p-8 h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ color: 'var(--highlight)' }}>Products</h1>
          <p className="opacity-80">Manage your product catalog with prices and stock</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', price: '', stock: '', gst_slab: '18', cgst: '', sgst: '', igst: '' }); setShowModal(true); }}
          className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <Package size={48} className="mx-auto mb-4 opacity-60" style={{ color: 'var(--highlight)' }} />
          <p className="text-lg mb-4">No products yet. Add your first product to start selling.</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary px-6 py-2 rounded-lg font-medium text-white"
          >
            Add Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div key={p.id} className="glass-panel p-6 rounded-xl transform transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--highlight-bg)' }}>
                    <Package size={24} style={{ color: 'var(--highlight)' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                    <p className="text-sm flex items-center gap-1" style={{ color: 'var(--highlight)' }}>
                      ₹{p.price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setConfirmDelete(p)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm opacity-75">Stock: {p.stock} units</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl border border-violet-500/20">
            <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--highlight)' }}>{editing ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 glass-input rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-4 py-2 glass-input rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full px-4 py-2 glass-input rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">GST (select or manual)</label>
                <select
                  value={form.gst_slab}
                  onChange={(e) => setForm({ ...form, gst_slab: e.target.value })}
                  className="w-full px-4 py-2 glass-input rounded-lg"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {GST_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {form.gst_slab === 'manual' && (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">CGST %</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={form.cgst}
                          onChange={(e) => setForm({ ...form, cgst: e.target.value })}
                          className="w-full px-3 py-2 glass-input rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">SGST %</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={form.sgst}
                          onChange={(e) => setForm({ ...form, sgst: e.target.value })}
                          className="w-full px-3 py-2 glass-input rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">IGST % (optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.igst}
                        onChange={(e) => setForm({ ...form, igst: e.target.value })}
                        className="w-full px-3 py-2 glass-input rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1 py-2 rounded-lg border border-violet-500/30 bg-transparent">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 py-2 rounded-lg text-white font-medium">
                  {editing ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
          <div className="glass-card w-full max-w-sm p-8 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.2)] border border-red-500/40 relative animate-[zoomInCenter_0.4s_ease-out_forwards]">
            <div className="absolute inset-0 bg-red-500/5 rounded-3xl pointer-events-none"></div>
            <div className="relative z-10 text-center">
              <h2 className="text-2xl font-black mb-3 text-red-500 drop-shadow-sm">Delete Product?</h2>
              <p className="text-sm opacity-80 mb-8 px-2">
                This will permanently delete <span className="font-bold text-red-400">{confirmDelete.name}</span>. This action cannot be undone!
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)] text-white font-bold transition-all transform hover:-translate-y-0.5"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
