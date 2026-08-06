import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KitchenTicket, TicketStatus } from '../types';
import {
  KDS_ACTIVE_STATUSES,
  resolveDbStations,
  stationLabel,
  uiStationFromDb,
} from '@culinaryos/shared';

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

const TENANT_ID = import.meta.env.VITE_TENANT_ID as string | undefined;

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
    station: 'grill',
    stationId: '1',
    stationName: 'Hot Grill',
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
    courseHoldStatus: 'held',
    status: 'queued',
    station: 'grill',
    stationId: '1',
    stationName: 'Hot Grill',
    items: [
      { id: 'i-3', name: 'Ribeye Steak 12oz', quantity: 1, modifiers: ['Medium Rare', 'Herb Butter'], notes: 'Sauce on side' }
    ],
    createdAt: new Date(Date.now() - 650 * 1000).toISOString(),
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
    station: 'cold',
    stationId: '2',
    stationName: 'Cold Prep',
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
    station: 'fry',
    stationId: '3',
    stationName: 'Fryer',
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
    status: 'cooking',
    station: 'bar',
    stationId: '4',
    stationName: 'Bar',
    items: [
      { id: 'i-8', name: 'Cosmopolitan Cocktail', quantity: 1 },
      { id: 'i-9', name: 'IPA Draft Beer', quantity: 2 }
    ],
    createdAt: new Date(Date.now() - 90 * 1000).toISOString(),
    firedAt: new Date(Date.now() - 90 * 1000).toISOString(),
    elapsedSeconds: 90
  },
  {
    id: 't-106',
    orderId: 'o-201',
    tableLabel: 'Table 4',
    seatNumber: 1,
    courseNumber: 2,
    courseHoldStatus: 'held',
    status: 'queued',
    station: 'grill',
    stationId: '1',
    stationName: 'Hot Grill',
    items: [
      { id: 'i-10', name: 'Grilled Salmon', quantity: 1, modifiers: ['Lemon Butter', 'Asparagus'] }
    ],
    createdAt: new Date(Date.now() - 280 * 1000).toISOString(),
    elapsedSeconds: 280
  }
];

let globalDemoTickets: KitchenTicket[] = [...INITIAL_DEMO_TICKETS];

export function bumpDemoTicket(ticketId: string) {
  globalDemoTickets = globalDemoTickets.filter(t => t.id !== ticketId);
}

export function fireDemoTicket(ticketId: string) {
  globalDemoTickets = globalDemoTickets.map(t => {
    if (t.id === ticketId) {
      return {
        ...t,
        courseHoldStatus: 'fired',
        status: 'cooking',
        firedAt: new Date().toISOString(),
      };
    }
    return t;
  });
}

function matchesStation(ticketStation: string | undefined, stationId: string): boolean {
  if (stationId === 'all' || stationId === 'expo') return true;
  const allowed = resolveDbStations(stationId);
  if (!ticketStation) return false;
  if (allowed.includes(ticketStation)) return true;
  // Also allow UI id comparison for demo tickets
  return uiStationFromDb(ticketStation) === stationId || ticketStation === stationId;
}

/** Snake_case DB row → camelCase KitchenTicket */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTicket(row: any): KitchenTicket {
  const dbStation = row.station as string | undefined;
  const stationIdStr = row.station_id
    ? String(row.station_id)
    : uiStationFromDb(dbStation);
  const itemsSource = Array.isArray(row.ticket_items)
    ? row.ticket_items
    : Array.isArray(row.items)
      ? row.items
      : [];

  return {
    id:               row.id,
    tenantId:         row.tenant_id,
    orderId:          row.order_id,
    tableLabel:       row.table_label ?? row.table_number ?? row.order_id?.slice?.(0, 6)?.toUpperCase(),
    tableNumber:      row.table_number,
    seatNumber:       row.seat_number ?? undefined,
    courseNumber:     row.course_number,
    courseHoldStatus: row.course_hold_status,
    status:           row.status,
    station:          dbStation,
    stationId:        stationIdStr,
    stationName:      row.station_name ?? stationLabel(stationIdStr ?? dbStation),
    items:            itemsSource.map((i: any) => ({
                            id:        i.id,
                            name:      i.menu_item_name ?? i.name ?? '?',
                            quantity:  i.quantity,
                            modifiers: i.modifiers ?? [],
                            notes:     i.notes ?? undefined,
                          })),
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

  const tick = useCallback(() => {
    setTickets((prev) =>
      prev.map((t) => ({ ...t, elapsedSeconds: elapsed(t) }))
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    const ACTIVE: TicketStatus[] = [...KDS_ACTIVE_STATUSES];

    if (!supabase) {
      setLoading(false);
      setError(null);

      let filtered: KitchenTicket[] = [];
      if (stationId === 'expo') {
        filtered = globalDemoTickets;
      } else if (stationId === 'all') {
        filtered = globalDemoTickets.filter(t => t.courseHoldStatus === 'fired');
      } else {
        filtered = globalDemoTickets.filter(
          t => matchesStation(t.station ?? t.stationId, stationId) && t.courseHoldStatus === 'fired'
        );
      }

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
        .order('created_at', { ascending: true });

      if (TENANT_ID) {
        query = query.eq('tenant_id', TENANT_ID);
      }

      if (stationId === 'expo') {
        // Expo pass: all stations
      } else if (stationId === 'all') {
        query = query.eq('course_hold_status', 'fired');
      } else {
        const stations = resolveDbStations(stationId);
        query = query.eq('course_hold_status', 'fired').in('station', stations);
      }

      const { data, error: fetchErr } = await query;

      if (!mounted) return;
      if (fetchErr) { setError(fetchErr.message); setLoading(false); return; }
      setTickets((data ?? []).map(rowToTicket));
      setLoading(false);
    }

    fetchInitial();

    const channelName = TENANT_ID
      ? `kds:tickets:${TENANT_ID}:${stationId}`
      : `kds-station-${stationId}`;

    const filter = TENANT_ID ? `tenant_id=eq.${TENANT_ID}` : undefined;

    const channel = supabase!
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_tickets',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          if (!mounted) return;
          const row = payload.new as any;
          if (!row?.id) {
            if (payload.eventType === 'DELETE' && (payload.old as any)?.id) {
              setTickets((prev) => prev.filter((t) => t.id !== (payload.old as any).id));
            }
            return;
          }
          if (TENANT_ID && row.tenant_id && row.tenant_id !== TENANT_ID) return;
          if (!matchesStation(row.station, stationId) && stationId !== 'all' && stationId !== 'expo') return;

          setTickets((prev) => {
            if (['voided', 'bumped'].includes(row.status)) {
              return prev.filter((t) => t.id !== row.id);
            }
            if (stationId !== 'expo' && row.course_hold_status === 'held') {
              return prev.filter((t) => t.id !== row.id);
            }
            // Realtime payloads lack joined ticket_items — preserve existing items
            const updated = rowToTicket(row);
            const exists  = prev.find((t) => t.id === row.id);
            if (exists) {
              if (!updated.items.length && exists.items.length) {
                updated.items = exists.items;
              }
              return prev.map((t) => (t.id === row.id ? updated : t));
            }
            return [...prev, updated].sort((a, b) => (a.elapsedSeconds ?? 0) - (b.elapsedSeconds ?? 0));
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          fetchInitial();
        }
      });

    timerRef.current = setInterval(tick, 1000);

    return () => {
      mounted = false;
      supabase!.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stationId, tick]);

  return { tickets, loading, error, setTickets };
}
