import { TAG_COLORS, TAG_LABELS } from '@/lib/supabase';

export function TagBadge({ tag }: { tag: string }) {
  const colorClass = TAG_COLORS[tag] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  const label = TAG_LABELS[tag] ?? tag;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
