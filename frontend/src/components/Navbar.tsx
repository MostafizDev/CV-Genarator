import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { User, Sparkles, Settings, FileText, ClipboardList, Cpu, LogOut, Users } from 'lucide-react';
import { getSettings, getStoredSession, clearStoredSession, AUTH_REQUIRED_EVENT } from '../api/client';

const PROVIDER_LABELS: Record<string, string> = {
  groq: 'Groq',
  openai: 'OpenAI',
  anthropic: 'Claude',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
};

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const session = getStoredSession();

  const navLinks = [
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/new-application', label: 'New Application', icon: Sparkles },
    { to: '/tracker', label: 'Tracker', icon: ClipboardList },
    { to: '/settings', label: 'Settings', icon: Settings },
    ...(session?.is_admin ? [{ to: '/users', label: 'Users', icon: Users }] : []),
  ];

  const handleLogout = () => {
    clearStoredSession();
    window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));
  };

  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        const active = settings.find((s) => s.is_default) || settings[0];
        setActiveProvider(active && active.api_key ? active.provider : null);
      } catch {
        setActiveProvider(null);
      }
    })();
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl text-white shadow-md shadow-sky-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex items-center">
              <span className="text-lg font-bold bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-950 bg-clip-text text-transparent">
                CV Generator
              </span>
              {activeProvider && (
                <Link
                  to="/settings"
                  title="Active AI provider — click to change"
                  className="ml-2 flex items-center space-x-1 text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium rounded-full transition"
                >
                  <Cpu className="w-3 h-3" />
                  <span>{PROVIDER_LABELS[activeProvider] || activeProvider}</span>
                </Link>
              )}
            </div>
          </div>

          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            ))}
            {session && (
              <div className="flex items-center space-x-1.5 pl-2 ml-1 border-l border-slate-200">
                <span className="text-xs font-medium text-slate-500 hidden sm:inline">{session.username}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
