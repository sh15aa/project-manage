// Compatibility re-export module: redirects all database calls to Turso
export * from './turso';

// Retain legacy exports for backward compatibility if any legacy code checks them
export const isSupabaseConfigured = false;
export const supabase = null;
