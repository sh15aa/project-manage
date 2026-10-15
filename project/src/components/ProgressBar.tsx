interface ProgressBarProps {
  done: number;
  total: number;
  notRequired?: number;
  showText?: boolean;
}

export function ProgressBar({
  done,
  total,
  notRequired = 0,
  showText = true,
}: ProgressBarProps) {
  const effectiveTotal = Math.max(0, total - notRequired);
  const pct =
    effectiveTotal === 0
      ? total > 0 && notRequired === total
        ? 100
        : 0
      : Math.round((done / effectiveTotal) * 100);

  const barColor =
    pct === 100
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
      : pct >= 50
      ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
      : pct > 0
      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
      : 'bg-zinc-700';

  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {showText && (
        <span className="text-[11px] font-mono tabular-nums text-zinc-500 shrink-0">
          {done}/{effectiveTotal || total}
          {notRequired > 0 && (
            <span className="ml-1 text-[10px] text-zinc-600">
              ({notRequired})
            </span>
          )}
        </span>
      )}
    </div>
  );
}
