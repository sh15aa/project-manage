import { useMemo } from 'react';
import { ChevronRight, ChevronLeft, ExternalLink, Sparkles } from 'lucide-react';
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
  onOpenPrompt?: (product: ProductWithTasks) => void;
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
  onOpenPrompt,
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
    <div className="space-y-4">
      {/* Mobile Column Jumper Pills */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {KANBAN_COLUMNS.map((col) => {
          const count = grouped[col.key]?.length ?? 0;
          const dot = col.key === 'other' ? 'bg-zinc-400' : STATUS_DOT_COLORS[col.key] ?? 'bg-zinc-400';
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => {
                const el = document.getElementById(`kanban-col-${col.key}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-zinc-300 shrink-0 active:bg-white/[0.08]"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              <span>{col.label}</span>
              <span className="rounded-full bg-white/[0.06] px-1.5 py-0.2 text-[10px] tabular-nums font-mono text-zinc-400">
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
              ? 'bg-zinc-400'
              : STATUS_DOT_COLORS[col.key] ?? 'bg-zinc-400';

          return (
            <div
              key={col.key}
              id={`kanban-col-${col.key}`}
              className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#0c0e14]/50 shadow-xl backdrop-blur-md min-h-[500px] w-[85vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                  <h3 className="text-sm font-semibold text-zinc-200 tracking-tight">
                    {col.label}
                  </h3>
                </div>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-mono tabular-nums text-zinc-400">
                  {colProducts.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="flex-1 space-y-3 p-3 overflow-y-auto max-h-[calc(100vh-280px)]">
                {colProducts.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] text-xs text-zinc-600">
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
                        className="group relative cursor-pointer rounded-xl border border-white/[0.06] bg-[#10141d]/70 p-3.5 shadow-sm transition-all hover:border-white/[0.14] hover:bg-[#141924]/90 hover:shadow-lg"
                      >
                        <div className="mb-2">
                          <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-1 tracking-tight">
                            {product.name}
                          </h4>
                          {product.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-400 leading-relaxed">
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

                        <div className="mb-2.5 flex items-center justify-between gap-1">
                          {totalTasks > 0 ? (
                            <span className="text-[11px] font-mono text-zinc-500">
                              {doneTasks}/{effectiveTasks || totalTasks} tasks
                            </span>
                          ) : <span />}

                          {onOpenPrompt && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPrompt(product);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                              title="Build Guide & AI Prompts"
                            >
                              <Sparkles className="h-2.5 w-2.5 text-sky-400" />
                              <span>Guide</span>
                            </button>
                          )}
                        </div>

                        {/* Card Footer: Quick Move Buttons */}
                        <div
                          className="flex items-center justify-between border-t border-white/[0.05] pt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {PREV_STATUS[product.status] ? (
                            <button
                              type="button"
                              onClick={() =>
                                onStatusChange(product.id, PREV_STATUS[product.status])
                              }
                              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
                              title={`Move to ${STATUS_LABELS[PREV_STATUS[product.status]]}`}
                            >
                              <ChevronLeft className="h-3 w-3" />
                              <span>{STATUS_LABELS[PREV_STATUS[product.status]]}</span>
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
                              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 transition-colors"
                              title={`Move to ${STATUS_LABELS[NEXT_STATUS[product.status]]}`}
                            >
                              <span>{STATUS_LABELS[NEXT_STATUS[product.status]]}</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          ) : product.url ? (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
                            >
                              <span>Preview</span>
                              <ExternalLink className="h-2.5 w-2.5" />
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
