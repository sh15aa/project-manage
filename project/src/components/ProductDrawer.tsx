import { useEffect, useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCheck,
  Ban,
  Sparkles,
  UserCheck,
  Clock,
  RotateCcw,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import {
  supabase,
  type ProductWithTasks,
  type Task,
  type TaskStatus,
  STATUS_OPTIONS,
  STATUS_LABELS,
  TAG_OPTIONS,
  TAG_LABELS,
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_DOT_COLORS,
  updateProductStatus,
  updateTaskStatus,
  bulkUpdateSectionTasksStatus,
  ensureProductTasks,
} from '@/lib/supabase';
import { CHECKLIST_SECTIONS } from '@/lib/masterChecklist';
import { TagBadge } from './TagBadge';
import { StatusBadge } from './StatusBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { ProgressBar } from './ProgressBar';
import { MasterPromptModal } from './MasterPromptModal';

interface ProductDrawerProps {
  product: ProductWithTasks | null;
  onClose: () => void;
  onUpdate: (product: ProductWithTasks) => void;
}

export function ProductDrawer({
  product,
  onClose,
  onUpdate,
}: ProductDrawerProps) {
  if (!product) return null;

  // Always guarantee the product has all 817 master tasks populated immediately
  const guaranteedProduct = useMemo(() => ensureProductTasks(product), [product]);

  const [tasks, setTasks] = useState<Task[]>(() => guaranteedProduct.tasks);
  const [newTask, setNewTask] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(guaranteedProduct.name);
  const [editDesc, setEditDesc] = useState(guaranteedProduct.description ?? '');
  const [editUrl, setEditUrl] = useState(guaranteedProduct.url ?? '');
  const [editTag, setEditTag] = useState(guaranteedProduct.tag);
  const [editStatus, setEditStatus] = useState(guaranteedProduct.status);
  const [saving, setSaving] = useState(false);
  const [showMasterPrompt, setShowMasterPrompt] = useState(false);

  // Task filtering & searching state
  const [taskSearch, setTaskSearch] = useState('');
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<TaskStatus | 'all'>('all');
  // Expand first 5 sections by default so tasks are immediately visible!
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(CHECKLIST_SECTIONS.slice(0, 5))
  );

  // Sync state whenever selected product changes
  useEffect(() => {
    const fresh = ensureProductTasks(product);
    setTasks(fresh.tasks);
    setEditName(fresh.name);
    setEditDesc(fresh.description ?? '');
    setEditUrl(fresh.url ?? '');
    setEditTag(fresh.tag);
    setEditStatus(fresh.status);
    setEditing(false);
    setNewTask('');
    setExpandedSections(new Set(CHECKLIST_SECTIONS.slice(0, 5)));
  }, [product?.id]);

  // Task metrics
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
  const aiReviewTasks = tasks.filter((t) => t.status === 'ai_review').length;
  const humanReviewTasks = tasks.filter((t) => t.status === 'human_review').length;
  const notRequiredTasks = tasks.filter((t) => t.status === 'not_required').length;
  const notStartedTasks = tasks.filter((t) => t.status === 'not_started').length;
  const effectiveTotal = Math.max(0, totalTasks - notRequiredTasks);

  // Group tasks by section
  const sections = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const sec = t.section || 'General';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(t);
    });
    return map;
  }, [tasks]);

  // Filtered tasks per section based on search and status filter
  const filteredSections = useMemo(() => {
    const result = new Map<string, Task[]>();
    sections.forEach((secTasks, secName) => {
      const matching = secTasks.filter((t) => {
        if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) {
          return false;
        }
        if (selectedTaskStatus !== 'all' && t.status !== selectedTaskStatus) {
          return false;
        }
        return true;
      });
      if (matching.length > 0) {
        result.set(secName, matching);
      }
    });
    return result;
  }, [sections, taskSearch, selectedTaskStatus]);

  async function handleQuickStatusChange(newStatus: string) {
    setEditStatus(newStatus);
    const updated = { ...guaranteedProduct, status: newStatus, tasks };
    onUpdate(updated);
    await updateProductStatus(guaranteedProduct.id, newStatus);
  }

  async function handleTaskStateChange(task: Task, newStatus: TaskStatus) {
    const updatedTasks = tasks.map((t) =>
      t.id === task.id ? { ...t, status: newStatus, done: newStatus === 'done' } : t
    );
    setTasks(updatedTasks);
    onUpdate({ ...guaranteedProduct, tasks: updatedTasks });
    await updateTaskStatus(guaranteedProduct.id, task.id, newStatus);
  }

  async function handleToggleTaskDone(task: Task) {
    const newStatus: TaskStatus = task.status === 'done' ? 'not_started' : 'done';
    await handleTaskStateChange(task, newStatus);
  }

  async function handleSectionBatchStatus(section: string, newStatus: TaskStatus) {
    const updatedTasks = await bulkUpdateSectionTasksStatus(
      guaranteedProduct.id,
      section,
      newStatus,
      tasks
    );
    setTasks(updatedTasks);
    onUpdate({ ...guaranteedProduct, tasks: updatedTasks });
  }

  async function addCustomTask() {
    if (!newTask.trim()) return;
    const taskTitle = newTask.trim();
    const newTaskObj: Task = {
      id: crypto.randomUUID(),
      product_id: guaranteedProduct.id,
      title: taskTitle,
      section: 'Custom Tasks',
      section_id: 999,
      status: 'not_started',
      done: false,
      sort_order: tasks.length + 1,
      created_at: new Date().toISOString(),
    };

    const updated = [newTaskObj, ...tasks];
    setTasks(updated);
    setNewTask('');
    onUpdate({ ...guaranteedProduct, tasks: updated });

    if (supabase) {
      await supabase.from('tasks').insert({
        id: newTaskObj.id,
        product_id: guaranteedProduct.id,
        title: taskTitle,
        section: 'Custom Tasks',
        status: 'not_started',
        done: false,
      });
    }
  }

  async function deleteTask(taskId: string) {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    onUpdate({ ...guaranteedProduct, tasks: updated });
    if (supabase) {
      await supabase.from('tasks').delete().eq('id', taskId);
    }
  }

  async function saveProductEdits() {
    setSaving(true);
    if (supabase) {
      await supabase
        .from('products')
        .update({
          name: editName,
          description: editDesc || null,
          url: editUrl || null,
          tag: editTag,
          status: editStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', guaranteedProduct.id);
    }
    setSaving(false);
    const updated = {
      ...guaranteedProduct,
      name: editName,
      description: editDesc || null,
      url: editUrl || null,
      tag: editTag,
      status: editStatus,
      tasks,
    };
    onUpdate(updated);
    setEditing(false);
  }

  function toggleSection(secName: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(secName)) next.delete(secName);
      else next.add(secName);
      return next;
    });
  }

  function expandAllSections() {
    setExpandedSections(new Set(sections.keys()));
  }

  function collapseAllSections() {
    setExpandedSections(new Set());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Main Dialog / Modal Container */}
      <div className="relative z-10 flex h-full max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-base font-bold text-white outline-none focus:border-cyan-500"
                />
              ) : (
                <h2 className="text-lg font-bold text-white tracking-tight truncate">
                  {guaranteedProduct.name}
                </h2>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <TagBadge tag={guaranteedProduct.tag} />
              <StatusBadge
                status={guaranteedProduct.status}
                onChange={handleQuickStatusChange}
                size="md"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMasterPrompt(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-colors shadow-sm"
              title="View & Copy Master Launch Prompt for this project"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Master Prompt</span>
            </button>

            {guaranteedProduct.url && (
              <a
                href={guaranteedProduct.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Live Link
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Mobile Tag & Status (shown when < sm) */}
          <div className="flex sm:hidden items-center gap-2">
            <TagBadge tag={guaranteedProduct.tag} />
            <StatusBadge
              status={guaranteedProduct.status}
              onChange={handleQuickStatusChange}
              size="md"
            />
          </div>

          {/* Description & Edit Form */}
          {editing ? (
            <div className="space-y-4 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">URL</label>
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Category</label>
                  <select
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                  >
                    {TAG_OPTIONS.map((t) => (
                      <option key={t} value={t}>{TAG_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveProductEdits}
                  disabled={saving}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
              <div className="flex-1">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {guaranteedProduct.description || 'No description provided.'}
                </p>
                {guaranteedProduct.url && (
                  <a
                    href={guaranteedProduct.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {guaranteedProduct.url}
                  </a>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="shrink-0 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Edit details
              </button>
            </div>
          )}

          {/* Master Checklist Progress & State Distribution */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white">
                  Master Launch Checklist
                </h3>
                <p className="text-xs text-slate-400">
                  {doneTasks} completed of {effectiveTotal} required ({totalTasks} total tasks across 38 sections)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Completion:</span>
                <span className="text-xl font-extrabold tabular-nums text-emerald-400">
                  {effectiveTotal > 0 ? Math.round((doneTasks / effectiveTotal) * 100) : 0}%
                </span>
              </div>
            </div>

            <ProgressBar
              done={doneTasks}
              total={totalTasks}
              notRequired={notRequiredTasks}
              showText={false}
            />

            {/* 7 Task States Grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 text-xs pt-1">
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.done}`} />
                  Done
                </span>
                <span className="font-bold text-white tabular-nums">{doneTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.in_progress}`} />
                  In Progress
                </span>
                <span className="font-bold text-white tabular-nums">{inProgressTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.blocked}`} />
                  Blocked
                </span>
                <span className="font-bold text-white tabular-nums">{blockedTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.ai_review}`} />
                  AI Review
                </span>
                <span className="font-bold text-white tabular-nums">{aiReviewTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.human_review}`} />
                  Human Review
                </span>
                <span className="font-bold text-white tabular-nums">{humanReviewTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.not_required}`} />
                  Not Required
                </span>
                <span className="font-bold text-white tabular-nums">{notRequiredTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.not_started}`} />
                  Not Started
                </span>
                <span className="font-bold text-white tabular-nums">{notStartedTasks}</span>
              </div>
            </div>
          </div>

          {/* Master Checklist Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Checklist Sections ({sections.size}) &bull; {totalTasks} Tasks
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAllSections}
                  className="text-xs text-cyan-400 hover:underline font-medium"
                >
                  Expand all
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={collapseAllSections}
                  className="text-xs text-slate-400 hover:underline font-medium"
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* Add custom task */}
            <div className="flex gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomTask()}
                placeholder="Add a new custom task..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
              />
              <button
                onClick={addCustomTask}
                disabled={!newTask.trim()}
                className="flex items-center gap-1 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {/* Search & State Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search among all 817 tasks (e.g. database, security, payment, SEO, auth)..."
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/50 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>

              {/* State Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedTaskStatus('all')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    selectedTaskStatus === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({totalTasks})
                </button>
                {TASK_STATUS_OPTIONS.map((st) => {
                  const count =
                    st === 'done'
                      ? doneTasks
                      : st === 'in_progress'
                      ? inProgressTasks
                      : st === 'blocked'
                      ? blockedTasks
                      : st === 'ai_review'
                      ? aiReviewTasks
                      : st === 'human_review'
                      ? humanReviewTasks
                      : st === 'not_required'
                      ? notRequiredTasks
                      : notStartedTasks;

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedTaskStatus(st)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        selectedTaskStatus === st
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${TASK_STATUS_DOT_COLORS[st]}`} />
                      {TASK_STATUS_LABELS[st]} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Accordions */}
            <div className="space-y-3 pt-2">
              {filteredSections.size === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
                  No tasks match your search or filter.
                </div>
              ) : (
                Array.from(filteredSections.entries()).map(([secName, secTasks]) => {
                  const isExpanded = expandedSections.has(secName) || Boolean(taskSearch);
                  const secDone = secTasks.filter((t) => t.status === 'done').length;
                  const secNotReq = secTasks.filter((t) => t.status === 'not_required').length;
                  const secEffective = Math.max(0, secTasks.length - secNotReq);

                  return (
                    <div
                      key={secName}
                      className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-sm transition-colors"
                    >
                      {/* Section Header */}
                      <div
                        onClick={() => toggleSection(secName)}
                        className="flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-cyan-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {secName}
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-3 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs tabular-nums font-semibold text-slate-400">
                            {secDone}/{secEffective || secTasks.length} done
                          </span>

                          {/* Quick Section Actions */}
                          <div className="relative group">
                            <button
                              type="button"
                              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                              title="Section batch actions"
                            >
                              Batch &hellip;
                            </button>
                            <div className="absolute right-0 z-50 mt-1 hidden group-hover:block w-40 rounded-xl border border-slate-700 bg-slate-900/98 p-1 shadow-2xl backdrop-blur-md">
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'done')}
                                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-slate-800"
                              >
                                <Check className="h-3 w-3" /> Mark all Done
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'not_required')}
                                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-slate-800"
                              >
                                <Ban className="h-3 w-3" /> Mark Not Required
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'in_progress')}
                                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-blue-300 hover:bg-slate-800"
                              >
                                <Clock className="h-3 w-3" /> Mark In Progress
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'ai_review')}
                                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-purple-300 hover:bg-slate-800"
                              >
                                <Sparkles className="h-3 w-3" /> Mark AI Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'human_review')}
                                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 hover:bg-slate-800"
                              >
                                <UserCheck className="h-3 w-3" /> Mark Human Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'not_started')}
                                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 border-t border-slate-800 mt-0.5 pt-1"
                              >
                                <RotateCcw className="h-3 w-3" /> Reset Section
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section Tasks List */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-800/50 p-1.5 bg-slate-900/40">
                          {secTasks.map((task) => (
                            <div
                              key={task.id}
                              className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskDone(task)}
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                                    task.status === 'done'
                                      ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                                      : task.status === 'not_required'
                                      ? 'border-zinc-700 bg-zinc-800 text-zinc-500'
                                      : 'border-slate-600 bg-slate-800/60 hover:border-cyan-500'
                                  }`}
                                  title={task.status === 'done' ? 'Mark not done' : 'Mark done'}
                                >
                                  {task.status === 'done' && <Check className="h-3 w-3 stroke-[3]" />}
                                  {task.status === 'not_required' && <span className="text-[9px]">✕</span>}
                                </button>
                                <span
                                  className={`text-xs leading-relaxed transition-colors truncate ${
                                    task.status === 'done'
                                      ? 'text-slate-500 line-through'
                                      : task.status === 'not_required'
                                      ? 'text-zinc-500 italic'
                                      : task.status === 'blocked'
                                      ? 'text-red-300 font-medium'
                                      : 'text-slate-200'
                                  }`}
                                  title={task.title}
                                >
                                  {task.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <TaskStatusBadge
                                  status={task.status}
                                  onChange={(newSt) => handleTaskStateChange(task, newSt)}
                                />
                                {task.section === 'Custom Tasks' && (
                                  <button
                                    onClick={() => deleteTask(task.id)}
                                    className="rounded p-1 text-slate-600 opacity-0 hover:text-red-400 group-hover:opacity-100 transition-all"
                                    title="Delete task"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Master Prompt Modal for this specific project */}
      <MasterPromptModal
        isOpen={showMasterPrompt}
        onClose={() => setShowMasterPrompt(false)}
        products={[guaranteedProduct]}
        initialProductId={guaranteedProduct.id}
      />
    </div>
  );
}
