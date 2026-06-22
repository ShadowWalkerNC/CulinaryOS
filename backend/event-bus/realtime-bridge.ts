// ============================================================
// CulinaryOS — Supabase Realtime Bridge
//
// Subscribes to Supabase Realtime changes on kitchen_tickets
// and pos_orders, then pushes updates to connected clients
// (KDS web display, POS web display) via a broadcast channel.
//
// This replaces polling for real-time ticket updates.
// Usage: import and call startRealtimeBridge() on server boot.
// ============================================================

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function startRealtimeBridge(): void {
  // ---- Kitchen Tickets → broadcast to KDS clients ----
  const kdsChannel: RealtimeChannel = supabase
    .channel('kds:tickets')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kitchen_tickets' },
      (payload) => {
        const tenantId = (payload.new as any)?.tenant_id ?? (payload.old as any)?.tenant_id;
        if (!tenantId) return;

        supabase.channel(`kds:${tenantId}`).send({
          type: 'broadcast',
          event: 'ticket_update',
          payload: {
            eventType: payload.eventType,   // INSERT | UPDATE | DELETE
            ticket:    payload.new,
          },
        });
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] KDS bridge:', status);
    });

  // ---- POS Orders → broadcast to POS clients ----
  const posChannel: RealtimeChannel = supabase
    .channel('pos:orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pos_orders' },
      (payload) => {
        const tenantId = (payload.new as any)?.tenant_id ?? (payload.old as any)?.tenant_id;
        if (!tenantId) return;

        supabase.channel(`pos:${tenantId}`).send({
          type: 'broadcast',
          event: 'order_update',
          payload: {
            eventType: payload.eventType,
            order:     payload.new,
          },
        });
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] POS bridge:', status);
    });
}

// ---- Client-side subscription helpers (used in React apps) ----
// Import in kds-client or pos-client to switch from polling to push.

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
