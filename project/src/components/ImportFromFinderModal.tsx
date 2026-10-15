import { useState, useRef } from 'react';
import { X, Sparkles, Compass, ExternalLink, Check, AlertCircle, ListOrdered, ArrowRight, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import {
  type ProductWithTasks,
  TAG_OPTIONS,
  TAG_LABELS,
  STATUS_OPTIONS,
  STATUS_LABELS,
  saveProduct,
  addCustomTask,
} from '@/lib/turso';
import { sanitizeText, isValidUrl } from '@/lib/sanitize';
import { trackEvent } from '@/lib/analytics';
import { extractIdeaFromImage } from '@/lib/gemini';

export interface FinderIdeaPayload {
  id?: string;
  name: string;
  description: string;
  url?: string;
  tag?: string;
  status?: string;
  source?: string;
  sourceUrl?: string;
  blueprint?: string;
  vibeGuide?: Array<{
    step: number;
    title: string;
    why?: string;
    prompt?: string;
    doneWhen?: string;
  }>;
}

function normalizeTag(tag?: string): string {
  const t = (tag || '').toLowerCase();
  if (t === 'app' || t === 'mobile' || t.includes('ios') || t.includes('android')) return 'app';
  if (t === 'games' || t.includes('game')) return 'games';
  if (t === 'saas' || t.includes('b2b') || t.includes('crm') || t.includes('subscription') || t.includes('ecommerce')) return 'saas';
  if (t === 'tool' || t.includes('util') || t.includes('dev') || t.includes('ai') || t.includes('extension')) return 'tool';
  if (t === 'made-for-fun' || t.includes('fun')) return 'made-for-fun';
  return 'web-app';
}

export function ImportFromFinderModal({
  initialData,
  onClose,
  onImported,
}: {
  initialData?: FinderIdeaPayload | null;
  onClose: () => void;
  onImported: (product: ProductWithTasks) => void;
}) {
  const [pasteInput, setPasteInput] = useState('');
  const [data, setData] = useState<FinderIdeaPayload>(() => {
    return (
      initialData || {
        name: '',
        description: '',
        url: '',
        tag: 'web-app',
        status: 'idea',
        source: 'Finder',
        sourceUrl: 'https://finder-d17.pages.dev/',
      }
    );
  });

  const [name, setName] = useState(data.name || '');
  const [description, setDescription] = useState(data.description || '');
  const [url, setUrl] = useState(data.url || data.sourceUrl || '');
  const [tag, setTag] = useState<string>(() => normalizeTag(data.tag));
  const [status, setStatus] = useState<string>(data.status || 'idea');
  const [includeVibeTasks, setIncludeVibeTasks] = useState(true);
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractingImage, setExtractingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageSelected(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }
    setError(null);
    setExtractingImage(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const extracted = await extractIdeaFromImage({
          base64Data: base64,
          mimeType: file.type,
          fileName: file.name,
        });
        applyParsedData(extracted);
      } catch (err: any) {
        setError(`Image extraction notice: ${err?.message || 'Could not analyze image'}`);
      } finally {
        setExtractingImage(false);
      }
    };
    reader.readAsDataURL(file);
  }

  // Handle parsing a pasted Finder link or JSON
  function handleParsePaste() {
    setError(null);
    const raw = pasteInput.trim();
    if (!raw) return;

    // Check if JSON
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        applyParsedData(parsed);
        return;
      } catch {
        // Not valid JSON, continue to URL parser
      }
    }

    // Check if Finder URL with query params
    try {
      const parsedUrl = new URL(raw);
      const importParam = parsedUrl.searchParams.get('import_idea');
      if (importParam) {
        try {
          applyParsedData(JSON.parse(importParam));
          return;
        } catch {
          try {
            applyParsedData(JSON.parse(decodeURIComponent(importParam)));
            return;
          } catch {
            // continue
          }
        }
      }

      // Check URL path like /hit/trustmrr/zachis-stealth-comp
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'hit' && pathParts[2]) {
        const ideaId = pathParts[2];
        const formattedName = ideaId
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        applyParsedData({
          name: formattedName,
          description: `Imported idea from Finder (${pathParts[1]}: ${ideaId})`,
          source: `Finder (${pathParts[1]})`,
          sourceUrl: raw,
          url: raw,
          tag: 'web-app',
          status: 'idea',
        });
        return;
      }
    } catch {
      // not a valid URL
    }

    setError('Could not recognize Finder idea format. Please paste a valid Finder link or JSON.');
  }

  function applyParsedData(parsed: Partial<FinderIdeaPayload>) {
    if (parsed.name) setName(parsed.name);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.url || parsed.sourceUrl) setUrl(parsed.url || parsed.sourceUrl || '');
    if (parsed.tag) setTag(normalizeTag(parsed.tag));
    if (parsed.status && (STATUS_OPTIONS as readonly string[]).includes(parsed.status)) setStatus(parsed.status);
    setData((prev) => ({ ...prev, ...parsed, tag: parsed.tag ? normalizeTag(parsed.tag) : prev.tag }));
  }

  async function handleSave() {
    const cleanName = sanitizeText(name);
    const cleanDesc = sanitizeText(description);
    const cleanUrl = url.trim();

    if (!cleanName) {
      setError('Project name is required.');
      return;
    }

    if (cleanUrl && !isValidUrl(cleanUrl)) {
      setError('Please enter a valid URL (http:// or https://)');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // Combine description with source note if available
      let finalDesc = cleanDesc;
      if (data.sourceUrl && !finalDesc.includes(data.sourceUrl)) {
        finalDesc = finalDesc ? `${finalDesc}\n\n[Mined from Finder](${data.sourceUrl})` : `Mined from Finder: ${data.sourceUrl}`;
      }

      const created = await saveProduct({
        id: data.id,
        name: cleanName,
        description: finalDesc || null,
        url: cleanUrl || data.sourceUrl || null,
        tag,
        status,
      });

      // If vibe guide steps exist and user checked include, add them as custom tasks
      if (includeVibeTasks && data.vibeGuide && data.vibeGuide.length > 0) {
        for (const step of data.vibeGuide) {
          try {
            await addCustomTask(created.id, {
              id: crypto.randomUUID(),
              title: `Step ${step.step}: ${step.title}`,
              section: 'Finder Vibe Plan',
              status: 'not_started',
            });
          } catch (taskErr) {
            console.warn('Failed to add vibe step task:', taskErr);
          }
        }
      }

      trackEvent('product_imported_from_finder', { tag, status });
      setSaving(false);
      onImported(created);
    } catch (err: any) {
      console.error('Failed to save imported idea:', err);
      setError(err?.message || 'Failed to save project');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-emerald-500/40 bg-slate-900 p-6 shadow-2xl shadow-emerald-950/40 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Push to Project Manager</h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  Finder Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">Turn this validated startup idea into an active tracked project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Paste link or upload image helper if no initial data */}
        {!initialData?.name && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2.5">
            <div>
              <p className="text-xs font-medium text-slate-300 mb-1.5">Paste Finder idea link or JSON</p>
              <div className="flex gap-2">
                <input
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder="https://finder-d17.pages.dev/hit/trustmrr/..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleParsePaste}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shrink-0"
                >
                  Load Idea
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
              <span className="text-slate-400">Or extract idea from screenshot / wireframe:</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageSelected(e.target.files[0]);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={extractingImage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-cyan-300 hover:bg-cyan-900/50 hover:text-white transition-colors"
              >
                {extractingImage ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-cyan-400" />
                    <span>📷 Upload Image (Gemini AI)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form fields */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ToonThis Rival"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Category Tag</label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              >
                {TAG_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {TAG_LABELS[t] || t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] || s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Opportunity Thesis / Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Key market flank, negative review insights, or why build now..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">Source Link / Inspiration</label>
              {data.sourceUrl && (
                <a
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                >
                  <span>View on Finder</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Vibe guide steps callout if available */}
          {data.vibeGuide && data.vibeGuide.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVibeTasks}
                  onChange={(e) => setIncludeVibeTasks(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <ListOrdered className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Include {data.vibeGuide.length} Sequenced Vibe Tasks</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Adds prompts and implementation tasks directly to your project's launch checklist.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Blueprint preview toggle if available */}
          {data.blueprint && (
            <div>
              <button
                type="button"
                onClick={() => setShowBlueprint((v) => !v)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>{showBlueprint ? 'Hide' : 'View'} AI Master Blueprint</span>
                <ArrowRight className={`h-3 w-3 transition-transform ${showBlueprint ? 'rotate-90' : ''}`} />
              </button>
              {showBlueprint && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
                  {data.blueprint}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Add to My Projects</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
