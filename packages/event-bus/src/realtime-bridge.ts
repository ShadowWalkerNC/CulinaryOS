// ============================================================
// CulinaryOS — Supabase Realtime Bridge
// Subscribes to kitchen_tickets + pos_orders and broadcasts
// on stable channels: kds:{tenantId} / pos:{tenantId}
// ============================================================

import { createClient, RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
const broadcastChannels = new Map<string, RealtimeChannel>();

try {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key && !url.includes('your-project')) {
    supabase = createClient(url, key);
  }
} catch {
  // Supabase not available
}

async function getJoinedBroadcastChannel(name: string): Promise<RealtimeChannel | null> {
  if (!supabase) return null;
  const existing = broadcastChannels.get(name);
  if (existing) return existing;

  const channel = supabase.channel(name);
  broadcastChannels.set(name, channel);
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        resolve();
      }
    });
  });
  return channel;
}

export function startRealtimeBridge(): void {
  if (!supabase) {
    console.log('[Realtime] Skip starting realtime bridge (Supabase offline)');
    return;
  }

  supabase
    .channel('kds:tickets')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kitchen_tickets' },
      async (payload) => {
        const tenantId = (payload.new as any)?.tenant_id ?? (payload.old as any)?.tenant_id;
        if (!tenantId) return;
        const channel = await getJoinedBroadcastChannel(`kds:${tenantId}`);
        channel?.send({
          type:  'broadcast',
          event: 'ticket_update',
          payload: { eventType: payload.eventType, ticket: payload.new },
        });
      }
    )
    .subscribe((status) => console.log('[Realtime] KDS bridge:', status));

  supabase
    .channel('pos:orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pos_orders' },
      async (payload) => {
        const tenantId = (payload.new as any)?.tenant_id ?? (payload.old as any)?.tenant_id;
        if (!tenantId) return;
        const channel = await getJoinedBroadcastChannel(`pos:${tenantId}`);
        channel?.send({
          type:  'broadcast',
          event: 'order_update',
          payload: { eventType: payload.eventType, order: payload.new },
        });
      }
    )
    .subscribe((status) => console.log('[Realtime] POS bridge:', status));
}

export function subscribeToTicketUpdates(
  supabaseClient: ReturnType<typeof createClient>,
  tenantId: string,
  onUpdate: (payload: unknown) => void
): () => void {
  const channel = supabaseClient
    .channel(`kds:${tenantId}`)
    .on('broadcast', { event: 'ticket_update' }, ({ payload }) => onUpdate(payload))
    .subscribe();
  return () => supabaseClient.removeChannel(channel);
}

export function subscribeToOrderUpdates(
  supabaseClient: ReturnType<typeof createClient>,
  tenantId: string,
  onUpdate: (payload: unknown) => void
): () => void {
  const channel = supabaseClient
    .channel(`pos:${tenantId}`)
    .on('broadcast', { event: 'order_update' }, ({ payload }) => onUpdate(payload))
    .subscribe();
  return () => supabaseClient.removeChannel(channel);
}
