// ============================================================
// KDS — Realtime ticket store
// Replaces react-query polling with Supabase Realtime push.
// Initial data is fetched once; all subsequent updates are push.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useKDSStore } from './store';
import { useRealtimeTickets } from '../../../../shared/realtime';
import type { KitchenTicket, KitchenStation } from '../../../../shared/types';

export function useTicketStore(station: KitchenStation | 'all') {
  const tenantId = useKDSStore((s) => s.tenantId);
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // ---- Initial fetch ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchInitial() {
      let q = supabase
        .from('kitchen_tickets')
        .select('*, items:ticket_items(id, line_item_id, name, quantity, modifiers, notes, sort_order)')
        .eq('tenant_id', tenantId)
        .in('status', ['queued', 'fired', 'cooking'])
        .order('created_at', { ascending: true });

      if (station !== 'all') q = q.eq('station', station);

      const { data, error } = await q;
      if (cancelled) return;
      if (error) { setError(error.message); setLoading(false); return; }
      setTickets(data as KitchenTicket[]);
      setLoading(false);
    }

    fetchInitial();
    return () => { cancelled = true; };
  }, [tenantId, station]);

  // ---- Realtime handlers ----

  const handleInsert = useCallback((ticket: KitchenTicket) => {
    if (station !== 'all' && ticket.station !== station) return;
    if (!['queued', 'fired', 'cooking'].includes(ticket.status)) return;
    setTickets((prev) => {
      if (prev.find((t) => t.id === ticket.id)) return prev;
      return [...prev, ticket].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, [station]);

  const handleUpdate = useCallback((ticket: KitchenTicket) => {
    setTickets((prev) => {
      // Remove from active list if bumped/voided
      if (['bumped', 'voided'].includes(ticket.status)) {
        return prev.filter((t) => t.id !== ticket.id);
      }
      // Update in place
      const idx = prev.findIndex((t) => t.id === ticket.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], ...ticket };
      return next;
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---- Wire Realtime subscription ----
  useRealtimeTickets(supabase, tenantId, handleInsert, handleUpdate, handleDelete);

  // ---- Manual bump/recall (optimistic) ----

  const bumpTicket = useCallback(async (ticketId: string, cookTimeSeconds: number) => {
    // Optimistic remove
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    const { error } = await supabase
      .from('kitchen_tickets')
      .update({ status: 'bumped', bumped_at: new Date().toISOString(), cook_time_seconds: cookTimeSeconds })
      .eq('id', ticketId);
    if (error) {
      console.error('[KDS] Bump failed:', error.message);
      // Re-fetch on failure
      const { data } = await supabase
        .from('kitchen_tickets')
        .select('*, items:ticket_items(*)')
        .eq('id', ticketId).single();
      if (data) setTickets((prev) => [...prev, data as KitchenTicket]);
    }
  }, []);

  const recallTicket = useCallback(async (ticketId: string) => {
    const { error } = await supabase
      .from('kitchen_tickets')
      .update({ status: 'cooking', bumped_at: null })
      .eq('id', ticketId);
    if (error) console.error('[KDS] Recall failed:', error.message);
  }, []);

  return { tickets, loading, error, bumpTicket, recallTicket };
}
