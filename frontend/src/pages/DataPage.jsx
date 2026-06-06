import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Download, Save, RefreshCw } from 'lucide-react';

const DataPage = ({ user }) => {
    const { formId } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newRecordData, setNewRecordData] = useState({});

    useEffect(() => {
        fetchData();
    }, [formId, user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const userQuery = `user_id=${user?.email || 'demo@example.com'}`;
            const [formRes, recordsRes] = await Promise.all([
                fetch(`/api/forms/${formId}?${userQuery}`),
                fetch(`/api/forms/${formId}/records?${userQuery}`)
            ]);

            if (formRes.ok && recordsRes.ok) {
                const formData = await formRes.json();
                const recordsData = await recordsRes.json();
                setForm(formData);
                setRecords(recordsData);
            }
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRecord = async () => {
        try {
            const response = await fetch(`/api/forms/${formId}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user?.email || 'demo@example.com',
                    ...newRecordData
                })
            });

            if (response.ok) {
                setShowNewModal(false);
                setNewRecordData({});
                fetchData(); // Refresh records
            }
        } catch (err) {
            console.error("Failed to save record", err);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!form) {
        return <div className="p-8">App not found!</div>;
    }

    return (
        <div className="p-8 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-full hover:bg-white/10 opacity-80 hover:opacity-100 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                    <h1 className="text-4xl font-extrabold drop-shadow-sm mb-1" style={{ color: 'var(--highlight)' }}>{form.name}</h1>
                    <p className="opacity-80 font-medium text-lg">Manage records for this custom table</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchData}
                        className="px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium border transition-all shadow-sm"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        <RefreshCw size={18} /> Refresh
                    </button>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-lg transition-all active:scale-95 text-white"
                        style={{ background: 'var(--highlight)' }}
                    >
                        <Plus size={18} /> Add Record
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col shadow-lg">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b text-sm tracking-wider uppercase" style={{ borderColor: 'var(--border-color)', background: 'var(--highlight-bg)' }}>
                                <th className="p-4 font-bold border-r w-16 text-center" style={{ borderColor: 'var(--border-color)' }}>ID</th>
                                {form.fields.map(field => (
                                    <th key={field.id} className="p-4 font-bold border-r" style={{ borderColor: 'var(--border-color)' }}>{field.name}</th>
                                ))}
                                <th className="p-4 font-bold">Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={form.fields.length + 2} className="p-8 text-center opacity-60 italic">
                                        No records found. Click "Add Record" to start populating this table.
                                    </td>
                                </tr>
                            ) : (
                                records.map((record, index) => (
                                    <tr key={record.id} className="border-b hover:bg-white/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                                        <td className="p-4 text-center font-mono text-xs border-r" style={{ borderColor: 'var(--border-color)' }}>{record.id}</td>
                                        {form.fields.map(field => (
                                            <td key={field.id} className="p-4 border-r font-medium" style={{ borderColor: 'var(--border-color)' }}>
                                                {record[field.name] || <span className="opacity-50">-</span>}
                                            </td>
                                        ))}
                                        <td className="p-4 text-sm opacity-75">
                                            {new Date(record.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Record Modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="glass-card w-full max-w-lg p-6 rounded-2xl shadow-2xl border" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex justify-between items-center mb-6 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
                            <h2 className="text-2xl font-bold" style={{ color: 'var(--highlight)' }}>Add New Record</h2>
                            <button onClick={() => setShowNewModal(false)} className="text-2xl leading-none opacity-70 hover:opacity-100">&times;</button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {form.fields.map(field => (
                                <div key={field.id}>
                                    <label className="block text-sm font-bold mb-1">{field.name} {field.is_required && <span className="text-red-400">*</span>}</label>
                                    <input
                                        type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                                        required={field.is_required}
                                        value={newRecordData[field.name] || ''}
                                        onChange={(e) => setNewRecordData({ ...newRecordData, [field.name]: e.target.value })}
                                        className="w-full px-3 py-2 glass-input rounded-lg focus:ring-2 focus:outline-none"
                                        style={{ borderColor: 'var(--border-color)' }}
                                        placeholder={`Enter ${field.name}...`}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="px-4 py-2 rounded-lg opacity-80 hover:opacity-100 transition-colors font-medium border"
                                style={{ borderColor: 'var(--border-color)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveRecord}
                                className="px-6 py-2 rounded-lg font-bold shadow-lg transition-all flex items-center gap-2 text-white"
                                style={{ background: 'var(--highlight)' }}
                            >
                                <Save size={18} /> Save Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataPage;
