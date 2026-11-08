import { useState, useRef, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Check,
  Key,
  ExternalLink,
  Loader2,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  RotateCcw,
  Plus,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  type Product,
  type ProductWithTasks,
  TAG_OPTIONS,
  TAG_LABELS,
  STATUS_OPTIONS,
  STATUS_LABELS,
  saveProduct,
  importProducts,
  addCustomTask,
} from '@/lib/turso';
import { sanitizeText, isValidUrl } from '@/lib/sanitize';
import { trackEvent } from '@/lib/analytics';
import {
  type ExtractedIdea,
  type ImageBatchItem,
  getGeminiApiKey,
  saveGeminiApiKey,
  clearGeminiApiKey,
  hasGeminiApiKey,
  verifyGeminiApiKey,
  compressAndPrepareImage,
  extractIdeasFromImage,
  extractLocalHeuristicIdea,
} from '@/lib/gemini';

export interface AddProductModalProps {
  onClose: () => void;
  onCreated: (product: Product) => void;
  onBatchCreated?: (products: Product[]) => void;
}

export function AddProductModal({
  onClose,
  onCreated,
  onBatchCreated,
}: AddProductModalProps) {
  const [tab, setTab] = useState<'text' | 'image'>('text');

  // Manual Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [tag, setTag] = useState<string>('web-app');
  const [status, setStatus] = useState<string>('idea');
  const [savingManual, setSavingManual] = useState(false);

  // Multi-Image & Batch Idea State
  const [batchItems, setBatchItems] = useState<ImageBatchItem[]>([]);
  const [extractedIdeas, setExtractedIdeas] = useState<ExtractedIdea[]>([]);
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<Set<string>>(new Set());
  const [expandedVibeGuideIds, setExpandedVibeGuideIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [overallProgress, setOverallProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });

  // UI & Alerts
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Gemini API Key Management
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getGeminiApiKey());
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyVerificationMsg, setKeyVerificationMsg] = useState<{
    valid: boolean;
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize API key value when opened
  useEffect(() => {
    setApiKeyInput(getGeminiApiKey());
  }, [showKeyConfig]);

  // Handle file selection (single or multiple images up to 10+)
  async function handleFilesSelected(fileList: FileList | File[]) {
    const rawFiles = Array.from(fileList);
    const validImageFiles = rawFiles.filter((f) => f.type.startsWith('image/'));

    if (validImageFiles.length === 0) {
      setError('Please select valid image files (PNG, JPG, WebP, SVG, GIF).');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    // Create batch items for newly uploaded images
    const newItems: ImageBatchItem[] = validImageFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      fileSize: file.size,
      previewUrl: '',
      mimeType: file.type || 'image/jpeg',
      status: 'queued',
      extractedIdeas: [],
    }));

    setBatchItems((prev) => [...prev, ...newItems]);
    void processUploadedItems(newItems);
  }

  // Concurrency-controlled batch extraction worker
  async function processUploadedItems(itemsToProcess: ImageBatchItem[]) {
    setIsProcessing(true);
    const activeApiKey = getGeminiApiKey();
    const concurrency = 2; // Process 2 images concurrently to respect rate limits

    let completedCount = 0;
    const totalCount = itemsToProcess.length;
    setOverallProgress({ completed: 0, total: totalCount });

    let nextIndex = 0;

    async function worker() {
      while (nextIndex < itemsToProcess.length) {
        const itemIdx = nextIndex++;
        const currentItem = itemsToProcess[itemIdx];

        // Mark item as processing
        setBatchItems((prev) =>
          prev.map((it) => (it.id === currentItem.id ? { ...it, status: 'processing' } : it))
        );

        try {
          // 1. Client-side canvas downscaling to avoid massive payloads
          const prepared = await compressAndPrepareImage(currentItem.file);

          // Update item preview
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === currentItem.id
                ? {
                    ...it,
                    previewUrl: prepared.previewUrl,
                    base64Data: prepared.base64Data,
                    mimeType: prepared.mimeType,
                  }
                : it
            )
          );

          // 2. Call Gemini multimodal vision (or smart local heuristic fallback)
          const ideas = await extractIdeasFromImage({
            base64Data: prepared.base64Data,
            mimeType: prepared.mimeType,
            fileName: currentItem.fileName,
            customApiKey: activeApiKey,
            imageIndex: itemIdx,
          });

          // Attach source metadata and guaranteed IDs
          const enrichedIdeas: ExtractedIdea[] = ideas.map((idea, i) => {
            const ideaId = idea.id || crypto.randomUUID();
            return {
              ...idea,
              id: ideaId,
              imageFileName: currentItem.fileName,
              imagePreview: prepared.previewUrl,
              imageIndex: itemIdx,
            };
          });

          // Mark item as done
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === currentItem.id
                ? { ...it, status: 'done', extractedIdeas: enrichedIdeas }
                : it
            )
          );

          // Append to extracted ideas and select them by default
          setExtractedIdeas((prev) => [...prev, ...enrichedIdeas]);
          setSelectedIdeaIds((prev) => {
            const next = new Set(prev);
            enrichedIdeas.forEach((idObj) => next.add(idObj.id!));
            return next;
          });
        } catch (err: any) {
          console.warn(`Extraction error for ${currentItem.fileName}:`, err);
          const fallback = extractLocalHeuristicIdea(currentItem.fileName, itemIdx);
          fallback.id = crypto.randomUUID();
          fallback.imageFileName = currentItem.fileName;

          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === currentItem.id
                ? { ...it, status: 'done', extractedIdeas: [fallback] }
                : it
            )
          );

          setExtractedIdeas((prev) => [...prev, fallback]);
          setSelectedIdeaIds((prev) => new Set(prev).add(fallback.id!));
        } finally {
          completedCount++;
          setOverallProgress({ completed: completedCount, total: totalCount });
        }
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, itemsToProcess.length) },
      () => worker()
    );

    await Promise.all(workers);
    setIsProcessing(false);
    setSuccessMessage(`Extracted ideas from ${totalCount} image${totalCount > 1 ? 's' : ''}!`);
  }

  // Drag and drop handlers
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFilesSelected(e.dataTransfer.files);
    }
  }

  // Paste handler supporting multiple images
  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      if (tab !== 'image') setTab('image');
      void handleFilesSelected(pastedFiles);
    }
  }

  // Remove uploaded image from batch
  function handleRemoveBatchItem(itemId: string) {
    const target = batchItems.find((b) => b.id === itemId);
    setBatchItems((prev) => prev.filter((b) => b.id !== itemId));

    if (target) {
      const removedIdeaIds = new Set(target.extractedIdeas.map((i) => i.id!));
      setExtractedIdeas((prev) => prev.filter((i) => !removedIdeaIds.has(i.id!)));
      setSelectedIdeaIds((prev) => {
        const next = new Set(prev);
        removedIdeaIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  // Clear all images and extracted ideas
  function handleClearAll() {
    setBatchItems([]);
    setExtractedIdeas([]);
    setSelectedIdeaIds(new Set());
    setError(null);
    setSuccessMessage(null);
  }

  // Update extracted idea fields inline
  function handleUpdateIdea(ideaId: string, updates: Partial<ExtractedIdea>) {
    setExtractedIdeas((prev) =>
      prev.map((idea) => (idea.id === ideaId ? { ...idea, ...updates } : idea))
    );
  }

  // Remove individual idea
  function handleRemoveIdea(ideaId: string) {
    setExtractedIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    setSelectedIdeaIds((prev) => {
      const next = new Set(prev);
      next.delete(ideaId);
      return next;
    });
  }

  // Toggle selection for an idea
  function handleToggleSelectIdea(ideaId: string) {
    setSelectedIdeaIds((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) {
        next.delete(ideaId);
      } else {
        next.add(ideaId);
      }
      return next;
    });
  }

  // Select/Deselect all ideas
  function handleToggleSelectAll() {
    if (selectedIdeaIds.size === extractedIdeas.length) {
      setSelectedIdeaIds(new Set());
    } else {
      setSelectedIdeaIds(new Set(extractedIdeas.map((i) => i.id!)));
    }
  }

  // Toggle vibe guide accordion
  function handleToggleVibeGuide(ideaId: string) {
    setExpandedVibeGuideIds((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) next.delete(ideaId);
      else next.add(ideaId);
      return next;
    });
  }

  // API Key Testing & Saving
  async function handleTestApiKey() {
    if (!apiKeyInput.trim()) {
      setKeyVerificationMsg({ valid: false, text: 'Please enter a Gemini API key first.' });
      return;
    }

    setIsTestingKey(true);
    setKeyVerificationMsg(null);
    const result = await verifyGeminiApiKey(apiKeyInput.trim());
    setIsTestingKey(false);

    if (result.valid) {
      saveGeminiApiKey(apiKeyInput.trim());
      setKeyVerificationMsg({
        valid: true,
        text: '✓ Key is active and verified! Gemini 2.5 Flash Vision enabled.',
      });
    } else {
      setKeyVerificationMsg({
        valid: false,
        text: `Verification failed: ${result.error}`,
      });
    }
  }

  function handleSaveApiKeyOnly() {
    saveGeminiApiKey(apiKeyInput);
    setShowKeyConfig(false);
    setKeyVerificationMsg(null);
  }

  function handleClearApiKey() {
    clearGeminiApiKey();
    setApiKeyInput('');
    setKeyVerificationMsg(null);
  }

  // Save manual entry idea
  async function handleSaveManual() {
    const cleanName = sanitizeText(name);
    const cleanDesc = sanitizeText(description);
    const cleanUrl = url.trim();

    if (!cleanName) {
      setError('Product name is required.');
      return;
    }

    if (cleanUrl && !isValidUrl(cleanUrl)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setError(null);
    setSavingManual(true);

    try {
      const created = await saveProduct({
        name: cleanName,
        description: cleanDesc || null,
        url: cleanUrl || null,
        tag,
        status,
      });

      trackEvent('product_created', { tag, status });
      setSavingManual(false);
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save product');
      setSavingManual(false);
    }
  }

  // Save single extracted idea
  async function handleSaveSingleIdea(idea: ExtractedIdea) {
    const cleanName = sanitizeText(idea.name);
    if (!cleanName) return;

    setSavingBatch(true);
    try {
      const created = await saveProduct({
        name: cleanName,
        description: idea.description ? sanitizeText(idea.description) : null,
        url: idea.url && isValidUrl(idea.url) ? idea.url.trim() : null,
        tag: idea.tag,
        status: idea.status || 'idea',
      });

      // Add vibe guide steps as initial tasks if present
      if (idea.vibeGuide && idea.vibeGuide.length > 0) {
        for (const step of idea.vibeGuide) {
          await addCustomTask(created.id, {
            id: crypto.randomUUID(),
            title: `[Step ${step.step}] ${step.title}`,
            section: 'Vibe Implementation',
            status: 'not_started',
          });
        }
      }

      trackEvent('product_created_from_image', { tag: idea.tag });
      setSavingBatch(false);
      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save idea');
      setSavingBatch(false);
    }
  }

  // Save all selected extracted ideas (batch import)
  async function handleSaveAllSelected() {
    const selectedIdeas = extractedIdeas.filter((i) => selectedIdeaIds.has(i.id!));
    if (selectedIdeas.length === 0) {
      setError('Please select at least one idea to add.');
      return;
    }

    setSavingBatch(true);
    setError(null);

    try {
      const itemsToImport = selectedIdeas.map((idea) => ({
        name: sanitizeText(idea.name) || 'New Extracted Product',
        description: idea.description ? sanitizeText(idea.description) : undefined,
        url: idea.url && isValidUrl(idea.url) ? idea.url.trim() : undefined,
        tag: idea.tag,
        status: idea.status || 'idea',
      }));

      const createdProducts = await importProducts(itemsToImport);

      // Add custom vibe guide steps for each product
      for (let i = 0; i < selectedIdeas.length; i++) {
        const idea = selectedIdeas[i];
        const product = createdProducts[i];
        if (product && idea.vibeGuide && idea.vibeGuide.length > 0) {
          for (const step of idea.vibeGuide) {
            await addCustomTask(product.id, {
              id: crypto.randomUUID(),
              title: `[Step ${step.step}] ${step.title}`,
              section: 'Vibe Implementation',
              status: 'not_started',
            });
          }
        }
      }

      trackEvent('batch_products_created_from_images', {
        count: createdProducts.length,
        imagesCount: batchItems.length,
      });

      setSavingBatch(false);

      if (onBatchCreated) {
        onBatchCreated(createdProducts);
      } else if (createdProducts[0]) {
        onCreated(createdProducts[0]);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save ideas');
      setSavingBatch(false);
    }
  }

  const hasApiKey = hasGeminiApiKey();
  const selectedCount = selectedIdeaIds.size;
  const isWideModal = tab === 'image' && (batchItems.length > 0 || extractedIdeas.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Main Modal Dialog */}
      <div
        onPaste={handlePaste}
        className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] ${
          isWideModal ? 'max-w-4xl' : 'max-w-lg'
        } max-h-[92vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.08] bg-[#0b0d13]/98 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl shadow-black/95 transition-all duration-300 animate-in zoom-in-95`}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-base font-bold text-white tracking-tight">
              Add New Idea
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
              {tab === 'image' && extractedIdeas.length > 0
                ? `${extractedIdeas.length} Idea${extractedIdeas.length > 1 ? 's' : ''} Found`
                : 'Workspace'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher: Manual Entry vs Extract from Images */}
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-white/[0.03] p-1 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all ${
              tab === 'text'
                ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.08]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <span>✍️ Manual Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('image')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all ${
              tab === 'image'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 shadow-sm border border-emerald-500/30'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>📷 Extract from Images (1 to 10+)</span>
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.08] px-3.5 py-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-white/40 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3.5 py-2.5 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-white/40 hover:text-white text-[11px]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: EXTRACT FROM IMAGES (MULTIPLE IMAGES SUPPORTED)        */}
        {/* ============================================================ */}
        {tab === 'image' && (
          <div className="space-y-4">
            {/* Hidden file input supporting multiple images */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/jpg,image/svg+xml,image/gif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void handleFilesSelected(e.target.files);
                }
              }}
            />

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl border border-dashed border-white/[0.14] bg-white/[0.02] p-5 text-center transition-all hover:border-emerald-500/40 hover:bg-white/[0.04]"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-2.5 text-xs font-semibold text-white tracking-tight">
                  Drop screenshots, wireframes, mockups, or notes (1 to 10+ images)
                </p>
                <p className="mt-1 text-[11px] text-white/50">
                  Select multiple files at once &bull; Paste directly with{' '}
                  <kbd className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/80 font-mono">
                    Ctrl+V
                  </kbd>
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-medium">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  <span>Supports multi-image batch extraction (10+ images)</span>
                </div>
              </div>
            </div>

            {/* Gemini Vision API Key & Engine Config Bar */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-white/80 font-medium text-xs">
                  {hasApiKey
                    ? 'Gemini 2.5 Flash Vision Active'
                    : 'Smart Heuristic Mode (Add Gemini Key for AI Vision)'}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <Key className="h-3 w-3" />
                <span>{showKeyConfig ? 'Close Settings' : hasApiKey ? 'Key Settings' : 'Add Gemini Key'}</span>
              </button>
            </div>

            {/* Collapsible API Key Drawer */}
            {showKeyConfig && (
              <div className="rounded-xl border border-white/[0.08] bg-black/60 p-3.5 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-white/70 block">
                    Google Gemini API Key (Multimodal Vision)
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:underline"
                  >
                    <span>Get free key at Google AI Studio</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      setKeyVerificationMsg(null);
                    }}
                    placeholder="AIzaSy..."
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder-white/20 font-mono outline-none focus:border-white/25"
                  />
                  <button
                    type="button"
                    onClick={handleTestApiKey}
                    disabled={isTestingKey || !apiKeyInput.trim()}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isTestingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                    <span>Test & Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveApiKeyOnly}
                    className="rounded-xl bg-white text-black px-3 py-1.5 text-xs font-semibold hover:bg-white/90"
                  >
                    Save
                  </button>
                  {hasApiKey && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
                      title="Clear API Key"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {keyVerificationMsg && (
                  <p
                    className={`text-[11px] font-medium ${
                      keyVerificationMsg.valid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {keyVerificationMsg.text}
                  </p>
                )}
              </div>
            )}

            {/* Batch Upload Progress Indicator */}
            {isProcessing && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>
                      Extracting ideas ({overallProgress.completed} / {overallProgress.total} images)...
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {Math.round(
                      overallProgress.total > 0
                        ? (overallProgress.completed / overallProgress.total) * 100
                        : 0
                    )}
                    %
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{
                      width: `${
                        overallProgress.total > 0
                          ? Math.round(
                              (overallProgress.completed / overallProgress.total) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Uploaded Images Queue / Gallery */}
            {batchItems.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/80">
                    Uploaded Images ({batchItems.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add More</span>
                    </button>
                    <span className="text-white/20">&bull;</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[11px] text-white/40 hover:text-rose-400 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Horizontal thumbnail scroll or wrap */}
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5">
                  {batchItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex-shrink-0 w-24 rounded-xl border border-white/[0.08] bg-black/40 p-1.5 overflow-hidden text-center"
                    >
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.fileName}
                          className="h-14 w-full rounded-lg object-cover border border-white/[0.06]"
                        />
                      ) : (
                        <div className="flex h-14 w-full items-center justify-center rounded-lg bg-white/[0.03]">
                          <ImageIcon className="h-5 w-5 text-white/30" />
                        </div>
                      )}

                      <p
                        className="mt-1 truncate text-[10px] text-white/70 font-mono"
                        title={item.fileName}
                      >
                        {item.fileName}
                      </p>

                      {/* Status indicator */}
                      <div className="mt-0.5">
                        {item.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400">
                            <Loader2 className="h-2 w-2 animate-spin" />
                            Analyzing
                          </span>
                        )}
                        {item.status === 'done' && (
                          <span className="text-[9px] text-emerald-400 font-medium">
                            ✓ {item.extractedIdeas.length} idea
                            {item.extractedIdeas.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {item.status === 'queued' && (
                          <span className="text-[9px] text-white/40">Queued</span>
                        )}
                      </div>

                      {/* Remove image button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveBatchItem(item.id)}
                        className="absolute top-1 right-1 rounded-md bg-black/80 p-1 text-white/50 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Ideas Review List */}
            {extractedIdeas.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      Extracted Ideas ({extractedIdeas.length})
                    </span>
                    <span className="text-[11px] text-white/40">
                      ({selectedCount} selected to add)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white"
                    >
                      {selectedCount === extractedIdeas.length ? (
                        <>
                          <CheckSquare className="h-3 w-3 text-emerald-400" />
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <Square className="h-3 w-3" />
                          <span>Select All</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Ideas Cards Grid */}
                <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                  {extractedIdeas.map((idea, index) => {
                    const isSelected = selectedIdeaIds.has(idea.id!);
                    const isVibeExpanded = expandedVibeGuideIds.has(idea.id!);

                    return (
                      <div
                        key={idea.id || index}
                        className={`rounded-2xl border p-3.5 transition-all ${
                          isSelected
                            ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                            : 'border-white/[0.06] bg-white/[0.01] opacity-75'
                        }`}
                      >
                        {/* Top row: Checkbox, Name, Tag & Actions */}
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectIdea(idea.id!)}
                            className="mt-1 text-white/60 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Square className="h-4 w-4 text-white/30" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Title & Tag header */}
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                value={idea.name}
                                onChange={(e) =>
                                  handleUpdateIdea(idea.id!, { name: e.target.value })
                                }
                                placeholder="Idea name..."
                                className="flex-1 min-w-[180px] rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-white placeholder-white/20 outline-none focus:border-white/25"
                              />

                              <select
                                value={idea.tag}
                                onChange={(e) =>
                                  handleUpdateIdea(idea.id!, {
                                    tag: e.target.value as ExtractedIdea['tag'],
                                  })
                                }
                                className="rounded-lg border border-white/[0.08] bg-[#12141c] px-2 py-1 text-[11px] text-white/90 outline-none focus:border-white/25"
                              >
                                {TAG_OPTIONS.map((t) => (
                                  <option key={t} value={t}>
                                    {TAG_LABELS[t]}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={idea.status}
                                onChange={(e) =>
                                  handleUpdateIdea(idea.id!, { status: e.target.value })
                                }
                                className="rounded-lg border border-white/[0.08] bg-[#12141c] px-2 py-1 text-[11px] text-white/90 outline-none focus:border-white/25"
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {STATUS_LABELS[s] ?? s}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => handleRemoveIdea(idea.id!)}
                                className="rounded-lg p-1 text-white/30 hover:text-rose-400 transition-colors"
                                title="Remove idea"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Description textarea */}
                            <div>
                              <textarea
                                value={idea.description}
                                onChange={(e) =>
                                  handleUpdateIdea(idea.id!, { description: e.target.value })
                                }
                                rows={2}
                                placeholder="Idea description & core opportunity..."
                                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] p-2 text-xs text-white/90 placeholder-white/20 outline-none focus:border-white/20"
                              />
                            </div>

                            {/* Metadata snippet & Reference URL */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40">
                              <div className="flex items-center gap-2">
                                {idea.imagePreview && (
                                  <img
                                    src={idea.imagePreview}
                                    alt="Source"
                                    className="h-4 w-4 rounded object-cover border border-white/10"
                                  />
                                )}
                                <span className="font-mono text-[10px] truncate max-w-[140px]">
                                  {idea.imageFileName || 'Image Upload'}
                                </span>
                                {idea.usedAi && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-medium">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    AI Vision
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {idea.vibeGuide && idea.vibeGuide.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleVibeGuide(idea.id!)}
                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                                  >
                                    <span>{idea.vibeGuide.length} Vibe Steps</span>
                                    {isVibeExpanded ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleSaveSingleIdea(idea)}
                                  disabled={savingBatch}
                                  className="text-[11px] text-white/60 hover:text-white font-medium underline"
                                >
                                  Add this only
                                </button>
                              </div>
                            </div>

                            {/* Collapsible Vibe Coding Steps */}
                            {isVibeExpanded && idea.vibeGuide && (
                              <div className="mt-2 space-y-1.5 rounded-xl border border-white/[0.06] bg-black/40 p-2.5 text-xs animate-in fade-in duration-150">
                                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
                                  Vibe Coding Blueprint Steps
                                </span>
                                {idea.vibeGuide.map((step) => (
                                  <div
                                    key={step.step}
                                    className="rounded-lg bg-white/[0.02] p-2 border border-white/[0.04]"
                                  >
                                    <p className="font-semibold text-white/90 text-[11px]">
                                      Step {step.step}: {step.title}
                                    </p>
                                    {step.prompt && (
                                      <p className="mt-0.5 font-mono text-[10px] text-emerald-300/80">
                                        Prompt: {step.prompt}
                                      </p>
                                    )}
                                    {step.doneWhen && (
                                      <p className="mt-0.5 text-[10px] text-white/50">
                                        Done when: {step.doneWhen}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Batch Actions */}
            {extractedIdeas.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
                <div className="text-xs text-white/60">
                  <span className="font-semibold text-white">{selectedCount}</span> of{' '}
                  <span className="font-semibold text-white">{extractedIdeas.length}</span> ideas
                  selected
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAllSelected}
                    disabled={selectedCount === 0 || savingBatch}
                    className="flex items-center gap-1.5 rounded-xl bg-white text-black px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40"
                  >
                    {savingBatch ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Adding to Projects...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-black" />
                        <span>Add {selectedCount} Idea{selectedCount > 1 ? 's' : ''} to Projects</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: MANUAL TEXT ENTRY (CLASSIC FORM)                      */}
        {/* ============================================================ */}
        {tab === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                Idea / Project Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="e.g. Supabase for AI Agents"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/25 focus:bg-white/[0.05] transition-all"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                Description & Opportunity
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Core value proposition, problem solved, target users..."
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/25 focus:bg-white/[0.05] transition-all"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                Reference URL (Optional)
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/25 focus:bg-white/[0.05] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Category Tag
                </label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#12131a] px-3.5 py-2 text-xs text-white outline-none focus:border-white/25 transition-all"
                >
                  {TAG_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {TAG_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#12131a] px-3.5 py-2 text-xs text-white outline-none focus:border-white/25 transition-all"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleSaveManual}
                disabled={!name.trim() || savingManual}
                className="flex-1 rounded-xl bg-white text-black py-2.5 text-xs font-semibold transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40"
              >
                {savingManual ? 'Saving...' : 'Add to Projects'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
