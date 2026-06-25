import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useKDSStore } from './store';
import type { KitchenTicket, KitchenStation } from '../../../shared/types';

export function useTickets(station?: KitchenStation | 'all') {
  const tenantId = useKDSStore((s) => s.tenantId);
  return useQuery({
    queryKey: ['tickets', tenantId, station],
    queryFn: async () => {
      let q = supabase
        .from('kitchen_tickets')
        .select('*, items:ticket_items(*)')
        .eq('tenant_id', tenantId)
        .in('status', ['queued', 'fired', 'cooking'])
        .order('created_at', { ascending: true });
      if (station && station !== 'all') q = q.eq('station', station);
      const { data, error } = await q;
      if (error) throw error;
      return data as KitchenTicket[];
    },
    refetchInterval: 5000,
  });
}

export function useBumpTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, cookTimeSeconds }: { ticketId: string; cookTimeSeconds: number }) => {
      const { error } = await supabase
        .from('kitchen_tickets')
        .update({ status: 'bumped', bumped_at: new Date().toISOString(), cook_time_seconds: cookTimeSeconds })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useRecallTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('kitchen_tickets')
        .update({ status: 'cooking', bumped_at: null })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useFireTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('kitchen_tickets')
        .update({ status: 'fired', fired_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}
