import { createClient, type Client } from '@libsql/client/web';
import { MASTER_CHECKLIST } from './masterChecklist';
import { DEFAULT_96_PROJECTS } from './defaultProjects';

// Storage keys for Turso configuration & local caching
const STORAGE_KEY_TURSO_URL = 'turso_db_url';
const STORAGE_KEY_TURSO_TOKEN = 'turso_auth_token';
const STORAGE_KEY_PRODUCTS = 'producthub_products_v2';
const STORAGE_KEY_TASK_OVERRIDES = 'producthub_task_overrides_v1';

// Default Turso Database credentials (libSQL)
const DEFAULT_TURSO_URL = 'libsql://projectmanage-sh15a.aws-ap-south-1.turso.io';
const DEFAULT_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODk4ODMxMTUsImlkIjoiMDFhMGJkNTItY2YwMS03MDNhLTgwNTEtYTZhZTVkNGM2NjY3Iiwia2lkIjoiUEJVVXJDMUljTkFQVmc5WEwyNWlsa1Z1amVTUlFNM0Nqb202b0VvSHpNbyIsInJpZCI6IjY4MTg1NGY0LTZmOTktNDQzNS1hZGI5LTcwNDgyMDJjYjVlYSJ9.A1O5Bwuj3A_T7SvZvaYNv-Iem-iWq0v-GT7R49Rbldqvj0ID1qubk0wsAl1Yho_XI_BqbhuEOjUDZNl9SEdNDQ';

// Read config from environment variables or localStorage
export function getTursoConfig(): { url: string; authToken: string } {
  const envUrl = import.meta.env.VITE_TURSO_DATABASE_URL || import.meta.env.VITE_TURSO_URL || '';
  const envToken = import.meta.env.VITE_TURSO_AUTH_TOKEN || '';

  const localUrl = localStorage.getItem(STORAGE_KEY_TURSO_URL) || '';
  const localToken = localStorage.getItem(STORAGE_KEY_TURSO_TOKEN) || '';

  const url = (localUrl || envUrl || DEFAULT_TURSO_URL).trim();
  const authToken = (localToken || envToken || DEFAULT_TURSO_TOKEN).trim();

  return { url, authToken };
}

export function saveTursoConfig(url: string, authToken: string): void {
  localStorage.setItem(STORAGE_KEY_TURSO_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_TURSO_TOKEN, authToken.trim());
  // Reset client so next call creates a fresh client with new credentials
  currentClient = null;
}

export function clearTursoConfig(): void {
  localStorage.removeItem(STORAGE_KEY_TURSO_URL);
  localStorage.removeItem(STORAGE_KEY_TURSO_TOKEN);
  currentClient = null;
}

let currentClient: Client | null = null;

export function getTursoClient(): Client | null {
  if (currentClient) return currentClient;

  const { url, authToken } = getTursoConfig();
  if (!url) return null;

  try {
    // Normalize URL if needed (libsql/client/web accepts libsql:// or https://)
    let formattedUrl = url;
    if (formattedUrl.startsWith('libsql://')) {
      formattedUrl = formattedUrl.replace('libsql://', 'https://');
    }

    currentClient = createClient({
      url: formattedUrl,
      authToken: authToken || undefined,
    });
    return currentClient;
  } catch (err) {
    console.error('Failed to initialize Turso client:', err);
    return null;
  }
}

export async function testTursoConnection(url: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    let formattedUrl = url.trim();
    if (formattedUrl.startsWith('libsql://')) {
      formattedUrl = formattedUrl.replace('libsql://', 'https://');
    }
    const testClient = createClient({
      url: formattedUrl,
      authToken: token.trim() || undefined,
    });
    await testClient.execute('SELECT 1 as connected;');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Connection failed' };
  }
}

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Schema Setup & Table Initialization in Turso
// ---------------------------------------------------------------------------
let isSchemaInitialized = false;

