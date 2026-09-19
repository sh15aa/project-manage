import { ExternalLink, MoreHorizontal, Check } from 'lucide-react';
import type { ProductWithTasks } from '@/lib/supabase';
import { TagBadge } from './TagBadge';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

interface ProductTableProps {
  products: ProductWithTasks[];
  onSelectProduct: (product: ProductWithTasks) => void;
  onStatusChange: (productId: string, newStatus: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export function ProductTable({
  products,
  onSelectProduct,
  onStatusChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: ProductTableProps) {
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = products.some((p) => selectedIds.has(p.id)) && !allSelected;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase text-slate-400">
            <tr>
              <th className="w-10 px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                    allSelected
                      ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                      : someSelected
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                      : 'border-slate-600 bg-slate-800 hover:border-slate-400'
                  }`}
                  title={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  {someSelected && <div className="h-1.5 w-1.5 rounded-sm bg-cyan-400" />}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">Project</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Status (Change)</th>
              <th className="px-4 py-3 font-semibold">Tasks</th>
              <th className="px-4 py-3 font-semibold">Link</th>
              <th className="w-12 px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {products.map((product) => {
              const isSelected = selectedIds.has(product.id);
              const doneCount = product.tasks.filter((t) => t.status === 'done' || t.done).length;
              const notRequiredCount = product.tasks.filter((t) => t.status === 'not_required').length;
              const totalCount = product.tasks.length;

              return (
                <tr
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className={`group cursor-pointer transition-colors hover:bg-slate-800/40 ${
                    isSelected ? 'bg-cyan-500/5' : ''
                  }`}
                >
                  <td
                    className="px-4 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSelect(product.id)}
                      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500 text-slate-950'
                          : 'border-slate-600 bg-slate-800 hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {product.name}
                    </div>
                    {product.description && (
                      <p className="line-clamp-1 text-xs text-slate-500 max-w-md">
                        {product.description}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <TagBadge tag={product.tag} />
                  </td>

                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusBadge
                      status={product.status}
                      onChange={(newStatus) => onStatusChange(product.id, newStatus)}
                    />
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {totalCount > 0 ? (
                      <div className="w-28 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Progress</span>
                          <span>{doneCount}/{Math.max(0, totalCount - notRequiredCount) || totalCount}</span>
                        </div>
                        <ProgressBar done={doneCount} total={totalCount} notRequired={notRequiredCount} showText={false} />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>

                  <td
                    className="px-4 py-3 whitespace-nowrap text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {product.url ? (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">
                          {product.url.replace(/^https?:\/\//, '')}
                        </span>
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(product);
                      }}
                      className="rounded p-1 text-slate-500 opacity-0 hover:bg-slate-700/50 hover:text-slate-300 group-hover:opacity-100"
                      title="Open details"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
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
