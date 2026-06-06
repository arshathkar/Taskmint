import React, { useState } from 'react';
import { Mail, Save } from 'lucide-react';

const SettingsPage = ({ user, onSettingsSaved }) => {
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPassword, setSenderPassword] = useState('');
  const [hasSenderPassword, setHasSenderPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  React.useEffect(() => {
    fetch(`/api/users/settings?user_id=${user?.email}`)
      .then((r) => r.ok ? r.json() : {})
      .then((d) => {
        setSenderEmail(d.sender_email || '');
        setLogoUrl(d.logo_url || '');
        setHasSenderPassword(d.has_sender_password || false);
      })
      .catch(() => { });
  }, [user?.email]);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.email || 'demo@user.com',
          sender_email: senderEmail || undefined,
          sender_password: senderPassword || undefined,
          logo_url: logoUrl || undefined,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (onSettingsSaved && d) onSettingsSaved({ logo_url: d.logo_url, sender_email: d.sender_email });
        if (senderPassword) setHasSenderPassword(true);
        setSenderPassword(''); // Clear it from input for safety
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-4xl font-extrabold mb-2" style={{ color: 'var(--highlight)' }}>Email Settings</h1>
      <p className="opacity-80 mb-8">Configure your email to send order notifications (accepted, rejected, shipped, delivered) to customers.</p>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Company Logo URL (for invoice)</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full px-4 py-2 glass-input rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sender Email (Gmail) - for order emails</label>
          <input
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="your@gmail.com"
            className="w-full px-4 py-2 glass-input rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">App Password</label>
          <input
            type="password"
            value={senderPassword}
            onChange={(e) => setSenderPassword(e.target.value)}
            placeholder={hasSenderPassword ? '(Saved - leave blank to keep)' : '16-char app password from Google'}
            className="w-full px-4 py-2 glass-input rounded-lg"
          />
          <p className="text-xs opacity-70 mt-1">Use an App Password from your Google account (not your regular password).</p>
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white"
          style={{ background: 'var(--highlight)' }}
        >
          <Save size={18} /> {saved ? 'Saved!' : 'Save'}
        </button>
      </form>
    </div>
  );
};

export default SettingsPage;