export async function initTursoSchema(client?: Client | null): Promise<boolean> {
  const db = client || getTursoClient();
  if (!db) return false;
  if (isSchemaInitialized) return true;

  try {
    await db.batch(
      [
        {
          sql: `CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            url TEXT,
            tag TEXT NOT NULL DEFAULT 'web-app',
            status TEXT NOT NULL DEFAULT 'idea',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );`,
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            title TEXT NOT NULL,
            section TEXT NOT NULL,
            section_id INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'not_started',
            done INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
          );`,
        },
        {
          sql: `CREATE INDEX IF NOT EXISTS idx_tasks_product_id ON tasks(product_id);`,
        },
      ],
      'write'
    );

    isSchemaInitialized = true;
    return true;
  } catch (err) {
    console.error('Failed to initialize Turso schema:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Master Checklist & Local Fallback Helpers
// ---------------------------------------------------------------------------
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

export function ensureProductTasks(product: ProductWithTasks): ProductWithTasks {
  if (product.tasks && product.tasks.length >= MASTER_CHECKLIST.length) {
    return product;
  }

  let overrides: Record<string, { status: TaskStatus; done: boolean }> = {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_TASK_OVERRIDES}_${product.id}`);
    if (raw) {
      overrides = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load task overrides', e);
  }

  const existingMap = new Map<string, Task>();
  if (product.tasks) {
    product.tasks.forEach((t) => {
      existingMap.set(t.title.toLowerCase().trim(), t);
      // Also map by ID
      existingMap.set(t.id, t);
    });
  }

  const masterTasks: Task[] = MASTER_CHECKLIST.map((m) => {
    const key = `${product.id}-${m.id}`;
    const override = overrides[key];
    const existing = existingMap.get(key) || existingMap.get(m.title.toLowerCase().trim());

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

  const masterTitleSet = new Set(MASTER_CHECKLIST.map((m) => m.title.toLowerCase().trim()));
  const customTasks = (product.tasks ?? []).filter(
    (t) => !masterTitleSet.has(t.title.toLowerCase().trim()) && !t.id.startsWith(`${product.id}-master-`)
  );

  return {
    ...product,
    tasks: [...masterTasks, ...customTasks],
  };
}

export function saveProductsToLocalStorage(products: (Product | ProductWithTasks)[]): void {
  try {
    const stripped = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      url: p.url,
      tag: p.tag,
      status: p.status,
      sort_order: p.sort_order,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(stripped));
  } catch (e) {
    console.warn('Failed to save products to localStorage:', e);
  }
}

export function getInitialProducts(): ProductWithTasks[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Invalidate if old format or contains old mock projects like 'Deep Zone' or 'Reusable '
      const hasOldMocks = parsed.some(
        (p: any) => p.name === 'Deep Zone' || (p.name && p.name.startsWith('Reusable '))
      );
      if (!hasOldMocks && Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: any) =>
          ensureProductTasks({
            ...p,
            tasks: p.tasks || [],
          })
        );
      }
    }
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
  }

  const defaultList = DEFAULT_96_PROJECTS.map((p) =>
    ensureProductTasks({
      ...p,
      tasks: [],
    })
  );
  saveProductsToLocalStorage(defaultList);
  return defaultList;
}

