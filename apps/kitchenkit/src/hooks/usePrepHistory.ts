import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DBPrepPlanWithItems } from './usePrepPlans';

const PAGE_SIZE = 20;

const DEV_SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || DEV_SEED_USER_ID;
}

export function usePrepHistory() {
  const [page, setPage] = useState(0);

  const query = useQuery<{ plans: DBPrepPlanWithItems[]; hasMore: boolean }>({
    queryKey: ['prep_history', page],
    queryFn: async () => {
      const userId = await getUserId();

      // Fetch PAGE_SIZE + 1 to detect if more pages exist without a separate count query
      const { data, error } = await supabase
        .from('prep_plans')
        .select('*, items:prep_plan_items(*)')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('plan_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

      if (error) throw error;

      const rows = (data ?? []) as DBPrepPlanWithItems[];
      const hasMore = rows.length > PAGE_SIZE;

      return {
        plans: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
        hasMore,
      };
    },
    placeholderData: (prev) => prev,
  });

  return {
    ...query,
    page,
    nextPage: () => setPage((p) => p + 1),
    prevPage: () => setPage((p) => Math.max(0, p - 1)),
  };
}
