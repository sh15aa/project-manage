import { ExternalLink, MoreVertical, Check, Sparkles } from 'lucide-react';
import type { ProductWithTasks } from '@/lib/supabase';
import { TagBadge } from './TagBadge';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

interface ProductCardProps {
  product: ProductWithTasks;
  onClick: () => void;
  onStatusChange?: (newStatus: string) => void;
  onOpenPrompt?: (product: ProductWithTasks) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function ProductCard({
  product,
  onClick,
  onStatusChange,
  onOpenPrompt,
  selected = false,
  onToggleSelect,
}: ProductCardProps) {
  const doneCount = product.tasks.filter((t) => t.status === 'done' || t.done).length;
  const notRequiredCount = product.tasks.filter((t) => t.status === 'not_required').length;
  const totalCount = product.tasks.length;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-xl border p-3.5 sm:p-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 cursor-pointer active:scale-[0.98] ${
        selected
          ? 'border-cyan-500 bg-slate-800/90 ring-1 ring-cyan-500/50'
          : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      <div>
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onToggleSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
                className="flex items-center justify-center -m-1 p-1 shrink-0"
                title={selected ? 'Deselect project' : 'Select project'}
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                    selected
                      ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                      : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                  }`}
                >
                  {selected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </button>
            )}
            <h3 className="font-semibold text-sm sm:text-base text-slate-100 transition-colors group-hover:text-cyan-300 truncate">
              {product.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors shrink-0 -mr-1 -mt-0.5"
            title="Open details"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {product.description && (
          <p className="mb-3 line-clamp-2 text-xs text-slate-400 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <TagBadge tag={product.tag} />
          <StatusBadge
            status={product.status}
            onChange={onStatusChange}
          />
        </div>
      </div>

      <div className="pt-1.5 border-t border-slate-800/50 mt-1">
        {doneCount > 0 && totalCount > 0 && (
          <div className="mb-2">
            <ProgressBar done={doneCount} total={totalCount} notRequired={notRequiredCount} />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {product.url ? (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[120px]">Live Preview</span>
            </a>
          ) : (
            <span className="text-[11px] text-slate-600">No preview URL</span>
          )}

          {onOpenPrompt && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPrompt(product);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-colors shadow-sm"
              title="Open Build Guide & AI Prompts for this project"
            >
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span>Build Guide</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