// ---------------------------------------------------------------------------
// Seeding All 96 Products to Turso
// ---------------------------------------------------------------------------
export async function seedAll96ProductsToTurso(force: boolean = false): Promise<{ success: boolean; count: number; message: string }> {
  const db = getTursoClient();
  if (!db) {
    return { success: false, count: 0, message: 'Turso client not configured' };
  }

  await initTursoSchema(db);

  try {
    // Check if products already exist unless force is specified
    if (!force) {
      const checkRes = await db.execute('SELECT COUNT(*) as count FROM products;');
      const currentCount = Number(checkRes.rows[0]?.[0] ?? checkRes.rows[0]?.count ?? 0);
      if (currentCount > 0) {
        return { success: true, count: currentCount, message: `Database already has ${currentCount} products.` };
      }
    }

    // Prepare batch statements for the 96 default products
    // We insert in chunks of 50 to respect HTTP payload constraints
    const batchSize = 40;
    const statements = DEFAULT_96_PROJECTS.map((p) => ({
      sql: `INSERT OR REPLACE INTO products (id, name, description, url, tag, status, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        p.id,
        p.name,
        p.description || null,
        p.url || null,
        p.tag,
        p.status,
        p.sort_order,
        p.created_at,
        p.updated_at,
      ],
    }));

    for (let i = 0; i < statements.length; i += batchSize) {
      const chunk = statements.slice(i, i + batchSize);
      await db.batch(chunk, 'write');
    }

    return {
      success: true,
      count: DEFAULT_96_PROJECTS.length,
      message: `Successfully seeded all ${DEFAULT_96_PROJECTS.length} products to Turso!`,
    };
  } catch (err: any) {
    console.error('Failed to seed products to Turso:', err);
    return { success: false, count: 0, message: err?.message || 'Failed to seed products' };
  }
}

// ---------------------------------------------------------------------------
// Database Operations for Products & Tasks in Turso
// ---------------------------------------------------------------------------

/**
 * Fetch all products and tasks from Turso.
 * Automatically initializes schema and seeds 96 products if empty!
 */
export async function fetchAllData(): Promise<ProductWithTasks[]> {
  const db = getTursoClient();

  if (db) {
    try {
      await initTursoSchema(db);

      // Fetch products
      const pResult = await db.execute('SELECT * FROM products ORDER BY sort_order ASC;');

      // If empty, auto-seed the 96 products
      if (!pResult.rows || pResult.rows.length === 0) {
        console.log('Turso products table is empty. Seeding all 96 products...');
        await seedAll96ProductsToTurso(true);
        // Re-query products
        const recheck = await db.execute('SELECT * FROM products ORDER BY sort_order ASC;');
        pResult.rows = recheck.rows;
      }

      if (pResult.rows && pResult.rows.length > 0) {
        // Fetch tasks
        const tResult = await db.execute('SELECT * FROM tasks;');
        const taskRows = tResult.rows || [];

        const taskList: Task[] = taskRows.map((r: any) => {
          const status = (r.status || 'not_started') as TaskStatus;
          const doneVal = Boolean(r.done === 1 || r.done === true || status === 'done');
          return {
            id: String(r.id),
            product_id: String(r.product_id),
            title: String(r.title),
            section: String(r.section || 'General'),
            section_id: Number(r.section_id ?? 0),
            status,
            done: doneVal,
            sort_order: Number(r.sort_order ?? 0),
            created_at: r.created_at ? String(r.created_at) : undefined,
          };
        });

        const productsWithTasks: ProductWithTasks[] = pResult.rows.map((r: any) => {
          const product: Product = {
            id: String(r.id),
            name: String(r.name),
            description: r.description ? String(r.description) : null,
            url: r.url ? String(r.url) : null,
            tag: String(r.tag || 'web-app'),
            status: String(r.status || 'idea'),
            sort_order: Number(r.sort_order ?? 0),
            created_at: String(r.created_at || new Date().toISOString()),
            updated_at: String(r.updated_at || new Date().toISOString()),
          };

          const tasksForProduct = taskList.filter((t) => t.product_id === product.id);

          return ensureProductTasks({
            ...product,
            tasks: tasksForProduct,
          });
        });

        saveProductsToLocalStorage(productsWithTasks);
        return productsWithTasks;
      }
    } catch (err) {
      console.warn('Turso fetch failed, falling back to local storage:', err);
    }
  }

  // Fallback to local storage or defaults
  return getInitialProducts();
}

/**
 * Update single product status in Turso and local storage
 */
export async function updateProductStatus(productId: string, status: string): Promise<boolean> {
  const now = new Date().toISOString();
  const db = getTursoClient();

  if (db) {
    try {
      await db.execute({
        sql: 'UPDATE products SET status = ?, updated_at = ? WHERE id = ?;',
        args: [status, now, productId],
      });
    } catch (err) {
      console.warn('Turso updateProductStatus error:', err);
    }
  }

  // Local storage update
  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    const products: Product[] = cached ? JSON.parse(cached) : DEFAULT_96_PROJECTS;
    const updated = products.map((p) =>
      p.id === productId ? { ...p, status, updated_at: now } : p
    );
    saveProductsToLocalStorage(updated);
  } catch (e) {
    console.error('Failed to update localStorage', e);
  }

  return true;
}

/**
 * Bulk update product status for multiple product IDs in Turso
 */
export async function bulkUpdateProductStatus(productIds: string[], status: string): Promise<boolean> {
  if (productIds.length === 0) return true;
  const now = new Date().toISOString();
  const db = getTursoClient();

  if (db) {
    try {
      const statements = productIds.map((id) => ({
        sql: 'UPDATE products SET status = ?, updated_at = ? WHERE id = ?;',
        args: [status, now, id],
      }));
      await db.batch(statements, 'write');
    } catch (err) {
      console.warn('Turso bulkUpdateProductStatus error:', err);
    }
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    const products: Product[] = cached ? JSON.parse(cached) : DEFAULT_96_PROJECTS;
    const idSet = new Set(productIds);
    const updated = products.map((p) =>
      idSet.has(p.id) ? { ...p, status, updated_at: now } : p
    );
    saveProductsToLocalStorage(updated);
  } catch (e) {
    console.error('Failed to update localStorage', e);
  }

  return true;
}

/**
 * Save or update product details in Turso
 */
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

  const db = getTursoClient();
  if (db) {
    try {
      await db.execute({
        sql: `INSERT INTO products (id, name, description, url, tag, status, sort_order, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                url = excluded.url,
                tag = excluded.tag,
                status = excluded.status,
                updated_at = excluded.updated_at;`,
        args: [
          productRecord.id,
          productRecord.name,
          productRecord.description,
          productRecord.url,
          productRecord.tag,
          productRecord.status,
          productRecord.sort_order,
          productRecord.created_at,
          productRecord.updated_at,
        ],
      });
    } catch (err) {
      console.warn('Turso saveProduct error:', err);
    }
  }

  const initialTasks = createMasterTasksForProduct(id);
  const fullProduct: ProductWithTasks = {
    ...productRecord,
    tasks: initialTasks,
  };

  try {
    const cached = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    const products: Product[] = cached ? JSON.parse(cached) : [...DEFAULT_96_PROJECTS];
    const index = products.findIndex((p) => p.id === id);
    if (index >= 0) {
      products[index] = { ...products[index], ...productRecord };
    } else {
      products.push(productRecord);
    }
    saveProductsToLocalStorage(products);
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }

  return fullProduct;
}

/**
 * Delete product from Turso and local storage
 */
export async function deleteProduct(productId: string): Promise<boolean> {
  const db = getTursoClient();
  if (db) {
    try {
      await db.batch(
        [
          { sql: 'DELETE FROM tasks WHERE product_id = ?;', args: [productId] },
          { sql: 'DELETE FROM products WHERE id = ?;', args: [productId] },
        ],
        'write'
      );
    } catch (err) {
      console.warn('Turso deleteProduct error:', err);
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

/**
 * Update task status in Turso
 */
export async function updateTaskStatus(
  productId: string,
  taskId: string,
  newStatus: TaskStatus,
  taskDetails?: Partial<Task>
): Promise<boolean> {
  const isDone = newStatus === 'done';

  // Save override to localStorage
  try {
    const overrideKey = `${STORAGE_KEY_TASK_OVERRIDES}_${productId}`;
    const raw = localStorage.getItem(overrideKey);
    const overrides = raw ? JSON.parse(raw) : {};
    overrides[taskId] = {
      status: newStatus,
      done: isDone,
    };
    localStorage.setItem(overrideKey, JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save task override to localStorage', e);
  }

  const db = getTursoClient();
  if (db) {
    try {
      await db.execute({
        sql: `INSERT INTO tasks (id, product_id, title, section, section_id, status, done, sort_order, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                done = excluded.done;`,
        args: [
          taskId,
          productId,
          taskDetails?.title || taskId,
          taskDetails?.section || 'General',
          taskDetails?.section_id ?? 0,
          newStatus,
          isDone ? 1 : 0,
          taskDetails?.sort_order ?? 0,
          new Date().toISOString(),
        ],
      });
    } catch (err) {
      console.warn('Turso updateTaskStatus error:', err);
    }
  }

  return true;
}

/**
 * Bulk update all tasks in a specific section
 */
export async function bulkUpdateSectionTasksStatus(
  productId: string,
  section: string,
  newStatus: TaskStatus,
  currentTasks: Task[]
): Promise<Task[]> {
  const isDone = newStatus === 'done';
  const updatedTasks = currentTasks.map((t) =>
    t.section === section
      ? { ...t, status: newStatus, done: isDone }
      : t
  );

  // Update local storage overrides
  try {
    const overrideKey = `${STORAGE_KEY_TASK_OVERRIDES}_${productId}`;
    const raw = localStorage.getItem(overrideKey);
    const overrides = raw ? JSON.parse(raw) : {};
    updatedTasks
      .filter((t) => t.section === section)
      .forEach((t) => {
        overrides[t.id] = { status: newStatus, done: isDone };
      });
    localStorage.setItem(overrideKey, JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save section overrides', e);
  }

  const db = getTursoClient();
  if (db) {
    try {
      const sectionTasks = updatedTasks.filter((t) => t.section === section);
      const statements = sectionTasks.map((t) => ({
        sql: `INSERT INTO tasks (id, product_id, title, section, section_id, status, done, sort_order, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                done = excluded.done;`,
        args: [
          t.id,
          productId,
          t.title,
          t.section,
          t.section_id ?? 0,
          newStatus,
          isDone ? 1 : 0,
          t.sort_order ?? 0,
          new Date().toISOString(),
        ],
      }));

      // Execute in batches of 40
      for (let i = 0; i < statements.length; i += 40) {
        await db.batch(statements.slice(i, i + 40), 'write');
      }
    } catch (err) {
      console.warn('Turso bulkUpdateSectionTasksStatus error:', err);
    }
  }

  return updatedTasks;
}

/**
 * Add a custom task for a product in Turso
 */
export async function addCustomTask(
  productId: string,
  task: { id: string; title: string; section?: string; status?: TaskStatus }
): Promise<Task> {
  const taskObj: Task = {
    id: task.id,
    product_id: productId,
    title: task.title,
    section: task.section || 'Custom Tasks',
    section_id: 999,
    status: task.status || 'not_started',
    done: task.status === 'done',
    sort_order: 0,
    created_at: new Date().toISOString(),
  };

  const db = getTursoClient();
  if (db) {
    try {
      await db.execute({
        sql: `INSERT INTO tasks (id, product_id, title, section, section_id, status, done, sort_order, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          taskObj.id,
          productId,
          taskObj.title,
          taskObj.section,
          taskObj.section_id ?? 0,
          taskObj.status,
          taskObj.done ? 1 : 0,
          taskObj.sort_order,
          taskObj.created_at || new Date().toISOString(),
        ],
      });
    } catch (err) {
      console.warn('Turso addCustomTask error:', err);
    }
  }

  return taskObj;
}

/**
 * Delete a custom task from Turso
 */
export async function deleteTask(taskId: string): Promise<boolean> {
  const db = getTursoClient();
  if (db) {
    try {
      await db.execute({
        sql: 'DELETE FROM tasks WHERE id = ?;',
        args: [taskId],
      });
    } catch (err) {
      console.warn('Turso deleteTask error:', err);
    }
  }
  return true;
}

/**
 * Import multiple products into Turso
 */
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

  const db = getTursoClient();
  if (db) {
    try {
      const statements = newProducts.map((p) => ({
        sql: `INSERT INTO products (id, name, description, url, tag, status, sort_order, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          p.id,
          p.name,
          p.description,
          p.url,
          p.tag,
          p.status,
          p.sort_order,
          p.created_at,
          p.updated_at,
        ],
      }));
      await db.batch(statements, 'write');
    } catch (err) {
      console.warn('Turso bulk insert failed:', err);
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
