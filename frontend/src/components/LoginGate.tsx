import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { Link, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import {
  syncSession,
  getCurrentUser,
  loginWithPassword,
  hasLocalToken,
  AUTH_REQUIRED_EVENT,
} from '../api/client';
import { AuthShell, authInputClass, authPrimaryButtonClass } from './AuthShell';
import { RegisterPage } from '../pages/RegisterPage';

type Status = 'checking' | 'authed' | 'locked';

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>('checking');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Email/password accounts keep a backend-issued token; validate it on load.
    if (!hasLocalToken()) return;
    getCurrentUser()
      .then(() => setStatus('authed'))
      .catch((err) => {
        setError(err.message || 'Failed to reach the server.');
        setStatus('locked');
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // A local session is handled by the effect above, not by Firebase state.
      if (hasLocalToken()) return;
      if (!user) {
        setStatus('locked');
        return;
      }
      try {
        await syncSession();
        setStatus('authed');
      } catch (err: any) {
        setError(err.message || 'Failed to sync your account with the server.');
        setStatus('locked');
      }
    });

    const handleAuthRequired = () => setStatus('locked');
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => {
      unsubscribe();
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged above picks up the signed-in user and runs syncSession().
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loginWithPassword(email.trim(), password);
      setStatus('authed');
    } catch (err: any) {
      setError(err.message || 'Could not sign in. Please try again.');
      setSubmitting(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage onAuthenticated={() => setStatus('authed')} />} />
        <Route
          path="*"
          element={
            <AuthShell subtitle="Sign in to continue." error={error}>
              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="login-email" className="text-xs font-semibold text-slate-600">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={authInputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="login-password" className="text-xs font-semibold text-slate-600">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={authInputClass}
                  />
                </div>
                <button type="submit" disabled={submitting} className={authPrimaryButtonClass}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
                </button>
              </form>

              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <div className="flex-1 h-px bg-slate-200" />
                <span>or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="w-full flex items-center justify-center space-x-2.5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg border border-slate-300 shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {signingIn ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
                </button>

              <p className="text-center text-xs text-slate-500">
                New here?{' '}
                <Link to="/register" className="font-semibold text-blue-700 hover:text-blue-900">
                  Create an account
                </Link>
              </p>
            </AuthShell>
          }
        />
      </Routes>
    );
  }

  return <>{children}</>;
};
