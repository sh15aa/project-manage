import { useEffect, useState, useCallback } from 'react';
import {
  LayoutGrid,
  Boxes,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  Table as TableIcon,
  Kanban as KanbanIcon,
  LogOut,
  User,
  Sparkles,
  Database,
} from 'lucide-react';
import {
  type ProductWithTasks,
  type Product,
  TAG_OPTIONS,
  TAG_LABELS,
  STATUS_OPTIONS,
  STATUS_LABELS,
  STATUS_DOT_COLORS,
  fetchAllData,
  updateProductStatus,
  bulkUpdateProductStatus,
  getInitialProducts,
  getTursoConfig,
} from '@/lib/turso';
import { TursoConfigModal } from '@/components/TursoConfigModal';
import { Dashboard } from '@/components/Dashboard';
import { ProductCard } from '@/components/ProductCard';
import { ProductTable } from '@/components/ProductTable';
import { ProductKanban } from '@/components/ProductKanban';
import { ProductDrawer } from '@/components/ProductDrawer';
import { AddProductModal } from '@/components/AddProductModal';
import { BulkActionBar } from '@/components/BulkActionBar';
import { LoginGate } from '@/components/LoginGate';
import { MasterPromptModal } from '@/components/MasterPromptModal';
import { PrivacyPolicyModal } from '@/components/PrivacyPolicyModal';
import { TermsModal } from '@/components/TermsModal';
import { CookieConsent } from '@/components/CookieConsent';
import { NotFoundView } from '@/components/NotFoundView';
import { trackEvent } from '@/lib/analytics';

