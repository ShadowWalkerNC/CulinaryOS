// ============================================================
// CulinaryOS — Shared Realtime Hooks
// ============================================================

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { KitchenTicket, Order } from '../types';
import { mapTicketRowToKitchenTicket, mapOrderRowToOrder } from '../mappers';

// Channel names must match packages/event-bus realtime-bridge broadcasts:
//   kds:{tenantId}  event ticket_update
//   pos:{tenantId}  event order_update
// Plus postgres_changes filters for direct client subscriptions.

export function useRealtimeTickets(
  supabase: SupabaseClient,
  tenantId: string,
  onInsert: (ticket: KitchenTicket) => void,
  onUpdate: (ticket: KitchenTicket) => void,
  onDelete: (id: string) => void
): void {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;
  onDeleteRef.current = onDelete;

  useEffect(() => {
    if (!supabase || !tenantId) return;

    const applyRow = (eventType: string, row: any) => {
      if (!row?.id) return;
      if (eventType === 'DELETE') {
        onDeleteRef.current(row.id);
        return;
      }
      const ticket = mapTicketRowToKitchenTicket(row);
      if (eventType === 'INSERT') onInsertRef.current(ticket);
      else onUpdateRef.current(ticket);
    };

    channelRef.current = supabase
      .channel(`kds:tickets:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_tickets',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: { eventType: string; new: any; old: any }) => {
          if (payload.eventType === 'DELETE') {
            applyRow('DELETE', payload.old);
          } else {
            applyRow(payload.eventType, payload.new);
          }
        }
      )
      .on('broadcast', { event: 'ticket_update' }, ({ payload }: { payload: any }) => {
        applyRow(payload?.eventType ?? 'UPDATE', payload?.ticket);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] KDS tickets subscribed for tenant ${tenantId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] KDS channel ${status} — client should refetch`);
        }
      });

    // Also join bridge broadcast channel used by server realtime-bridge
    const bridge = supabase.channel(`kds:${tenantId}`).subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      supabase.removeChannel(bridge);
    };
  }, [supabase, tenantId]);
}

export function useRealtimeOrders(
  supabase: SupabaseClient,
  tenantId: string,
  onInsert: (order: Order) => void,
  onUpdate: (order: Order) => void
): void {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!supabase || !tenantId) return;

    channelRef.current = supabase
      .channel(`pos:orders:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pos_orders',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: { new: any }) => onInsertRef.current(mapOrderRowToOrder(payload.new))
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pos_orders',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: { new: any }) => onUpdateRef.current(mapOrderRowToOrder(payload.new))
      )
      .on('broadcast', { event: 'order_update' }, ({ payload }: { payload: any }) => {
        const order = mapOrderRowToOrder(payload?.order);
        if (!order?.id) return;
        if (payload?.eventType === 'INSERT') onInsertRef.current(order);
        else onUpdateRef.current(order);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] POS orders subscribed for tenant ${tenantId}`);
        }
      });

    const bridge = supabase.channel(`pos:${tenantId}`).subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      supabase.removeChannel(bridge);
    };
  }, [supabase, tenantId]);
}

export function useRealtimeStatus(
  supabase: SupabaseClient,
  tenantId: string
): { connected: boolean } {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`presence:${tenantId}`)
      .subscribe((status: string) => {
        setConnected(status === 'SUBSCRIBED');
      });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [supabase, tenantId]);

  return { connected };
}
