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
  Filter,
  CheckCheck,
  Ban,
  Sparkles,
  UserCheck,
  AlertCircle,
  Clock,
  RotateCcw,
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
  createMasterTasksForProduct,
} from '@/lib/supabase';
import { TagBadge } from './TagBadge';
import { StatusBadge } from './StatusBadge';
import { TaskStatusBadge } from './TaskStatusBadge';
import { ProgressBar } from './ProgressBar';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Task filtering & searching state
  const [taskSearch, setTaskSearch] = useState('');
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<TaskStatus | 'all'>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (product) {
      setTasks(product.tasks || []);
      setEditName(product.name);
      setEditDesc(product.description ?? '');
      setEditUrl(product.url ?? '');
      setEditTag(product.tag);
      setEditStatus(product.status);
      setEditing(false);
      setNewTask('');
      // Expand first 2 sections by default
      if (product.tasks && product.tasks.length > 0) {
        const firstTwo = Array.from(new Set(product.tasks.map((t) => t.section))).slice(0, 2);
        setExpandedSections(new Set(firstTwo));
      }
    }
  }, [product]);

  if (!product) return null;
  const currentProduct: ProductWithTasks = product;

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
    const updated = { ...currentProduct, status: newStatus };
    onUpdate(updated);
    await updateProductStatus(currentProduct.id, newStatus);
  }

  async function handleTaskStateChange(task: Task, newStatus: TaskStatus) {
    const updatedTasks = tasks.map((t) =>
      t.id === task.id ? { ...t, status: newStatus, done: newStatus === 'done' } : t
    );
    setTasks(updatedTasks);
    onUpdate({ ...currentProduct, tasks: updatedTasks });
    await updateTaskStatus(currentProduct.id, task.id, newStatus);
  }

  async function handleToggleTaskDone(task: Task) {
    const newStatus: TaskStatus = task.status === 'done' ? 'not_started' : 'done';
    await handleTaskStateChange(task, newStatus);
  }

  async function handleSectionBatchStatus(section: string, newStatus: TaskStatus) {
    const updatedTasks = await bulkUpdateSectionTasksStatus(
      currentProduct.id,
      section,
      newStatus,
      tasks
    );
    setTasks(updatedTasks);
    onUpdate({ ...currentProduct, tasks: updatedTasks });
  }

  async function handleResetToMasterChecklist() {
    if (!confirm('This will load all 817 master checklist tasks from the PDF. Proceed?')) {
      return;
    }
    const freshTasks = createMasterTasksForProduct(currentProduct.id);
    setTasks(freshTasks);
    onUpdate({ ...currentProduct, tasks: freshTasks });
  }

  async function addCustomTask() {
    if (!newTask.trim()) return;
    const taskTitle = newTask.trim();
    const newTaskObj: Task = {
      id: crypto.randomUUID(),
      product_id: currentProduct.id,
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
    onUpdate({ ...currentProduct, tasks: updated });

    if (supabase) {
      await supabase.from('tasks').insert({
        id: newTaskObj.id,
        product_id: currentProduct.id,
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
    onUpdate({ ...currentProduct, tasks: updated });
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
        .eq('id', currentProduct.id);
    }
    setSaving(false);
    const updated = {
      ...currentProduct,
      name: editName,
      description: editDesc || null,
      url: editUrl || null,
      tag: editTag,
      status: editStatus,
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
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-slate-700 bg-slate-900 shadow-2xl transition-transform duration-300">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 p-5 bg-slate-900/90 backdrop-blur-md">
          <div className="flex-1 pr-4">
            {editing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-cyan-500"
              />
            ) : (
              <h2 className="text-xl font-bold text-white tracking-tight">{product.name}</h2>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {!editing && (
                <>
                  <TagBadge tag={product.tag} />
                  <StatusBadge
                    status={product.status}
                    onChange={handleQuickStatusChange}
                    size="md"
                  />
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Edit form */}
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
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Tag</label>
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
              <div className="flex gap-2">
                <button
                  onClick={saveProductEdits}
                  disabled={saving}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {product.description && (
                <p className="mb-3 text-sm text-slate-400 leading-relaxed">{product.description}</p>
              )}
              <div className="flex items-center gap-3">
                {product.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-cyan-400 transition-colors hover:bg-slate-800 hover:text-cyan-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {product.url}
                  </a>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Edit details
                </button>
              </div>
            </div>
          )}

          {/* Master Checklist Progress & State Distribution */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-200">
                  Master Checklist Progress
                </span>
                <p className="text-xs text-slate-400">
                  {doneTasks} done of {effectiveTotal} required ({totalTasks} total)
                </p>
              </div>
              <span className="text-lg font-bold tabular-nums text-white">
                {effectiveTotal > 0 ? Math.round((doneTasks / effectiveTotal) * 100) : 0}%
              </span>
            </div>

            <ProgressBar
              done={doneTasks}
              total={totalTasks}
              notRequired={notRequiredTasks}
              showText={false}
            />

            {/* Task States Chips */}
            <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.done}`} />
                  Done
                </span>
                <span className="font-bold text-white tabular-nums">{doneTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.in_progress}`} />
                  In Progress
                </span>
                <span className="font-bold text-white tabular-nums">{inProgressTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.blocked}`} />
                  Blocked
                </span>
                <span className="font-bold text-white tabular-nums">{blockedTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.ai_review}`} />
                  AI Review
                </span>
                <span className="font-bold text-white tabular-nums">{aiReviewTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.human_review}`} />
                  Human Review
                </span>
                <span className="font-bold text-white tabular-nums">{humanReviewTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.not_required}`} />
                  Not Required
                </span>
                <span className="font-bold text-white tabular-nums">{notRequiredTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-2 sm:col-span-2">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.not_started}`} />
                  Not Started
                </span>
                <span className="font-bold text-white tabular-nums">{notStartedTasks}</span>
              </div>
            </div>
          </div>

          {/* Master Checklist Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">
                Tasks ({totalTasks})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAllSections}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Expand all
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={collapseAllSections}
                  className="text-[11px] text-slate-400 hover:underline"
                >
                  Collapse
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
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
              />
              <button
                onClick={addCustomTask}
                disabled={!newTask.trim()}
                className="flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {/* Search & State Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search among all tasks (e.g. database, security, payment, SEO)..."
                  className="w-full rounded-lg border border-slate-700/80 bg-slate-800/40 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>

              {/* State Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedTaskStatus('all')}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    selectedTaskStatus === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300'
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
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
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
                <div className="py-8 text-center text-xs text-slate-500">
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
                      className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm"
                    >
                      {/* Section Header */}
                      <div
                        onClick={() => toggleSection(secName)}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/40 hover:bg-slate-800/70 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {secName}
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] tabular-nums font-medium text-slate-400">
                            {secDone}/{secEffective || secTasks.length}
                          </span>

                          {/* Quick Section Actions */}
                          <div className="relative group">
                            <button
                              type="button"
                              className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
                              title="Section batch actions"
                            >
                              Batch &hellip;
                            </button>
                            <div className="absolute right-0 z-50 mt-1 hidden group-hover:block w-36 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'done')}
                                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-emerald-300 hover:bg-slate-800"
                              >
                                <Check className="h-3 w-3" /> Mark all Done
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'not_required')}
                                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-zinc-400 hover:bg-slate-800"
                              >
                                <Ban className="h-3 w-3" /> Mark Not Required
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'in_progress')}
                                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-blue-300 hover:bg-slate-800"
                              >
                                <Clock className="h-3 w-3" /> Mark In Progress
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'ai_review')}
                                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-purple-300 hover:bg-slate-800"
                              >
                                <Sparkles className="h-3 w-3" /> Mark AI Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'human_review')}
                                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-amber-300 hover:bg-slate-800"
                              >
                                <UserCheck className="h-3 w-3" /> Mark Human Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSectionBatchStatus(secName, 'not_started')}
                                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 border-t border-slate-800 mt-0.5 pt-1"
                              >
                                <RotateCcw className="h-3 w-3" /> Reset Section
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section Tasks List */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-800/40 p-1 bg-slate-900/30">
                          {secTasks.map((task) => (
                            <div
                              key={task.id}
                              className="group flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-800/40 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
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

                              <div className="flex items-center gap-1.5 shrink-0">
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
                                    <Trash2 className="h-3 w-3" />
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
    </>
  );
}
