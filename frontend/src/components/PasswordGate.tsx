import React, { useEffect, useState } from 'react';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { verifyPassword, getStoredPassword, AUTH_REQUIRED_EVENT } from '../api/client';

type Status = 'checking' | 'authed' | 'locked';

export const PasswordGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ok = await verifyPassword(getStoredPassword());
      setStatus(ok ? 'authed' : 'locked');
    })();

    const handleAuthRequired = () => setStatus('locked');
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const ok = await verifyPassword(password);
    if (ok) {
      setStatus('authed');
      setPassword('');
    } else {
      setError('Incorrect password.');
    }
    setSubmitting(false);
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4"
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">CV Generator</h1>
            <p className="text-sm text-slate-500">Enter the app password to continue.</p>
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
          />

          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-sm font-semibold rounded-lg shadow-sm shadow-sky-600/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Checking...' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
};
