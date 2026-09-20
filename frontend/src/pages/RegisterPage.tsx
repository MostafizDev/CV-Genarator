import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { AuthShell, authInputClass, authPrimaryButtonClass } from '../components/AuthShell';
import { registerAccount } from '../api/client';
import { routes } from '../config/routes';
import { generatePassword } from '../utils/generatePassword';

const MIN_PASSWORD_LENGTH = 8;

export const RegisterPage: React.FC<{ onAuthenticated: () => void }> = ({ onAuthenticated }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setPassword(generatePassword());
    // Reveal it so the user can see (and save) what was generated.
    setShowPassword(true);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the password is visible to copy by hand.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await registerAccount({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
      });
      onAuthenticated();
    } catch (err: any) {
      setError(err.message || 'Could not create your account.');
      setSubmitting(false);
    }
  };

  return (
    <AuthShell subtitle="Create your account." error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="first-name" className="text-xs font-semibold text-slate-600">
              First name
            </label>
            <input
              id="first-name"
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={authInputClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="last-name" className="text-xs font-semibold text-slate-600">
              Last name
            </label>
            <input
              id="last-name"
              type="text"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={authInputClass}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-semibold text-slate-600">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-semibold text-slate-600">
              Password
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center space-x-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Generate password</span>
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-16`}
            />
            <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
              {password && (
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy password"
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            At least {MIN_PASSWORD_LENGTH} characters. If you generate one, save it before continuing.
          </p>
        </div>

        <button type="submit" disabled={submitting} className={authPrimaryButtonClass}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{submitting ? 'Creating account...' : 'Create account'}</span>
        </button>
      </form>

      <p className="text-center text-xs text-slate-500">
        Already have an account?{' '}
        <Link to={routes.login} className="font-semibold text-blue-700 hover:text-blue-900">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};
