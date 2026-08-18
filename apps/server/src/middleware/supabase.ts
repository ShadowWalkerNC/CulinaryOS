// ============================================================
// CulinaryOS — Supabase Middleware
// Migrated from backend/middleware/supabase.ts
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Context, Next } from 'hono';
import type { Env } from '../types.js';
import { isLiveSupabaseConfigured } from '../lib/secrets.js';

let supabaseClient: SupabaseClient | null = null;
let testClientOverride: any = null;

// Service-role client — bypasses RLS, used for backend mutations
export const adminSupabase = (): SupabaseClient | null => {
  if (testClientOverride !== null) return testClientOverride;
  if (!supabaseClient && isLiveSupabaseConfigured()) {
    try {
      supabaseClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
    } catch {}
  }
  return supabaseClient;
};

/** Testing helper: override admin supabase client instance */
export const setAdminSupabaseForTesting = (client: any) => {
  testClientOverride = client;
};

// Inject supabase admin client into Hono context
export async function withSupabase(c: Context<Env>, next: Next) {
  c.set('supabase', adminSupabase() as any);
  await next();
}
