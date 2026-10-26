import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
try {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && key && !url.includes('your-project')) {
    supabaseClient = createClient(url, key);
  }
} catch {
  // Authentication stays unconfigured; access fails closed via requireClient.
}

export const configuredSupabase: SupabaseClient | null = supabaseClient;
export const isOffline = !configuredSupabase;

function requireClient(): SupabaseClient {
  if (!configuredSupabase) throw new Error('Sign-in is unavailable: authentication is not configured.');
  return configuredSupabase;
}

export const supabase: Pick<SupabaseClient, 'auth' | 'from'> = {
  get auth() { return requireClient().auth; },
  get from() { const client = requireClient(); return client.from.bind(client); },
};
