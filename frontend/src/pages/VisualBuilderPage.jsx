import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { Type, Hash, Calendar, Upload, CheckSquare, Image as ImageIcon, Plus, Save, CheckCircle } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Available field types to drag
const FIELD_TYPES = [
    { id: 'text', label: 'Text Field', icon: Type, bg: 'bg-blue-100', color: 'text-blue-700' },
    { id: 'number', label: 'Number', icon: Hash, bg: 'bg-green-100', color: 'text-green-700' },
    { id: 'date', label: 'Date', icon: Calendar, bg: 'bg-purple-100', color: 'text-purple-700' },
    { id: 'checkbox', label: 'Checkbox', icon: CheckSquare, bg: 'bg-yellow-100', color: 'text-yellow-800' },
    { id: 'file', label: 'File Upload', icon: Upload, bg: 'bg-gray-100', color: 'text-gray-700' },
    { id: 'image', label: 'Image', icon: ImageIcon, bg: 'bg-pink-100', color: 'text-pink-700' },
];

const DraggableTool = ({ tool }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'field',
        item: { type: tool.id, label: tool.label },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const Icon = tool.icon;

    return (
        <div
            ref={drag}
            className={`p-3 mb-3 rounded-lg border cursor-grab flex items-center gap-3 transition-all field-type-tool ${isDragging ? 'opacity-50 border-dashed' : 'bg-white hover:border-primary hover:shadow-sm'}`}
        >
            <div className={`p-2 rounded-md ${tool.bg} ${tool.color}`}>
                <Icon size={18} />
            </div>
            <span className="font-medium text-sm builder-field-label">{tool.label}</span>
        </div>
    );
};

const FormCanvas = ({ fields, onDrop, onUpdateField, onRemoveField }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'field',
        drop: (item) => onDrop(item),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    return (
        <div
            ref={drop}
            className={`flex-1 glass-card rounded-xl border-2 min-h-[500px] p-6 transition-colors ${isOver ? 'border-violet-400 border-dashed bg-violet-500/10' : ''}`}
            style={{ borderColor: 'var(--border-color)' }}
        >
            {fields.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-80">
                    <Plus size={48} className="mb-4" style={{ color: 'var(--highlight)' }} />
                    <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Drag fields here to build your form</p>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Create custom tracking tables for Customers, Orders, etc.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-4 glass-panel border border-white/40 rounded-lg group relative">
                            <button
                                onClick={() => onRemoveField(field.id)}
                                className="absolute right-3 top-3 text-red-500 hover:text-red-700 hidden group-hover:block transition-colors"
                            >
                                &times;
                            </button>
                            <div className="flex gap-4">
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Field Name</label>
                                    <input
                                        type="text"
                                        value={field.name}
                                        onChange={(e) => onUpdateField(field.id, 'name', e.target.value)}
                                        className="w-full px-3 py-2 glass-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        style={{ color: 'var(--text-primary)' }}
                                        placeholder="e.g. Customer Name"
                                    />
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Preview</label>
                                    <div className="px-3 py-2 rounded-md text-sm" style={{ background: 'var(--highlight-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                                        {field.type === 'file' || field.type === 'image' ? (
                                            <div className="flex items-center gap-2 cursor-pointer text-blue-800 font-medium">
                                                <Upload size={14} /> Click to Upload {field.type === 'image' ? 'Image' : 'File'}...
                                            </div>
                                        ) : field.type === 'text' ? (
                                            <span className="text-gray-500 italic">Text Input...</span>
                                        ) : field.type === 'number' ? (
                                            <span className="text-gray-500 italic">123...</span>
                                        ) : field.type === 'date' ? (
                                            <span className="text-gray-500 italic">DD/MM/YYYY</span>
                                        ) : field.type === 'checkbox' ? (
                                            <div className="flex items-center gap-2 text-gray-500 italic">
                                                <input type="checkbox" disabled /> Checkbox
                                            </div>
                                        ) : (
                                            <span className="capitalize">{field.type}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-1/3 flex items-center pt-5">
                                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded border" style={{ background: 'var(--highlight-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => onUpdateField(field.id, 'required', e.target.checked)}
                                            className="rounded text-violet-600 focus:ring-violet-500 h-4 w-4"
                                        />
                                        <span className="text-sm font-bold">Required Field</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const VisualBuilderPage = ({ user }) => {
    const showToast = useToast();
    const [formName, setFormName] = useState('Untitled App');
    const [fields, setFields] = useState([]);
    const [showSavedToast, setShowSavedToast] = useState(false);

    const handleDrop = (item) => {
        const newField = {
            id: Date.now().toString(),
            type: item.type,
            name: `New ${item.label}`,
            required: false,
        };
        setFields((prev) => [...prev, newField]);
    };

    const handleUpdateField = (id, key, value) => {
        setFields((prev) => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const handleRemoveField = (id) => {
        setFields((prev) => prev.filter(f => f.id !== id));
    };

    const handleSave = async () => {
        try {
            const response = await fetch('/api/forms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formName,
                    user_id: user?.email || 'demo@example.com',
                    fields: fields.map(f => ({ name: f.name, field_type: f.type, is_required: f.required }))
                })
            });
            if (response.ok) {
                setShowSavedToast(true);
                setTimeout(() => setShowSavedToast(false), 3000);
            } else {
                showToast('Failed to save. Ensure the Flask backend is active.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Server unreachable. Ensure the Flask backend is running.', 'error');
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="p-8 h-full flex flex-col relative">
                {showSavedToast && (
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-[fadeInDown_0.3s_ease-out] z-50 border text-white"
                        style={{ background: 'var(--highlight)' }}
                    >
                        <CheckCircle size={20} />
                        <span className="font-bold">Successfully saved Custom App: {formName}!</span>
                    </div>
                )}
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="text-4xl font-extrabold drop-shadow-sm bg-transparent border-b-2 border-transparent hover:border-violet-500/50 focus:border-violet-500 focus:outline-none transition-all px-0 py-1 mb-2 w-full builder-title"
                            style={{ color: 'var(--text-primary)' }}
                        />
                        <p className="opacity-90 font-medium text-lg mt-2 builder-label builder-page-label">Design your custom database tables visually.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2 font-medium text-white"
                    >
                        <Save size={18} />
                        Save App Structure
                    </button>
                </div>

                <div className="flex gap-8 flex-1">
                    {/* Toolbox Sidebar */}
                    <div className="w-64 glass-panel border border-white/10 rounded-xl p-4 shadow-lg flex flex-col">
                        <h3 className="font-bold mb-4 px-2 uppercase text-xs tracking-wider drop-shadow-sm builder-label builder-page-label">Field Types</h3>
                        <div className="flex-1 overflow-y-auto pr-2">
                            {FIELD_TYPES.map(tool => (
                                <DraggableTool key={tool.id} tool={tool} />
                            ))}
                        </div>
                    </div>

                    {/* Droppable Canvas */}
                    <FormCanvas
                        fields={fields}
                        onDrop={handleDrop}
                        onUpdateField={handleUpdateField}
                        onRemoveField={handleRemoveField}
                    />
                </div>
            </div>
        </DndProvider>
    );
};

export default VisualBuilderPage;
