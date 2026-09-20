import { useMemo } from 'react';
import { ChevronRight, ChevronLeft, ExternalLink } from 'lucide-react';
import type { ProductWithTasks } from '@/lib/supabase';
import {
  STATUS_LABELS,
  STATUS_DOT_COLORS,
} from '@/lib/supabase';
import { TagBadge } from './TagBadge';
import { StatusBadge } from './StatusBadge';

interface ProductKanbanProps {
  products: ProductWithTasks[];
  onSelectProduct: (product: ProductWithTasks) => void;
  onStatusChange: (productId: string, newStatus: string) => void;
}

const KANBAN_COLUMNS = [
  { key: 'idea', label: 'Idea' },
  { key: 'working', label: 'Working' },
  { key: 'done', label: 'Done' },
  { key: 'deployed', label: 'Deployed' },
  { key: 'other', label: 'Other / Pending' },
] as const;

export function ProductKanban({
  products,
  onSelectProduct,
  onStatusChange,
}: ProductKanbanProps) {
  const grouped = useMemo(() => {
    const map: Record<string, ProductWithTasks[]> = {
      idea: [],
      working: [],
      done: [],
      deployed: [],
      other: [],
    };

    products.forEach((p) => {
      const s = p.status;
      if (s === 'idea') map.idea.push(p);
      else if (s === 'working' || s === 'in-progress') map.working.push(p);
      else if (s === 'done' || s === 'complete') map.done.push(p);
      else if (s === 'deployed' || s === 'hosted') map.deployed.push(p);
      else map.other.push(p);
    });

    return map;
  }, [products]);

  // Status transitions
  const NEXT_STATUS: Record<string, string> = {
    idea: 'working',
    working: 'done',
    done: 'deployed',
  };

  const PREV_STATUS: Record<string, string> = {
    working: 'idea',
    done: 'working',
    deployed: 'done',
  };

  return (
    <div className="space-y-3">
      {/* Mobile Column Jumper Pills */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {KANBAN_COLUMNS.map((col) => {
          const count = grouped[col.key]?.length ?? 0;
          const dot = col.key === 'other' ? 'bg-slate-400' : STATUS_DOT_COLORS[col.key] ?? 'bg-slate-400';
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => {
                const el = document.getElementById(`kanban-col-${col.key}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300 shrink-0 active:bg-slate-800"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              <span>{col.label}</span>
              <span className="rounded bg-slate-800 px-1 py-0.2 text-[10px] tabular-nums font-semibold text-slate-400">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 no-scrollbar touch-scroll md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 md:snap-none">
        {KANBAN_COLUMNS.map((col) => {
          const colProducts = grouped[col.key] ?? [];
          if (col.key === 'other' && colProducts.length === 0) {
            return null; // hide other column if empty
          }

          const dotClass =
            col.key === 'other'
              ? 'bg-slate-400'
              : STATUS_DOT_COLORS[col.key] ?? 'bg-slate-400';

          return (
            <div
              key={col.key}
              id={`kanban-col-${col.key}`}
              className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 min-h-[480px] w-[85vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink"
            >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-slate-800/20">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                <h3 className="text-sm font-semibold text-slate-200">
                  {col.label}
                </h3>
              </div>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-400">
                {colProducts.length}
              </span>
            </div>

            {/* Column Body */}
            <div className="flex-1 space-y-2.5 p-3 overflow-y-auto max-h-[calc(100vh-280px)]">
              {colProducts.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 text-xs text-slate-600">
                  No projects in this stage
                </div>
              ) : (
                colProducts.map((product) => {
                  const doneTasks = product.tasks.filter((t) => t.status === 'done' || t.done).length;
                  const notRequiredTasks = product.tasks.filter((t) => t.status === 'not_required').length;
                  const totalTasks = product.tasks.length;
                  const effectiveTasks = Math.max(0, totalTasks - notRequiredTasks);

                  return (
                    <div
                      key={product.id}
                      onClick={() => onSelectProduct(product)}
                      className="group relative cursor-pointer rounded-lg border border-slate-800 bg-slate-800/60 p-3 shadow-sm transition-all hover:border-slate-600 hover:bg-slate-800"
                    >
                      <div className="mb-2">
                        <h4 className="text-sm font-medium text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {product.name}
                        </h4>
                        {product.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                        <TagBadge tag={product.tag} />
                        <StatusBadge
                          status={product.status}
                          onChange={(newStatus) => onStatusChange(product.id, newStatus)}
                        />
                      </div>

                      {totalTasks > 0 && (
                        <div className="mb-2 text-[11px] text-slate-500">
                          {doneTasks}/{effectiveTasks || totalTasks} tasks done
                        </div>
                      )}

                      {/* Card Footer: Quick Move Buttons */}
                      <div
                        className="flex items-center justify-between border-t border-slate-800/60 pt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {PREV_STATUS[product.status] ? (
                          <button
                            type="button"
                            onClick={() =>
                              onStatusChange(product.id, PREV_STATUS[product.status])
                            }
                            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
                            title={`Move to ${STATUS_LABELS[PREV_STATUS[product.status]]}`}
                          >
                            <ChevronLeft className="h-3 w-3" />
                            {STATUS_LABELS[PREV_STATUS[product.status]]}
                          </button>
                        ) : (
                          <div />
                        )}

                        {NEXT_STATUS[product.status] ? (
                          <button
                            type="button"
                            onClick={() =>
                              onStatusChange(product.id, NEXT_STATUS[product.status])
                            }
                            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors"
                            title={`Move to ${STATUS_LABELS[NEXT_STATUS[product.status]]}`}
                          >
                            {STATUS_LABELS[NEXT_STATUS[product.status]]}
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        ) : product.url ? (
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Live
                          </a>
                        ) : (
                          <div />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

