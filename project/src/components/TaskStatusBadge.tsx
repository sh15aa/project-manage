import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  type TaskStatus,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_STATUS_DOT_COLORS,
} from '@/lib/supabase';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  onChange?: (newStatus: TaskStatus) => void;
  interactive?: boolean;
  size?: 'sm' | 'xs';
}

export function TaskStatusBadge({
  status,
  onChange,
  interactive = Boolean(onChange),
  size = 'xs',
}: TaskStatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const colorClass =
    TASK_STATUS_COLORS[status] ?? 'bg-slate-500/15 text-slate-400 border-slate-600/40';
  const dotClass = TASK_STATUS_DOT_COLORS[status] ?? 'bg-slate-400';
  const label = TASK_STATUS_LABELS[status] ?? status;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!interactive || !onChange) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${
          size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        } ${colorClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {label}
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition-all hover:brightness-110 active:scale-95 cursor-pointer shadow-sm ${
          size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        } ${colorClass}`}
        title="Click to change task state"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown
          className={`shrink-0 opacity-70 transition-transform ${
            open ? 'rotate-180' : ''
          } ${size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'}`}
        />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 z-50 mt-1 min-w-[155px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900/98 p-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Task State
          </div>
          <div className="space-y-0.5">
            {TASK_STATUS_OPTIONS.map((opt) => {
              const optDot = TASK_STATUS_DOT_COLORS[opt] ?? 'bg-slate-400';
              const optLabel = TASK_STATUS_LABELS[opt] ?? opt;
              const isSelected = opt === status;

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${optDot}`} />
                    {optLabel}
                  </span>
                  {isSelected && <Check className="h-3 w-3 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
