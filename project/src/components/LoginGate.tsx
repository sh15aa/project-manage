import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Boxes, ArrowRight, AlertCircle, Shield, Sparkles } from 'lucide-react';

interface LoginGateProps {
  onSuccess: () => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if an idea from Finder is pending import
  const pendingIdea = (() => {
    try {
      const stored = sessionStorage.getItem('pending_finder_import');
      if (stored) return JSON.parse(stored);
      const params = new URLSearchParams(window.location.search);
      const name = params.get('name');
      if (name) return { name, tag: params.get('tag') };
    } catch {}
    return null;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Required credentials: username: sh15a, password: sndSND1!
    if (username.trim() === 'sh15a' && password === 'sndSND1!') {
      setLoading(true);
      localStorage.setItem('producthub_auth', 'true');
      localStorage.setItem('producthub_user', 'sh15a');
      sessionStorage.setItem('producthub_auth', 'true');
      sessionStorage.setItem('producthub_user', 'sh15a');
      onSuccess();
    } else {
      setError('Invalid username or password. Access denied.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 px-4 py-6 overflow-y-auto">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl my-auto">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/25">
            <Boxes className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-white">Product Hub</h1>
          <p className="mt-1 text-xs text-slate-400">Master Launch OS &bull; 95 Projects</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-[11px] font-medium text-slate-300">
            <Shield className="h-3 w-3 text-cyan-400" />
            Protected Workspace
          </div>
        </div>

        {/* Incoming idea notification banner */}
        {pendingIdea?.name && (
          <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-left shadow-lg shadow-emerald-950/30 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>Incoming Idea from Finder</span>
            </div>
            <p className="mt-1 text-sm font-bold text-white truncate">
              {pendingIdea.name}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-300 leading-relaxed">
              Unlock your workspace below to review and import this idea into your 95 projects pipeline.
            </p>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Username
            </label>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2.5 pr-10 text-base sm:text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-slate-400" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition-all hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <span>Unlock Access</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          Authorized personnel only &bull; Credentials required
        </p>
      </div>
    </div>
  );
};
