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
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-300 cursor-pointer active:scale-[0.99] ${
        selected
          ? 'border-sky-500/50 bg-sky-950/20 shadow-glow-cyan ring-1 ring-sky-500/30'
          : 'border-white/[0.06] bg-[#0c0e14]/60 hover:border-white/[0.14] hover:bg-[#11141d]/80 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-0.5'
      }`}
    >
      <div>
        <div className="mb-2.5 flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
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
                  className={`flex h-4 w-4 items-center justify-center rounded-md border transition-all duration-150 ${
                    selected
                      ? 'border-sky-400 bg-sky-400 text-black shadow-sm'
                      : 'border-white/20 bg-black/40 hover:border-white/40'
                  }`}
                >
                  {selected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </button>
            )}
            <h3 className="font-semibold text-sm sm:text-[15px] text-zinc-100 transition-colors group-hover:text-white tracking-tight truncate">
              {product.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="rounded-lg p-1 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors shrink-0 -mr-1 -mt-0.5 opacity-60 group-hover:opacity-100"
            title="Open details"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {product.description && (
          <p className="mb-3 line-clamp-2 text-xs text-zinc-400 group-hover:text-zinc-300 leading-relaxed transition-colors">
            {product.description}
          </p>
        )}

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <TagBadge tag={product.tag} />
          <StatusBadge
            status={product.status}
            onChange={onStatusChange}
          />
        </div>
      </div>

      <div className="pt-3 border-t border-white/[0.05] mt-2">
        {doneCount > 0 && totalCount > 0 && (
          <div className="mb-2.5">
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
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors border border-transparent hover:border-white/[0.08]"
            >
              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate max-w-[110px]">Preview</span>
            </a>
          ) : (
            <span className="text-[11px] text-zinc-600 font-mono">unlinked</span>
          )}

          {onOpenPrompt && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPrompt(product);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all shadow-sm"
              title="Open Build Guide & AI Prompts for this project"
            >
              <Sparkles className="h-3 w-3 text-sky-400" />
              <span>Guide</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
