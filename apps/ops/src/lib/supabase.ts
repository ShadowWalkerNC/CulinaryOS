import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Always export a real client — throws a useful error at call time if unconfigured
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  key ?? 'anon-key-placeholder'
);

export const isOffline = !url || !key;
