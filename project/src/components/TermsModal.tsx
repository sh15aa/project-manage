import React from 'react';
import { X, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Terms and Conditions</h2>
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
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              1. Acceptance of Terms
            </h3>
            <p>
              By accessing and using Product Hub (Master Launch OS), you agree to be bound by these terms. This platform is designed to assist founders and engineering teams in organizing, tracking, and executing product launch workflows.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white mb-2">
              <ShieldAlert className="h-4 w-4 text-blue-400" />
              2. Acceptable Use
            </h3>
            <p>
              You agree not to use the software to store, manage, or orchestrate unlawful activities, malicious code, or unauthorized distribution of third-party intellectual property.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white mb-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              3. Intellectual Property
            </h3>
            <p>
              You retain all rights, title, and ownership of your product ideas, checklists, proprietary roadmaps, and code definitions managed within Product Hub.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white mb-2">
              <ShieldAlert className="h-4 w-4 text-blue-400" />
              4. Disclaimer of Warranties
            </h3>
            <p>
              Product Hub and its Master Checklists are provided "as is" without warranty of any kind. While the checklist provides thorough guidance, compliance and regulatory verification remain the responsibility of the product owner.
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
