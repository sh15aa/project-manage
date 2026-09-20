import { X, CheckCheck } from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_DOT_COLORS,
} from '@/lib/supabase';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onApplyStatus: (status: string) => void;
}

const BULK_STATUS_TARGETS = [
  { key: 'idea', label: 'Idea' },
  { key: 'working', label: 'Working' },
  { key: 'done', label: 'Done' },
  { key: 'deployed', label: 'Deployed' },
] as const;

export function BulkActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  onApplyStatus,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-xl animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-2.5 sm:px-5 sm:py-3 shadow-2xl shadow-black/60 backdrop-blur-md overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 border-r border-slate-700/80 pr-3 sm:pr-4 shrink-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
            {selectedCount}
          </div>
          <span className="text-xs font-medium text-slate-300">
            selected
          </span>
          {selectedCount < totalCount ? (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[11px] text-cyan-400 hover:underline ml-1"
            >
              (Select all {totalCount})
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Set status:</span>
          {BULK_STATUS_TARGETS.map((target) => {
            const dot = STATUS_DOT_COLORS[target.key] ?? 'bg-slate-400';
            return (
              <button
                key={target.key}
                type="button"
                onClick={() => onApplyStatus(target.key)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-all hover:border-cyan-500 hover:bg-slate-800 active:scale-95"
              >
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                {target.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
