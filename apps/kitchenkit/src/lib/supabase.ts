import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
try {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (url && key && !url.includes('your-project')) {
    supabaseClient = createClient(url, key);
  }
} catch {
  // Supabase not configured — running offline/demo
}

export const supabase = supabaseClient!;
