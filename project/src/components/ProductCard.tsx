import { ExternalLink, MoreVertical, Check } from 'lucide-react';
import type { ProductWithTasks } from '@/lib/supabase';
import { TagBadge } from './TagBadge';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

interface ProductCardProps {
  product: ProductWithTasks;
  onClick: () => void;
  onStatusChange?: (newStatus: string) => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function ProductCard({
  product,
  onClick,
  onStatusChange,
  selected = false,
  onToggleSelect,
}: ProductCardProps) {
  const doneCount = product.tasks.filter((t) => t.status === 'done' || t.done).length;
  const notRequiredCount = product.tasks.filter((t) => t.status === 'not_required').length;
  const totalCount = product.tasks.length;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 cursor-pointer ${
        selected
          ? 'border-cyan-500 bg-slate-800/80 ring-1 ring-cyan-500/50'
          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/60'
      }`}
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {onToggleSelect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                  selected
                    ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                    : 'border-slate-600 bg-slate-800/80 hover:border-slate-400 group-hover:border-slate-500'
                }`}
                title={selected ? 'Deselect project' : 'Select project'}
              >
                {selected && <Check className="h-3 w-3 stroke-[3]" />}
              </button>
            )}
            <h3 className="font-semibold text-slate-100 transition-colors group-hover:text-white truncate">
              {product.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="rounded-md p-1 text-slate-500 opacity-0 transition-opacity hover:bg-slate-700/50 hover:text-slate-300 group-hover:opacity-100 shrink-0"
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

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TagBadge tag={product.tag} />
          <StatusBadge
            status={product.status}
            onChange={onStatusChange}
          />
        </div>
      </div>

      <div className="pt-2">
        {totalCount > 0 && (
          <div className="mb-2">
            <ProgressBar done={doneCount} total={totalCount} notRequired={notRequiredCount} />
          </div>
        )}

        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{product.url.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
      </div>
    </div>
  );
}
