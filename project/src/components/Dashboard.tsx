import { Package, CheckCircle2, Clock, Layers, Rocket, Lightbulb, CheckSquare, Sparkles, UserCheck, AlertCircle, Ban, Compass, ExternalLink } from 'lucide-react';
import type { ProductWithTasks, TaskStatus } from '@/lib/supabase';
import {
  STATUS_LABELS,
  STATUS_DOT_COLORS,
  TAG_LABELS,
  TAG_COLORS,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_DOT_COLORS,
} from '@/lib/supabase';

export function Dashboard({ products }: { products: ProductWithTasks[] }) {
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
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Deployed',
      value: deployedCount,
      icon: Rocket,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Working On',
      value: workingCount,
      icon: Clock,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
    {
      label: 'Tasks Completed',
      value: `${doneTasks} / ${effectiveTasks}`,
      icon: CheckSquare,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
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
      {/* Finder Startup & App Ideas Integration Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Finder — Startup & App Ideas</h3>
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  Live Platform
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 max-w-2xl leading-relaxed">
                Discover validated ideas from TrustMRR, Reddit, Product Hunt & App Store with verified Stripe & Lemon Squeezy MRR, and turn them into actionable project launches.
              </p>
            </div>
          </div>
          <a
            href="https://finder-d17.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-10 px-4 transition-all shadow-sm hover:shadow-emerald-500/20 shrink-0"
          >
            <span>Explore on Finder</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 transition-colors hover:border-slate-600"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Task States Overview (7 States) */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Master Tasks Overview Across All Products
            </h3>
            <p className="text-xs text-slate-400">
              Tracking all 7 states: Not Started, In Progress, Blocked, AI Review, Human Review, Done, Not Required
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Completion:</span>
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
              {completionRate}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {TASK_STATUS_OPTIONS.map((st) => {
            const count = taskStateCounts[st] ?? 0;
            const dot = TASK_STATUS_DOT_COLORS[st];
            const label = TASK_STATUS_LABELS[st];

            return (
              <div
                key={st}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center"
              >
                <div className="mb-1.5 flex items-center justify-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  <span className="text-xs font-medium text-slate-300">{label}</span>
                </div>
                <p className="text-xl font-bold tabular-nums text-white">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status breakdown */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Product Lifecycle</h3>
          <div className="space-y-3">
            {statusBreakdown.map((s) => {
              const pct = totalProducts > 0 ? (s.count / totalProducts) * 100 : 0;
              return (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[s.key] ?? 'bg-slate-400'}`} />
                      {s.label}
                    </span>
                    <span className="tabular-nums text-slate-400 font-medium">
                      {s.count} <span className="text-xs text-slate-500">({Math.round(pct)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-700/40">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${STATUS_DOT_COLORS[s.key] ?? 'bg-slate-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tag breakdown */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">By Category</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(tagCounts).map(([tag, count]) => (
              <div
                key={tag}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${TAG_COLORS[tag] ?? 'border-slate-600 bg-slate-700/30 text-slate-300'}`}
              >
                <span className="text-sm font-medium">{TAG_LABELS[tag] ?? tag}</span>
                <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
                  {count}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Overall Effective Tasks Completed</span>
              <span className="font-semibold text-slate-200">{doneTasks} / {effectiveTasks} ({completionRate}%)</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* All status counts */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-200">All Product Statuses</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="rounded-lg border border-slate-700/40 bg-slate-800/50 p-3 text-center">
              <div className="mb-1 flex items-center justify-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[status] ?? 'bg-slate-400'}`} />
                <span className="text-xs text-slate-400">{STATUS_LABELS[status] ?? status}</span>
              </div>
              <p className="text-xl font-bold tabular-nums text-white">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
