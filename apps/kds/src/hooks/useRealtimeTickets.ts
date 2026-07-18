import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KitchenTicket, TicketStatus } from '../types';

let supabase: SupabaseClient | null = null;
try {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key && !url.includes('your-project')) {
    supabase = createClient(url, key);
  }
} catch {
  // Supabase not available — app will render in demo/offline mode
}

/** Derives elapsed seconds from a ticket's firedAt or createdAt */
function elapsed(ticket: { firedAt?: string; createdAt: string }): number {
  const base = ticket.firedAt ?? ticket.createdAt;
  return Math.floor((Date.now() - new Date(base).getTime()) / 1000);
}

/** Snake_case DB row → camelCase KitchenTicket */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTicket(row: any): KitchenTicket {
  return {
    id:               row.id,
    orderId:          row.order_id,
    tableLabel:       row.table_label ?? row.order_id.slice(0, 6).toUpperCase(),
    seatNumber:       row.seat_number ?? undefined,
    courseNumber:     row.course_number,
    courseHoldStatus: row.course_hold_status,
    status:           row.status,
    items:            Array.isArray(row.ticket_items)
                        ? row.ticket_items.map((i: any) => ({
                            id:        i.id,
                            name:      i.menu_item_name ?? i.name ?? '?',
                            quantity:  i.quantity,
                            modifiers: i.modifiers ?? [],
                            notes:     i.notes ?? undefined,
                          }))
                        : [],
    createdAt:        row.created_at,
    firedAt:          row.fired_at ?? undefined,
    bumpedAt:         row.bumped_at ?? undefined,
    elapsedSeconds:   elapsed({ firedAt: row.fired_at, createdAt: row.created_at }),
  };
}

/**
 * Subscribes to kitchen_tickets for the given station via Supabase Realtime.
 * Only shows queued/cooking/ready tickets — held and bumped are filtered client-side.
 * Returns active tickets sorted by elapsedSeconds DESC (oldest first).
 */
export function useRealtimeTickets(stationId: string) {
  const [tickets, setTickets]   = useState<KitchenTicket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);
  const timerRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh elapsed every 10s so timer badges update
  const tick = useCallback(() => {
    setTickets((prev) =>
      prev.map((t) => ({ ...t, elapsedSeconds: elapsed(t) }))
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    const ACTIVE: TicketStatus[] = ['queued', 'cooking', 'ready'];

    if (!supabase) {
      setLoading(false);
      setError('No database configured — running in demo mode');
      return;
    }

    async function fetchInitial() {
      setLoading(true);
      const { data, error: fetchErr } = await supabase!
        .from('kitchen_tickets')
        .select('*, ticket_items(*)')
        .eq('station_id', stationId)
        .in('status', ACTIVE)
        .eq('course_hold_status', 'fired') // never show held tickets
        .order('created_at', { ascending: true });

      if (!mounted) return;
      if (fetchErr) { setError(fetchErr.message); setLoading(false); return; }
      setTickets((data ?? []).map(rowToTicket));
      setLoading(false);
    }

    fetchInitial();

    // Realtime subscription
    const channel = supabase!
      .channel(`kds-station-${stationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitchen_tickets',
          filter: `station_id=eq.${stationId}` },
        (payload) => {
          if (!mounted) return;
          const row = payload.new as any;
          if (!row?.id) return;

          setTickets((prev) => {
            // Remove if voided/bumped/held
            if (['voided', 'bumped'].includes(row.status) || row.course_hold_status === 'held') {
              return prev.filter((t) => t.id !== row.id);
            }
            const updated = rowToTicket(row);
            const exists  = prev.find((t) => t.id === row.id);
            if (exists) return prev.map((t) => (t.id === row.id ? updated : t));
            return [...prev, updated].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
          });
        }
      )
      .subscribe();

    timerRef.current = setInterval(tick, 10_000);

    return () => {
      mounted = false;
      supabase!.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stationId, tick]);

  return { tickets, loading, error };
}
