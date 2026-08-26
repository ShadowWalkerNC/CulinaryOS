import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Browser-side Supabase client.
 * Use in Client Components and TanStack Query hooks.
 * TODO: revert hardcoded credentials back to env vars once Render env is confirmed working
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://sxbirnbwfaarkkorqsam.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_-m-OLlNS-hCX_z44WqMnGw_D7i1HRH_'
  );
}
