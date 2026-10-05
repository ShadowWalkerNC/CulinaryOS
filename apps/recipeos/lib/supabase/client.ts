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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient<any>(url, key);
}
