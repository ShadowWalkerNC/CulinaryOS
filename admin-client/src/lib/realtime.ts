// Admin-specific Realtime: live alert feed for low-stock + failed events
import { useEffect, useRef, useState } from 'react';
import { supabase, TENANT_ID } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveAlert {
  id: string;
  type: 'low_stock' | 'event_error' | 'out_of_stock';
  message: string;
  at: string;
}

export function useLiveAlerts() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  function push(alert: Omit<LiveAlert, 'id'>) {
    setAlerts((prev) => [
      { ...alert, id: crypto.randomUUID() },
      ...prev.slice(0, 49),   // keep last 50
    ]);
  }

  useEffect(() => {
    // Watch domain_events for new low-stock events or errors
    channelRef.current = supabase
      .channel(`admin:alerts:${TENANT_ID}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'domain_events',
          filter: `tenant_id=eq.${TENANT_ID}`,
        },
        (payload) => {
          const ev = payload.new as any;
          if (ev.event_type === 'recipeos:pantry:low-stock') {
            const p = ev.payload;
            push({
              type: p.currentQty <= 0 ? 'out_of_stock' : 'low_stock',
              message: `${p.ingredientName}: ${p.currentQty}${p.unit} remaining (reorder at ${p.reorderAt}${p.unit})`,
              at: ev.created_at,
            });
          }
          if (ev.error) {
            push({
              type: 'event_error',
              message: `Event handler failed [${ev.event_type}]: ${ev.error}`,
              at: ev.created_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return { alerts, dismiss };
}
