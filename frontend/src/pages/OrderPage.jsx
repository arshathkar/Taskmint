import React, { useState } from 'react';
import { ShoppingCart, CheckCircle, XCircle, Package, Clock } from 'lucide-react';

const OrderPage = ({ onOrderAccepted }) => {
    const [quantity, setQuantity] = useState(1);
    const [pendingOrder, setPendingOrder] = useState(null);
    const [notification, setNotification] = useState(null);

    const handlePlaceOrder = () => {
        if (quantity < 1) return;
        setPendingOrder({ quantity: parseInt(quantity), id: Date.now() });
    };

    const handleAccept = () => {
        if (!pendingOrder) return;
        if (onOrderAccepted) onOrderAccepted(pendingOrder.quantity);
        setNotification({ type: 'success', message: `Order of ${pendingOrder.quantity} unit(s) accepted! Inventory updated.` });
        setPendingOrder(null);
        setQuantity(1);
        setTimeout(() => setNotification(null), 4000);
    };

    const handleReject = () => {
        setNotification({ type: 'error', message: 'Order rejected.' });
        setPendingOrder(null);
        setQuantity(1);
        setTimeout(() => setNotification(null), 2500);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
            {/* Floating notification */}
            {notification && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border text-sm font-semibold transition-all animate-[fadeIn_0.3s_ease-out] ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
                    {notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    {notification.message}
                </div>
            )}

            {/* Customer Order Box */}
            <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-lg p-8 text-center">
                <div className="mb-4 flex justify-center">
                    <div className="bg-emerald-100 p-4 rounded-full">
                        <ShoppingCart className="text-emerald-600" size={32} />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Place an Order</h1>
                <p className="text-gray-400 text-sm mb-6">Enter quantity and submit your request</p>

                <div className="mb-4">
                    <label className="block text-left text-sm font-semibold text-gray-600 mb-1">Quantity</label>
                    <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-lg text-center text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                </div>

                <button
                    onClick={handlePlaceOrder}
                    disabled={!!pendingOrder}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors text-base shadow-md shadow-emerald-200"
                >
                    {pendingOrder ? 'Waiting for approval...' : 'Place Order'}
                </button>
            </div>

            {/* Admin Accept/Reject Panel */}
            {pendingOrder && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-200 p-6 animate-[fadeInUp_0.4s_ease-out]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-amber-100 p-2 rounded-full">
                            <Clock className="text-amber-500" size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">Incoming Order Request</p>
                            <p className="text-sm text-gray-500">A customer wants to order <span className="font-bold text-emerald-600">{pendingOrder.quantity} unit(s)</span></p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleAccept}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-100"
                        >
                            <CheckCircle size={18} /> Accept
                        </button>
                        <button
                            onClick={handleReject}
                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <XCircle size={18} /> Reject
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderPage;
