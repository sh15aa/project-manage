import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  Search,
  BookOpen,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  MASTER_PROMPT_RAW,
  MASTER_PROMPT_SECTIONS,
  generateProductPrompt,
} from '@/lib/masterPrompt';
import type { ProductWithTasks } from '@/lib/supabase';

interface MasterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: ProductWithTasks[];
  initialProductId?: string | null;
}

export const MasterPromptModal: React.FC<MasterPromptModalProps> = ({
  isOpen,
  onClose,
  products = [],
  initialProductId = null,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId ?? '');
  const [selectedSectionId, setSelectedSectionId] = useState<number>(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSection, setCopiedSection] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected product if any
  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) ?? null;
  }, [products, selectedProductId]);

  // Generate full prompt customized for the selected product
  const fullPrompt = useMemo(() => {
    if (!currentProduct) return MASTER_PROMPT_RAW;
    return generateProductPrompt(
      currentProduct.name,
      currentProduct.description ?? undefined,
      currentProduct.tag
    );
  }, [currentProduct]);

  // Filter sections by search query
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

  const handleCopySection = async (secId: number, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedSection(secId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 md:p-6 backdrop-blur-md">
      <div className="relative flex h-full max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Master Launch Prompt
                </h2>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                  27 Blueprint Phases
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extracted from <code className="text-cyan-300">Master prompt.pdf</code> &bull; Complete IDEA → PRODUCTION OS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download PDF button */}
            <a
              href="/Master-prompt.pdf"
              download="Master prompt.pdf"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              title="Download original Master prompt.pdf"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              <span>Download PDF</span>
            </a>

            {/* View PDF tab */}
            <a
              href="/Master-prompt.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              title="Open PDF in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Open PDF</span>
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
                  <span>Copied 27 Phases!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Full Prompt</span>
                </>
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Customization Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-800/80 bg-slate-900/90 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Customize for:</span>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium text-white outline-none focus:border-cyan-500"
            >
              <option value="">Generic / Template Prompt</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.tag})
                </option>
              ))}
            </select>
            {currentProduct && (
              <span className="hidden md:inline text-[11px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                Auto-injected into Section 1
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 27 phases..."
              className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Content Body: Left sidebar (TOC) + Right viewer */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left TOC */}
          <aside className="w-64 sm:w-72 shrink-0 border-r border-slate-800 bg-slate-950/50 overflow-y-auto p-2 space-y-1">
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Phases ({filteredSections.length})
            </p>
            {filteredSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSelectedSectionId(sec.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
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
          </aside>

          {/* Right Section Content Viewer */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60">
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
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
                      <span className="text-emerald-400">Copied Section</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-slate-400" />
                      <span>Copy Phase</span>
                    </>
                  )}
                </button>
              </div>

              {/* Injected banner for Section 1 if product selected */}
              {activeSection.id === 1 && currentProduct && (
                <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5">
                  <p className="text-xs font-semibold text-cyan-300">
                    Product Injected: {currentProduct.name}
                  </p>
                  {currentProduct.description && (
                    <p className="mt-1 text-xs text-slate-300">
                      {currentProduct.description}
                    </p>
                  )}
                </div>
              )}

              {/* Preformatted section content */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-cyan-500 selection:text-black">
                {activeSection.id === 1 && currentProduct
                  ? activeSection.content.replace(
                      '[PASTE MY PRODUCT IDEA HERE]',
                      `Project Name: ${currentProduct.name}\nDescription: ${
                        currentProduct.description || 'N/A'
                      }\nCategory: ${currentProduct.tag}`
                    )
                  : activeSection.content}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
