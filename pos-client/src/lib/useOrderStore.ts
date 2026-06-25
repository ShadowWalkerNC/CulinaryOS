// ============================================================
// POS — Realtime order store
// Replaces polling. Initial fetch once; all updates are push.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { usePOSStore } from './store';
import { useRealtimeOrders } from '../../../../shared/realtime';
import type { Order } from '../../../../shared/types';

const ACTIVE_STATUSES = ['open', 'sent', 'in-progress', 'ready'];

export function useOrderStore() {
  const tenantId = usePOSStore((s) => s.tenantId);
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ---- Initial fetch ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('pos_orders')
      .select('*, items:pos_order_line_items(*, modifiers:line_item_modifiers(*))')
      .eq('tenant_id', tenantId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setError(error.message); setLoading(false); return; }
        setOrders(data as Order[]);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tenantId]);

  // ---- Realtime handlers ----

  const handleInsert = useCallback((order: Order) => {
    if (!ACTIVE_STATUSES.includes(order.status)) return;
    setOrders((prev) => {
      if (prev.find((o) => o.id === order.id)) return prev;
      return [...prev, order];
    });
  }, []);

  const handleUpdate = useCallback((order: Order) => {
    setOrders((prev) => {
      // Remove if no longer active (paid / voided)
      if (!ACTIVE_STATUSES.includes(order.status)) {
        return prev.filter((o) => o.id !== order.id);
      }
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx === -1) return [...prev, order]; // newly active
      const next = [...prev];
      next[idx] = { ...next[idx], ...order };
      return next;
    });
  }, []);

  useRealtimeOrders(supabase, tenantId, handleInsert, handleUpdate);

  return { orders, loading, error };
}
