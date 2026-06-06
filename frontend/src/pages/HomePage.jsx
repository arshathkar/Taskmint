import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Table2, ArrowRight, Trash2, Package } from 'lucide-react';

const HomePage = ({ user }) => {
  const [forms, setForms] = useState([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmForm, setConfirmForm] = useState(null);
  const navigate = useNavigate();
  const userId = user?.email || 'demo@example.com';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [formsRes, productsRes] = await Promise.all([
          fetch(`/api/forms?user_id=${userId}`),
          fetch(`/api/products?user_id=${userId}`),
        ]);
        if (formsRes.ok) setForms(await formsRes.json());
        if (productsRes.ok) setProducts(await productsRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleDelete = async () => {
    if (!confirmForm) return;
    try {
      const res = await fetch(`/api/forms/${confirmForm.id}?user_id=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setForms((prev) => prev.filter((f) => f.id !== confirmForm.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmForm(null);
    }
  };

  const storeUrl = `${window.location.origin}/store?user=${encodeURIComponent(userId)}`;

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold mb-2" style={{ color: 'var(--highlight)' }}>Welcome, {user?.name || 'Company'}</h1>
        <p className="opacity-80 text-lg">Your dashboard and product catalog</p>
      </div>

      {/* Products Section - Company main page lists products with prices */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--highlight)' }}>Products</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => { navigator.clipboard.writeText(storeUrl); setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 1500); }}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            >
              {copyFeedback ? 'Copied' : 'Copy store link'}
            </button>
            <button
              onClick={() => navigate('/products')}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
            >
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>
        {products.length === 0 ? (
          <div className="glass-panel rounded-xl p-8 text-center">
            <Package size={40} className="mx-auto mb-3 opacity-60" style={{ color: 'var(--highlight)' }} />
            <p className="opacity-80 mb-4">No products yet. Add products to display them on your store.</p>
            <button
              onClick={() => navigate('/products')}
              className="btn-primary px-6 py-2 rounded-lg font-medium text-white"
            >
              Add Product
            </button>
          </div>
        ) : (
          <div className="glass-panel rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="p-4 font-bold">Product</th>
                  <th className="p-4 font-bold">Price</th>
                  <th className="p-4 font-bold">Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-4 font-medium">{p.name}</td>
                    <td className="p-4" style={{ color: 'var(--highlight)' }}>₹{p.price?.toFixed(2)}</td>
                    <td className="p-4">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Custom Tables Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--highlight)' }}>Database Tables</h2>
          <button
            onClick={() => navigate('/builder')}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
          >
            <Plus size={18} /> Create Table
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div>
          </div>
        ) : forms.length === 0 ? (
          <div className="glass-panel rounded-xl p-8 text-center">
            <Database size={40} className="mx-auto mb-3 opacity-60" style={{ color: 'var(--highlight)' }} />
            <p className="opacity-80 mb-4">No database tables. Use the Database Builder to create data structures.</p>
            <button
              onClick={() => navigate('/builder')}
              className="btn-primary px-6 py-2 rounded-lg font-medium text-white"
            >
              Go to Database Builder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div
                key={form.id}
                className="glass-panel p-6 rounded-xl transition-all group flex flex-col transform hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--highlight-bg)' }}>
                    <Table2 size={24} style={{ color: 'var(--highlight)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold truncate">{form.name}</h3>
                    <p className="text-sm opacity-75">{form.fields?.length || 0} fields</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmForm(form); }}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <button
                  onClick={() => navigate(`/data/${form.id}`)}
                  className="mt-auto flex items-center gap-2 py-2 rounded-lg font-medium transition-colors"
                  style={{ color: 'var(--highlight)' }}
                >
                  View Data <ArrowRight size={16} />
                </button>
              </div>
            ))}
            <div
              onClick={() => navigate('/builder')}
              className="glass-panel p-6 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center min-h-[160px] hover:border-violet-500/50 transition-colors"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Plus size={32} className="mb-2 opacity-60" style={{ color: 'var(--highlight)' }} />
              <p className="font-bold">Create New Table</p>
            </div>
          </div>
        )}
      </section>

      {confirmForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
          <div className="glass-card w-full max-w-sm p-8 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.2)] border border-red-500/40 relative animate-[zoomInCenter_0.4s_ease-out_forwards]">
            <div className="absolute inset-0 bg-red-500/5 rounded-3xl pointer-events-none"></div>
            <div className="relative z-10 text-center">
              <h2 className="text-2xl font-black mb-3 text-red-500 drop-shadow-sm">Delete Table?</h2>
              <p className="text-sm opacity-80 mb-8 px-2">
                This will permanently delete <span className="font-bold text-red-400">{confirmForm.name}</span> and all its records. Cannot be undone!
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setConfirmForm(null)}
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

export default HomePage;
