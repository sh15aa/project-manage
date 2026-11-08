/**
 * Google Gemini API Client & Workspace Assistant Engine
 * Supports multimodal image extraction (Vision) and full-workspace project chatbot.
 */

import type { ProductWithTasks } from './turso';

// Safe default key decoded at runtime
const _RAW_DEFAULT_KEY = '';

export const DEFAULT_GEMINI_API_KEY = _RAW_DEFAULT_KEY;
export const DEFAULT_GEMINI_PROJECT_ID = 'projects/830811815910';
export const GEMINI_API_KEY_STORAGE = 'producthub_gemini_api_key';

export function getGeminiApiKey(): string {
  if (typeof window === 'undefined') return DEFAULT_GEMINI_API_KEY;
  const stored = localStorage.getItem(GEMINI_API_KEY_STORAGE);
  if (stored && stored.trim()) return stored.trim();
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';
  if (envKey && envKey.trim()) return envKey.trim();
  return DEFAULT_GEMINI_API_KEY;
}

export function saveGeminiApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (!key.trim()) {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  } else {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  }
}

export function clearGeminiApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GEMINI_API_KEY_STORAGE);
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

/**
 * Validates a Gemini API Key with a lightweight ping to the models endpoint.
 */
export async function verifyGeminiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, error: 'Please enter a Gemini API key.' };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`
    );
    if (res.ok) {
      return { valid: true };
    }
    const data = await res.json().catch(() => ({}));
    const message = data.error?.message || `API returned status ${res.status}`;
    return { valid: false, error: message };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Network error reaching Google API' };
  }
}

export interface ExtractedIdea {
  id?: string;
  name: string;
  description: string;
  tag: 'app' | 'web-app' | 'tool' | 'saas' | 'made-for-fun' | 'games';
  status: string;
  url?: string;
  source?: string;
  vibeGuide?: Array<{
    step: number;
    title: string;
    why?: string;
    prompt?: string;
    doneWhen?: string;
  }>;
  extractedText?: string;
  usedAi: boolean;
  imageFileName?: string;
  imagePreview?: string;
  imageIndex?: number;
}

export interface ImageBatchItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  previewUrl: string;
  base64Data?: string;
  mimeType: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  error?: string;
  extractedIdeas: ExtractedIdea[];
}

/**
 * Client-side canvas image downscaling & compression.
 * Reduces 5MB-20MB mobile screenshots to ~200KB-400KB in milliseconds,
 * allowing 10+ images to be uploaded and processed smoothly without memory leaks.
 */
export async function compressAndPrepareImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ base64Data: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error(`Empty file read for ${file.name}`));
        return;
      }

      // If SVG or tiny image (< 200KB), return directly
      if (file.type === 'image/svg+xml' || file.size < 200 * 1024) {
        resolve({
          base64Data: dataUrl,
          mimeType: file.type || 'image/jpeg',
          previewUrl: dataUrl,
        });
        return;
      }

      const img = new Image();
      img.onerror = () => {
        resolve({
          base64Data: dataUrl,
          mimeType: file.type || 'image/jpeg',
          previewUrl: dataUrl,
        });
      };
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width <= maxDimension && height <= maxDimension) {
          resolve({
            base64Data: dataUrl,
            mimeType: file.type || 'image/jpeg',
            previewUrl: dataUrl,
          });
          return;
        }

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              base64Data: dataUrl,
              mimeType: file.type || 'image/jpeg',
              previewUrl: dataUrl,
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({
            base64Data: compressedDataUrl,
            mimeType: 'image/jpeg',
            previewUrl: compressedDataUrl,
          });
        } catch {
          resolve({
            base64Data: dataUrl,
            mimeType: file.type || 'image/jpeg',
            previewUrl: dataUrl,
          });
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Intelligent local fallback heuristic for extracting product concepts when
 * Gemini API key is unconfigured or network/quota fails. Guarantees 0-crash reliability.
 */
export function extractLocalHeuristicIdea(fileName?: string, index?: number): ExtractedIdea {
  let cleanName = (fileName || 'App Idea')
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(screenshot|screen shot|img|image|photo|wireframe|mockup|v\d+|\d{4}-\d{2}-\d{2})\b/gi, '')
    .trim();

  // If the filename was just timestamps or numbers like '2026 11 08 at 14.22.10'
  if (/^[\d\s.:\-_at]+$/i.test(cleanName) || cleanName.length < 2) {
    cleanName = '';
  }

  const formattedName = cleanName
    ? cleanName
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : index !== undefined
    ? `Product Concept ${index + 1}`
    : 'New Software Product';

  const lower = (fileName || '').toLowerCase();
  let tag: ExtractedIdea['tag'] = 'web-app';
  if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android') || lower.includes('app')) {
    tag = 'app';
  } else if (lower.includes('saas') || lower.includes('b2b') || lower.includes('crm') || lower.includes('billing')) {
    tag = 'saas';
  } else if (
    lower.includes('tool') ||
    lower.includes('cli') ||
    lower.includes('util') ||
    lower.includes('api') ||
    lower.includes('ai') ||
    lower.includes('generator')
  ) {
    tag = 'tool';
  } else if (lower.includes('game') || lower.includes('play')) {
    tag = 'games';
  } else if (lower.includes('fun') || lower.includes('meme')) {
    tag = 'made-for-fun';
  }

  return {
    id: crypto.randomUUID(),
    name: formattedName,
    description: `Captured from ${fileName || 'uploaded image'}. Ready for vibe coding, market validation, and rapid launch.`,
    tag,
    status: 'idea',
    source: 'Image Upload',
    vibeGuide: [
      {
        step: 1,
        title: `Design architecture & UI layout for ${formattedName}`,
        prompt: `Create a clean, responsive prototype for ${formattedName} with modern dark UI styling.`,
        doneWhen: 'User interface components and initial routing are functional.',
      },
      {
        step: 2,
        title: 'Implement core functionality & business logic',
        prompt: 'Build out the primary interactive workflow and local state management.',
        doneWhen: 'Main user journey completes end-to-end without errors.',
      },
      {
        step: 3,
        title: 'Add persistence, polish, and export',
        prompt: 'Connect storage/API backend, add error handling, and polish responsive design.',
        doneWhen: 'Ready for production deployment and user testing.',
      },
    ],
    usedAi: false,
  };
}

/**
 * Normalizes raw tag strings to valid TAG_OPTIONS.
 */
function normalizeExtractedTag(rawTag?: string): ExtractedIdea['tag'] {
  const validTags = ['app', 'web-app', 'tool', 'saas', 'made-for-fun', 'games'] as const;
  const t = (rawTag || '').toLowerCase().trim();
  if (validTags.includes(t as any)) return t as any;
  if (t.includes('mobile') || t.includes('ios') || t.includes('android')) return 'app';
  if (t.includes('saas') || t.includes('b2b') || t.includes('crm')) return 'saas';
  if (t.includes('tool') || t.includes('ai') || t.includes('dev') || t.includes('cli') || t.includes('util'))
    return 'tool';
  if (t.includes('game')) return 'games';
  if (t.includes('fun')) return 'made-for-fun';
  return 'web-app';
}

/**
 * Calls Gemini API models with automatic fallback across supported multimodal models.
 */
async function fetchGeminiGenerateContent(
  apiKey: string,
  body: any,
  preferredModel: string = 'gemini-2.5-flash'
): Promise<Response> {
  const modelsToTry = [
    preferredModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastResponse: Response | null = null;
  let lastError: any = null;

  for (const model of uniqueModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey.trim()
    )}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        return res;
      }

      // If key is unauthorized (401 or 403), stop immediately rather than hammering other models
      if (res.status === 401 || res.status === 403) {
        return res;
      }

      // If 400 Bad Request with responseMimeType, retry without responseMimeType
      if (res.status === 400 && body.generationConfig?.responseMimeType) {
        const fallbackBody = {
          ...body,
          generationConfig: { ...body.generationConfig },
        };
        delete fallbackBody.generationConfig.responseMimeType;
        const retryRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackBody),
        });
        if (retryRes.ok) return retryRes;
      }

      // If model not found (404), try next model
      if (res.status === 404) {
        console.warn(`Model ${model} returned 404, attempting fallback model...`);
        lastResponse = res;
        continue;
      }

      lastResponse = res;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error('Failed to reach Gemini API');
}

/**
 * Extracts ALL ideas from a single uploaded image using Gemini Vision API.
 * Supports images depicting a single product, or images containing multiple ideas (e.g. lists, whiteboards).
 */
export async function extractIdeasFromImage(params: {
  base64Data: string;
  mimeType: string;
  fileName?: string;
  customApiKey?: string;
  imageIndex?: number;
}): Promise<ExtractedIdea[]> {
  const apiKey = params.customApiKey || getGeminiApiKey();

  // If no API key configured, return smart local heuristic
  if (!apiKey) {
    const fallback = extractLocalHeuristicIdea(params.fileName, params.imageIndex);
    fallback.imageFileName = params.fileName;
    fallback.imagePreview = params.base64Data;
    return [fallback];
  }

  // Strip possible base64 URL prefix (e.g. data:image/png;base64,)
  let rawBase64 = params.base64Data;
  if (rawBase64.includes('base64,')) {
    rawBase64 = rawBase64.split('base64,')[1];
  }

  const prompt = `You are an elite product architect, venture scout, and vibe-coding engineer.
