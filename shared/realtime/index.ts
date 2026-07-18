// ============================================================
// CulinaryOS — Shared Realtime Hooks
// Import in any React client to replace polling with push.
// Requires VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in env.
// ============================================================

import { useEffect, useRef } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { KitchenTicket, Order } from '../types';

// ---- KDS: ticket updates ----

export function useRealtimeTickets(
  supabase: SupabaseClient,
  tenantId: string,
  onInsert: (ticket: KitchenTicket) => void,
  onUpdate: (ticket: KitchenTicket) => void,
  onDelete: (id: string) => void
): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!supabase || !tenantId) return;

    channelRef.current = supabase
      .channel(`kds:tickets:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kitchen_tickets',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => onInsert(payload.new as KitchenTicket)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kitchen_tickets',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => onUpdate(payload.new as KitchenTicket)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'kitchen_tickets',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => onDelete((payload.old as any).id)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] KDS tickets subscribed for tenant ${tenantId}`);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId]);
}

// ---- POS: order updates ----

export function useRealtimeOrders(
  supabase: SupabaseClient,
  tenantId: string,
  onInsert: (order: Order) => void,
  onUpdate: (order: Order) => void
): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

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
        (payload) => onInsert(payload.new as Order)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pos_orders',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => onUpdate(payload.new as Order)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] POS orders subscribed for tenant ${tenantId}`);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId]);
}

// ---- Connection status hook ----

export function useRealtimeStatus(
  supabase: SupabaseClient,
  tenantId: string
): { connected: boolean } {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`presence:${tenantId}`)
      .subscribe((status) => {
        connectedRef.current = status === 'SUBSCRIBED';
      });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  return { connected: connectedRef.current };
}
