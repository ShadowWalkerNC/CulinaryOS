import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { usePOSStore } from './store';

// ---- MENU ----
export function useMenu() {
  const tenantId = usePOSStore((s) => s.tenantId);
  return useQuery({
    queryKey: ['menu', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menus')
        .select(`
          id, name,
          sections:menu_sections(
            id, name, sort_order,
            items:menu_items(
              id, name, description, price, status, station, allergens, sort_order,
              modifier_groups(id, name, required, min_selections, max_selections,
                modifiers(id, name, price_adjustment, is_default)
              )
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('sort_order', { foreignTable: 'menu_sections' })
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

// ---- ORDERS ----
export function useOpenOrders() {
  const tenantId = usePOSStore((s) => s.tenantId);
  return useQuery({
    queryKey: ['orders', tenantId, 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_orders')
        .select('*, items:pos_order_line_items(*, modifiers:line_item_modifiers(*))')
        .eq('tenant_id', tenantId)
        .in('status', ['open', 'sent', 'in-progress', 'ready'])
        .order('created_at');
      if (error) throw error;
      return data;
    },
    refetchInterval: 10_000,
  });
}

export function useOrder(id: string | null) {
  const tenantId = usePOSStore((s) => s.tenantId);
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_orders')
        .select('*, items:pos_order_line_items(*, modifiers:line_item_modifiers(*))')
        .eq('id', id!)
        .eq('tenant_id', tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async (payload: { table_number?: string; cover_count?: number; server_name?: string }) => {
      const { data, error } = await supabase
        .from('pos_orders')
        .insert({ tenant_id: tenantId, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useAddLineItem() {
  const qc = useQueryClient();
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async (item: {
      order_id: string;
      menu_item_id: string;
      name: string;
      quantity: number;
      unit_price: number;
      station: string;
      course_number?: number;
      notes?: string;
    }) => {
      const line_total = item.unit_price * item.quantity;
      const { data, error } = await supabase
        .from('pos_order_line_items')
        .insert({ tenant_id: tenantId, line_total, ...item })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['order', vars.order_id] }),
  });
}

export function useFireOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('pos_orders')
        .update({ status: 'sent', fired_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['order', id] }),
  });
}

export function useVoidOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const { error } = await supabase
        .from('pos_orders')
        .update({ status: 'voided', voided_at: new Date().toISOString(), void_reason: reason })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