Analyze this uploaded image (which may be a software screenshot, wireframe, whiteboard diagram, product mockup, tweet, landing page, notes, or app concept).
Identify ALL viable software product opportunities, tools, or app concepts visible in the image.

RULES:
1. If the image depicts 1 primary product concept, return a JSON array with 1 item.
2. If the image contains a list, brainstorm, or multiple app ideas, return a JSON array with an item for EACH distinct idea (up to all ideas present).
3. Do NOT invent unrelated apps; extract the actual product opportunity shown in the image.
4. Each idea must follow this JSON schema:
{
  "name": "Catchy, concise product name (2 to 5 words)",
  "description": "2 to 3 sentences explaining the value proposition, key problem solved, and target users",
  "tag": "Strictly one of: 'app' (mobile), 'web-app', 'tool' (developer tool/utility/AI tool), 'saas' (B2B/subscription), 'made-for-fun', 'games'",
  "status": "idea",
  "url": "Any valid URL or website domain detected in the image (or empty string)",
  "extractedText": "Brief summary of any headline text, visible buttons, or handwritten notes from the image",
  "vibeGuide": [
    {
      "step": 1,
      "title": "Short title for step 1",
      "prompt": "Vibe coding prompt instruction",
      "doneWhen": "Acceptance criterion"
    },
    {
      "step": 2,
      "title": "Short title for step 2",
      "prompt": "Vibe coding prompt instruction",
      "doneWhen": "Acceptance criterion"
    },
    {
      "step": 3,
      "title": "Short title for step 3",
      "prompt": "Vibe coding prompt instruction",
      "doneWhen": "Acceptance criterion"
    }
  ]
}

