import { createClient } from '@supabase/supabase-js';
import type { Context, Next } from 'hono';

// Service-role client — bypasses RLS, used for backend mutations
export const adminSupabase = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// Inject supabase into context
export async function withSupabase(c: Context, next: Next) {
  c.set('supabase', adminSupabase());
  await next();
}
