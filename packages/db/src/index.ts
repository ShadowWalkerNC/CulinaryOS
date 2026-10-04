import { createClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export * from './types.js';
export * from './postgres.js';

