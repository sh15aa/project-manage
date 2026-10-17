import { Package, CheckCircle2, Clock, Layers, Rocket, CheckSquare, Compass, ExternalLink, Library, Globe } from 'lucide-react';
import type { ProductWithTasks, TaskStatus } from '@/lib/supabase';
import { useState } from 'react';
import { AllLinksModal } from './AllLinksModal';
import {
  STATUS_LABELS,
  STATUS_DOT_COLORS,
  TAG_LABELS,
  TAG_COLORS,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_DOT_COLORS,
} from '@/lib/supabase';

export function Dashboard({
  products,
  onOpenAllLinks,
}: {
  products: ProductWithTasks[];
  onOpenAllLinks?: () => void;
}) {
  const [internalShowAllLinks, setInternalShowAllLinks] = useState(false);
  const handleOpenAllLinks = onOpenAllLinks || (() => setInternalShowAllLinks(true));
  const totalProducts = products.length;
  const totalTasks = products.reduce((acc, p) => acc + p.tasks.length, 0);

  // Task breakdown by 7 states
  const taskStateCounts: Record<TaskStatus, number> = {
    not_started: 0,
    in_progress: 0,
    blocked: 0,
    ai_review: 0,
    human_review: 0,
    done: 0,
    not_required: 0,
  };

  products.forEach((p) => {
    p.tasks.forEach((t) => {
      const st = t.status || (t.done ? 'done' : 'not_started');
      taskStateCounts[st] = (taskStateCounts[st] ?? 0) + 1;
    });
  });

  const doneTasks = taskStateCounts.done;
  const notRequiredTasks = taskStateCounts.not_required;
  const effectiveTasks = Math.max(0, totalTasks - notRequiredTasks);
  const completionRate = effectiveTasks > 0 ? Math.round((doneTasks / effectiveTasks) * 100) : 0;

  const deployedCount = products.filter((p) => p.status === 'deployed' || p.status === 'hosted').length;
  const doneCount = products.filter((p) => p.status === 'done' || p.status === 'complete').length;
  const workingCount = products.filter((p) => p.status === 'working' || p.status === 'in-progress').length;
  const ideaCount = products.filter((p) => p.status === 'idea').length;

  // Status distribution
  const statusCounts: Record<string, number> = {};
  products.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  });

  // Tag distribution
  const tagCounts: Record<string, number> = {};
  products.forEach((p) => {
    tagCounts[p.tag] = (tagCounts[p.tag] ?? 0) + 1;
  });

  const stats = [
    {
      label: 'Total Projects',
      value: totalProducts,
      icon: Package,
      accent: 'text-sky-400',
    },
    {
      label: 'Deployed Live',
      value: deployedCount,
      icon: Rocket,
      accent: 'text-indigo-400',
    },
    {
      label: 'In Progress (Working)',
      value: workingCount,
      icon: Clock,
      accent: 'text-amber-400',
    },
    {
      label: 'Tasks Completed',
      value: `${doneTasks}`,
      subvalue: `of ${effectiveTasks} tasks (${completionRate}%)`,
      icon: CheckSquare,
      accent: 'text-emerald-400',
    },
  ];

  const statusBreakdown = [
    { key: 'idea', label: 'Idea', count: ideaCount, icon: Layers },
    { key: 'working', label: 'Working', count: workingCount, icon: Clock },
    { key: 'done', label: 'Done', count: doneCount, icon: CheckCircle2 },
    { key: 'deployed', label: 'Deployed', count: deployedCount, icon: Rocket },
  ];

  return (
    <div className="space-y-6">
      {/* Ecosystem Hub — All Links Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-sky-950/20 via-[#0c0e14]/70 to-[#0c0e14]/60 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/[0.08] border border-sky-500/20 text-sky-400">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">Ecosystem Hubs & Reusable Factories</h3>
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300 border border-sky-500/20">
                  6 Hubs
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400 max-w-2xl leading-relaxed">
                Connect your product pipeline to Finder (Validated Ideas), Enterprise Bot Factory, AI Agent Runtime, Mobile Product Factory (163 Modules), Reusable Code Library (33 Modules) & AI Mentor OS.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAllLinks}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.1] font-medium text-xs h-10 px-4 transition-all shadow-sm shrink-0 active:scale-[0.98]"
          >
            <Globe className="h-3.5 w-3.5 text-sky-400" />
            <span>All Links</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/[0.06] bg-[#0c0e14]/60 p-5 shadow-lg backdrop-blur-md transition-all hover:border-white/[0.12] hover:bg-[#10141d]/80"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Icon className={`h-4 w-4 ${stat.accent}`} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-zinc-400">
                {stat.label}
                {stat.subvalue && (
                  <span className="block text-[11px] text-zinc-500 font-normal mt-0.5">{stat.subvalue}</span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* Task States Overview (7 States) */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e14]/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 tracking-tight">
              Master Tasks Distribution Across Portfolio
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live status across all 817 launch milestones
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Completion rate:</span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/20 font-mono">
              {completionRate}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {TASK_STATUS_OPTIONS.map((st) => {
            const count = taskStateCounts[st] ?? 0;
            const dot = TASK_STATUS_DOT_COLORS[st];
            const label = TASK_STATUS_LABELS[st];

            return (
              <div
                key={st}
                className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center transition-colors hover:bg-white/[0.04]"
              >
                <div className="mb-1 flex items-center justify-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  <span className="text-[11px] font-medium text-zinc-400 truncate">{label}</span>
                </div>
                <p className="text-lg font-bold tabular-nums text-white font-mono">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status breakdown */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e14]/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200 tracking-tight">Pipeline Stages</h3>
          <div className="space-y-3.5">
            {statusBreakdown.map((s) => {
              const pct = totalProducts > 0 ? (s.count / totalProducts) * 100 : 0;
              return (
                <div key={s.key}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-zinc-300 font-medium">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[s.key] ?? 'bg-zinc-400'}`} />
                      {s.label}
                    </span>
                    <span className="tabular-nums font-mono text-zinc-400">
                      {s.count} <span className="text-zinc-500 font-normal">({Math.round(pct)}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${STATUS_DOT_COLORS[s.key] ?? 'bg-zinc-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tag breakdown */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e14]/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
          <h3 className="mb-4 text-sm font-semibold text-zinc-200 tracking-tight">Project Categories</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(tagCounts).map(([tag, count]) => (
              <div
                key={tag}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${TAG_COLORS[tag] ?? 'border-white/[0.08] bg-white/[0.04] text-zinc-300'}`}
              >
                <span>{TAG_LABELS[tag] ?? tag}</span>
                <span className="rounded-full bg-white/[0.08] px-1.5 py-0.2 text-[10px] font-mono tabular-nums text-white">
                  {count}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/[0.05] pt-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span>Portfolio-Wide Checklist Completion</span>
              <span className="font-mono text-zinc-200 font-semibold">{doneTasks} / {effectiveTasks} ({completionRate}%)</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <AllLinksModal
        isOpen={internalShowAllLinks}
        onClose={() => setInternalShowAllLinks(false)}
      />
    </div>
  );
}
