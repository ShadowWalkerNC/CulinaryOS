import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { laborCostPct, summarizeLabor } from '@culinaryos/labor-engine';
import { costRecipe } from '@culinaryos/food-cost-engine';
import { wastePct, summarizeWaste } from '@culinaryos/waste-engine';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const since = weekAgo.toISOString().split('T')[0];

      const [shiftsRes, menuRes, wastesRes, openPOsRes] = await Promise.all([
        supabase
          .from('shifts')
          .select('*, employees(hourly_rate)')
          .gte('shift_date', since),
        supabase
          .from('menu_items')
          .select('*, menu_item_ingredients(*)')
          .eq('active', true),
        supabase
          .from('waste_logs')
          .select('*')
          .gte('log_date', since),
        supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['draft', 'sent']),
      ]);

      if (shiftsRes.error) throw shiftsRes.error;
      if (menuRes.error) throw menuRes.error;
      if (wastesRes.error) throw wastesRes.error;
      if (openPOsRes.error) throw openPOsRes.error;

      // Labor cost %
      const shifts = (shiftsRes.data ?? []).map((s: any) => ({
        ...s,
        hourly_rate: s.employees?.hourly_rate ?? 0,
      }));
      const laborSummary = summarizeLabor(shifts);
      const totalRevEst = shifts.length > 0 ? laborSummary.totalCost * 3.5 : 0; // rough 28% labor target
      const laborPct = totalRevEst > 0 ? laborCostPct(laborSummary.totalCost, totalRevEst) : null;

      // Food cost %
      const items = menuRes.data ?? [];
      const allCosts = items.map((item: any) =>
        costRecipe(item.menu_item_ingredients ?? [], item.menu_price)
      );
      const avgFoodCostPct =
        allCosts.length > 0
          ? allCosts.reduce((a: number, c: any) => a + c.foodCostPct, 0) / allCosts.length
          : null;

      // Waste this week
      const wastes = (wastesRes.data ?? []).map((w: any) => ({
        ingredient: w.ingredient,
        quantity_grams: w.quantity_grams,
        cost_per_gram: w.cost_per_gram,
      }));
      const wasteSummary = summarizeWaste(wastes);

      return {
        laborPct,
        avgFoodCostPct,
        wasteCost: wasteSummary.totalCost,
        wasteGrams: wasteSummary.totalGrams,
        openPOs: openPOsRes.count ?? 0,
      };
    },
    refetchInterval: 60_000,
  });
}
