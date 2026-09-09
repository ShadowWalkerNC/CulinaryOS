import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Browser-side Supabase client.
 * Use in Client Components and TanStack Query hooks.
 *
 * Credentials come from environment ONLY. Hardcoded project credentials were
 * removed (they were committed to the repo). If you deployed with them,
 * rotate the anon key in the Supabase dashboard — it is in git history.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      '[recipeos] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set them in your deployment environment (see .env.example).'
    );
  }
  return createBrowserClient<any>(url, key);
}
