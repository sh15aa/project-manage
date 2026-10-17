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
  Ban,
  Sparkles,
  UserCheck,
  Clock,
  RotateCcw,
  Layers,
  ArrowLeft,
  Terminal,
  Cpu,
  CheckCircle2,
  Copy,
  Download,
  Library,
} from 'lucide-react';
import {
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
  addCustomTask as addCustomTaskToTurso,
  deleteTask as deleteTursoTask,
  saveProduct,
} from '@/lib/turso';
import { sanitizeText } from '@/lib/sanitize';
import { CHECKLIST_SECTIONS } from '@/lib/masterChecklist';
import {
  generateProjectBlueprint,
  downloadBlueprintMarkdown,
} from '@/lib/masterPrompt';
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
  // Always guarantee the product has all 817 master tasks populated immediately
  const guaranteedProduct = useMemo(
    () => (product ? ensureProductTasks(product) : null),
    [product]
  );

  const [tasks, setTasks] = useState<Task[]>(() => guaranteedProduct?.tasks ?? []);
  const [newTask, setNewTask] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(guaranteedProduct?.name ?? '');
  const [editDesc, setEditDesc] = useState(guaranteedProduct?.description ?? '');
  const [editUrl, setEditUrl] = useState(guaranteedProduct?.url ?? '');
  const [editTag, setEditTag] = useState(guaranteedProduct?.tag ?? 'web-app');
  const [editStatus, setEditStatus] = useState(guaranteedProduct?.status ?? 'idea');
  const [saving, setSaving] = useState(false);
  const [showMasterPrompt, setShowMasterPrompt] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'checklist' | 'guide'>('checklist');
  const [copiedPromptId, setCopiedPromptId] = useState<number | null>(null);
  const [copiedFullPrompt, setCopiedFullPrompt] = useState(false);

  // Compute rich blueprint for this project
  const blueprint = useMemo(
    () =>
      guaranteedProduct
        ? generateProjectBlueprint(guaranteedProduct)
        : generateProjectBlueprint({ name: '', tag: 'web-app' }),
    [guaranteedProduct]
  );

  const handleCopyVibePrompt = async (phaseNum: number, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedPromptId(phaseNum);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleCopyAllBlueprint = async () => {
    await navigator.clipboard.writeText(blueprint.fullMasterPrompt);
    setCopiedFullPrompt(true);
    setTimeout(() => setCopiedFullPrompt(false), 2000);
  };

  // Task filtering & searching state
  const [taskSearch, setTaskSearch] = useState('');
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<TaskStatus | 'all'>('all');
  // Expand first 5 sections by default so tasks are immediately visible!
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(CHECKLIST_SECTIONS.slice(0, 5))
  );
  const [openBatchSec, setOpenBatchSec] = useState<string | null>(null);

  // Sync state whenever selected product changes
  useEffect(() => {
    if (!product) return;
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
  }, [product]);

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
    const cleanTitle = sanitizeText(newTask);
    if (!cleanTitle) return;
    const taskTitle = cleanTitle;
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

    await addCustomTaskToTurso(guaranteedProduct.id, {
      id: newTaskObj.id,
      title: taskTitle,
      section: 'Custom Tasks',
      status: 'not_started',
    });
  }

  async function deleteTask(taskId: string) {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    onUpdate({ ...guaranteedProduct, tasks: updated });
    await deleteTursoTask(taskId);
  }

  async function saveProductEdits() {
    const cleanName = sanitizeText(editName) || guaranteedProduct.name;
    const cleanDesc = sanitizeText(editDesc);
    const cleanUrl = editUrl.trim();

    setSaving(true);
    await saveProduct({
      id: guaranteedProduct.id,
      name: cleanName,
      description: cleanDesc || null,
      url: cleanUrl || null,
      tag: editTag,
      status: editStatus,
    });
    setSaving(false);
    const updated = {
      ...guaranteedProduct,
      name: cleanName,
      description: cleanDesc || null,
      url: cleanUrl || null,
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

  if (!product || !guaranteedProduct) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 animate-in fade-in duration-150 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Dialog / Modal Container */}
      <div className="relative z-10 flex h-full w-full sm:max-h-[92vh] sm:max-w-5xl flex-col rounded-none sm:rounded-3xl border-0 sm:border border-white/[0.08] bg-[#0c0e14] shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-3.5 sm:px-6 sm:py-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pr-2 sm:pr-4">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Back</span>
            </button>

            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/[0.04] px-3 py-1.5 text-base font-bold text-white outline-none focus:border-white/40"
                />
              ) : (
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate">
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

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowMasterPrompt(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08] hover:text-white transition-colors shadow-sm"
              title="View & Copy Master Launch Prompt for this project"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Prompt</span>
            </button>

            {guaranteedProduct.url && (
              <a
                href={guaranteedProduct.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                title="Open Live Preview"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Preview</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
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
            <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-3.5 py-2 text-sm text-white outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">URL</label>
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-3.5 py-2 text-sm text-white outline-none focus:border-white/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">Category</label>
                  <select
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3.5 py-2 text-sm text-white outline-none focus:border-white/30"
                  >
                    {TAG_OPTIONS.map((t) => (
                      <option key={t} value={t}>{TAG_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3.5 py-2 text-sm text-white outline-none focus:border-white/30"
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
                  className="rounded-xl bg-white hover:bg-zinc-200 px-4 py-2 text-xs font-semibold text-black transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-white/[0.1] px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex-1">
                <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                  {guaranteedProduct.description || 'No description provided.'}
                </p>
                {guaranteedProduct.url && (
                  <a
                    href={guaranteedProduct.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{guaranteedProduct.url}</span>
                  </a>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors self-start sm:self-auto"
              >
                Edit details
              </button>
            </div>
          )}

          {/* Drawer Tab Switcher: Checklist vs Build Guide */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3.5">
            <button
              type="button"
              onClick={() => setDrawerTab('checklist')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                drawerTab === 'checklist'
                  ? 'bg-white/[0.1] text-white shadow-sm border border-white/[0.15] font-semibold'
                  : 'border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Master Checklist ({totalTasks})</span>
            </button>
            <button
              type="button"
              onClick={() => setDrawerTab('guide')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                drawerTab === 'guide'
                  ? 'bg-white/[0.1] text-white shadow-sm border border-white/[0.15] font-semibold'
                  : 'border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              <span>Build Guide & AI Prompts</span>
            </button>
          </div>

          {drawerTab === 'checklist' ? (
            <>
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
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 sm:grid sm:grid-cols-4 lg:grid-cols-7 text-xs pt-1 touch-scroll">
              <div className="shrink-0 min-w-[110px] sm:min-w-0 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.done}`} />
                  Done
                </span>
                <span className="font-bold text-white tabular-nums">{doneTasks}</span>
              </div>
              <div className="shrink-0 min-w-[110px] sm:min-w-0 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.in_progress}`} />
                  In Progress
                </span>
                <span className="font-bold text-white tabular-nums">{inProgressTasks}</span>
              </div>
              <div className="shrink-0 min-w-[110px] sm:min-w-0 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.blocked}`} />
                  Blocked
                </span>
                <span className="font-bold text-white tabular-nums">{blockedTasks}</span>
              </div>
              <div className="shrink-0 min-w-[110px] sm:min-w-0 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.ai_review}`} />
                  AI Review
                </span>
                <span className="font-bold text-white tabular-nums">{aiReviewTasks}</span>
              </div>
              <div className="shrink-0 min-w-[110px] sm:min-w-0 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.human_review}`} />
                  Human Review
                </span>
                <span className="font-bold text-white tabular-nums">{humanReviewTasks}</span>
              </div>
              <div className="shrink-0 min-w-[110px] sm:min-w-0 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT_COLORS.not_required}`} />
                  Not Required
                </span>
                <span className="font-bold text-white tabular-nums">{notRequiredTasks}</span>
              </div>
              <div className="shrink-0 min-w-[110px] sm:min-w-0 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
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
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 px-3.5 py-2 text-base sm:text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
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
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/50 py-2 pl-9 pr-3 text-base sm:text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
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
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenBatchSec(openBatchSec === secName ? null : secName)}
                              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                              title="Section batch actions"
                            >
                              Batch &hellip;
                            </button>
                            {openBatchSec === secName && (
                              <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-slate-700 bg-slate-900/98 p-1.5 shadow-2xl backdrop-blur-md">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSectionBatchStatus(secName, 'done');
                                    setOpenBatchSec(null);
                                  }}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-slate-800"
                                >
                                  <Check className="h-3.5 w-3.5" /> Mark all Done
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSectionBatchStatus(secName, 'not_required');
                                    setOpenBatchSec(null);
                                  }}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-slate-800"
                                >
                                  <Ban className="h-3.5 w-3.5" /> Mark Not Required
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSectionBatchStatus(secName, 'in_progress');
                                    setOpenBatchSec(null);
                                  }}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-blue-300 hover:bg-slate-800"
                                >
                                  <Clock className="h-3.5 w-3.5" /> Mark In Progress
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSectionBatchStatus(secName, 'ai_review');
                                    setOpenBatchSec(null);
                                  }}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-purple-300 hover:bg-slate-800"
                                >
                                  <Sparkles className="h-3.5 w-3.5" /> Mark AI Review
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSectionBatchStatus(secName, 'human_review');
                                    setOpenBatchSec(null);
                                  }}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 hover:bg-slate-800"
                                >
                                  <UserCheck className="h-3.5 w-3.5" /> Mark Human Review
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSectionBatchStatus(secName, 'not_started');
                                    setOpenBatchSec(null);
                                  }}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 border-t border-slate-800 mt-0.5 pt-1"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" /> Reset Section
                                </button>
                              </div>
                            )}
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
                                  className="flex items-center justify-center -m-1.5 p-1.5 shrink-0"
                                  title={task.status === 'done' ? 'Mark not done' : 'Mark done'}
                                >
                                  <div
                                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                                      task.status === 'done'
                                        ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                                        : task.status === 'not_required'
                                        ? 'border-zinc-700 bg-zinc-800 text-zinc-500'
                                        : 'border-slate-600 bg-slate-800/60 hover:border-cyan-500'
                                    }`}
                                  >
                                    {task.status === 'done' && <Check className="h-3 w-3 stroke-[3]" />}
                                    {task.status === 'not_required' && <span className="text-[9px]">✕</span>}
                                  </div>
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
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Banner & Fast Actions */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[11px] font-bold text-cyan-300">
                  {blueprint.productType}
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-300 font-medium">
                  27 Phased Master Blueprint
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                AI Build Guide for {blueprint.productName}
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Use these 6 self-contained prompts with Claude, Cursor, Antigravity, Bolt, or ChatGPT to take this product from idea to production launch.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href="https://reusable-library.foundershivanand.workers.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/30 transition-colors shadow-sm"
                title="Browse 33 enterprise modules (Auth, Payments, Storage, Audit, etc.)"
              >
                <Library className="h-3.5 w-3.5 text-indigo-400" />
                <span>Reusable Code Library</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>

              <button
                type="button"
                onClick={() => downloadBlueprintMarkdown(blueprint)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 transition-colors"
                title="Download complete guide as Markdown file"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Blueprint (.md)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAllBlueprint}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md transition-all ${
                  copiedFullPrompt
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                }`}
                title="Copy entire 27-phase master prompt"
              >
                {copiedFullPrompt ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied Prompt!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Copy Master Prompt</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowMasterPrompt(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-cyan-500 hover:to-blue-500 transition-all shadow-sm"
                title="Open full interactive studio with 27 phases"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Open Full Studio</span>
              </button>
            </div>
          </div>

          {/* Strategy & Recommended Stack */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                Product Strategy & Core Problem
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Problem:</span>
                  <p className="text-slate-200 leading-relaxed">{blueprint.problemSolved}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Target Users:</span>
                  <p className="text-slate-200 leading-relaxed">{blueprint.targetUsers}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Core Value Prop:</span>
                  <p className="text-cyan-300 font-medium leading-relaxed">{blueprint.coreValueProp}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                Recommended Tech Stack
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-slate-800 bg-slate-950 p-2">
                  <span className="text-[10px] text-slate-500 uppercase block">Frontend</span>
                  <span className="font-semibold text-cyan-300">{blueprint.recommendedTechStack.frontend}</span>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-2">
                  <span className="text-[10px] text-slate-500 uppercase block">Backend</span>
                  <span className="font-semibold text-slate-200">{blueprint.recommendedTechStack.backend}</span>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-2">
                  <span className="text-[10px] text-slate-500 uppercase block">Database</span>
                  <span className="font-semibold text-slate-200">{blueprint.recommendedTechStack.database}</span>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-2">
                  <span className="text-[10px] text-slate-500 uppercase block">Auth</span>
                  <span className="font-semibold text-slate-200">{blueprint.recommendedTechStack.auth}</span>
                </div>
                <div className="col-span-2 rounded border border-indigo-500/20 bg-indigo-950/20 p-2 flex items-center justify-between">
                  <span className="text-[11px] text-indigo-300">
                    💡 Pull pre-built Auth, Billing, R2 & DB modules
                  </span>
                  <a
                    href="https://reusable-library.foundershivanand.workers.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-200 transition-colors"
                  >
                    <span>Code Library (33)</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 6 Phased Vibe-Coding Prompts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">
                  Sequential Implementation Prompts (Phases 1 — 6)
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                Click copy on each phase to send to your AI coder
              </span>
            </div>

            <div className="space-y-3">
              {blueprint.vibeCodingPrompts.map((vp) => {
                const isCopied = copiedPromptId === vp.phase;
                return (
                  <div
                    key={vp.phase}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3 transition-colors hover:border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs">
                          {vp.phase}
                        </span>
                        <div>
                          <h5 className="text-sm font-bold text-white">
                            Phase {vp.phase}: {vp.title}
                          </h5>
                          <span className="text-[11px] text-slate-400">
                            AI Role: <strong className="text-slate-300">{vp.role}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyVibePrompt(vp.phase, vp.prompt)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-white'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Copied Phase {vp.phase}!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Phase {vp.phase} Prompt</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300">
                      {vp.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-slate-500 text-[11px] font-semibold">Target Files:</span>
                      {vp.filesToCreateOrModify.map((f) => (
                        <code key={f} className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300 font-mono">
                          {f}
                        </code>
                      ))}
                    </div>

                    <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-2.5 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Definition of Done:
                      </span>
                      <ul className="space-y-1">
                        {vp.definitionOfDone.map((d, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <details className="group">
                      <summary className="text-[11px] font-medium text-slate-400 hover:text-cyan-400 cursor-pointer list-none flex items-center gap-1 select-none">
                        <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                        <span>Preview Prompt Content</span>
                      </summary>
                      <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/80 p-3 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {vp.prompt}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
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
