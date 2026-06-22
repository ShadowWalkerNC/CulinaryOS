import { useQuery } from '@tanstack/react-query';
import { supabase, TENANT_ID } from './supabase';

// ---- Overview ----

export function useOverviewStats() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const [orders, tickets, lowStock, events] = await Promise.all([
        supabase.from('pos_orders').select('id, status, total, created_at')
          .eq('tenant_id', TENANT_ID)
          .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
        supabase.from('kitchen_tickets').select('id, status, station')
          .eq('tenant_id', TENANT_ID)
          .gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
        supabase.from('pantry_status').select('id, name, unit, current_qty, reorder_at, stock_status')
          .eq('tenant_id', TENANT_ID)
          .in('stock_status', ['low_stock', 'out_of_stock']),
        supabase.from('domain_events').select('id, event_type, processed, error, created_at')
          .eq('tenant_id', TENANT_ID)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const todayOrders  = orders.data  ?? [];
      const todayTickets = tickets.data ?? [];
      const revenue = todayOrders
        .filter((o) => o.status === 'paid')
        .reduce((s, o) => s + (o.total ?? 0), 0);

      return {
        revenue,
        orderCount:     todayOrders.length,
        paidCount:      todayOrders.filter((o) => o.status === 'paid').length,
        activeTickets:  todayTickets.filter((t) => ['fired','cooking','queued'].includes(t.status)).length,
        bumpedTickets:  todayTickets.filter((t) => t.status === 'bumped').length,
        lowStockItems:  lowStock.data  ?? [],
        recentEvents:   events.data    ?? [],
      };
    },
    refetchInterval: 30_000,
  });
}

// ---- Pantry ----

export function usePantryStatus() {
  return useQuery({
    queryKey: ['admin', 'pantry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pantry_status').select('*').eq('tenant_id', TENANT_ID).order('name');
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });
}

export function usePantryLedger(ingredientId?: string) {
  return useQuery({
    queryKey: ['admin', 'ledger', ingredientId],
    queryFn: async () => {
      let q = supabase
        .from('pantry_ledger')
        .select('*, ingredient:ingredients(name, unit)')
        .eq('tenant_id', TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(100);
      if (ingredientId) q = q.eq('ingredient_id', ingredientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });
}

// ---- Event Log ----

export function useEventLog() {
  return useQuery({
    queryKey: ['admin', 'events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('domain_events')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10_000,
  });
}

// ---- Order History ----

export function useOrderHistory() {
  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_orders')
        .select('*, items:pos_order_line_items(id, name, quantity, line_total, is_voided)')
        .eq('tenant_id', TENANT_ID)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });
}

// ---- Revenue chart (last 7 days, by day) ----

export function useRevenueChart() {
  return useQuery({
    queryKey: ['admin', 'revenue-chart'],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('pos_orders')
        .select('total, created_at')
        .eq('tenant_id', TENANT_ID)
        .eq('status', 'paid')
        .gte('created_at', since)
        .order('created_at');
      if (error) throw error;

      // Group by day
      const byDay: Record<string, number> = {};
      for (const o of data ?? []) {
        const day = o.created_at.slice(0, 10);
        byDay[day] = (byDay[day] ?? 0) + o.total;
      }
      return Object.entries(byDay).map(([date, total]) => ({ date, total }));
    },
    refetchInterval: 60_000,
  });
}
