import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Logo } from './landing/Logo';

export const authInputClass =
  'w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition';

export const authPrimaryButtonClass =
  'w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-950 hover:bg-blue-900 active:bg-blue-950 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed';

export const AuthShell: React.FC<{
  subtitle: string;
  error: string | null;
  children: React.ReactNode;
}> = ({ subtitle, error, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
    <div className="w-full max-w-sm bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col items-center text-center space-y-2">
        <h1 className="sr-only">Backedstory</h1>
        <Logo size={40} />
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {children}
    </div>
  </div>
);