Return ONLY a valid JSON array starting with '[' and ending with ']'. No markdown fences, no explanation text.`;

  try {
    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: params.mimeType || 'image/jpeg',
                data: rawBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetchGeminiGenerateContent(apiKey, body, 'gemini-2.5-flash');

    if (!res.ok) {
      // If unauthorized (401/403) or quota, fall back to smart local heuristic gracefully
      if (res.status === 401 || res.status === 403) {
        console.warn('Gemini API key is unauthorized. Falling back to smart local extraction.');
        const fallback = extractLocalHeuristicIdea(params.fileName, params.imageIndex);
        fallback.imageFileName = params.fileName;
        fallback.imagePreview = params.base64Data;
        return [fallback];
      }

      const errText = await res.text();
      console.warn('Gemini vision API error:', res.status, errText);
      throw new Error(`Gemini API returned status ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!candidateText) {
      throw new Error('Gemini returned an empty response for this image.');
    }

    const rawIdeas = parseIdeasJsonResiliently(candidateText);
    const ideas: ExtractedIdea[] = rawIdeas.map((parsed, idx) => {
      const finalTag = normalizeExtractedTag(parsed.tag);
      return {
        id: crypto.randomUUID(),
        name: parsed.name?.trim() || `Idea from ${params.fileName || 'Image'}`,
        description: parsed.description?.trim() || parsed.extractedText || 'Extracted from uploaded image.',
        tag: finalTag,
        status: 'idea',
        url: parsed.url && parsed.url.startsWith('http') ? parsed.url.trim() : undefined,
        extractedText: parsed.extractedText || undefined,
        vibeGuide: Array.isArray(parsed.vibeGuide) ? parsed.vibeGuide : undefined,
        source: 'Gemini Vision Extraction',
        usedAi: true,
        imageFileName: params.fileName,
        imagePreview: params.base64Data,
        imageIndex: params.imageIndex ?? idx,
      };
    });

    return ideas.length > 0 ? ideas : [extractLocalHeuristicIdea(params.fileName, params.imageIndex)];
  } catch (err: any) {
    console.error('Image vision extraction failed, falling back to local heuristic:', err);
    const fallback = extractLocalHeuristicIdea(params.fileName, params.imageIndex);
    fallback.imageFileName = params.fileName;
    fallback.imagePreview = params.base64Data;
    return [fallback];
  }
}

/**
 * Extracts a single idea from an image (backwards compatibility).
 */
export async function extractIdeaFromImage(params: {
  base64Data: string;
  mimeType: string;
  fileName?: string;
  customApiKey?: string;
}): Promise<ExtractedIdea> {
  const ideas = await extractIdeasFromImage(params);
  return ideas[0] || extractLocalHeuristicIdea(params.fileName);
}

/**
 * High-performance batch image processor.
 * Concurrently processes multiple images (1 to 10+ images) with live progress updates.
 */
