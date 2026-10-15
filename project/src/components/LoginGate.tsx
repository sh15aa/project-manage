import React, { useState } from 'react';
import { Eye, EyeOff, Boxes, ArrowRight, AlertCircle, Shield, Sparkles } from 'lucide-react';

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
      setError('Invalid credentials. Access denied.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090d] px-4 py-6 overflow-y-auto font-sans selection:bg-white/15 selection:text-white">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-sky-500/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-indigo-500/[0.03] blur-3xl" />

      <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#0c0e14]/90 p-7 sm:p-8 shadow-2xl backdrop-blur-2xl my-auto">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-white shadow-inner-light">
            <Boxes className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-white">Product Hub</h1>
          <p className="mt-0.5 text-xs text-zinc-400">Founder Launch OS &bull; 96 Projects</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400">
            <Shield className="h-3 w-3 text-sky-400" />
            Protected Workspace
          </div>
        </div>

        {/* Incoming idea notification banner */}
        {pendingIdea?.name && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 text-left shadow-lg animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>Incoming Idea from Finder</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-white truncate">
              {pendingIdea.name}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400 leading-relaxed">
              Unlock workspace to review and import into your portfolio.
            </p>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
              Username
            </label>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:bg-white/[0.04] focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:bg-white/[0.04] focus:border-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 py-2.5 text-sm font-semibold text-black transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            ) : (
              <>
                <span>Unlock Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] font-mono text-zinc-500">
          Authorized Founder Session Only
        </p>
      </div>
    </div>
  );
};