type NavView = 'dashboard' | 'products';
type DisplayMode = 'grid' | 'table' | 'kanban';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('producthub_auth') === 'true';
  });
  // Synchronous initialization guarantees all 96 projects are rendered immediately with zero delay
  const [products, setProducts] = useState<ProductWithTasks[]>(() => getInitialProducts());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<NavView>('products');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithTasks | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMasterPrompt, setShowMasterPrompt] = useState(false);
  const [masterPromptProductId, setMasterPromptProductId] = useState<string | null>(null);

  const handleOpenPrompt = useCallback((product: ProductWithTasks) => {
    setMasterPromptProductId(product.id);
    setShowMasterPrompt(true);
  }, []);

  const [showTursoModal, setShowTursoModal] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [tursoConfig, setTursoConfig] = useState(() => getTursoConfig());
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchAllData();
      if (data && data.length > 0) {
        setProducts(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err?.message || 'Failed to load projects');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Filter products (defined before callbacks that depend on it)
  const filtered = products.filter((p) => {
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !(p.description ?? '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (activeTags.length > 0 && !activeTags.includes(p.tag)) {
      return false;
    }
    if (activeStatuses.length > 0 && !activeStatuses.includes(p.status)) {
      return false;
    }
    return true;
  });

  // Quick manual status change for a single project
  const handleStatusChange = useCallback(async (productId: string, newStatus: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p))
    );
    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    await updateProductStatus(productId, newStatus);
  }, [selectedProduct]);

  // Bulk status change for multiple selected projects
  const handleBulkStatusChange = useCallback(async (newStatus: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setProducts((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, status: newStatus } : p))
    );
    setSelectedIds(new Set());
    await bulkUpdateProductStatus(ids, newStatus);
  }, [selectedIds]);

  // Multi-selection
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }, [selectedIds, filtered]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  }, [filtered]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  if (!isAuthenticated) {
    return <LoginGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function toggleStatus(status: string) {
    setActiveStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  function clearFilters() {
    setActiveTags([]);
    setActiveStatuses([]);
    setSearch('');
  }

  function handleProductUpdate(updated: ProductWithTasks) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedProduct(updated);
  }

  function handleProductCreated(newProduct: Product) {
    const newProductWithTasks: ProductWithTasks = { ...newProduct, tasks: [] };
    setProducts((prev) => [...prev, newProductWithTasks]);
    setShowAdd(false);
  }

  const hasFilters = activeTags.length > 0 || activeStatuses.length > 0 || search.length > 0;

  // Status counters for quick chips
  const statusCounts: Record<string, number> = {};
  products.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-64 flex-col border-r border-slate-800 bg-slate-900/60 p-4 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Product Hub</h1>
            <p className="text-[11px] text-slate-400">95 Projects Manager</p>
          </div>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setView('products')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              view === 'products'
                ? 'bg-cyan-500/15 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Boxes className="h-4 w-4" />
            All Projects
            <span className="ml-auto rounded-md bg-slate-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setView('dashboard')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              view === 'dashboard'
                ? 'bg-cyan-500/15 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Dashboard
          </button>

          <button
            onClick={() => setShowMasterPrompt(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Master Prompt
            <span className="ml-auto rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
              PDF
            </span>
          </button>
        </nav>

        {/* Quick Status Stats in Sidebar */}
        <div className="my-6 border-t border-slate-800/80 pt-5">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Status Overview
          </p>
          <div className="space-y-1">
            {[
              { key: 'idea', label: 'Idea' },
              { key: 'working', label: 'Working' },
              { key: 'done', label: 'Done' },
              { key: 'deployed', label: 'Deployed' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => {
                  setView('products');
                  setActiveStatuses([st.key]);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[st.key]}`} />
                  {st.label}
                </span>
                <span className="font-semibold tabular-nums text-slate-300">
                  {statusCounts[st.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-2.5">
          {/* Turso DB Status Button */}
          <button
            type="button"
            onClick={() => setShowTursoModal(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2 text-xs hover:border-slate-700 transition-colors group"
            title="Configure Turso Database & Sync"
          >
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              <span className="text-slate-300 font-medium">Turso DB</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                tursoConfig.url ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tursoConfig.url ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {tursoConfig.url ? 'Connected' : 'Configure'}
            </span>
          </button>

          <button
            onClick={() => setShowAdd(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-2.5 text-sm font-medium text-white shadow-md shadow-cyan-600/20 transition-all hover:bg-cyan-500 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </button>

          {/* User Session & Logout */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200">sh15a</p>
                <p className="text-[10px] text-cyan-400">Authenticated</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('producthub_auth');
                sessionStorage.removeItem('producthub_user');
                setIsAuthenticated(false);
              }}
              title="Lock Workspace / Log Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {/* Legal & Compliance links */}
          <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-500">
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Privacy Policy
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Terms & Conditions
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3.5 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-sm shadow-cyan-500/20">
            <Boxes className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-tight">Product Hub</span>
              <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.2 text-[10px] font-bold text-cyan-300 tabular-nums">
                {products.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Launch OS</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowTursoModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500/50 transition-colors"
            title="Turso Database Settings"
          >
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium hidden xs:inline">DB</span>
            <span
              className={`h-2 w-2 rounded-full ${
                tursoConfig.url ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('producthub_auth');
              sessionStorage.removeItem('producthub_user');
              setIsAuthenticated(false);
            }}
            title="Lock Workspace / Log Out"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/80 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-8 pt-16 pb-28 md:pt-8 md:pb-12">
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-500" />
            </div>
          ) : error ? (
            <div className="flex h-96 flex-col items-center justify-center text-center">
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm font-medium text-red-300">Failed to load data</p>
                <p className="mt-1 text-xs text-red-400/70">{error}</p>
              </div>
              <button
                onClick={() => loadData()}
                className="mt-3 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
              >
                Try again
              </button>
            </div>
          ) : view === 'dashboard' ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Overview of all {products.length} projects and development lifecycle
                </p>
              </div>
              <Dashboard products={products} />
            </>
          ) : (
            <>
              {/* Header & View Mode Switcher */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">All Projects</h2>
                    <span className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-xs font-bold text-cyan-300 tabular-nums">
                      {filtered.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
                    Showing {filtered.length} of {products.length} projects &bull; Click any status badge to update
                  </p>
                </div>

                {/* View switcher & Quick Action */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowTursoModal(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-500/50 hover:text-white transition-colors"
                    title="Turso Database Settings & Sync"
                  >
                    <Database className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Turso DB</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        tursoConfig.url ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  </button>

                  <div className="flex items-center rounded-xl border border-slate-700/80 bg-slate-900/60 p-1">
                    <button
                      type="button"
                      onClick={() => setDisplayMode('grid')}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        displayMode === 'grid'
                          ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayMode('table')}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        displayMode === 'table'
                          ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Table View (compact list)"
                    >
                      <TableIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayMode('kanban')}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        displayMode === 'kanban'
                          ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Kanban Board View"
                    >
                      <KanbanIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Kanban</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Quick Filter Chips */}
              <div className="mb-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap touch-pan-x">
                <span className="text-xs font-medium text-slate-400 mr-1 shrink-0">Status:</span>
                {[
                  { key: 'idea', label: 'Idea' },
                  { key: 'working', label: 'Working' },
                  { key: 'done', label: 'Done' },
                  { key: 'deployed', label: 'Deployed' },
                ].map((s) => {
                  const isActive = activeStatuses.includes(s.key);
                  const count = statusCounts[s.key] ?? 0;
                  const dot = STATUS_DOT_COLORS[s.key] ?? 'bg-slate-400';

                  return (
                    <button
                      key={s.key}
                      onClick={() => toggleStatus(s.key)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shrink-0 transition-all ${
                        isActive
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200 shadow-sm'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      {s.label}
                      <span className="ml-0.5 rounded px-1 py-0.2 text-[10px] bg-slate-800/80 tabular-nums">
                        {count}
                      </span>
                    </button>
                  );
                })}

                {activeStatuses.length > 0 && (
                  <button
                    onClick={() => setActiveStatuses([])}
                    className="ml-1 text-xs text-slate-400 hover:text-cyan-300 shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Search + Filters */}
              <div className="mb-5 space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search projects by name or description..."
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-800/50 py-2.5 pl-10 pr-9 text-base sm:text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      showFilters || hasFilters
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                        : 'border-slate-700/80 bg-slate-800/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {hasFilters && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs text-white">
                        {activeTags.length + activeStatuses.length}
                      </span>
                    )}
                  </button>
                </div>

                {showFilters && (
                  <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/70 p-4 backdrop-blur-sm">
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        <X className="h-3 w-3" />
                        Clear all filters
                      </button>
                    )}
                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-400">Categories / Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {TAG_OPTIONS.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                              activeTags.includes(tag)
                                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300'
                                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                            }`}
                          >
                            {TAG_LABELS[tag]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-slate-400">All Statuses</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((status) => (
                          <button
                            key={status}
                            onClick={() => toggleStatus(status)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                              activeStatuses.includes(status)
                                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300'
                                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                            }`}
                          >
                            {STATUS_LABELS[status] ?? status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Products View */}
              {filtered.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center rounded-2xl border border-dashed border-slate-800 p-8">
                  <Boxes className="mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-sm text-slate-400">
                    No projects match your filters.
                  </p>
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-3 text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : displayMode === 'table' ? (
                <ProductTable
                  products={filtered}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                  onStatusChange={handleStatusChange}
                  onOpenPrompt={handleOpenPrompt}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleSelectAll={handleToggleSelectAll}
                />
              ) : displayMode === 'kanban' ? (
                <ProductKanban
                  products={filtered}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                  onStatusChange={handleStatusChange}
                  onOpenPrompt={handleOpenPrompt}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => setSelectedProduct(product)}
                      onStatusChange={(newStatus) =>
                        handleStatusChange(product.id, newStatus)
                      }
                      onOpenPrompt={handleOpenPrompt}
                      selected={selectedIds.has(product.id)}
                      onToggleSelect={() => handleToggleSelect(product.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-slate-800 bg-slate-950/95 px-2 py-1.5 backdrop-blur-lg md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            setView('products');
            if (displayMode === 'kanban') setDisplayMode('grid');
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
            view === 'products' && displayMode !== 'kanban'
              ? 'text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="h-5 w-5" />
          <span className="text-[10px]">Projects</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setView('products');
            setDisplayMode('kanban');
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
            view === 'products' && displayMode === 'kanban'
              ? 'text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <KanbanIcon className="h-5 w-5" />
          <span className="text-[10px]">Kanban</span>
        </button>

        {/* Center Floating Add Button */}
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex h-11 w-11 -mt-4 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 border-4 border-slate-950 active:scale-95 transition-transform"
          title="Add New Project"
        >
          <Plus className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
            view === 'dashboard'
              ? 'text-cyan-400'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setShowMasterPrompt(true)}
          className="flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <span className="text-[10px]">Prompt</span>
        </button>
      </nav>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={filtered.length}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
        onApplyStatus={handleBulkStatusChange}
      />

      {/* Drawer */}
      <ProductDrawer
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onUpdate={handleProductUpdate}
      />

      {/* Add modal */}
      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onCreated={handleProductCreated}
        />
      )}

      {/* Master Prompt Modal */}
      <MasterPromptModal
        isOpen={showMasterPrompt}
        onClose={() => {
          setShowMasterPrompt(false);
          setMasterPromptProductId(null);
        }}
        products={products}
        initialProductId={masterPromptProductId}
      />

      {/* Turso Database Config Modal */}
      <TursoConfigModal
        isOpen={showTursoModal}
        onClose={() => setShowTursoModal(false)}
        onConfigSaved={() => {
          setTursoConfig(getTursoConfig());
          loadData();
        }}
      />

      {/* Legal Modals & Cookie Banner */}
      <PrivacyPolicyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
      />
      <CookieConsent
        onOpenPrivacy={() => setShowPrivacy(true)}
      />
    </div>
  );
}
