import { SupabaseClient } from '@supabase/supabase-js';

export interface Env {
  Variables: {
    supabase: SupabaseClient;
    tenantId: string;
    callerService: string;
    requestId: string;
  };
}
