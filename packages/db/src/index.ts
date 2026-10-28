import { createClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

class FallbackWebSocket {
  url: string;
  readyState = 3; // CLOSED
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  protocol = '';
  constructor(url: string) {
    this.url = url;
  }
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

const realtimeOptions = typeof globalThis.WebSocket !== 'undefined'
  ? {}
  : { realtime: { transport: FallbackWebSocket as any } };

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, realtimeOptions);

export * from './types.js';
export * from './postgres.js';

