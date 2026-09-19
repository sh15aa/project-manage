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
      ? 'bg-emerald-400'
      : pct >= 50
      ? 'bg-cyan-400'
      : pct > 0
      ? 'bg-yellow-400'
      : 'bg-slate-600';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {showText && (
        <span className="text-xs font-medium tabular-nums text-slate-400">
          {done}/{effectiveTotal || total}
          {notRequired > 0 && (
            <span className="ml-1 text-[10px] text-slate-500">
              ({notRequired} N/R)
            </span>
          )}
        </span>
      )}
    </div>
  );
}
