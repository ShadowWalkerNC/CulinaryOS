// ============================================================
// CulinaryOS — Supabase Middleware
// Migrated from backend/middleware/supabase.ts
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Context, Next } from 'hono';
import type { Env } from '../types.js';
import { isLiveSupabaseConfigured } from '../lib/secrets.js';

let supabaseClient: SupabaseClient | null = null;
try {
  if (isLiveSupabaseConfigured()) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
} catch {
  // Supabase not configured
}

// Service-role client — bypasses RLS, used for backend mutations
export const adminSupabase = () => supabaseClient;

// Inject supabase admin client into Hono context
export async function withSupabase(c: Context<Env>, next: Next) {
  c.set('supabase', adminSupabase() as any);
  await next();
}
