// ============================================================
// CulinaryOS — Supabase Middleware
// Migrated from backend/middleware/supabase.ts
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { Context, Next } from 'hono';
import type { Env } from '../types.js';

// Service-role client — bypasses RLS, used for backend mutations
export const adminSupabase = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// Inject supabase admin client into Hono context
export async function withSupabase(c: Context<Env>, next: Next) {
  c.set('supabase', adminSupabase());
  await next();
}
