// ============================================================
// CulinaryOS — Supabase Realtime Bridge
// Migrated from backend/event-bus/realtime-bridge.ts
//
// Subscribes to Supabase Realtime on kitchen_tickets + pos_orders
// and broadcasts updates to connected KDS/POS clients.
// Call startRealtimeBridge() on server boot.
// ============================================================

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function startRealtimeBridge(): void {
  // ---- Kitchen Tickets → broadcast to KDS clients ----
  const _kdsChannel: RealtimeChannel = supabase
    .channel('kds:tickets')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kitchen_tickets' },
      (payload) => {
        const tenantId = (payload.new as any)?.tenant_id ?? (payload.old as any)?.tenant_id;
        if (!tenantId) return;
        supabase.channel(`kds:${tenantId}`).send({
          type:  'broadcast',
          event: 'ticket_update',
          payload: { eventType: payload.eventType, ticket: payload.new },
        });
      }
    )
    .subscribe((status) => console.log('[Realtime] KDS bridge:', status));

  // ---- POS Orders → broadcast to POS clients ----
  const _posChannel: RealtimeChannel = supabase
    .channel('pos:orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pos_orders' },
      (payload) => {
        const tenantId = (payload.new as any)?.tenant_id ?? (payload.old as any)?.tenant_id;
        if (!tenantId) return;
        supabase.channel(`pos:${tenantId}`).send({
          type:  'broadcast',
          event: 'order_update',
          payload: { eventType: payload.eventType, order: payload.new },
        });
      }
    )
    .subscribe((status) => console.log('[Realtime] POS bridge:', status));
}

// ---- Client-side subscription helpers (used in React apps) ----

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
