import { ExternalLink, Check, Sparkles, MoreHorizontal } from 'lucide-react';
import type { ProductWithTasks } from '@/lib/supabase';
import { TagBadge } from './TagBadge';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

interface ProductTableProps {
  products: ProductWithTasks[];
  onSelectProduct: (product: ProductWithTasks) => void;
  onStatusChange: (productId: string, newStatus: string) => void;
  onOpenPrompt?: (product: ProductWithTasks) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function ProductTable({
  products,
  onSelectProduct,
  onStatusChange,
  onOpenPrompt,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: ProductTableProps) {
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = products.some((p) => selectedIds.has(p.id)) && !allSelected;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0e14]/60 shadow-xl backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[11px] uppercase tracking-wider font-semibold text-zinc-500">
            <tr>
              <th className="w-10 px-4 py-3.5 text-center">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className={`flex h-4 w-4 items-center justify-center rounded-md border transition-colors ${
                    allSelected
                      ? 'border-sky-400 bg-sky-400 text-black shadow-sm'
                      : someSelected
                      ? 'border-sky-400/60 bg-sky-400/20 text-sky-300'
                      : 'border-white/20 bg-black/40 hover:border-white/40'
                  }`}
                  title={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  {someSelected && <div className="h-1.5 w-1.5 rounded-sm bg-sky-400" />}
                </button>
              </th>
              <th className="px-4 py-3.5">Project</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 w-44">Checklist Progress</th>
              <th className="px-4 py-3.5">Link</th>
              <th className="w-24 px-4 py-3.5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {products.map((product) => {
              const isSelected = selectedIds.has(product.id);
              const doneCount = product.tasks.filter((t) => t.status === 'done' || t.done).length;
              const notRequiredCount = product.tasks.filter((t) => t.status === 'not_required').length;
              const totalCount = product.tasks.length;

              return (
                <tr
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className={`group cursor-pointer transition-colors hover:bg-white/[0.03] ${
                    isSelected ? 'bg-sky-500/[0.04]' : ''
                  }`}
                >
                  <td
                    className="px-4 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSelect(product.id)}
                      className={`flex h-4 w-4 items-center justify-center rounded-md border transition-colors ${
                        isSelected
                          ? 'border-sky-400 bg-sky-400 text-black shadow-sm'
                          : 'border-white/20 bg-black/40 hover:border-white/40'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-zinc-100 group-hover:text-white transition-colors tracking-tight">
                      {product.name}
                    </div>
                    {product.description && (
                      <p className="line-clamp-1 text-xs text-zinc-400 max-w-md font-normal leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <TagBadge tag={product.tag} />
                  </td>

                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <StatusBadge
                      status={product.status}
                      onChange={(newStatus) => onStatusChange(product.id, newStatus)}
                    />
                  </td>

                  <td className="px-4 py-3">
                    {totalCount > 0 ? (
                      <ProgressBar done={doneCount} total={totalCount} notRequired={notRequiredCount} />
                    ) : (
                      <span className="text-[11px] font-mono text-zinc-600">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {product.url ? (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <ExternalLink className="h-3 w-3 opacity-60" />
                        <span className="max-w-[100px] truncate">Open</span>
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-600 font-mono">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {onOpenPrompt && (
                      <button
                        type="button"
                        onClick={() => onOpenPrompt(product)}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all"
                        title="Open Build Guide"
                      >
                        <Sparkles className="h-3 w-3 text-sky-400" />
                        <span>Guide</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
