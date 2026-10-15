import { TAG_COLORS, TAG_LABELS } from '@/lib/supabase';

export function TagBadge({ tag }: { tag: string }) {
  const colorClass = TAG_COLORS[tag] ?? 'bg-zinc-800/60 text-zinc-300 border-white/[0.08]';
  const label = TAG_LABELS[tag] ?? tag;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-medium tracking-wide transition-colors ${colorClass}`}>
      {label}
    </span>
  );
}
