import { useState } from 'react';
import { X, UploadCloud, Sparkles } from 'lucide-react';
import {
  STATUS_OPTIONS,
  STATUS_LABELS,
  TAG_OPTIONS,
  TAG_LABELS,
  importProducts,
  type ProductWithTasks,
} from '@/lib/supabase';

interface ImportProjectsModalProps {
  onClose: () => void;
  onImported: (newProducts: ProductWithTasks[]) => void;
}

const DETECTED_SYSTEM_PROJECTS = [
  'alarm',
  'calculator',
  'chargestop',
  'desi-games-hub',
  'digitalgate',
  'gaintclock',
  'gratefulgarden',
  'gymtimer',
  'habitrpg',
  'kyrosio',
  'leakcheck',
  'learnenglish',
  'lifeheatmap',
  'lifeos',
  'looksmax',
  'mentor',
  'microcrm',
  'mindsetwidget',
  'omnisight',
  'onepunchman',
  'petjournal',
  'portfolio',
  'qrmenu',
  'ramesh',
  'Resumematcher',
  'speak',
  'staticsites',
  'studiobook',
  'timeawareness',
  'todoapp',
  'tripledger',
  '100days',
];

export function ImportProjectsModal({
  onClose,
  onImported,
}: ImportProjectsModalProps) {
  const [text, setText] = useState('');
  const [defaultStatus, setDefaultStatus] = useState('idea');
  const [defaultTag, setDefaultTag] = useState('web-app');
  const [loading, setLoading] = useState(false);

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  function handleLoadDetected() {
    setText(DETECTED_SYSTEM_PROJECTS.join('\n'));
  }

  async function handleImport() {
    if (lines.length === 0) return;
    setLoading(true);

    const items = lines.map((line) => {
      // Support CSV: "Name, Tag, Status, URL, Description"
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        return {
          name: parts[0],
          tag: parts[1] || defaultTag,
          status: parts[2] || defaultStatus,
          url: parts[3] || undefined,
          description: parts[4] || undefined,
        };
      }
      return {
        name: line,
        tag: defaultTag,
        status: defaultStatus,
      };
    });

    const created = await importProducts(items);
    setLoading(false);
    onImported(created);
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Import Projects
              </h2>
              <p className="text-xs text-slate-400">
                Paste project names (one per line) or CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              Project List ({lines.length} detected)
            </label>
            <button
              type="button"
              onClick={handleLoadDetected}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Load detected local projects
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder={`Project Alpha\nProject Beta\nProject Gamma\n...\nor CSV: Name, Tag, Status, URL`}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 p-3 font-mono text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Default Status
              </label>
              <select
                value={defaultStatus}
                onChange={(e) => setDefaultStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Default Category
              </label>
              <select
                value={defaultTag}
                onChange={(e) => setDefaultTag(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
              >
                {TAG_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {TAG_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleImport}
              disabled={lines.length === 0 || loading}
              className="flex-1 rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-40"
            >
              {loading ? 'Importing...' : `Import ${lines.length} Projects`}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
