import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, XCircle, Truck, Printer, Download, RefreshCw, PackageCheck, Search, Trash2 } from 'lucide-react';
import InvoicePrint from '../components/InvoicePrint';
import { useToast } from '../context/ToastContext';

const ActiveOrdersPage = ({ user }) => {
  const showToast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [whatsappAlert, setWhatsappAlert] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'accept'|'reject', order }
  const [confirmClear, setConfirmClear] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(new Set());

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?user_id=${user?.email || 'demo@user.com'}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const updateOrderOptimistic = (orderId, patch) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
  };

  const handleAccept = async (orderId) => {
    setLoadingOrders((prev) => new Set(prev).add(orderId));
    const prev = orders.find((o) => o.id === orderId);
    updateOrderOptimistic(orderId, { status: 'accepted' });
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.email }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders((prevOps) => prevOps.map((o) => (o.id === orderId ? data : o)));
      } else {
        const err = await res.json();
        updateOrderOptimistic(orderId, { status: prev?.status ?? 'pending' });
        showToast(err.error || 'Failed', 'error');
      }
    } catch (e) {
      updateOrderOptimistic(orderId, { status: prev?.status ?? 'pending' });
      showToast('Network error', 'error');
    } finally {
      setLoadingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleReject = async (orderId) => {
    setLoadingOrders((prev) => new Set(prev).add(orderId));
    const prev = orders.find((o) => o.id === orderId);
    updateOrderOptimistic(orderId, { status: 'rejected' });
    try {
      const res = await fetch(`/api/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.email }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders((prevOps) => prevOps.map((o) => (o.id === orderId ? data : o)));
      } else {
        updateOrderOptimistic(orderId, { status: prev?.status ?? 'pending' });
        const err = await res.json();
        showToast(err.error || 'Failed', 'error');
      }
    } catch (e) {
      updateOrderOptimistic(orderId, { status: prev?.status ?? 'pending' });
      showToast('Network error', 'error');
    } finally {
      setLoadingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleShip = async (orderId) => {
    setLoadingOrders((prev) => new Set(prev).add(orderId));
    const prev = orders.find((o) => o.id === orderId);
    updateOrderOptimistic(orderId, { status: 'shipped', shipped_at: new Date().toISOString() });
    try {
      const res = await fetch(`/api/orders/${orderId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.email }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders((prevOps) => prevOps.map((o) => (o.id === orderId ? data : o)));
      } else {
        updateOrderOptimistic(orderId, { status: prev?.status ?? 'accepted', shipped_at: null });
        const err = await res.json();
        showToast(err.error || 'Failed', 'error');
      }
    } catch (e) {
      updateOrderOptimistic(orderId, { status: prev?.status ?? 'accepted', shipped_at: null });
      showToast('Network error', 'error');
    } finally {
      setLoadingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleComplete = async (orderId) => {
    setLoadingOrders((prev) => new Set(prev).add(orderId));
    const prev = orders.find((o) => o.id === orderId);
    updateOrderOptimistic(orderId, { status: 'completed', completed_at: new Date().toISOString() });
    try {
      const res = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.email }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders((prevOps) => prevOps.map((o) => (o.id === orderId ? data : o)));
        if (data.automation_alert?.whatsapp_link) {
          setWhatsappAlert(data.automation_alert);
          setTimeout(() => setWhatsappAlert(null), 10000);
        }
      } else {
        updateOrderOptimistic(orderId, { status: prev?.status ?? 'shipped', completed_at: null });
        const err = await res.json();
        showToast(err.error || 'Failed', 'error');
      }
    } catch (e) {
      updateOrderOptimistic(orderId, { status: prev?.status ?? 'shipped', completed_at: null });
      showToast('Network error', 'error');
    } finally {
      setLoadingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleDownloadReport = () => {
    window.open(`/api/reports/sales/download?period=${reportPeriod}&user_id=${user?.email}`, '_blank');
  };

  const handleClearOrders = async () => {
    try {
      const res = await fetch('/api/orders/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.email }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders([]);
        setConfirmClear(false);
        showToast(`Cleared ${data.cleared || 0} orders.`);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to clear orders', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const matchOrder = (o, q) => {
    if (!q || !q.trim()) return true;
    const lower = q.trim().toLowerCase();
    const num = (o.order_number || '').toLowerCase();

    // If search is purely numbers, check if the order number ENDS with that number
    // to prevent "7" matching "ORD-20260227-0001" by date
    if (/^\d+$/.test(lower)) {
      if (num.endsWith(lower)) return true;
    } else {
      if (num.includes(lower)) return true;
    }

    const name = (o.customer_name || '').toLowerCase();
    const email = (o.customer_email || '').toLowerCase();
    const itemsText = (o.items || []).map((i) => (i.product_name || '').toLowerCase()).join(' ');

    return name.includes(lower) || email.includes(lower) || itemsText.includes(lower);
  };

  const filteredOrders = orders.filter((o) => matchOrder(o, searchQuery));
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending');
  const acceptedOrders = filteredOrders.filter((o) => o.status === 'accepted');
  const shippedOrders = filteredOrders.filter((o) => o.status === 'shipped');
  const completedOrders = filteredOrders.filter((o) => o.status === 'completed');

  return (
    <div className="p-8 h-full">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ color: 'var(--highlight)' }}>Orders</h1>
          <p className="opacity-80">Manage and complete customer orders</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 glass-input rounded-lg"
            />
          </div>
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            className="px-4 py-2 glass-input rounded-lg"
          >
            <option value="monthly">Monthly Report</option>
            <option value="yearly">Yearly Report</option>
          </select>
          <button
            onClick={handleDownloadReport}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
          >
            <Download size={18} /> Download
          </button>
          <button onClick={fetchOrders} className="btn-primary p-2 rounded-lg">
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 size={18} /> Clear orders
          </button>
        </div>
      </div>

      {whatsappAlert && (
        <div className="fixed bottom-6 right-6 z-40 p-4 rounded-xl border border-green-500/40 bg-green-500/90 text-white shadow-2xl flex items-center gap-4 max-w-md">
          <span className="text-sm font-medium flex-1">
            Low stock alert triggered after order completion. Send WhatsApp to manager?
          </span>
          <a
            href={whatsappAlert.whatsapp_link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm"
          >
            Open WhatsApp
          </a>
        </div>
      )}

      {confirmAction && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="glass-card max-w-sm w-full p-6 rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--highlight)' }}>
              {confirmAction.type === 'accept' ? 'Accept order?' : 'Reject order?'}
            </h3>
            <p className="text-sm opacity-80 mb-4">
              Order <span className="font-mono font-semibold">{confirmAction.order.order_number}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2 rounded-lg border border-violet-500/30"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = confirmAction.order.id;
                  const type = confirmAction.type;
                  setConfirmAction(null);
                  if (type === 'accept') {
                    await handleAccept(id);
                  } else {
                    await handleReject(id);
                  }
                }}
                className="flex-1 py-2 rounded-lg text-white font-medium"
                style={{ background: confirmAction.type === 'accept' ? 'var(--highlight)' : '#dc2626' }}
              >
                {confirmAction.type === 'accept' ? 'Yes, Accept' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {pendingOrders.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--highlight)' }}>Pending Approval</h2>
              <div className="space-y-4">
                {pendingOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onAccept={() => setConfirmAction({ type: 'accept', order: o })}
                    onReject={() => setConfirmAction({ type: 'reject', order: o })}
                    onComplete={null}
                    onInvoice={() => setInvoiceOrder(o)}
                    showAcceptReject
                    disabled={loadingOrders.has(o.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {acceptedOrders.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--highlight)' }}>Accepted (Ready to Ship)</h2>
              <div className="space-y-4">
                {acceptedOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onShip={() => handleShip(o.id)}
                    onInvoice={() => setInvoiceOrder(o)}
                    showShip
                    disabled={loadingOrders.has(o.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {shippedOrders.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--highlight)' }}>Shipped (Ready to Complete)</h2>
              <div className="space-y-4">
                {shippedOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onComplete={() => handleComplete(o.id)}
                    onInvoice={() => setInvoiceOrder(o)}
                    showComplete
                    disabled={loadingOrders.has(o.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {completedOrders.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--highlight)' }}>Completed</h2>
              <div className="space-y-4">
                {completedOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onInvoice={() => setInvoiceOrder(o)}
                    showShippedBadge={!!o.shipped_at}
                  />
                ))}
              </div>
            </section>
          )}

          {filteredOrders.length === 0 && (
            <div className="glass-panel rounded-xl p-12 text-center">
              <Package size={48} className="mx-auto mb-4 opacity-60" style={{ color: 'var(--highlight)' }} />
              <p className="text-lg">{searchQuery.trim() ? 'No orders match your search.' : 'No orders yet. Share your store link with customers.'}</p>
            </div>
          )}

          {confirmClear && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmClear(false)}>
              <div className="glass-card max-w-sm w-full p-6 rounded-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-3 text-red-400">Clear all orders?</h3>
                <p className="text-sm opacity-80 mb-4">This will permanently delete all orders. This cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmClear(false)} className="flex-1 py-2 rounded-lg border">Cancel</button>
                  <button onClick={handleClearOrders} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">Clear all</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {invoiceOrder && (
        <InvoicePrint order={invoiceOrder} user={user} onClose={() => setInvoiceOrder(null)} />
      )}
    </div>
  );
};

function OrderCard({ order, onAccept, onReject, onComplete, onShip, onInvoice, showAcceptReject, showComplete, showShip, showShippedBadge, disabled }) {
  const statusColors = {
    pending: 'text-amber-500',
    accepted: 'text-blue-500',
    shipped: 'text-indigo-500',
    completed: 'text-green-500',
    rejected: 'text-red-500',
  };

  return (
    <div className={`glass-panel p-6 rounded-xl relative ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono font-bold" style={{ color: 'var(--highlight)' }}>{order.order_number}</span>
            <span className={`text-sm font-medium capitalize ${statusColors[order.status] || ''}`}>
              {disabled ? 'Updating...' : order.status}
            </span>
          </div>
          <p className="text-sm opacity-80">{order.customer_name || 'Guest'}</p>
          <p className="text-sm opacity-60">{order.customer_email}</p>
          <div className="mt-2 space-y-1">
            {order.items?.map((item) => (
              <p key={item.id} className="text-sm">
                {item.product_name} x {item.quantity} = ₹{item.subtotal?.toFixed(2)}
              </p>
            ))}
          </div>
          <p className="font-bold mt-2">Total: ₹{order.total_amount?.toFixed(2)}</p>
          {order.notes && (
            <div className="mt-3 p-3 rounded-lg border border-violet-500/20 bg-violet-500/5 text-sm">
              <span className="font-semibold" style={{ color: 'var(--highlight)' }}>Notes: </span>
              <span className="opacity-80 break-words">{order.notes}</span>
            </div>
          )}
          {showShippedBadge && order.shipped_at && (
            <p className="text-xs mt-2 opacity-75">Shipped</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onInvoice}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-500/30 hover:bg-violet-500/10 transition-colors"
          >
            <Printer size={18} /> Invoice
          </button>
          {showAcceptReject && onAccept && (
            <>
              <button disabled={disabled} onClick={onAccept} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">
                <CheckCircle size={18} /> Accept
              </button>
              <button disabled={disabled} onClick={onReject} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">
                <XCircle size={18} /> Reject
              </button>
            </>
          )}
          {showShip && onShip && (
            <button
              disabled={disabled}
              onClick={onShip}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-800 text-white font-medium transition-all duration-200 ease-out"
            >
              <PackageCheck size={18} /> Shipped
            </button>
          )}
          {showComplete && onComplete && (
            <button
              disabled={disabled}
              onClick={onComplete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-800 text-white font-medium transition-all duration-200 ease-out"
            >
              <CheckCircle size={18} /> Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActiveOrdersPage;
