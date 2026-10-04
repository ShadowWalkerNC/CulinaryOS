import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
try {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (url && key && !url.includes('your-project')) {
    supabaseClient = createClient(url, key);
  }
} catch {
  // Invalid or absent configuration remains unavailable; never fabricate a session.
}

export const configuredSupabase = supabaseClient;

function requireClient(): SupabaseClient {
  if (!configuredSupabase) throw new Error('Sign-in is unavailable: authentication is not configured.');
  return configuredSupabase;
}

// Keep query consumers stable without falsely typing an absent client as configured.
export const supabase: Pick<SupabaseClient, 'auth' | 'from'> = {
  get auth() { return requireClient().auth; },
  get from() { const client = requireClient(); return client.from.bind(client); },
};
