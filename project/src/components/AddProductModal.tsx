import { useState, useRef } from 'react';
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
} from 'lucide-react';
import {
  type Product,
  TAG_OPTIONS,
  TAG_LABELS,
  STATUS_OPTIONS,
  STATUS_LABELS,
  saveProduct,
} from '@/lib/turso';
import { sanitizeText, isValidUrl } from '@/lib/sanitize';
import { trackEvent } from '@/lib/analytics';
import {
  extractIdeaFromImage,
  getGeminiApiKey,
  saveGeminiApiKey,
  hasGeminiApiKey,
} from '@/lib/gemini';

export function AddProductModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (product: Product) => void;
}) {
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [tag, setTag] = useState<string>('web-app');
  const [status, setStatus] = useState<string>('idea');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image Upload & AI Vision State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyVal, setApiKeyVal] = useState(() => getGeminiApiKey());

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setError(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      // Auto-extract immediately on selection
      void runExtraction(result, file.type, file.name);
    };
    reader.readAsDataURL(file);
  }

  async function runExtraction(base64Data: string, mimeType: string, fileName: string) {
    setExtracting(true);
    setError(null);
    setExtractionSuccess(null);

    try {
      const extracted = await extractIdeaFromImage({
        base64Data,
        mimeType,
        fileName,
      });

      if (extracted.name) setName(extracted.name);
      if (extracted.description) setDescription(extracted.description);
      if (extracted.tag) setTag(extracted.tag);
      if (extracted.url) setUrl(extracted.url);

      setExtractionSuccess(
        extracted.usedAi
          ? `✓ Gemini AI extracted idea: "${extracted.name}"`
          : `✓ Captured idea from ${fileName}. (Connect Gemini API key for deep AI analysis)`
      );
      setTab('text'); // Switch to form so user can review & save
    } catch (err: any) {
      console.error('Vision extraction error:', err);
      const rawMsg = err?.message || 'Could not analyze image';
      const cleanMsg = rawMsg.replace(/^(?:Extraction notice:\s*)+/i, '');
      setError(`Extraction notice: ${cleanMsg}`);
    } finally {
      setExtracting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelected(files[0]);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileSelected(file);
          break;
        }
      }
    }
  }

  async function handleSave() {
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
    setSaving(true);

    const created = await saveProduct({
      name: cleanName,
      description: cleanDesc || null,
      url: cleanUrl || null,
      tag,
      status,
    });

    trackEvent('product_created', { tag, status });
    setSaving(false);
    onCreated(created);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose} />
      <div
        onPaste={handlePaste}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.08] bg-[#0c0d12]/95 backdrop-blur-2xl p-6 shadow-2xl shadow-black/90 animate-in zoom-in-95 duration-200"
      >
        <div className="mb-5 flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-base font-bold text-white tracking-tight">Add New Idea</h2>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
              New Idea
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab selection: Text Input vs Image Extraction */}
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-white/[0.03] p-1 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setTab('text')}
            className={`flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium transition-all ${
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
            className={`flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium transition-all ${
              tab === 'image'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 shadow-sm border border-emerald-500/30'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>📷 Extract from Image</span>
          </button>
        </div>

        {/* Status & Error Alerts */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {extractionSuccess && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-2.5 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{extractionSuccess}</span>
            </div>
            <button
              onClick={() => setExtractionSuccess(null)}
              className="text-white/40 hover:text-white text-[11px]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* TAB 1: Image Upload / AI Vision */}
        {tab === 'image' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-6 text-center transition-all hover:border-emerald-500/40 hover:bg-white/[0.04]"
            >
              {imagePreview ? (
                <div className="relative mx-auto max-w-xs">
                  <img
                    src={imagePreview}
                    alt="Uploaded preview"
                    className="max-h-48 w-full rounded-xl object-contain border border-white/[0.08]"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                    className="absolute right-2 top-2 rounded-lg bg-black/80 backdrop-blur-md p-1.5 text-white/60 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                    <Upload className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-xs font-medium text-white">
                    Drop screenshot, wireframe, or photo here
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">
                    or click to browse &bull; Paste image with <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/60 font-mono">Ctrl+V</kbd>
                  </p>
                </div>
              )}
            </div>

            {/* AI Vision extraction info */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-white/70 font-medium text-xs">Gemini AI Vision Extraction</span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
              >
                <Key className="h-3 w-3" />
                <span>{hasGeminiApiKey() ? 'API Key Configured ✓' : 'Add Gemini API Key'}</span>
              </button>
            </div>

            {showKeyInput && (
              <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-2">
                <label className="text-[11px] text-white/60 font-medium block">
                  Google Gemini API Key (free from Google AI Studio)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeyVal}
                    onChange={(e) => setApiKeyVal(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white placeholder-white/20 font-mono outline-none focus:border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      saveGeminiApiKey(apiKeyVal);
                      setShowKeyInput(false);
                    }}
                    className="rounded-xl bg-white text-black px-3.5 py-1.5 text-xs font-semibold hover:bg-white/90"
                  >
                    Save
                  </button>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:underline"
                >
                  <span>Get your free Gemini API key</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            )}

            {extracting && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-emerald-400 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Gemini is reading text and analyzing idea...</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Text Form (Always shown or populated after extraction) */}
        {tab === 'text' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-white/50">Idea Name *</label>
                {imagePreview && (
                  <span className="text-[10px] font-medium text-emerald-400 inline-flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    From Image
                  </span>
                )}
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="e.g. Supabase for AI Agents"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Description & Opportunity</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Core value proposition, problem solved, market flank..."
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">URL / Reference (Optional)</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Category Tag</label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#12131a] px-3.5 py-2 text-xs text-white outline-none focus:border-white/20 transition-all"
                >
                  {TAG_OPTIONS.map((t) => (
                    <option key={t} value={t}>{TAG_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#12131a] px-3.5 py-2 text-xs text-white outline-none focus:border-white/20 transition-all"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="flex-1 rounded-xl bg-white text-black py-2.5 text-xs font-semibold transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Add to Projects'}
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
