import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { usePOSStore } from './store';
import { getMockOrders, saveMockOrders } from './mockDb';

const MOCK_MENU = {
  id: 'demo-menu',
  name: 'Dinner Menu',
  sections: [
    {
      id: 'section-1',
      name: 'Starters',
      sort_order: 1,
      items: [
        {
          id: 'item-1',
          name: 'Truffle Hummus & Pita',
          price: 950,
          status: 'available',
          station: 'cold',
          allergens: ['gluten', 'sesame'],
          sort_order: 1,
          modifier_groups: []
        },
        {
          id: 'item-2',
          name: 'Crispy Calamari',
          price: 1400,
          status: 'available',
          station: 'fry',
          allergens: ['gluten', 'seafood'],
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-sauce',
              name: 'Extra Dipping Sauce',
              required: false,
              min_selections: 0,
              max_selections: 2,
              modifiers: [
                { id: 'mod-sauce-1', name: 'Spicy Aioli', price_adjustment: 150, is_default: false },
                { id: 'mod-sauce-2', name: 'Garlic Aioli', price_adjustment: 0, is_default: true }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'section-2',
      name: 'Mains',
      sort_order: 2,
      items: [
        {
          id: 'item-3',
          name: 'Wood-Fired Margherita Pizza',
          price: 1650,
          status: 'available',
          station: 'pizza',
          allergens: ['gluten', 'dairy'],
          sort_order: 1,
          modifier_groups: [
            {
              id: 'group-toppings',
              name: 'Add Toppings',
              required: false,
              min_selections: 0,
              max_selections: 4,
              modifiers: [
                { id: 'mod-top-1', name: 'Prosciutto di Parma', price_adjustment: 400, is_default: false },
                { id: 'mod-top-2', name: 'Wild Mushrooms', price_adjustment: 250, is_default: false },
                { id: 'mod-top-3', name: 'Extra Mozzarella', price_adjustment: 200, is_default: false }
              ]
            }
          ]
        },
        {
          id: 'item-4',
          name: 'Prime Bistro Burger',
          price: 1850,
          status: 'available',
          station: 'grill',
          allergens: ['gluten', 'dairy'],
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-cook',
              name: 'Meat Preparation',
              required: true,
              min_selections: 1,
              max_selections: 1,
              modifiers: [
                { id: 'mod-cook-1', name: 'Medium Rare', price_adjustment: 0, is_default: true },
                { id: 'mod-cook-2', name: 'Medium', price_adjustment: 0, is_default: false },
                { id: 'mod-cook-3', name: 'Well Done', price_adjustment: 0, is_default: false }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// ---- MENU ----
export function useMenu() {
  const tenantId = usePOSStore((s) => s.tenantId);
  return useQuery({
    queryKey: ['menu', tenantId],
    queryFn: async () => {
      if (!supabase) {
        return MOCK_MENU;
      }
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
      if (!supabase) {
        return getMockOrders().filter(o => ['open', 'sent', 'in-progress', 'ready'].includes(o.status));
      }
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
      if (!supabase) {
        return getMockOrders().find(o => o.id === id) || null;
      }
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
      if (!supabase) {
        const newOrder = {
          id: `o-${Math.floor(1000 + Math.random() * 9000)}`,
          tenant_id: tenantId,
          status: 'open',
          table_number: payload.table_number || null,
          cover_count: payload.cover_count || 1,
          server_name: payload.server_name || 'Server',
          items: [],
          total: 0,
          created_at: new Date().toISOString()
        };
        const orders = getMockOrders();
        orders.push(newOrder);
        saveMockOrders(orders);
        return newOrder;
      }
      const { data, error } = await supabase
        .from('pos_orders')
        .insert({ tenant_id: tenantId, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (data?.id) qc.invalidateQueries({ queryKey: ['order', data.id] });
    },
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
      seat_number?: number;
      course_number?: number;
      notes?: string;
      selectedModifiers?: { modifier_id: string; name: string; price_adjustment: number }[];
    }) => {
      const modTotal = item.selectedModifiers?.reduce((s, m) => s + m.price_adjustment, 0) ?? 0;
      const finalUnitPrice = item.unit_price + modTotal;
      const line_total = finalUnitPrice * item.quantity;

      if (!supabase) {
        const orders = getMockOrders();
        const order = orders.find(o => o.id === item.order_id);
        if (order) {
          const newLineItem = {
            id: `li-${Math.floor(10000 + Math.random() * 90000)}`,
            line_total,
            order_id: item.order_id,
            menu_item_id: item.menu_item_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: finalUnitPrice,
            station: item.station,
            seat_number: item.seat_number ?? 1,
            notes: item.notes || null,
            modifiers: item.selectedModifiers || []
          };
          order.items = order.items || [];
          order.items.push(newLineItem);
          order.total = (order.total ?? 0) + line_total;
          saveMockOrders(orders);
          return newLineItem;
        }
        throw new Error('Order not found');
      }

      // Live Supabase path
      const { data: lineItem, error: lineError } = await supabase
        .from('pos_order_line_items')
        .insert({
          tenant_id: tenantId,
          order_id: item.order_id,
          menu_item_id: item.menu_item_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: finalUnitPrice,
          line_total,
          station: item.station,
          notes: item.notes
        })
        .select()
        .single();
      if (lineError) throw lineError;

      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        const { error: modError } = await supabase
          .from('line_item_modifiers')
          .insert(
            item.selectedModifiers.map(m => ({
              tenant_id: tenantId,
              line_item_id: lineItem.id,
              modifier_id: m.modifier_id,
              name: m.name,
              price_adjustment: m.price_adjustment
            }))
          );
        if (modError) throw modError;
      }

      return lineItem;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['order', vars.order_id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useFireOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!supabase) {
        const orders = getMockOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.status = 'sent';
          order.fired_at = new Date().toISOString();
          saveMockOrders(orders);
        }
        return;
      }
      const { error } = await supabase
        .from('pos_orders')
        .update({ status: 'sent', fired_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useVoidOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      if (!supabase) {
        const orders = getMockOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.status = 'voided';
          order.voided_at = new Date().toISOString();
          order.void_reason = reason;
          saveMockOrders(orders);
        }
        return;
      }
      const { error } = await supabase
        .from('pos_orders')
        .update({ status: 'voided', voided_at: new Date().toISOString(), void_reason: reason })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
