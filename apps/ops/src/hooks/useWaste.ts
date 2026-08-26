import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type WasteReason = 'spoilage' | 'trim' | 'overcook' | 'drop' | 'expired' | 'other';

export interface WasteLog {
  id: string;
  log_date: string;
  ingredient: string;
  quantity_grams: number;
  reason: WasteReason;
  cost_per_gram: number;
  notes: string | null;
  created_at: string;
}

export function useWasteLogs(days = 30) {
  return useQuery({
    queryKey: ['waste_logs', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from('waste_logs')
        .select('*')
        .gte('log_date', since.toISOString().split('T')[0])
        .order('log_date', { ascending: false });
      if (error) throw error;
      return data as WasteLog[];
    },
  });
}

export function useLogWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: Omit<WasteLog, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('waste_logs').insert({ ...log, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste_logs'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteWasteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('waste_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste_logs'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
