import React, { useState } from 'react';
import { Send, Clock } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AnnouncementsPage = ({ user }) => {
  const showToast = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [sending, setSending] = useState(false);

  const sendAnnouncement = async () => {
    if (!message.trim()) {
      showToast('Message is required', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/announcements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.email,
          subject: subject || 'Announcement',
          message,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Announcement sent to ${data.sent} customers.`);
        setSubject('');
        setMessage('');
        setScheduleAt('');
      } else {
        showToast(data.error || 'Failed to send announcement', 'error');
      }
    } catch (e) {
      showToast('Network error while sending announcement', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = () => {
    if (!scheduleAt) {
      showToast('Pick a schedule time', 'error');
      return;
    }
    const when = new Date(scheduleAt);
    const delay = when.getTime() - Date.now();
    if (delay <= 0) {
      sendAnnouncement();
      return;
    }
    showToast('Announcement scheduled. Keep this tab open.', 'info');
    setTimeout(sendAnnouncement, delay);
  };

  return (
    <div className="p-8 h-full max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold mb-2" style={{ color: 'var(--highlight)' }}>Announcements</h1>
        <p className="opacity-80">
          Send an update to all customers who have placed an order.
        </p>
      </div>
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2 glass-input rounded-lg"
            placeholder="e.g. New products this week"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 glass-input rounded-lg min-h-[140px]"
            placeholder="Write your announcement..."
          />
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-medium mb-1">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="w-full px-4 py-2 glass-input rounded-lg"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              disabled={sending}
              onClick={sendAnnouncement}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-violet-950 hover:bg-violet-900 border border-violet-800 disabled:opacity-50"
            >
              <Send size={18} /> {sending ? 'Sending...' : 'Send now'}
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={handleSchedule}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-violet-950 hover:bg-violet-900 border border-violet-800 disabled:opacity-50"
            >
              <Clock size={18} /> Schedule send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPage;
