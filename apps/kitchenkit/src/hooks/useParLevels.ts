import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export interface DBParLevel {
  id: string;
  user_id: string;
  ingredient_name: string;
  par_amount: number;
  current_stock: number;
  unit: string;
  shifts?: string[];
  updated_at: string;
}

export interface ShiftPrepItem {
  ingredient_name: string;
  current_stock: number;
  par_amount: number;
  prep_amount: number;
  unit: string;
  recipe_id: string | null;
}

const DEV_SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || DEV_SEED_USER_ID;
}

export function useParLevels() {
  return useQuery<DBParLevel[]>({
    queryKey: ['par_levels'],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('par_levels')
        .select('*')
        .eq('user_id', userId)
        .order('ingredient_name', { ascending: true });
      if (error) throw error;
      return data as DBParLevel[];
    },
  });
}

/**
 * Returns only items that are below par, with prep_amount pre-calculated.
 * shift and date params are accepted for query-key scoping / future
 * shift-specific par levels, but currently all par levels apply to every shift.
 */
export function useShiftPrep(shift: string, date: string) {
  return useQuery<ShiftPrepItem[]>({
    queryKey: ['shift_prep', shift, date],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('par_levels')
        .select('*')
        .eq('user_id', userId)
        .order('ingredient_name', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as DBParLevel[];
      return rows
        .filter((r) => Number(r.current_stock) < Number(r.par_amount))
        .map((r) => ({
          ingredient_name: r.ingredient_name,
          current_stock:   Number(r.current_stock),
          par_amount:      Number(r.par_amount),
          prep_amount:     Number(r.par_amount) - Number(r.current_stock),
          unit:            r.unit,
          recipe_id:       null,
        }));
    },
    enabled: Boolean(shift && date),
  });
}

export function useUpsertParLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      ingredient_name: string;
      par_amount: number;
      current_stock: number;
      unit: string;
    }) => {
      const userId = await getUserId();
      const { error } = await supabase
        .from('par_levels')
        .upsert(
          { ...payload, user_id: userId },
          { onConflict: 'user_id,ingredient_name' }
        );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['par_levels'] });
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] });
      toast.success(variables.id ? 'Par level updated' : `"${variables.ingredient_name}" added`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to save par level: ${err.message}`);
    },
  });
}

export function useDeleteParLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('par_levels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['par_levels'] });
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] });
      toast.success('Par item removed');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete par item: ${err.message}`);
    },
  });
}
