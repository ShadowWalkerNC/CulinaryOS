import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface DashboardStats {
  recipeCount:     number;
  parItemCount:    number;   // total par level line items
  activePlansCount: number;  // prep plans saved but not yet completed
  belowParCount:   number;   // par items where current_stock < par_amount
  completedToday:  number;   // prep plans completed today
}

export function useDashboardStats(): { data: DashboardStats | undefined; isLoading: boolean } {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard_stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const [recipes, parLevels, activePlans, completedTodayRes] = await Promise.all([
        // Total recipe count
        supabase
          .from('recipes')
          .select('id', { count: 'exact', head: true }),

        // All par levels (need rows to compute belowParCount)
        supabase
          .from('par_levels')
          .select('id, current_stock, par_amount', { count: 'exact' }),

        // Prep plans saved and not yet completed
        supabase
          .from('prep_plans')
          .select('id', { count: 'exact', head: true })
          .eq('is_completed', false),

        // Prep plans completed today
        supabase
          .from('prep_plans')
          .select('id', { count: 'exact', head: true })
          .eq('is_completed', true)
          .gte('completed_at', `${todayISO}T00:00:00Z`)
          .lte('completed_at', `${todayISO}T23:59:59Z`),
      ]);

      const parRows = parLevels.data ?? [];

      return {
        recipeCount:      recipes.count      ?? 0,
        parItemCount:     parLevels.count    ?? 0,
        activePlansCount: activePlans.count  ?? 0,
        belowParCount:    parRows.filter(
          (r) => Number(r.current_stock) < Number(r.par_amount)
        ).length,
        completedToday:   completedTodayRes.count ?? 0,
      };
    },
  });
}
