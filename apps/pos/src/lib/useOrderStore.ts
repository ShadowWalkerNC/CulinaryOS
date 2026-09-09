// ============================================================
// POS — Realtime order store
// Replaces polling. Initial fetch once; all updates are push.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { usePOSStore } from './store';
import { useRealtimeOrders, type Order, getApiBase, apiHeaders } from '@culinaryos/shared';
import { getMockOrders } from './mockDb';

const ACTIVE_STATUSES = ['open', 'sent', 'in-progress', 'ready', 'served'];

export function useOrderStore() {
  const tenantId = usePOSStore((s) => s.tenantId);
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ---- Initial fetch ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadOrders = async () => {
      const API = getApiBase();
      try {
        const res = await fetch(`${API}/v1/orders`, {
          headers: apiHeaders(tenantId),
        });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) {
            setOrders((json.data || []) as Order[]);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through to mock DB
      }

      if (!cancelled) {
        setOrders(getMockOrders().filter(o => ACTIVE_STATUSES.includes(o.status)));
        setLoading(false);
      }
    };

    loadOrders();
    const interval = setInterval(loadOrders, 5_000);

    const updateHandler = () => {
      loadOrders();
    };
    window.addEventListener('mock-db-update', updateHandler);
    window.addEventListener('culinaryos:order-status-changed', updateHandler);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('mock-db-update', updateHandler);
      window.removeEventListener('culinaryos:order-status-changed', updateHandler);
    };
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