export async function processImageBatch(
  files: File[],
  options: {
    concurrency?: number;
    customApiKey?: string;
    onItemUpdate?: (item: ImageBatchItem) => void;
  } = {}
): Promise<{ items: ImageBatchItem[]; allIdeas: ExtractedIdea[] }> {
  const concurrency = options.concurrency || 2;
  const apiKey = options.customApiKey || getGeminiApiKey();

  // Create initial items
  const items: ImageBatchItem[] = files.map((file) => ({
    id: crypto.randomUUID(),
    file,
    fileName: file.name,
    fileSize: file.size,
    previewUrl: '',
    mimeType: file.type || 'image/jpeg',
    status: 'queued',
    extractedIdeas: [],
  }));

  let currentIndex = 0;
  const allIdeas: ExtractedIdea[] = [];

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx];
      item.status = 'processing';
      options.onItemUpdate?.({ ...item });

      try {
        // Compress and prepare image to prevent payload bloat
        const prepared = await compressAndPrepareImage(item.file);
        item.previewUrl = prepared.previewUrl;
        item.base64Data = prepared.base64Data;
        item.mimeType = prepared.mimeType;

        // Extract ideas
        const ideas = await extractIdeasFromImage({
          base64Data: prepared.base64Data,
          mimeType: prepared.mimeType,
          fileName: item.fileName,
          customApiKey: apiKey,
          imageIndex: idx,
        });

        // Ensure each idea references its source image
        ideas.forEach((idea) => {
          idea.imageFileName = item.fileName;
          idea.imagePreview = prepared.previewUrl;
          if (!idea.id) idea.id = crypto.randomUUID();
        });

        item.status = 'done';
        item.extractedIdeas = ideas;
        allIdeas.push(...ideas);
      } catch (err: any) {
        console.warn(`Extraction error for ${item.fileName}:`, err);
        const fallbackIdea = extractLocalHeuristicIdea(item.fileName, idx);
        fallbackIdea.imageFileName = item.fileName;
        fallbackIdea.imagePreview = item.previewUrl;
        item.status = 'done';
        item.extractedIdeas = [fallbackIdea];
        allIdeas.push(fallbackIdea);
      }

      options.onItemUpdate?.({ ...item });
    }
  }

  // Run concurrency pool
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return { items, allIdeas };
}

/**
 * Resilient JSON parser supporting single objects, arrays, wrapped objects { ideas: [...] },
 * truncated bracket repairs, and regex field fallbacks.
 */
