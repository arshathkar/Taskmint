import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const LoginPage = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [appPassword, setAppPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const url = isSignUp ? '/api/auth/signup' : '/api/auth/login';
            const body = isSignUp ? { company_name: companyName, email, password, sender_password: appPassword || undefined } : { email, password };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                setIsExiting(true);
                setTimeout(() => {
                    onLogin(data);
                    navigate('/');
                }, 400);
            } else {
                setError(data.error || 'Authentication failed');
            }
        } catch (err) {
            setError('Network error. Ensure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const decoded = jwtDecode(credentialResponse.credential);
            const response = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: decoded.email,
                    name: decoded.name
                })
            });

            const data = await response.json();
            if (response.ok) {
                setIsExiting(true);
                setTimeout(() => {
                    onLogin(data);
                    navigate('/');
                }, 400);
            } else {
                setError('Google authentication failed on server');
            }
        } catch (err) {
            setError('Error processing Google login');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 w-full overflow-hidden relative" style={{ background: 'var(--bg-base)' }}>
            {/* Background glowing orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full mix-blend-screen opacity-10 animate-[glowPulse_8s_infinite] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--highlight) 0%, transparent 70%)' }}></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full mix-blend-screen opacity-10 animate-[glowPulse_10s_infinite_reverse] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--color-primary-light) 0%, transparent 70%)' }}></div>

            <div className={`glass-card relative z-10 w-full max-w-md p-10 rounded-3xl shadow-2xl flex flex-col border border-white/10 dark:border-white/5 backdrop-blur-3xl ${isExiting ? 'animate-[zoomOutLogin_0.5s_ease-in-out_forwards]' : 'animate-[zoomInCenter_0.6s_ease-out_forwards]'}`}>
                <div className="text-center mb-8">
                    <div className="inline-block p-4 rounded-2xl mb-4 bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                        <svg className="w-10 h-10 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--highlight)' }}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
                    <p className="opacity-70 font-medium text-sm">{isSignUp ? 'Start building your futuristic workspace' : 'Enter your portal to Taskmint'}</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-6">
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full px-4 py-3 glass-input rounded-lg"
                                placeholder="e.g. Acme Corp"
                                required={isSignUp}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 glass-input rounded-lg"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 glass-input rounded-lg"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Gmail App Password (optional, for order emails)</label>
                            <input
                                type="password"
                                value={appPassword}
                                onChange={(e) => setAppPassword(e.target.value)}
                                className="w-full px-4 py-3 glass-input rounded-lg"
                                placeholder="16-char app password from Google"
                            />
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-3.5 px-4 mt-6 text-lg tracking-wide rounded-xl disabled:opacity-50 animate-[glowPulse_3s_infinite]"
                    >
                        {loading ? 'Authenticating...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>

                    <p className="text-center text-sm mt-4 opacity-80">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="font-medium underline"
                            style={{ color: 'var(--highlight)' }}
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>
                </form>

                <div className="mt-6 flex items-center">
                    <div className="flex-grow border-t" style={{ borderColor: 'var(--border-color)' }}></div>
                    <span className="flex-shrink-0 mx-4 text-sm opacity-80">Or continue with</span>
                    <div className="flex-grow border-t" style={{ borderColor: 'var(--border-color)' }}></div>
                </div>

                <div className="mt-6 flex justify-center w-full">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google Sign-In Failed')}
                        useOneTap
                        theme="filled_black"
                        shape="pill"
                        size="large"
                    />
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
