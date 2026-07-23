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

const INITIAL_DEMO_TICKETS: KitchenTicket[] = [
  {
    id: 't-101',
    orderId: 'o-201',
    tableLabel: 'Table 4',
    seatNumber: 1,
    courseNumber: 1,
    courseHoldStatus: 'fired',
    status: 'cooking',
    items: [
      { id: 'i-1', name: 'Smash Burger Double', quantity: 2, modifiers: ['No Onions', 'Extra Cheese'], notes: 'Gluten Allergy' },
      { id: 'i-2', name: 'Truffle Fries', quantity: 1, modifiers: ['Aioli Dip'] }
    ],
    createdAt: new Date(Date.now() - 320 * 1000).toISOString(),
    firedAt: new Date(Date.now() - 320 * 1000).toISOString(),
    elapsedSeconds: 320
  },
  {
    id: 't-102',
    orderId: 'o-202',
    tableLabel: 'Table 12',
    seatNumber: 2,
    courseNumber: 2,
    courseHoldStatus: 'fired',
    status: 'queued',
    items: [
      { id: 'i-3', name: 'Ribeye Steak 12oz', quantity: 1, modifiers: ['Medium Rare', 'Herb Butter'], notes: 'Sauce on side' }
    ],
    createdAt: new Date(Date.now() - 650 * 1000).toISOString(),
    firedAt: new Date(Date.now() - 650 * 1000).toISOString(),
    elapsedSeconds: 650
  },
  {
    id: 't-103',
    orderId: 'o-203',
    tableLabel: 'Table 8',
    seatNumber: 1,
    courseNumber: 1,
    courseHoldStatus: 'fired',
    status: 'cooking',
    items: [
      { id: 'i-4', name: 'Caesar Salad', quantity: 1, modifiers: ['Add Grilled Chicken', 'Dressing Side'] },
      { id: 'i-5', name: 'Truffle Hummus', quantity: 1 }
    ],
    createdAt: new Date(Date.now() - 140 * 1000).toISOString(),
    firedAt: new Date(Date.now() - 140 * 1000).toISOString(),
    elapsedSeconds: 140
  },
  {
    id: 't-104',
    orderId: 'o-204',
    tableLabel: 'Bar-John',
    courseNumber: 1,
    courseHoldStatus: 'fired',
    status: 'cooking',
    items: [
      { id: 'i-6', name: 'Crispy Calamari', quantity: 2, modifiers: ['Spicy Mayo'] },
      { id: 'i-7', name: 'Buffalo Wings', quantity: 1, notes: 'Extra Crispy' }
    ],
    createdAt: new Date(Date.now() - 210 * 1000).toISOString(),
    firedAt: new Date(Date.now() - 210 * 1000).toISOString(),
    elapsedSeconds: 210
  },
  {
    id: 't-105',
    orderId: 'o-205',
    tableLabel: 'Bar-Sarah',
    courseNumber: 1,
    courseHoldStatus: 'fired',
    status: 'ready',
    items: [
      { id: 'i-8', name: 'Cosmopolitan Cocktail', quantity: 1 },
      { id: 'i-9', name: 'IPA Draft Beer', quantity: 2 }
    ],
    createdAt: new Date(Date.now() - 90 * 1000).toISOString(),
    firedAt: new Date(Date.now() - 90 * 1000).toISOString(),
    elapsedSeconds: 90
  }
];

let globalDemoTickets: KitchenTicket[] = [...INITIAL_DEMO_TICKETS];

export function bumpDemoTicket(ticketId: string) {
  globalDemoTickets = globalDemoTickets.filter(t => t.id !== ticketId);
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
 * Subscribes to kitchen_tickets for the given station via Supabase Realtime or local demo state.
 */
export function useRealtimeTickets(stationId: string) {
  const [tickets, setTickets]   = useState<KitchenTicket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);
  const timerRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh elapsed every second so timers update continuously
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
      setError(null);

      const filtered = stationId === 'all'
        ? globalDemoTickets
        : globalDemoTickets.filter((t, idx) => {
            if (stationId === '1') return idx % 2 === 0;
            if (stationId === '2') return idx === 2;
            if (stationId === '3') return idx === 3;
            if (stationId === '4') return idx === 4;
            return true;
          });

      setTickets(filtered.map(t => ({ ...t, elapsedSeconds: elapsed(t) })));

      timerRef.current = setInterval(tick, 1000);
      return () => {
        mounted = false;
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }

    async function fetchInitial() {
      setLoading(true);
      let query = supabase!
        .from('kitchen_tickets')
        .select('*, ticket_items(*)')
        .in('status', ACTIVE)
        .eq('course_hold_status', 'fired')
        .order('created_at', { ascending: true });

      if (stationId !== 'all') {
        query = query.eq('station_id', stationId);
      }

      const { data, error: fetchErr } = await query;

      if (!mounted) return;
      if (fetchErr) { setError(fetchErr.message); setLoading(false); return; }
      setTickets((data ?? []).map(rowToTicket));
      setLoading(false);
    }

    fetchInitial();

    const channel = supabase!
      .channel(`kds-station-${stationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitchen_tickets' },
        (payload) => {
          if (!mounted) return;
          const row = payload.new as any;
          if (!row?.id) return;
          if (stationId !== 'all' && row.station_id !== stationId) return;

          setTickets((prev) => {
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

    timerRef.current = setInterval(tick, 1000);

    return () => {
      mounted = false;
      supabase!.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stationId, tick]);

  return { tickets, loading, error, setTickets };
}
