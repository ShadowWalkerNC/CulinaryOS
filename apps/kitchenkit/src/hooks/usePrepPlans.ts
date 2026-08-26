import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export interface DBPrepPlan {
  id: string;
  user_id: string;
  shift: string;
  plan_date: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface DBPrepPlanItem {
  id: string;
  plan_id: string;
  ingredient_name: string;
  prep_amount: number;
  unit: string;
  is_done: boolean;
  done_at: string | null;
  note?: string | null;
}

export interface DBPrepPlanWithItems extends DBPrepPlan {
  items: DBPrepPlanItem[];
}

const DEV_SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || DEV_SEED_USER_ID;
}

export function usePrepPlan(shift: string, date: string) {
  return useQuery<DBPrepPlanWithItems | null>({
    queryKey: ['prep_plan', shift, date],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('prep_plans')
        .select('*, items:prep_plan_items(*)')
        .eq('user_id', userId)
        .eq('shift', shift)
        .eq('plan_date', date)
        .maybeSingle();
      if (error) throw error;
      return data as DBPrepPlanWithItems | null;
    },
    enabled: Boolean(shift && date),
  });
}

export function useSavePrepPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shift, date, items,
    }: {
      shift: string;
      date: string;
      items: Array<{ ingredient_name: string; prep_amount: number; unit: string }>;
    }) => {
      const userId = await getUserId();

      const { data: plan, error: planErr } = await supabase
        .from('prep_plans')
        .upsert(
          { user_id: userId, shift, plan_date: date },
          { onConflict: 'user_id,shift,plan_date' }
        )
        .select()
        .single();
      if (planErr) throw planErr;

      const { error: delErr } = await supabase
        .from('prep_plan_items')
        .delete()
        .eq('plan_id', plan.id)
        .eq('is_done', false);
      if (delErr) throw delErr;

      if (items.length > 0) {
        const { error: insErr } = await supabase
          .from('prep_plan_items')
          .insert(items.map(item => ({ ...item, plan_id: plan.id })));
        if (insErr) throw insErr;
      }

      return plan as DBPrepPlan;
    },
    onSuccess: (_data, { shift, date }) => {
      qc.invalidateQueries({ queryKey: ['prep_plan', shift, date] });
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] });
      toast.success('Prep plan saved');
    },
    onError: (err: Error) => {
      toast.error(`Failed to save plan: ${err.message}`);
    },
  });
}

export function useTogglePrepItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId, isDone,
    }: {
      itemId: string;
      isDone: boolean;
      shift: string;
      date: string;
    }) => {
      const { error } = await supabase
        .from('prep_plan_items')
        .update({ is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: (_data, { shift, date, isDone, itemId: _itemId }) => {
      qc.invalidateQueries({ queryKey: ['prep_plan', shift, date] });
      qc.invalidateQueries({ queryKey: ['par_levels'] });
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] });
      if (isDone) toast.success('Item marked done');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update item: ${err.message}`);
    },
  });
}

export function useCompletePrepPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planId,
    }: {
      planId: string;
      shift: string;
      date: string;
    }) => {
      const { error: itemsErr } = await supabase
        .from('prep_plan_items')
        .update({ is_done: true, done_at: new Date().toISOString() })
        .eq('plan_id', planId)
        .eq('is_done', false);
      if (itemsErr) throw itemsErr;

      const { error: planErr } = await supabase
        .from('prep_plans')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', planId);
      if (planErr) throw planErr;
    },
    onSuccess: (_data, { shift, date }) => {
      qc.invalidateQueries({ queryKey: ['prep_plan', shift, date] });
      qc.invalidateQueries({ queryKey: ['prep_history'] });
      qc.invalidateQueries({ queryKey: ['par_levels'] });
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] });
      toast.success('Shift complete! 🎉');
    },
    onError: (err: Error) => {
      toast.error(`Failed to complete shift: ${err.message}`);
    },
  });
}
