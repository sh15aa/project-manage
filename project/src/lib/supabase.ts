import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MASTER_CHECKLIST } from './masterChecklist';
import { DEFAULT_96_PROJECTS } from './defaultProjects';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Product = {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  tag: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'ai_review'
  | 'human_review'
  | 'done'
  | 'not_required';

export type Task = {
  id: string;
  product_id: string;
  title: string;
  section: string;
  section_id?: number;
  status: TaskStatus;
  done: boolean;
  sort_order: number;
  created_at?: string;
};

export type ProductWithTasks = Product & {
  tasks: Task[];
};

export const TAG_OPTIONS = [
  'app',
  'web-app',
  'tool',
  'saas',
  'made-for-fun',
  'games',
] as const;

export const PRIMARY_STATUS_OPTIONS = [
  'idea',
  'working',
  'done',
  'deployed',
] as const;

export const STATUS_OPTIONS = [
  'idea',
  'working',
  'done',
  'deployed',
  'in-progress',
  'complete',
  'hosted',
  'pending',
  'archived',
] as const;

export const TAG_LABELS: Record<string, string> = {
  'app': 'App',
  'web-app': 'Web App',
  'tool': 'Tool',
  'saas': 'SaaS',
  'made-for-fun': 'Made for Fun',
  'games': 'Games',
};

export const TAG_COLORS: Record<string, string> = {
  'app': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'web-app': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'tool': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'saas': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'made-for-fun': 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  'games': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export const STATUS_LABELS: Record<string, string> = {
  'idea': 'Idea',
  'working': 'Working',
  'done': 'Done',
  'deployed': 'Deployed',
  'in-progress': 'In Progress',
  'complete': 'Complete',
  'hosted': 'Hosted',
  'pending': 'Pending',
  'archived': 'Archived',
};

export const STATUS_COLORS: Record<string, string> = {
  'idea': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'working': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'done': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'deployed': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'in-progress': 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  'complete': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'hosted': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'pending': 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'archived': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export const STATUS_DOT_COLORS: Record<string, string> = {
  'idea': 'bg-amber-400',
  'working': 'bg-cyan-400',
  'done': 'bg-emerald-400',
  'deployed': 'bg-violet-400',
  'in-progress': 'bg-yellow-400',
  'complete': 'bg-emerald-400',
  'hosted': 'bg-purple-400',
  'pending': 'bg-orange-400',
  'archived': 'bg-slate-400',
};

// Task States requested by user:
// not started, in progress, blocked, AI review, Human review, Done and Not required
export const TASK_STATUS_OPTIONS: TaskStatus[] = [
  'not_started',
  'in_progress',
  'blocked',
  'ai_review',
  'human_review',
  'done',
  'not_required',
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  'not_started': 'Not Started',
  'in_progress': 'In Progress',
  'blocked': 'Blocked',
  'ai_review': 'AI Review',
  'human_review': 'Human Review',
  'done': 'Done',
  'not_required': 'Not Required',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  'not_started': 'bg-slate-500/15 text-slate-400 border-slate-600/40',
  'in_progress': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'blocked': 'bg-red-500/15 text-red-300 border-red-500/30',
  'ai_review': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'human_review': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'done': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'not_required': 'bg-zinc-700/30 text-zinc-400 border-zinc-700/50',
};

export const TASK_STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  'not_started': 'bg-slate-500',
  'in_progress': 'bg-blue-400',
  'blocked': 'bg-red-500',
  'ai_review': 'bg-purple-400',
  'human_review': 'bg-amber-400',
  'done': 'bg-emerald-400',
  'not_required': 'bg-zinc-500',
};

const STORAGE_KEY_PRODUCTS = 'producthub_products_v1';
const STORAGE_KEY_TASK_OVERRIDES = 'producthub_task_overrides_v1';

/**
 * Generate default master checklist tasks for a product.
 */
export function createMasterTasksForProduct(productId: string): Task[] {
  return MASTER_CHECKLIST.map((m) => ({
    id: `${productId}-${m.id}`,
    product_id: productId,
    title: m.title,
    section: m.section,
    section_id: m.section_id,
    status: 'not_started',
    done: false,
    sort_order: m.sort_order,
  }));
}

/**
 * Helper to ensure a product has the 817 master tasks from the PDF.
 */
export function ensureProductTasks(product: ProductWithTasks): ProductWithTasks {
  if (product.tasks && product.tasks.length >= MASTER_CHECKLIST.length) {
    return product;
  }

  // Check if we have overrides stored in localStorage
  let overrides: Record<string, { status: TaskStatus; done: boolean }> = {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_TASK_OVERRIDES}_${product.id}`);
    if (raw) {
      overrides = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load task overrides', e);
  }

  // Merge any existing custom tasks
  const existingMap = new Map<string, Task>();
  if (product.tasks) {
    product.tasks.forEach((t) => {
      existingMap.set(t.title.toLowerCase().trim(), t);
    });
  }

  const masterTasks: Task[] = MASTER_CHECKLIST.map((m) => {
    const key = `${product.id}-${m.id}`;
    const override = overrides[key];
    const existing = existingMap.get(m.title.toLowerCase().trim());

    const status: TaskStatus =
      override?.status ??
      (existing?.status || (existing?.done ? 'done' : 'not_started'));

    return {
      id: key,
      product_id: product.id,
      title: m.title,
      section: m.section,
      section_id: m.section_id,
      status,
      done: status === 'done',
      sort_order: m.sort_order,
    };
  });

  // Also include any user-created custom tasks that weren't in the master checklist
  const masterTitleSet = new Set(MASTER_CHECKLIST.map((m) => m.title.toLowerCase().trim()));
  const customTasks = (product.tasks ?? []).filter(
    (t) => !masterTitleSet.has(t.title.toLowerCase().trim())
  );

  return {
    ...product,
    tasks: [...masterTasks, ...customTasks],
  };
}

export async function fetchAllData(): Promise<ProductWithTasks[]> {
  let productsWithTasks: ProductWithTasks[] = [];

  if (supabase) {
    try {
      const { data: productData, error: pError } = await supabase
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true });

      if (pError) throw pError;

      const { data: taskData, error: tError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });

      if (tError) throw tError;

      const taskList = taskData ?? [];
      productsWithTasks = (productData ?? []).map((p: Product) => {
        const tasksForProduct: Task[] = taskList
          .filter((t: any) => t.product_id === p.id)
          .map((t: any) => ({
            id: t.id,
            product_id: t.product_id,
            title: t.title,
            section: t.section || 'General',
            section_id: t.section_id ?? 0,
            status: (t.status as TaskStatus) || (t.done ? 'done' : 'not_started'),
            done: t.done ?? (t.status === 'done'),
            sort_order: t.sort_order ?? 0,
            created_at: t.created_at,
          }));

        return ensureProductTasks({
          ...p,
          tasks: tasksForProduct,
        });
      });

      // Cache to localStorage
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(productsWithTasks));
      } catch (e) {
        console.warn('Failed to cache to localStorage', e);
      }

      return productsWithTasks;
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to localStorage:', err);
    }
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (cached) {
      const parsed: ProductWithTasks[] = JSON.parse(cached);
      if (parsed && parsed.length > 0) {
        return parsed.map((p) => ensureProductTasks(p));
      }
    }
  } catch (e) {
    console.error('Failed to read from localStorage', e);
  }

  // Auto-seed with DEFAULT_96_PROJECTS so all 96 projects are immediately available!
  const defaultProducts: ProductWithTasks[] = DEFAULT_96_PROJECTS.map((p) =>
    ensureProductTasks({
      ...p,
      tasks: [],
    })
  );

  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(defaultProducts));
  } catch (e) {
    console.error('Failed to auto-seed to localStorage', e);
  }

  return defaultProducts;
}

export async function updateProductStatus(productId: string, status: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase
        .from('products')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', productId);
    } catch (err) {
      console.warn('Supabase status update error:', err);
    }
  }

  // Update in localStorage
  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (cached) {
      const products: ProductWithTasks[] = JSON.parse(cached);
      const updated = products.map((p) =>
        p.id === productId ? { ...p, status, updated_at: new Date().toISOString() } : p
      );
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to update localStorage', e);
  }

  return true;
}

export async function bulkUpdateProductStatus(productIds: string[], status: string): Promise<boolean> {
  if (productIds.length === 0) return true;

  if (supabase) {
    try {
      await supabase
        .from('products')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', productIds);
    } catch (err) {
      console.warn('Supabase bulk status update error:', err);
    }
  }

  // Update in localStorage
  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (cached) {
      const products: ProductWithTasks[] = JSON.parse(cached);
      const idSet = new Set(productIds);
      const updated = products.map((p) =>
        idSet.has(p.id) ? { ...p, status, updated_at: new Date().toISOString() } : p
      );
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to update localStorage', e);
  }

  return true;
}

export async function saveProduct(product: Partial<Product> & { id?: string }): Promise<ProductWithTasks> {
  const isNew = !product.id;
  const id = product.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const productRecord: Product = {
    id,
    name: product.name || 'Untitled Project',
    description: product.description ?? null,
    url: product.url ?? null,
    tag: product.tag || 'web-app',
    status: product.status || 'idea',
    sort_order: product.sort_order ?? 0,
    created_at: product.created_at || now,
    updated_at: now,
  };

  if (supabase) {
    try {
      if (isNew) {
        await supabase.from('products').insert(productRecord);
      } else {
        await supabase.from('products').update(productRecord).eq('id', id);
      }
    } catch (err) {
      console.warn('Supabase save failed:', err);
    }
  }

  const initialTasks = createMasterTasksForProduct(id);
  const fullProduct: ProductWithTasks = {
    ...productRecord,
    tasks: initialTasks,
  };

  // Save to localStorage
  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    const products: ProductWithTasks[] = cached ? JSON.parse(cached) : [];
    const index = products.findIndex((p) => p.id === id);
    if (index >= 0) {
      products[index] = { ...products[index], ...productRecord };
    } else {
      products.push(fullProduct);
    }
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error('Failed to update localStorage', e);
  }

  return fullProduct;
}

export async function deleteProduct(productId: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from('products').delete().eq('id', productId);
    } catch (err) {
      console.warn('Supabase delete failed:', err);
    }
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (cached) {
      const products: ProductWithTasks[] = JSON.parse(cached);
      const filtered = products.filter((p) => p.id !== productId);
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(filtered));
    }
    localStorage.removeItem(`${STORAGE_KEY_TASK_OVERRIDES}_${productId}`);
  } catch (e) {
    console.error('Failed to delete from localStorage', e);
  }

  return true;
}

export async function updateTaskStatus(
  productId: string,
  taskId: string,
  newStatus: TaskStatus
): Promise<boolean> {
  // Save override to localStorage for fast persistence
  try {
    const overrideKey = `${STORAGE_KEY_TASK_OVERRIDES}_${productId}`;
    const raw = localStorage.getItem(overrideKey);
    const overrides = raw ? JSON.parse(raw) : {};
    overrides[taskId] = {
      status: newStatus,
      done: newStatus === 'done',
    };
    localStorage.setItem(overrideKey, JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save task override', e);
  }

  if (supabase) {
    try {
      await supabase
        .from('tasks')
        .upsert({
          id: taskId,
          product_id: productId,
          status: newStatus,
          done: newStatus === 'done',
        });
    } catch (err) {
      console.warn('Supabase task update error:', err);
    }
  }

  return true;
}

export async function bulkUpdateSectionTasksStatus(
  productId: string,
  section: string,
  newStatus: TaskStatus,
  currentTasks: Task[]
): Promise<Task[]> {
  const updatedTasks = currentTasks.map((t) =>
    t.section === section
      ? { ...t, status: newStatus, done: newStatus === 'done' }
      : t
  );

  try {
    const overrideKey = `${STORAGE_KEY_TASK_OVERRIDES}_${productId}`;
    const raw = localStorage.getItem(overrideKey);
    const overrides = raw ? JSON.parse(raw) : {};
    updatedTasks
      .filter((t) => t.section === section)
      .forEach((t) => {
        overrides[t.id] = { status: newStatus, done: newStatus === 'done' };
      });
    localStorage.setItem(overrideKey, JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save section overrides', e);
  }

  return updatedTasks;
}

export async function importProducts(
  items: Array<{ name: string; tag?: string; status?: string; description?: string; url?: string }>
): Promise<ProductWithTasks[]> {
  const now = new Date().toISOString();
  const newProducts: ProductWithTasks[] = items.map((item, index) => {
    const id = crypto.randomUUID();
    return {
      id,
      name: item.name.trim(),
      description: item.description || null,
      url: item.url || null,
      tag: item.tag || 'web-app',
      status: item.status || 'idea',
      sort_order: index,
      created_at: now,
      updated_at: now,
      tasks: createMasterTasksForProduct(id),
    };
  });

  if (supabase) {
    try {
      const rows = newProducts.map(({ tasks, ...rest }) => rest);
      await supabase.from('products').insert(rows);
    } catch (err) {
      console.warn('Supabase bulk insert failed:', err);
    }
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    const existing: ProductWithTasks[] = cached ? JSON.parse(cached) : [];
    const combined = [...existing, ...newProducts];
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(combined));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }

  return newProducts;
}
