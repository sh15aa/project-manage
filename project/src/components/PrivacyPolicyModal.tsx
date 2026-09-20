import React from 'react';
import { X, ShieldCheck, Lock, Eye, Database, Server } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Privacy Policy</h2>
              <p className="text-xs text-slate-400">Last updated: September 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-2 text-xs leading-relaxed text-slate-300">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white mb-2">
              <Lock className="h-4 w-4 text-cyan-400" />
              1. Overview & Data Ownership
            </h3>
            <p>
              Product Hub is designed with privacy-first principles. Your project definitions, tasks, architecture documents, and development notes remain strictly under your control. We do not sell, rent, or monetize your product data.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white mb-2">
              <Database className="h-4 w-4 text-cyan-400" />
              2. Data Storage & Turso Database
            </h3>
            <p>
              When connected to Turso (libSQL), project data and task states are encrypted in transit via TLS and stored in your dedicated Turso database instance. No third-party ad trackers or invasive analytics are embedded.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white mb-2">
              <Eye className="h-4 w-4 text-cyan-400" />
              3. Local Storage & Session State
            </h3>
            <p>
              We use browser localStorage and sessionStorage solely to persist your authentication gate status, local preferences, and offline project cache. You can clear this data at any time through your browser settings or by disconnecting the database.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white mb-2">
              <Server className="h-4 w-4 text-cyan-400" />
              4. Data Retention & Deletion
            </h3>
            <p>
              You maintain complete sovereignty over your data. Deleting a product or resetting tasks removes the corresponding records from your database and local cache immediately.
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
