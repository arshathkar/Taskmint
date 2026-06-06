import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const WorkflowPage = ({ user }) => {
  const showToast = useToast();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.email || 'demo@user.com';

  const fetchWorkflows = async () => {
    try {
      const res = await fetch(`/api/automations?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [userId]);

  const addWorkflow = () => {
    const newWf = {
      id: 'new-' + Date.now(),
      name: 'New Automation',
      trigger_model: 'Inventory',
      condition_field: 'Stock Level',
      condition_operator: '<',
      condition_value: '10',
      action_type: 'Send WhatsApp',
      action_target: '',
      action_config: '{"phone": "", "manager_email": ""}',
      is_active: true,
    };
    setWorkflows([...workflows, newWf]);
  };

  const removeWorkflow = async (id) => {
    if (id.toString().startsWith('new-')) {
      setWorkflows(workflows.filter((wf) => wf.id !== id));
      return;
    }
    try {
      const res = await fetch(`/api/automations/${id}?user_id=${userId}`, { method: 'DELETE' });
      if (res.ok) fetchWorkflows();
    } catch (e) {
      console.error(e);
    }
  };

  const updateWorkflow = (id, field, value) => {
    setWorkflows(workflows.map((wf) => (wf.id === id ? { ...wf, [field]: value } : wf)));
  };

  const getConfig = (wf) => {
    try {
      return typeof wf.action_config === 'string' ? JSON.parse(wf.action_config || '{}') : (wf.action_config || {});
    } catch {
      return {};
    }
  };

  const setConfig = (id, key, value) => {
    setWorkflows(
      workflows.map((wf) => {
        if (wf.id !== id) return wf;
        const cfg = getConfig(wf);
        cfg[key] = value;
        return { ...wf, action_config: JSON.stringify(cfg) };
      })
    );
  };

  const handleSave = async () => {
    for (const wf of workflows) {
      const body = {
        user_id: userId,
        name: wf.name,
        trigger_model: wf.trigger_model,
        condition_field: wf.condition_field,
        condition_operator: wf.condition_operator,
        condition_value: String(wf.condition_value),
        action_type: wf.action_type,
        action_target: wf.action_target,
        action_config: getConfig(wf),
        is_active: (wf.is_active ?? wf.isActive) !== false,
      };
      if (wf.id.toString().startsWith('new-')) {
        await fetch('/api/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`/api/automations/${wf.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
    }
    fetchWorkflows();
    showToast('Automations saved!');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ color: 'var(--highlight)' }}>Automations</h1>
          <p className="opacity-80">Create IF-THEN rules. E.g. when stock is low, send WhatsApp to manager.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white"
          style={{ background: 'var(--highlight)' }}
        >
          <Save size={18} /> Save All
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="glass-panel p-6 rounded-xl relative group">
              <button
                onClick={() => removeWorkflow(wf.id)}
                className="absolute right-4 top-4 opacity-60 hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={20} />
              </button>

              <div className="mb-6">
                <input
                  type="text"
                  value={wf.name}
                  onChange={(e) => updateWorkflow(wf.id, 'name', e.target.value)}
                  placeholder="Automation Name"
                  className="text-lg font-bold bg-transparent border-b border-transparent hover:border-violet-500/50 focus:border-violet-500 focus:outline-none px-0 py-1 min-w-[300px] w-full"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 flex-wrap pb-2">
                <div className="flex items-center gap-3 p-4 rounded-lg flex-1 min-w-[320px] glass-input" style={{ background: 'var(--highlight-bg)' }}>
                  <span className="font-bold px-3 py-1 rounded" style={{ background: 'var(--highlight)', color: 'white' }}>IF</span>
                  <div className="flex gap-2 flex-1 flex-wrap">
                    <select
                      value={wf.trigger_model}
                      onChange={(e) => updateWorkflow(wf.id, 'trigger_model', e.target.value)}
                      className="border rounded p-2 text-sm flex-1 min-w-[100px] border-gray-300"
                      style={{ backgroundColor: '#fff', color: '#1a1a1a', appearance: 'auto' }}
                    >
                      <option value="Inventory">Inventory</option>
                      <option value="Orders">Orders</option>
                    </select>
                    <select
                      value={wf.condition_field}
                      onChange={(e) => updateWorkflow(wf.id, 'condition_field', e.target.value)}
                      className="border rounded p-2 text-sm flex-1 min-w-[100px] border-gray-300"
                      style={{ backgroundColor: '#fff', color: '#1a1a1a', appearance: 'auto' }}
                    >
                      <option value="Stock Level">Stock Level</option>
                      <option value="Total Amount">Total Amount</option>
                      <option value="Status">Status</option>
                    </select>
                    <select
                      value={wf.condition_operator}
                      onChange={(e) => updateWorkflow(wf.id, 'condition_operator', e.target.value)}
                      className="border rounded p-2 text-sm w-16 border-gray-300"
                      style={{ backgroundColor: '#fff', color: '#1a1a1a', appearance: 'auto' }}
                    >
                      <option value="==">==</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                    </select>
                    <input
                      type="text"
                      value={wf.condition_value}
                      onChange={(e) => updateWorkflow(wf.id, 'condition_value', e.target.value)}
                      placeholder="Value"
                      className="border rounded p-2 text-sm w-24 min-w-[5rem] bg-white/80 dark:bg-black/20"
                    />
                  </div>
                </div>

                <ArrowRight className="hidden lg:block flex-shrink-0 opacity-50" />

                <div className="flex items-center gap-3 p-4 rounded-lg flex-1 min-w-[320px] glass-input" style={{ background: 'var(--highlight-bg)' }}>
                  <span className="font-bold px-3 py-1 rounded bg-green-600/80 text-white">THEN</span>
                  <div className="flex gap-2 flex-1 flex-wrap">
                    <select
                      value={wf.action_type}
                      onChange={(e) => updateWorkflow(wf.id, 'action_type', e.target.value)}
                      className="border rounded p-2 text-sm flex-1 min-w-[120px] border-gray-300"
                      style={{ backgroundColor: '#fff', color: '#1a1a1a', appearance: 'auto' }}
                    >
                      <option value="Send WhatsApp">Send WhatsApp</option>
                      <option value="Send SMS">Send SMS</option>
                      <option value="Send Email">Send Email</option>
                      <option value="Create Task">Create Task</option>
                    </select>
                    {wf.action_type === 'Send WhatsApp' && (
                      <input
                        type="text"
                        placeholder="Manager phone (e.g. 919876543210)"
                        value={getConfig(wf).phone || ''}
                        onChange={(e) => setConfig(wf.id, 'phone', e.target.value)}
                        className="border rounded p-2 text-sm flex-1 min-w-[150px] bg-white/80 dark:bg-black/20"
                      />
                    )}
                    {wf.action_type === 'Send Email' && (
                      <input
                        type="email"
                        placeholder="Manager email (e.g. manager@example.com)"
                        value={getConfig(wf).manager_email || ''}
                        onChange={(e) => setConfig(wf.id, 'manager_email', e.target.value)}
                        className="border rounded p-2 text-sm flex-1 min-w-[150px] bg-white/80 dark:bg-black/20"
                      />
                    )}
                    <input
                      type="text"
                      placeholder="Target (optional)"
                      value={wf.action_target || ''}
                      onChange={(e) => updateWorkflow(wf.id, 'action_target', e.target.value)}
                      className="border rounded p-2 text-sm flex-1 min-w-[100px] bg-white/80 dark:bg-black/20"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wf.is_active !== false}
                  onChange={(e) => updateWorkflow(wf.id, 'is_active', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          ))}

          <button
            onClick={addWorkflow}
            className="w-full py-4 border-2 border-dashed rounded-xl font-bold flex items-center justify-center gap-2 transition-all opacity-70 hover:opacity-100"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Plus size={20} /> Add New Automation
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkflowPage;
