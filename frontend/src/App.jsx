import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Home, LayoutDashboard, Component, GitBranch, LogOut, User, ShoppingCart, Package, Sun, Moon, Mail, Megaphone } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

import DashboardPage from './pages/DashboardPage';
import VisualBuilderPage from './pages/VisualBuilderPage';
import WorkflowPage from './pages/WorkflowPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DataPage from './pages/DataPage';
import ProductsPage from './pages/ProductsPage';
import ActiveOrdersPage from './pages/ActiveOrdersPage';
import CustomerStorePage from './pages/CustomerStorePage';
import AnnouncementsPage from './pages/AnnouncementsPage';

function MainApp({ user }) {
  const { isDark, toggleTheme } = useTheme();
  const [accountOpen, setAccountOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [appPassword, setAppPassword] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const navLinkClass = "flex items-center px-6 py-3 font-medium hover:bg-violet-600/40 hover:text-white rounded-lg mx-2 transition-all sidebar-nav-link";

  const handleSaveAppPassword = async () => {
    try {
      const res = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.email, sender_password: appPassword || undefined }),
      });
      if (res.ok) {
        setEmailSaved(true);
        setTimeout(() => { setShowEmailModal(false); setEmailSaved(false); setAppPassword(''); }, 1200);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-screen overflow-hidden p-4 gap-6 animate-[fadeInUp_0.6s_ease-out] bg-transparent w-full max-w-[1600px] mx-auto">
      {/* Sidebar - Floating Capsule */}
      <div
        className="w-64 rounded-3xl shadow-2xl flex flex-col border flex-shrink-0 sidebar-container backdrop-blur-xl relative overflow-hidden"
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'rgba(167, 139, 250, 0.3)',
        }}
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
        <div className="p-6 border-b" style={{ borderColor: 'rgba(167, 139, 250, 0.2)' }}>
          <h1 className="text-2xl font-bold flex items-center gap-2 drop-shadow-md sidebar-theme-text" style={{ color: 'inherit' }}>
            Taskmint
          </h1>
        </div>
        <nav className="mt-4 flex-1 space-y-1">
          <Link to="/" className={navLinkClass}>
            <Home className="w-5 h-5 mr-3" /> Home
          </Link>
          <Link to="/dashboard" className={navLinkClass}>
            <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
          </Link>
          <Link to="/products" className={navLinkClass}>
            <Package className="w-5 h-5 mr-3" /> Products
          </Link>
          <Link to="/orders" className={navLinkClass}>
            <ShoppingCart className="w-5 h-5 mr-3" /> Orders
          </Link>
          <Link to="/builder" className={navLinkClass}>
            <Component className="w-5 h-5 mr-3" /> Database Builder
          </Link>
          <Link to="/workflows" className={navLinkClass}>
            <GitBranch className="w-5 h-5 mr-3" /> Automations
          </Link>
          <Link to="/announcements" className={navLinkClass}>
            <Megaphone className="w-5 h-5 mr-3" /> Announcements
          </Link>
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'rgba(167, 139, 250, 0.2)' }}>
          <button
            onClick={() => setAccountOpen((o) => !o)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <div className="p-2 rounded-full sidebar-user-icon" style={{ background: 'rgba(167, 139, 250, 0.2)' }}>
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold truncate sidebar-theme-text" style={{ color: 'inherit' }}>{user.name}</p>
              <p className="text-xs truncate opacity-80 sidebar-theme-text" style={{ color: 'inherit' }}>{user.email}</p>
            </div>
            <span className="sidebar-theme-text text-xs">{accountOpen ? '▼' : '▶'}</span>
          </button>
          {accountOpen && (
            <div className="mt-2 space-y-1 pl-2">
              <button
                onClick={() => { setShowEmailModal(true); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors sidebar-theme-btn"
                style={{ background: 'rgba(167, 139, 250, 0.2)' }}
              >
                <Mail size={18} />
                <span className="sidebar-theme-text">Gmail for Orders</span>
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('taskmint_user');
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors border border-red-500/30 text-red-300 hover:bg-red-500/20"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg mb-1 transition-colors sidebar-theme-btn"
            style={{ background: 'rgba(167, 139, 250, 0.2)' }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span className="sidebar-theme-text">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowEmailModal(false)}>
          <div className="glass-card max-w-md w-full p-6 rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--highlight)' }}>Order Emails (Gmail)</h3>
            <p className="text-sm opacity-80 mb-4">Emails are sent from <strong>{user?.email}</strong>. Add a Gmail App Password so order notifications work.</p>
            <input
              type="password"
              placeholder="16-char Gmail App Password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              className="w-full px-4 py-3 glass-input rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowEmailModal(false)} className="flex-1 py-2 rounded-lg border">Cancel</button>
              <button onClick={handleSaveAppPassword} className="flex-1 py-2 rounded-lg text-white" style={{ background: 'var(--highlight)' }}>
                {emailSaved ? 'Saved!' : 'Save'}
              </button>
            </div>
            <p className="text-xs mt-3 opacity-70">Get one at: Google Account → Security → 2-Step Verification → App passwords</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 rounded-3xl shadow-[0_0_40px_rgba(139,92,246,0.15)] overflow-hidden border relative flex flex-col animate-[zoomInCenter_0.6s_ease-out_forwards]" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-0"></div>
        <div className="relative z-10 flex-1 overflow-auto h-full w-full">
          <Routes>
            <Route path="/" element={<HomePage user={user} />} />
            <Route path="/dashboard" element={<DashboardPage user={user} />} />
            <Route path="/products" element={<ProductsPage user={user} />} />
            <Route path="/orders" element={<ActiveOrdersPage user={user} />} />
            <Route path="/data/:formId" element={<DataPage user={user} />} />
            <Route path="/builder" element={<VisualBuilderPage user={user} />} />
            <Route path="/workflows" element={<WorkflowPage user={user} />} />
            <Route path="/announcements" element={<AnnouncementsPage user={user} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('taskmint_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('taskmint_user', JSON.stringify(userData));
  };

  return (
    <Router>
      <Routes>
        <Route path="/store" element={<CustomerStorePage />} />
        <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" replace />} />
        <Route path="*" element={user ? <MainApp user={user} /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
