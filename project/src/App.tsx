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
  Compass,
  ExternalLink,
  Bot,
  MessageSquare,
  Library,
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
  saveProduct,
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
import { ImportFromFinderModal, type FinderIdeaPayload } from '@/components/ImportFromFinderModal';
import { ProjectAssistantDrawer } from '@/components/ProjectAssistantDrawer';
import { trackEvent } from '@/lib/analytics';

type NavView = 'dashboard' | 'products';
type DisplayMode = 'grid' | 'table' | 'kanban';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return (
      localStorage.getItem('producthub_auth') === 'true' ||
      sessionStorage.getItem('producthub_auth') === 'true'
    );
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
  const [finderIdeaToImport, setFinderIdeaToImport] = useState<FinderIdeaPayload | null>(null);
  const [showFinderImportModal, setShowFinderImportModal] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);

  // Detect incoming idea handoff from Finder via URL query parameters or preserved session
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const importIdeaParam = params.get('import_idea');
      const action = params.get('action');
      const name = params.get('name');

      let ideaPayload: FinderIdeaPayload | null = null;

      if (importIdeaParam) {
        try {
          ideaPayload = JSON.parse(importIdeaParam);
        } catch {
          try {
            ideaPayload = JSON.parse(decodeURIComponent(importIdeaParam));
          } catch (e) {
            console.warn('Could not parse import_idea payload as JSON:', e);
          }
        }
      }

      if (!ideaPayload && (action === 'import-idea' || name)) {
        ideaPayload = {
          id: params.get('id') || undefined,
          name: name || 'Finder Idea',
          description: params.get('description') || params.get('desc') || '',
          url: params.get('url') || '',
          tag: params.get('tag') || 'web-app',
          status: params.get('status') || 'idea',
          source: params.get('source') || 'Finder',
          sourceUrl: params.get('sourceUrl') || params.get('source_url') || '',
          blueprint: params.get('blueprint') || undefined,
        };
      }

      // Check session storage if not in URL (e.g. preserved during login gate)
      if (!ideaPayload) {
        const cached = sessionStorage.getItem('pending_finder_import');
        if (cached) {
          try {
            ideaPayload = JSON.parse(cached);
          } catch {
            sessionStorage.removeItem('pending_finder_import');
          }
        }
      }

      if (ideaPayload && ideaPayload.name) {
        setFinderIdeaToImport(ideaPayload);
        setShowFinderImportModal(true);
        sessionStorage.setItem('pending_finder_import', JSON.stringify(ideaPayload));
        // Clean up URL query string cleanly without losing idea in memory
        if (window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {
      console.error('Failed to parse incoming Finder idea:', e);
    }
  }, []);

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

  function handleFinderIdeaImported(imported: ProductWithTasks) {
    setProducts((prev) => [imported, ...prev]);
    setSelectedProduct(imported);
    setShowFinderImportModal(false);
    setFinderIdeaToImport(null);
    sessionStorage.removeItem('pending_finder_import');
  }

  const hasFilters = activeTags.length > 0 || activeStatuses.length > 0 || search.length > 0;

  // Status counters for quick chips
  const statusCounts: Record<string, number> = {};
  products.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  });

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 font-sans selection:bg-white/15 selection:text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-64 flex-col border-r border-white/[0.06] bg-[#090b10]/80 p-4 md:flex backdrop-blur-2xl overflow-y-auto">
        <div className="mb-7 flex items-center gap-3 px-2 pt-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-white shadow-inner-light">
            <Boxes className="h-4 w-4 text-zinc-100" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">Product Hub</h1>
            <p className="text-[11px] text-zinc-500 font-medium">Founder Launch OS</p>
          </div>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setView('products')}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
              view === 'products'
                ? 'bg-white/[0.08] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
            }`}
          >
            <Boxes className="h-4 w-4 opacity-80" />
            All Projects
            <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-mono tabular-nums text-zinc-400">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setView('dashboard')}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
              view === 'dashboard'
                ? 'bg-white/[0.08] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="h-4 w-4 opacity-80" />
            Dashboard
          </button>

          <button
            onClick={() => setShowAssistant(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 transition-all group"
          >
            <Bot className="h-4 w-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>AI Assistant</span>
            <span className="ml-auto rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300 border border-sky-500/20">
              Gemini
            </span>
          </button>

          <button
            onClick={() => setShowMasterPrompt(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 transition-all"
          >
            <Sparkles className="h-4 w-4 text-zinc-400" />
            Master Prompt
            <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-zinc-400">
              PDF
            </span>
          </button>

          <a
            href="https://finder-d17.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-zinc-400 hover:bg-white/[0.04] hover:text-emerald-300 transition-all group"
          >
            <Compass className="h-4 w-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
            <span>Finder (Ideas)</span>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/20">
              <span>Live</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          </a>

          <a
            href="https://reusable-library.foundershivanand.workers.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-zinc-400 hover:bg-white/[0.04] hover:text-indigo-300 transition-all group"
          >
            <Library className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Reusable Library</span>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/20">
              <span>33 Modules</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </span>
          </a>
        </nav>

        {/* Quick Status Stats in Sidebar */}
        <div className="my-5 border-t border-white/[0.06] pt-4">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Status Pipeline
          </p>
          <div className="space-y-0.5">
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
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[st.key]}`} />
                  {st.label}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                  {statusCounts[st.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Finder Quick Callout Card */}
        <div className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/15 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
              <Compass className="h-3.5 w-3.5 text-emerald-400" />
              <span>Finder Ideas</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-300 border border-emerald-500/20">
              VIBE ENGINE
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 mb-2">
            Validated ideas from Reddit, TrustMRR & Product Hunt ready to import.
          </p>
          <a
            href="https://finder-d17.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all group"
          >
            <span>Open Finder</span>
            <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* Reusable Library Quick Callout Card */}
        <div className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-950/15 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
              <Library className="h-3.5 w-3.5 text-indigo-400" />
              <span>Reusable Library</span>
            </div>
            <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-300 border border-indigo-500/20">
              33 MODULES
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 mb-2">
            Enterprise code modules (Auth, Billing, Storage, Audit) for AI agents.
          </p>
          <a
            href="https://reusable-library.foundershivanand.workers.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-all group"
          >
            <span>Open Library</span>
            <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        <div className="mt-auto space-y-2">
          {/* Turso DB Status Button */}
          <button
            type="button"
            onClick={() => setShowTursoModal(true)}
            className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs hover:border-white/[0.12] transition-colors group"
            title="Configure Turso Database & Sync"
          >
            <div className="flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
              <span className="text-zinc-300 font-medium">Turso DB</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-mono ${
                tursoConfig.url ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tursoConfig.url ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {tursoConfig.url ? 'Connected' : 'Setup'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-zinc-200 px-3 py-2 text-xs font-semibold text-black shadow-sm transition-all active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              New Project
            </button>
            <button
              onClick={() => {
                setFinderIdeaToImport(null);
                setShowFinderImportModal(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-xs font-semibold text-zinc-200 transition-all hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
              title="Import Idea from Finder"
            >
              <Compass className="h-3.5 w-3.5 text-emerald-400" />
              Import
            </button>
          </div>

          {/* User Session & Logout */}
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300">
                <User className="h-3 w-3" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-zinc-200">sh15a</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('producthub_auth');
                localStorage.removeItem('producthub_user');
                sessionStorage.removeItem('producthub_auth');
                sessionStorage.removeItem('producthub_user');
                sessionStorage.removeItem('pending_finder_import');
                setIsAuthenticated(false);
              }}
              title="Lock Workspace / Log Out"
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Legal & Compliance links */}
          <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-zinc-500">
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="hover:text-zinc-300 transition-colors"
            >
              Privacy
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="hover:text-zinc-300 transition-colors"
            >
              Terms
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#090b10]/80 px-4 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-white">
            <Boxes className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white tracking-tight">Product Hub</span>
              <span className="rounded-full bg-white/[0.08] px-1.5 py-0.2 text-[10px] font-mono text-zinc-300 tabular-nums">
                {products.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://finder-d17.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-2 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-950/40 transition-colors"
            title="Open Finder — Startup & App Ideas"
          >
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium hidden xs:inline">Finder</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </a>

          <a
            href="https://reusable-library.foundershivanand.workers.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-950/20 px-2 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-950/40 transition-colors"
            title="Open Reusable Code Library (33 Modules)"
          >
            <Library className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[11px] font-medium hidden xs:inline">Library</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </a>

          <button
            type="button"
            onClick={() => setShowAssistant(true)}
            className="flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-950/20 px-2 py-1.5 text-xs text-sky-300 hover:bg-sky-900/40 transition-colors"
            title="Ask AI Assistant"
          >
            <Bot className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-[11px] font-semibold">AI</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTursoModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-xs text-zinc-300 hover:border-white/20 transition-colors"
            title="Turso Database Settings"
          >
            <Database className="h-3.5 w-3.5 text-zinc-400" />
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                tursoConfig.url ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('producthub_auth');
              localStorage.removeItem('producthub_user');
              sessionStorage.removeItem('producthub_auth');
              sessionStorage.removeItem('producthub_user');
              sessionStorage.removeItem('pending_finder_import');
              setIsAuthenticated(false);
            }}
            title="Lock Workspace / Log Out"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-red-400 transition-colors"
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
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">All Projects</h2>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs font-mono tabular-nums text-zinc-300">
                      {filtered.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                    Showing {filtered.length} of {products.length} projects &bull; Click any status badge to update
                  </p>
                </div>

                {/* View switcher & Quick Action */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <a
                    href="https://finder-d17.pages.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-500/50 transition-colors shadow-sm"
                    title="Open Finder — Startup & App Ideas"
                  >
                    <Compass className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Finder</span>
                    <span className="hidden md:inline text-[10px] text-emerald-400/80 font-mono">Ideas</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                  </a>

                  <a
                    href="https://reusable-library.foundershivanand.workers.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-950/40 hover:border-indigo-500/50 transition-colors shadow-sm"
                    title="Open Reusable Code Library — 33 Battle-tested Modules"
                  >
                    <Library className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Code Library</span>
                    <span className="hidden md:inline text-[10px] text-indigo-400/80 font-mono">33 Modules</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setShowFinderImportModal(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08] hover:text-white transition-all shadow-sm"
                    title="Import validated idea or vibe blueprint from Finder"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                    <span>Import Idea</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTursoModal(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/20 hover:text-white transition-colors"
                    title="Turso Database Settings & Sync"
                  >
                    <Database className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="hidden sm:inline">Turso DB</span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        tursoConfig.url ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  </button>

                  <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
                    <button
                      type="button"
                      onClick={() => setDisplayMode('grid')}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        displayMode === 'grid'
                          ? 'bg-white/[0.1] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
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
                          ? 'bg-white/[0.1] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
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
                          ? 'bg-white/[0.1] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
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
                <span className="text-xs font-medium text-zinc-500 mr-1 shrink-0">Filter:</span>
                {[
                  { key: 'idea', label: 'Idea' },
                  { key: 'working', label: 'Working' },
                  { key: 'done', label: 'Done' },
                  { key: 'deployed', label: 'Deployed' },
                ].map((s) => {
                  const isActive = activeStatuses.includes(s.key);
                  const count = statusCounts[s.key] ?? 0;
                  const dot = STATUS_DOT_COLORS[s.key] ?? 'bg-zinc-400';

                  return (
                    <button
                      key={s.key}
                      onClick={() => toggleStatus(s.key)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shrink-0 transition-all ${
                        isActive
                          ? 'border-white/20 bg-white/[0.1] text-white shadow-sm'
                          : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      {s.label}
                      <span className="ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono bg-white/[0.06] tabular-nums text-zinc-400">
                        {count}
                      </span>
                    </button>
                  );
                })}

                {activeStatuses.length > 0 && (
                  <button
                    onClick={() => setActiveStatuses([])}
                    className="ml-1 text-xs text-zinc-500 hover:text-zinc-300 shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Search + Filters */}
              <div className="mb-6 space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search projects by name, tags, description..."
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] focus:bg-white/[0.05] focus:border-white/25 py-2.5 pl-10 pr-9 text-base sm:text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
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
                        ? 'border-white/25 bg-white/[0.08] text-white'
                        : 'border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                    }`}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {hasFilters && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-mono font-bold text-black">
                        {activeTags.length + activeStatuses.length}
                      </span>
                    )}
                  </button>
                </div>

                {showFilters && (
                  <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0c0e14]/95 p-5 backdrop-blur-xl shadow-2xl">
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                        Clear all filters
                      </button>
                    )}
                    <div>
                      <p className="mb-2 text-xs font-medium text-zinc-400">Categories / Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {TAG_OPTIONS.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              activeTags.includes(tag)
                                ? 'border-white/20 bg-white/[0.1] text-white'
                                : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200'
                            }`}
                          >
                            {TAG_LABELS[tag]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-zinc-400">All Statuses</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((status) => (
                          <button
                            key={status}
                            onClick={() => toggleStatus(status)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              activeStatuses.includes(status)
                                ? 'border-white/20 bg-white/[0.1] text-white'
                                : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12] hover:text-zinc-200'
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
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/[0.06] bg-[#090b10]/90 px-2 py-2 backdrop-blur-2xl md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            setView('products');
            if (displayMode === 'kanban') setDisplayMode('grid');
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
            view === 'products' && displayMode !== 'kanban'
              ? 'text-white font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Boxes className="h-4 w-4" />
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
              ? 'text-white font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <KanbanIcon className="h-4 w-4" />
          <span className="text-[10px]">Kanban</span>
        </button>

        {/* Center Floating Add Button */}
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex h-10 w-10 -mt-5 items-center justify-center rounded-full bg-white text-black shadow-xl border-4 border-[#090b10] active:scale-95 transition-transform"
          title="Add New Project"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
            view === 'dashboard'
              ? 'text-white font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setShowMasterPrompt(true)}
          className="flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <Sparkles className="h-4 w-4 text-zinc-400" />
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

      {/* Import Idea from Finder Modal */}
      {showFinderImportModal && (
        <ImportFromFinderModal
          initialData={finderIdeaToImport}
          onClose={() => {
            setShowFinderImportModal(false);
            setFinderIdeaToImport(null);
            sessionStorage.removeItem('pending_finder_import');
          }}
          onImported={handleFinderIdeaImported}
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

      {/* Floating AI Assistant Trigger Button */}
      <button
        onClick={() => setShowAssistant(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-white/[0.12] bg-[#0d1017]/90 hover:bg-[#141924] px-4 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl transition-all hover:scale-105 active:scale-95 group shadow-black/50"
      >
        <div className="relative">
          <Bot className="h-4 w-4 text-sky-400 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
        </div>
        <span className="hidden sm:inline tracking-tight font-medium">Assistant</span>
        <span className="sm:hidden font-medium">AI</span>
      </button>

      {/* AI Chatbot Assistant Drawer */}
      <ProjectAssistantDrawer
        isOpen={showAssistant}
        onClose={() => setShowAssistant(false)}
        products={products}
        onApplyFilter={(filters) => {
          setView('products');
          if (filters.tags !== undefined) setActiveTags(filters.tags);
          if (filters.statuses !== undefined) setActiveStatuses(filters.statuses);
          if (filters.search !== undefined) setSearch(filters.search);
        }}
        onSelectProduct={(product) => {
          setSelectedProduct(product);
        }}
      />
    </div>
  );
}
