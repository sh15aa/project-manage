import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Sparkles,
  Search,
  BookOpen,
  ChevronRight,
  Terminal,
  ShieldAlert,
  Database,
  Cpu,
  CheckCircle2,
  FileText,
  Workflow,
  Library,
  ExternalLink,
} from 'lucide-react';
import {
  MASTER_PROMPT_SECTIONS,
  generateProductPrompt,
  generateProjectBlueprint,
  downloadBlueprintMarkdown,
} from '@/lib/masterPrompt';
import type { ProductWithTasks } from '@/lib/supabase';

interface MasterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: ProductWithTasks[];
  initialProductId?: string | null;
}

type ModalTab = 'vibe_prompts' | 'master_27' | 'architecture';

export const MasterPromptModal: React.FC<MasterPromptModalProps> = ({
  isOpen,
  onClose,
  products = [],
  initialProductId = null,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId ?? '');
  const [activeTab, setActiveTab] = useState<ModalTab>('vibe_prompts');
  const [selectedSectionId, setSelectedSectionId] = useState<number>(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<number | null>(null);
  const [copiedSection, setCopiedSection] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync selected product if initialProductId changes
  React.useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId]);

  // Selected product if any
  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) ?? null;
  }, [products, selectedProductId]);

  // Generate intelligent blueprint for the selected project
  const blueprint = useMemo(() => {
    if (!currentProduct) {
      return generateProjectBlueprint({
        name: 'Custom Product Idea',
        description: 'New full-stack web, SaaS, or mobile application.',
        tag: 'web-app',
      });
    }
    return generateProjectBlueprint(currentProduct);
  }, [currentProduct]);

  // Generate full prompt customized for the selected product
  const fullPrompt = useMemo(() => {
    if (!currentProduct) return blueprint.fullMasterPrompt;
    return generateProductPrompt(
      currentProduct.name,
      currentProduct.description ?? undefined,
      currentProduct.tag
    );
  }, [currentProduct, blueprint]);

  // Filter 27 sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return MASTER_PROMPT_SECTIONS;
    const q = searchQuery.toLowerCase();
    return MASTER_PROMPT_SECTIONS.filter(
      (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeSection = useMemo(() => {
    return (
      MASTER_PROMPT_SECTIONS.find((s) => s.id === selectedSectionId) ??
      MASTER_PROMPT_SECTIONS[0]
    );
  }, [selectedSectionId]);

  if (!isOpen) return null;

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(fullPrompt);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyVibePrompt = async (phaseNum: number, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedPromptId(phaseNum);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleCopySection = async (secId: number, content: string) => {
    // If it's Section 1 and product exists, copy with product info injected
    let textToCopy = content;
    if (secId === 1 && currentProduct) {
      textToCopy = content.replace(
        '[PASTE MY PRODUCT IDEA HERE]',
        `Project Name: ${currentProduct.name}\nDescription: ${
          currentProduct.description || 'N/A'
        }\nCategory: ${currentProduct.tag}`
      );
    }
    await navigator.clipboard.writeText(textToCopy);
    setCopiedSection(secId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 sm:p-4 md:p-6 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative flex h-full w-full sm:max-h-[92vh] sm:max-w-6xl flex-col rounded-none sm:rounded-2xl border-0 sm:border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3 sm:px-5 sm:py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight">
                  Master Build Studio & AI Prompts
                </h2>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                  {blueprint.category.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Turn <span className="font-semibold text-cyan-300">{blueprint.productName}</span> from IDEA &rarr; MVP &rarr; PRODUCTION
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Download Markdown Blueprint button */}
            <button
              onClick={() => downloadBlueprintMarkdown(blueprint)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 hover:text-white transition-colors"
              title="Download Complete Blueprint as Markdown (.md)"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Download Blueprint (.md)</span>
              <span className="xs:hidden">.md</span>
            </button>

            {/* Reusable Code Library */}
            <a
              href="https://reusable-library.foundershivanand.workers.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/25 hover:text-white transition-colors"
              title="Open Reusable Code Library (33 enterprise modules for AI agents)"
            >
              <Library className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Reusable Library</span>
              <span className="sm:hidden">Library</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </a>

            {/* Download PDF button */}
            <a
              href="/Master-prompt.pdf"
              download="Master prompt.pdf"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              title="Download original Master prompt.pdf"
            >
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">PDF</span>
            </a>

            {/* Copy Full Prompt */}
            <button
              onClick={handleCopyAll}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md transition-all ${
                copiedAll
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
              }`}
            >
              {copiedAll ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied All!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Master Prompt</span>
                </>
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors ml-auto sm:ml-0"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Product Selector & Navigation Tabs */}
        <div className="flex flex-col border-b border-slate-800 bg-slate-900/90 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 gap-2 sm:gap-4">
          {/* Product Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Project:</span>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="max-w-[240px] sm:max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-white outline-none focus:border-cyan-500 truncate"
            >
              <option value="">Generic / Template</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tag})
                </option>
              ))}
            </select>
            {currentProduct && (
              <span className="hidden lg:inline text-[11px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md truncate max-w-xs">
                {blueprint.productType}
              </span>
            )}
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 shrink-0 self-start sm:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('vibe_prompts')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === 'vibe_prompts'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>AI Coding Prompts (6 Phases)</span>
            </button>
            <button
              onClick={() => setActiveTab('master_27')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === 'master_27'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>27-Phase Blueprint</span>
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Tech Specs</span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Vibe-Coding Prompts (6 Phases) */}
        {activeTab === 'vibe_prompts' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60 space-y-6">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-cyan-200 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-cyan-400" />
                  Step-by-Step AI Vibe-Coding Prompts
                </h3>
                <p className="text-xs text-slate-300">
                  Feed these 6 prompts sequentially into <strong className="text-white">Claude</strong>, <strong className="text-white">Cursor</strong>, <strong className="text-white">Antigravity</strong>, <strong className="text-white">Bolt</strong>, or <strong className="text-white">ChatGPT</strong> to build <span className="text-cyan-300 font-semibold">{blueprint.productName}</span> incrementally without breaking code.
                </p>
              </div>
              <button
                onClick={handleCopyAll}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Full Prompt</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {blueprint.vibeCodingPrompts.map((vp) => {
                const isCopied = copiedPromptId === vp.phase;
                return (
                  <div
                    key={vp.phase}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5 transition-all hover:border-slate-700 shadow-lg space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs">
                          {vp.phase}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            Phase {vp.phase}: {vp.title}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Role: <span className="text-slate-300 font-medium">{vp.role}</span>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyVibePrompt(vp.phase, vp.prompt)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          isCopied
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-300'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Prompt Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-400" />
                            <span>Copy Phase {vp.phase} Prompt</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300">
                      {vp.summary}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5 space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Target Files
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {vp.filesToCreateOrModify.map((f) => (
                            <code key={f} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300 font-mono">
                              {f}
                            </code>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5 space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Definition of Done
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
                    </div>

                    <div className="pt-2">
                      <details className="group">
                        <summary className="text-[11px] font-medium text-slate-400 hover:text-cyan-400 cursor-pointer list-none flex items-center gap-1 select-none">
                          <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                          <span>View Raw Prompt Text</span>
                        </summary>
                        <div className="mt-2 rounded-lg border border-slate-800/90 bg-slate-950 p-3 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                          {vp.prompt}
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: 27-Phase Master Document */}
        {activeTab === 'master_27' && (
          <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
            {/* Left TOC */}
            <aside className="w-full md:w-64 sm:md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/50 flex flex-col max-h-48 md:max-h-full">
              <div className="p-2 border-b border-slate-800/80">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search 27 phases..."
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="overflow-y-auto p-2 space-y-1 flex-1">
                {filteredSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      selectedSectionId === sec.id
                        ? 'bg-cyan-500/15 font-semibold text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate pr-2">{sec.title}</span>
                    <ChevronRight
                      className={`h-3 w-3 shrink-0 ${
                        selectedSectionId === sec.id ? 'text-cyan-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </aside>

            {/* Right Section Content Viewer */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60">
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs">
                      {activeSection.id}
                    </div>
                    <h3 className="text-base font-bold text-white">
                      {activeSection.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleCopySection(activeSection.id, activeSection.content)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {copiedSection === activeSection.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied Phase</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-slate-400" />
                        <span>Copy Phase</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Injected banner for Section 1 */}
                {activeSection.id === 1 && currentProduct && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 space-y-1">
                    <p className="text-xs font-bold text-cyan-300">
                      Product Injected: {currentProduct.name}
                    </p>
                    <p className="text-xs text-slate-300">
                      {currentProduct.description || blueprint.problemSolved}
                    </p>
                  </div>
                )}

                {/* Preformatted section content */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-cyan-500 selection:text-black">
                  {activeSection.id === 1 && currentProduct
                    ? activeSection.content.replace(
                        '[PASTE MY PRODUCT IDEA HERE]',
                        `Project Name: ${currentProduct.name}\nDescription: ${
                          currentProduct.description || blueprint.problemSolved
                        }\nCategory: ${currentProduct.tag}\nProduct Type: ${blueprint.productType}`
                      )
                    : activeSection.content}
                </div>
              </div>
            </main>
          </div>
        )}

        {/* Tab 3: Technical Architecture & Blueprint */}
        {activeTab === 'architecture' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60 space-y-6">
            {/* Overview Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Workflow className="h-4 w-4 text-cyan-400" />
                Product Strategy & Core Problem
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Problem Solved</span>
                  <p className="text-xs text-slate-200 leading-relaxed">{blueprint.problemSolved}</p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Users</span>
                  <p className="text-xs text-slate-200 leading-relaxed">{blueprint.targetUsers}</p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Core Value Prop</span>
                  <p className="text-xs text-slate-200 leading-relaxed">{blueprint.coreValueProp}</p>
                </div>
              </div>
            </div>

            {/* Recommended Stack */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                Recommended Tech Stack (Optimized for Solo Dev / Low Cost)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Frontend</span>
                  <p className="text-xs font-semibold text-cyan-300">{blueprint.recommendedTechStack.frontend}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Backend</span>
                  <p className="text-xs font-semibold text-white">{blueprint.recommendedTechStack.backend}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Database</span>
                  <p className="text-xs font-semibold text-white">{blueprint.recommendedTechStack.database}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Authentication</span>
                  <p className="text-xs font-semibold text-white">{blueprint.recommendedTechStack.auth}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Hosting / CDN</span>
                  <p className="text-xs font-semibold text-white">{blueprint.recommendedTechStack.hosting}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Styling</span>
                  <p className="text-xs font-semibold text-white">{blueprint.recommendedTechStack.styling}</p>
                </div>
              </div>
            </div>

            {/* Database Tables */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-400" />
                Key Database Schema (Data Minimization Followed)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {blueprint.keyDatabaseTables.map((tbl) => (
                  <div key={tbl.name} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400">{tbl.name}</span>
                      <span className="text-[10px] text-slate-500">{tbl.columns.length} columns</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{tbl.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/80">
                      {tbl.columns.map((col) => (
                        <code key={col} className="rounded bg-slate-800 px-1 py-0.5 text-[10px] text-slate-300 font-mono">
                          {col}
                        </code>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Threat Model & Privacy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Security Threat Model
                </h3>
                <div className="space-y-2.5">
                  {blueprint.securityThreatModel.map((item, i) => (
                    <div key={i} className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300">{item.risk}</span>
                      </div>
                      <p className="text-[11px] text-rose-300/90 font-medium">Impact: {item.impact}</p>
                      <p className="text-[11px] text-slate-300">Mitigation: {item.mitigation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  Privacy & DPDP Compliance
                </h3>
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Frameworks</span>
                  <div className="flex flex-wrap gap-1">
                    {blueprint.privacyCompliance.regulations.map((reg) => (
                      <span key={reg} className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[11px] text-cyan-300 font-medium">
                        {reg}
                      </span>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs text-slate-300">
                    <p><strong className="text-slate-400">Data Retention:</strong> {blueprint.privacyCompliance.retention}</p>
                    <p><strong className="text-slate-400">Cookies Policy:</strong> {blueprint.privacyCompliance.cookieRequirements}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
