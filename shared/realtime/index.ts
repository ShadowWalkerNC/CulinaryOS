// ============================================================
// CulinaryOS — Shared Realtime Hooks (root shared/)
// Keep in sync with packages/shared/src/realtime
// ============================================================

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { KitchenTicket, Order } from '../types';

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
            onDeleteRef.current((payload.old as any).id);
            return;
          }
          const row = payload.new as KitchenTicket;
          if (payload.eventType === 'INSERT') onInsertRef.current(row);
          else onUpdateRef.current(row);
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] KDS channel ${status}`);
        }
      });

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
        (payload: { new: any }) => onInsertRef.current(payload.new as Order)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pos_orders',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: { new: any }) => onUpdateRef.current(payload.new as Order)
      )
      .subscribe();

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
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`presence:${tenantId}`)
      .subscribe((status: string) => {
        setConnected(status === 'SUBSCRIBED');
      });
    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [supabase, tenantId]);

  return { connected };
}