export function parseIdeasJsonResiliently(rawText: string): any[] {
  if (!rawText || !rawText.trim()) {
    throw new Error('Gemini returned an empty response for this image.');
  }

  let clean = rawText
    .replace(/^```(?:json)?\s*/gim, '')
    .replace(/```\s*$/gm, '')
    .replace(/```/g, '')
    .trim();

  // 1. Direct parse attempt
  try {
    const direct = JSON.parse(clean);
    if (Array.isArray(direct)) return direct;
    if (direct && typeof direct === 'object') {
      if (Array.isArray(direct.ideas)) return direct.ideas;
      if (Array.isArray(direct.products)) return direct.products;
      if (Array.isArray(direct.items)) return direct.items;
      return [direct];
    }
  } catch {}

  // 2. Bracket slice & repair attempt
  const firstBracket = clean.indexOf('[');
  const firstBrace = clean.indexOf('{');

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const arraySlice = clean.slice(firstBracket);
    const lastBracket = arraySlice.lastIndexOf(']');
    if (lastBracket !== -1) {
      try {
        const sliced = JSON.parse(arraySlice.slice(0, lastBracket + 1));
        if (Array.isArray(sliced)) return sliced;
      } catch {}
    }
    try {
      const repaired = repairTruncatedJson(arraySlice);
      const parsed = JSON.parse(repaired);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // 3. Object slice & repair attempt
  if (firstBrace !== -1) {
    const objSlice = clean.slice(firstBrace);
    try {
      const single = parseIdeaJsonResiliently(objSlice);
      if (Array.isArray(single)) return single;
      if (single && typeof single === 'object') {
        if (Array.isArray(single.ideas)) return single.ideas;
        return [single];
      }
    } catch {}
  }

  // 4. Regex extraction for multiple objects { "name": ... }
  const ideas: any[] = [];
  const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let match;
  while ((match = objectRegex.exec(clean)) !== null) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.name) ideas.push(parsed);
    } catch {}
  }
  if (ideas.length > 0) return ideas;

  // Single fallback parse
  const singleFallback = parseIdeaJsonResiliently(clean);
  return [singleFallback];
}

/**
 * Repairs truncated or malformed JSON emitted by LLMs when hitting token limits
 * or omitting closing brackets.
 */
function repairTruncatedJson(str: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      if (inString) escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' && stack[stack.length - 1] === '{') {
        stack.pop();
      } else if (ch === ']' && stack[stack.length - 1] === '[') {
        stack.pop();
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += '"';
  }

  // Strip trailing commas, colons, or incomplete key fragments before closing
  repaired = repaired.replace(/,\s*$/, '');
  repaired = repaired.replace(/:\s*$/, ': null');
  repaired = repaired.replace(/"[^"]*"\s*:\s*$/, '');
  repaired = repaired.replace(/,\s*$/, '');

  // Close remaining open brackets in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === '{') repaired += '}';
    else if (open === '[') repaired += ']';
  }

  return repaired;
}

/**
 * Resilient JSON parser for single LLM vision output objects
 */
function parseIdeaJsonResiliently(rawText: string): any {
  if (!rawText || !rawText.trim()) {
    throw new Error('Gemini returned an empty response for this image.');
  }

  let clean = rawText
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/```\s*$/m, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = clean.indexOf('{');
  if (firstBrace !== -1) {
    clean = clean.slice(firstBrace);
  }

  // 1. Direct parse attempt
  try {
    const direct = JSON.parse(clean);
    if (direct && typeof direct === 'object') return direct;
  } catch {}

  // 2. Try slice to last }
  const lastBrace = clean.lastIndexOf('}');
  if (lastBrace !== -1) {
    try {
      const sliced = JSON.parse(clean.slice(0, lastBrace + 1));
      if (sliced && typeof sliced === 'object') return sliced;
    } catch {}
  }

  // 3. Try automatic repair on full clean string
  try {
    const repaired = repairTruncatedJson(clean);
    const parsed = JSON.parse(repaired);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}

  // 3b. Try repair on slice up to last complete sub-object }
  if (lastBrace !== -1) {
    try {
      const repaired = repairTruncatedJson(clean.slice(0, lastBrace + 1));
      const parsed = JSON.parse(repaired);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
  }

  // 4. Regex fallback extraction for fields
  const fallback: any = {};
  const nameMatch = clean.match(/"name"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  if (nameMatch) {
    try {
      fallback.name = JSON.parse(`"${nameMatch[1]}"`);
    } catch {
      fallback.name = nameMatch[1];
    }
  }

  const descMatch = clean.match(/"description"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  if (descMatch) {
    try {
      fallback.description = JSON.parse(`"${descMatch[1]}"`);
    } catch {
      fallback.description = descMatch[1];
    }
  }

  const tagMatch = clean.match(/"tag"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  if (tagMatch) fallback.tag = tagMatch[1];

  const urlMatch = clean.match(/"url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  if (urlMatch) fallback.url = urlMatch[1];

  const textMatch = clean.match(/"extractedText"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
  if (textMatch) {
    try {
      fallback.extractedText = JSON.parse(`"${textMatch[1]}"`);
    } catch {
      fallback.extractedText = textMatch[1];
    }
  }

  if (fallback.name || fallback.description || fallback.extractedText) {
    return fallback;
  }

  throw new Error('Could not parse structured JSON from Gemini vision output.');
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  filterAction?: {
    tags?: string[];
    statuses?: string[];
    search?: string;
    label: string;
  };
  suggestedProductIds?: string[];
}

/**
 * Intelligent Project Assistant that has complete knowledge of all 96+ projects.
 * Supports natural questions like:
 * - "give me app ideas"
 * - "give me ideas that are in progress"
 * - "what developer tools do I have?"
 * - "recommend what I should build next"
 */
export async function askProjectAssistant(params: {
  question: string;
  products: ProductWithTasks[];
  history: ChatMessage[];
  customApiKey?: string;
}): Promise<Omit<ChatMessage, 'id' | 'timestamp' | 'role'>> {
  const q = params.question.toLowerCase().trim();
  const apiKey = params.customApiKey || getGeminiApiKey();

  // Try calling Gemini API if key is present
  if (apiKey) {
    try {
      return await callGeminiAssistant({ ...params, apiKey });
    } catch (err) {
      console.warn('Gemini chat API call failed, using embedded smart engine:', err);
    }
  }

  // Embedded Smart Assistant Engine (100% reliable, zero external dependencies required)
  return runEmbeddedAssistant(params);
}

/**
 * Embedded knowledge engine with intent recognition and database querying across all products.
 */
function runEmbeddedAssistant(params: {
  question: string;
  products: ProductWithTasks[];
}): Omit<ChatMessage, 'id' | 'timestamp' | 'role'> {
  const { question, products } = params;
  const q = question.toLowerCase().trim();

  // 1. "give me app ideas" / mobile apps
  if (
    q.includes('app idea') ||
    q.includes('mobile idea') ||
    q.includes('app ideas') ||
    (q.includes('app') && (q.includes('idea') || q.includes('suggest') || q.includes('give me') || q.includes('show')))
  ) {
    const appIdeas = products.filter((p) => p.tag === 'app');
    const ideaApps = appIdeas.filter((p) => p.status === 'idea');
    const displayList = ideaApps.length > 0 ? ideaApps : appIdeas;

    const top5 = displayList.slice(0, 5);
    const bullets = top5
      .map(
        (p, i) =>
          `**${i + 1}. [${p.name}](#view-${p.id})** (${p.tag.toUpperCase()})\n${p.description || 'Focused mobile experience.'}\n*Status: ${p.status} • Tasks: ${p.tasks.filter((t) => t.done).length}/${p.tasks.length} done*`
      )
      .join('\n\n');

    return {
      text: `📱 **Here are ${displayList.length} App Ideas in your workspace:**\n\n${bullets}\n\n💡 *Tip: Tap any project name above to view details, or click the button below to filter your dashboard.*`,
      filterAction: {
        tags: ['app'],
        statuses: ['idea'],
        label: `Filter Dashboard: App Ideas (${displayList.length})`,
      },
      suggestedProductIds: top5.map((p) => p.id),
    };
  }

  // 2. "give me ideas that are in progress" / working / ongoing
  if (
    q.includes('in progress') ||
    q.includes('in-progress') ||
    q.includes('working') ||
    q.includes('ongoing') ||
    q.includes('active build') ||
    q.includes('current work')
  ) {
    const workingProjects = products.filter((p) => p.status === 'working');

    if (workingProjects.length === 0) {
      return {
        text: `⚡ **No projects are currently marked as "Working" (in progress).**\n\nAll ${products.length} projects are either in the **Idea**, **Done**, or **Deployed** stages.\n\nWould you like me to recommend high-impact ideas to promote to **Working**?`,
        filterAction: {
          statuses: ['idea'],
          label: 'View Ideas Ready to Build',
        },
      };
    }

    const bullets = workingProjects
      .map((p, i) => {
        const done = p.tasks.filter((t) => t.done).length;
        const total = p.tasks.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return `**${i + 1}. [${p.name}](#view-${p.id})** [${p.tag}]\n${p.description || 'In active development.'}\n*Progress: ${done}/${total} tasks completed (${pct}%)*`;
      })
      .join('\n\n');

    return {
      text: `🚀 **Here are the ${workingProjects.length} Projects currently In Progress:**\n\n${bullets}\n\nTap on any project to open its master launch checklist!`,
      filterAction: {
        statuses: ['working'],
        label: `Filter Dashboard: In Progress (${workingProjects.length})`,
      },
      suggestedProductIds: workingProjects.map((p) => p.id),
    };
  }

  // 3. "give me saas ideas" / b2b
  if (q.includes('saas') || q.includes('b2b') || q.includes('subscription')) {
    const saasProjects = products.filter((p) => p.tag === 'saas');
    const top5 = saasProjects.slice(0, 5);
    const bullets = top5
      .map(
        (p, i) =>
          `**${i + 1}. [${p.name}](#view-${p.id})** [Status: ${p.status}]\n${p.description || 'High-margin SaaS solution.'}`
      )
      .join('\n\n');

    return {
      text: `💼 **Found ${saasProjects.length} SaaS Projects in your hub:**\n\n${bullets}`,
      filterAction: {
        tags: ['saas'],
        label: `Filter Dashboard: SaaS (${saasProjects.length})`,
      },
      suggestedProductIds: top5.map((p) => p.id),
    };
  }

  // 3b. "all links" / "ecosystem" / "reusable" / "factories"
  if (
    q.includes('all links') ||
    q.includes('links') ||
    q.includes('ecosystem') ||
    q.includes('hubs') ||
    q.includes('factories') ||
    q.includes('reusable') ||
    q.includes('library') ||
    q.includes('module') ||
    q.includes('mentor')
  ) {
    return {
      text: `🌐 **Personal Product Factory — All Ecosystem Links & Hubs:**\n\n` +
        `**1. [Finder — Startup & App Ideas](https://finder-d17.pages.dev/)** [IDEAS]\n` +
        `Market-validated startup opportunities from Reddit, TrustMRR, Product Hunt & App Store.\n\n` +
        `**2. [Enterprise Bot Product Factory](https://botserusable.pages.dev/)** [BOTS]\n` +
        `Enterprise bot architecture & reusable code library for chat bots, automation workflows & listeners.\n\n` +
        `**3. [AI Agent Product Factory](https://agentsreusable.pages.dev/)** [AGENTS]\n` +
        `Production-ready AI agent architectures, memory persistence & multi-agent coordination systems.\n\n` +
        `**4. [Mobile Product Factory](https://appreusable.pages.dev/)** [163 MOBILE MODULES]\n` +
        `163 production-grade mobile app components, offline-first sync engines & cross-platform layouts.\n\n` +
        `**5. [Reusable Code Library](https://reusable-library.foundershivanand.workers.dev/)** [33 CORE MODULES]\n` +
        `33 enterprise modules: Session Auth & RBAC, Stripe/LemonSqueezy Payments, R2 Storage & Webhooks.\n\n` +
        `**6. [AI Mentor Operating System](https://mentor-api.foundershivanand.workers.dev/)** [MENTOR OS]\n` +
        `Adversarial Socratic mentor for founders: zero empty praise, extreme accountability, bottleneck audits & flaw remediation.\n\n` +
        `💡 *Tip: Click the **All Links** button in the top navigation or sidebar to view the interactive popup!*`,
    };
  }

  // 4. "developer tools" / "tool"
  if (q.includes('tool') || q.includes('developer') || q.includes('dev tool') || q.includes('utility')) {
    const tools = products.filter((p) => p.tag === 'tool');
    const top5 = tools.slice(0, 5);
    const bullets = top5
      .map(
        (p, i) =>
          `**${i + 1}. [${p.name}](#view-${p.id})** [Status: ${p.status}]\n${p.description || 'Developer tool.'}`
      )
      .join('\n\n');

    return {
      text: `🛠️ **Found ${tools.length} Developer Tools in your hub:**\n\n${bullets}`,
      filterAction: {
        tags: ['tool'],
        label: `Filter Dashboard: Tools (${tools.length})`,
      },
      suggestedProductIds: top5.map((p) => p.id),
    };
  }

  // 5. "deployed" / "live"
  if (q.includes('deployed') || q.includes('live') || q.includes('shipped') || q.includes('done')) {
    const deployed = products.filter((p) => p.status === 'deployed');
    const done = products.filter((p) => p.status === 'done');

    const list = deployed.length > 0 ? deployed : done;
    const bullets = list
      .slice(0, 6)
      .map(
        (p, i) =>
          `**${i + 1}. [${p.name}](#view-${p.id})** [${p.tag}]\n${p.description || 'Shipped product.'}`
      )
      .join('\n\n');

    return {
      text: `🎉 **You have ${deployed.length} Deployed and ${done.length} Done projects:**\n\n${bullets}`,
      filterAction: {
        statuses: ['deployed', 'done'],
        label: `Filter Dashboard: Deployed & Done (${list.length})`,
      },
      suggestedProductIds: list.map((p) => p.id),
    };
  }

  // 6. "stats" / "summary" / "overview" / "how many"
  if (q.includes('stat') || q.includes('overview') || q.includes('summary') || q.includes('count') || q.includes('how many')) {
    const ideas = products.filter((p) => p.status === 'idea').length;
    const working = products.filter((p) => p.status === 'working').length;
    const done = products.filter((p) => p.status === 'done').length;
    const deployed = products.filter((p) => p.status === 'deployed').length;

    const apps = products.filter((p) => p.tag === 'app').length;
    const saas = products.filter((p) => p.tag === 'saas').length;
    const tools = products.filter((p) => p.tag === 'tool').length;
    const webapps = products.filter((p) => p.tag === 'web-app').length;

    return {
      text: `📊 **Product Hub Portfolio Overview (${products.length} Projects):**\n\n` +
        `**By Pipeline Stage:**\n` +
        `• 💡 **Idea Stage**: ${ideas} projects\n` +
        `• ⚡ **In Progress (Working)**: ${working} projects\n` +
        `• ✅ **Done**: ${done} projects\n` +
        `• 🚀 **Deployed Live**: ${deployed} projects\n\n` +
        `**By Category:**\n` +
        `• 📱 Mobile Apps: ${apps}\n` +
        `• 💼 SaaS Platforms: ${saas}\n` +
        `• 🛠️ Developer Tools: ${tools}\n` +
        `• 🌐 Web Applications: ${webapps}`,
    };
  }

  // 7. "what should I build" / "recommend" / "next" / "best"
  if (q.includes('build next') || q.includes('recommend') || q.includes('what should i') || q.includes('pick') || q.includes('best')) {
    const ideas = products.filter((p) => p.status === 'idea');
    // Pick 3 diverse recommendations
    const saasPick = ideas.find((p) => p.tag === 'saas') || ideas[0];
    const toolPick = ideas.find((p) => p.tag === 'tool' && p.id !== saasPick?.id) || ideas[1];
    const appPick = ideas.find((p) => p.tag === 'app' && p.id !== saasPick?.id && p.id !== toolPick?.id) || ideas[2];

    const picks = [saasPick, toolPick, appPick].filter(Boolean);

    const bullets = picks
      .map(
        (p, i) =>
          `**${i + 1}. [${p.name}](#view-${p.id})** [${p.tag.toUpperCase()}]\n${p.description || 'Validated idea.'}\n*Why build: Fast MVP turnaround with 817-task launch checklist.*`
      )
      .join('\n\n');

    return {
      text: `🎯 **Top 3 Recommended Projects to Build Next:**\n\n${bullets}\n\nWhich of these matches your current stack preferences?`,
      suggestedProductIds: picks.map((p) => p.id),
    };
  }

  // 8. General keyword search across products
  const matches = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      p.tag.toLowerCase().includes(q)
  );

  if (matches.length > 0) {
    const top4 = matches.slice(0, 4);
    const bullets = top4
      .map(
        (p, i) =>
          `**${i + 1}. [${p.name}](#view-${p.id})** [${p.tag} • ${p.status}]\n${p.description || 'No description'}`
      )
      .join('\n\n');

    return {
      text: `🔍 **Found ${matches.length} matching project(s) for "${question}":**\n\n${bullets}`,
      filterAction: {
        search: question,
        label: `Filter Dashboard: "${question}" (${matches.length})`,
      },
      suggestedProductIds: top4.map((p) => p.id),
    };
  }

  // Fallback greeting / guide
  return {
    text: `👋 I have indexed all **${products.length} projects** in your Product Hub!\n\nYou can ask me things like:\n` +
      `• *"Give me app ideas"*\n` +
      `• *"Give me ideas that are in progress"*\n` +
      `• *"Show me developer tools"*\n` +
      `• *"Which projects are deployed?"*\n` +
      `• *"Show workspace stats"*\n` +
      `• *"What should I build next?"*\n\n` +
      `*(Optional: Connect your free Gemini API key in settings for deeper conversational advice!)*`,
  };
}

/**
 * Calls Gemini 1.5 Flash for conversational responses incorporating the full workspace knowledge base.
 */
async function callGeminiAssistant(params: {
  question: string;
  products: ProductWithTasks[];
  history: ChatMessage[];
  apiKey: string;
}): Promise<Omit<ChatMessage, 'id' | 'timestamp' | 'role'>> {
  const { question, products, history, apiKey } = params;

  // Build compact project registry for context
  const projectIndex = products
    .slice(0, 96)
    .map((p) => {
      const done = p.tasks.filter((t) => t.done).length;
      return `- ID: ${p.id} | Name: "${p.name}" | Tag: ${p.tag} | Status: ${p.status} | Done: ${done}/${p.tasks.length} tasks | Desc: ${(p.description || '').slice(0, 90)}`;
    })
    .join('\n');

  const systemPrompt = `You are the Product Hub AI Assistant for a founder managing ${products.length} startup projects.
You have complete knowledge of every project in the workspace:
${projectIndex}

Rules:
1. Always reference real projects from the database above when relevant. Format project mentions as markdown links: [Project Name](#view-ID) so the user can click them directly.
2. If the user asks for "app ideas", list projects tagged as 'app' with status 'idea' and explain why they are great to build.
3. If the user asks for "ideas in progress" or "working", list projects with status 'working' and show their progress.
4. When relevant (e.g. user asks about tools, architecture, reusable code, bots, agents, mobile modules), reference the Ecosystem Hubs:
   - Finder (Ideas): https://finder-d17.pages.dev/
   - Bot Factory: https://botserusable.pages.dev/
   - AI Agents: https://agentsreusable.pages.dev/
   - Mobile Factory (163 Modules): https://appreusable.pages.dev/
   - Reusable Code Library (33 Modules): https://reusable-library.foundershivanand.workers.dev/
   - AI Mentor OS: https://mentor-api.foundershivanand.workers.dev/
5. If your answer recommends filtering the dashboard, append a directive at the very end on its own line:
   ACTION_FILTER:{"tags":["app"],"statuses":["idea"],"label":"Filter Dashboard to App Ideas"}
6. Keep responses concise, structured with bullet points and bold headers, and action-oriented.`;

  // Build multi-turn contents
  const contents: any[] = [];
  const recentHistory = history.slice(-6);

  recentHistory.forEach((msg) => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    });
  });

  contents.push({
    role: 'user',
    parts: [{ text: question }],
  });

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1000,
    },
  };

  const res = await fetchGeminiGenerateContent(apiKey, body, 'gemini-2.5-flash');

  if (!res.ok) {
    throw new Error(`Gemini assistant API returned ${res.status}`);
  }

  const data = await res.json();
  let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extract ACTION_FILTER directive if present
  let filterAction: ChatMessage['filterAction'] = undefined;
  const actionMatch = rawText.match(/ACTION_FILTER:(\{.*?\})/);
  if (actionMatch) {
    try {
      filterAction = JSON.parse(actionMatch[1]);
      rawText = rawText.replace(actionMatch[0], '').trim();
    } catch {
      // ignore parse err
    }
  }

  // Extract any highlighted product IDs from [Name](#view-id)
  const idMatches = [...rawText.matchAll(/#view-([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);

  return {
    text: rawText.trim(),
    filterAction,
    suggestedProductIds: idMatches.length > 0 ? idMatches : undefined,
  };
}
