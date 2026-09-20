import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Key,
  Globe,
  UploadCloud,
  Check,
  Zap,
} from 'lucide-react';
import {
  getTursoConfig,
  saveTursoConfig,
  clearTursoConfig,
  testTursoConnection,
  seedAll96ProductsToTurso,
} from '@/lib/turso';

interface TursoConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const TursoConfigModal: React.FC<TursoConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [url, setUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getTursoConfig();
      setUrl(current.url);
      setAuthToken(current.authToken);
      setTestResult(null);
      setSeedResult(null);
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleTest() {
    if (!url.trim()) {
      setTestResult({ success: false, message: 'Please enter a Turso database URL.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const res = await testTursoConnection(url, authToken);
    setTesting(false);
    if (res.success) {
      setTestResult({ success: true, message: 'Connection successful! Turso database is reachable.' });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Connection failed. Please check your URL and Auth Token.',
      });
    }
  }

  function handleSave() {
    saveTursoConfig(url, authToken);
    setIsSaved(true);
    onConfigSaved();
    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  }

  function handleDisconnect() {
    clearTursoConfig();
    setUrl('');
    setAuthToken('');
    setTestResult(null);
    setSeedResult(null);
    onConfigSaved();
  }

  async function handleSeed() {
    // Automatically save config first if entered
    if (url.trim()) {
      saveTursoConfig(url, authToken);
    }
    setSeeding(true);
    setSeedResult(null);
    const res = await seedAll96ProductsToTurso(true);
    setSeeding(false);
    if (res.success) {
      setSeedResult({
        success: true,
        message: res.message || 'All 96 products and their states are synced to Turso!',
      });
      onConfigSaved();
    } else {
      setSeedResult({
        success: false,
        message: res.message || 'Failed to seed products. Verify database connection.',
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Turso Database Connection</h2>
              <p className="text-xs text-slate-400">Store and manage all 96 products & states in Turso (libSQL)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Quick Guide */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 text-xs text-slate-300">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                How to get Turso credentials:
              </span>
              <a
                href="https://turso.tech"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-[11px]"
              >
                turso.tech <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-slate-400 mb-2 leading-relaxed">
              Create a free Turso database via Turso CLI or dashboard:
            </p>
            <div className="space-y-1 font-mono text-[11px] bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 text-cyan-300">
              <div>$ turso db create project-manage</div>
              <div>$ turso db show project-manage --url</div>
              <div>$ turso db tokens create project-manage</div>
            </div>
          </div>

          {/* Database URL Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-cyan-400" />
                Database URL (libsql:// or https://)
              </span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. libsql://project-manage-yourname.turso.io"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono text-xs"
            />
          </div>

          {/* Auth Token Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-cyan-400" />
                Database Auth Token
              </span>
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="eyJhbGciOiJFZERTQ..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono text-xs"
            />
          </div>

          {/* Test & Seed Feedback */}
          {testResult && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                testResult.success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {seedResult && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                seedResult.success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
            >
              {seedResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <span>{seedResult.message}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !url}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span>Test Connection</span>
            </button>

            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding || !url}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
            >
              {seeding ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span>Seed 96 Products to Turso</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {url && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="rounded-xl px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Disconnect
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/20 hover:from-cyan-500 hover:to-blue-500 transition-all active:scale-[0.98]"
            >
              {isSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Configuration</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
