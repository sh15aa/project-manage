import { X } from 'lucide-react';
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
    <div className="fixed bottom-20 md:bottom-6 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-full border border-white/[0.12] bg-[#0c0e14]/95 px-4 py-2.5 shadow-2xl shadow-black/80 backdrop-blur-2xl">
        <div className="flex items-center gap-2.5 border-r border-white/[0.08] pr-3.5 shrink-0">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-mono font-bold text-black">
            {selectedCount}
          </div>
          <span className="text-xs font-medium text-zinc-300">
            selected
          </span>
          {selectedCount < totalCount && (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[11px] font-mono text-zinc-400 hover:text-white underline underline-offset-2 ml-1"
            >
              (all {totalCount})
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs text-zinc-500 mr-1 hidden sm:inline">Set:</span>
          {BULK_STATUS_TARGETS.map((target) => {
            const dot = STATUS_DOT_COLORS[target.key] ?? 'bg-zinc-400';
            return (
              <button
                key={target.key}
                type="button"
                onClick={() => onApplyStatus(target.key)}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white active:scale-95 shrink-0"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <span>{target.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClearSelection}
          className="rounded-full p-1 text-zinc-500 hover:bg-white/[0.08] hover:text-white transition-colors shrink-0"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
