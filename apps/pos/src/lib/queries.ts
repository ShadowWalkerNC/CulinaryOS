import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHeaders, getApiBase } from '@culinaryos/shared';
import { supabase } from './supabase';
import { usePOSStore } from './store';
import { getMockOrders, saveMockOrders } from './mockDb';

const MOCK_MENU = {
  id: 'demo-menu',
  name: 'Alley Katz & Half Baked Pilot Menu',
  sections: [
    {
      id: 'section-1',
      name: 'Starters & Bowls',
      sort_order: 1,
      items: [
        {
          id: 'item-1',
          name: 'Maine Clam Chowder',
          description: 'Traditional creamy New England chowder, tender ocean clams, smoked bacon & oyster crackers',
          price: 900,
          status: 'available',
          station: 'cold',
          allergens: ['dairy', 'seafood', 'gluten'],
          sort_order: 1,
          modifier_groups: []
        },
        {
          id: 'item-2',
          name: 'Crispy Point Judith Calamari',
          description: 'Flash-fried cherry peppers, lemon wedge, house roasted garlic & spicy dipping aioli',
          price: 1450,
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
                { id: 'mod-sauce-1', name: 'Spicy Sambal Aioli', price_adjustment: 150, is_default: false },
                { id: 'mod-sauce-2', name: 'Roasted Garlic Tartar', price_adjustment: 0, is_default: true }
              ]
            }
          ]
        },
        {
          id: 'item-3',
          name: 'Truffle Parmesan Hand-Cut Fries',
          description: 'Double-cooked Maine russets, white truffle oil, shaved pecorino & rosemary aioli',
          price: 850,
          status: 'available',
          station: 'fry',
          allergens: ['dairy'],
          sort_order: 3,
          modifier_groups: []
        }
      ]
    },
    {
      id: 'section-2',
      name: 'Mains & Tavern Classics',
      sort_order: 2,
      items: [
        {
          id: 'item-4',
          name: 'Alley Katz Classic Lobster Roll',
          description: 'Chilled Maine claw & knuckle lobster meat, griddled brioche split-top bun, light lemon-mayo dressing or warm butter',
          price: 2800,
          status: 'available',
          station: 'cold',
          allergens: ['shellfish', 'dairy', 'gluten'],
          sort_order: 1,
          modifier_groups: [
            {
              id: 'group-lobster-style',
              name: 'Preparation Style',
              required: true,
              min_selections: 1,
              max_selections: 1,
              modifiers: [
                { id: 'mod-lob-1', name: 'Traditional Chilled w/ Herb Mayo', price_adjustment: 0, is_default: true },
                { id: 'mod-lob-2', name: 'Warm Poached in Brown Butter', price_adjustment: 200, is_default: false }
              ]
            },
            {
              id: 'group-lob-side',
              name: 'Choice of Side',
              required: true,
              min_selections: 1,
              max_selections: 1,
              modifiers: [
                { id: 'mod-side-1', name: 'Hand-Cut Sea Salt Fries', price_adjustment: 0, is_default: true },
                { id: 'mod-side-2', name: 'Cape Cod Salt & Vinegar Slaw', price_adjustment: 0, is_default: false },
                { id: 'mod-side-3', name: 'Sub Clam Chowder Cup', price_adjustment: 450, is_default: false }
              ]
            }
          ]
        },
        {
          id: 'item-5',
          name: 'Crispy Haddock Fish & Chips',
          description: 'Local Gulf of Maine haddock in crisp craft ale batter, fresh tartar, lemon, hand-cut fries',
          price: 1950,
          status: 'available',
          station: 'fry',
          allergens: ['fish', 'gluten'],
          sort_order: 2,
          modifier_groups: []
        },
        {
          id: 'item-6',
          name: 'Prime Smash Cheeseburger',
          description: 'Two dry-aged 4oz beef patties, double Cabot cheddar, shaved red onion, dill pickle, secret sauce on toasted potato bun',
          price: 1650,
          status: 'available',
          station: 'grill',
          allergens: ['gluten', 'dairy'],
          sort_order: 3,
          modifier_groups: [
            {
              id: 'group-burger-temp',
              name: 'Meat Temperature',
              required: true,
              min_selections: 1,
              max_selections: 1,
              modifiers: [
                { id: 'mod-cook-1', name: 'Medium Rare (Juicy)', price_adjustment: 0, is_default: true },
                { id: 'mod-cook-2', name: 'Medium (Standard)', price_adjustment: 0, is_default: false },
                { id: 'mod-cook-3', name: 'Well Done (Crisp Edge)', price_adjustment: 0, is_default: false }
              ]
            },
            {
              id: 'group-burger-adds',
              name: 'Burger Add-Ons',
              required: false,
              min_selections: 0,
              max_selections: 3,
              modifiers: [
                { id: 'mod-b-1', name: 'Applewood Smoked Bacon', price_adjustment: 250, is_default: false },
                { id: 'mod-b-2', name: 'Fried Farm Egg', price_adjustment: 200, is_default: false },
                { id: 'mod-b-3', name: 'Gluten-Free Bun', price_adjustment: 150, is_default: false }
              ]
            }
          ]
        },
        {
          id: 'item-7',
          name: 'Wood-Fired Margherita Pizza',
          description: 'Crushed San Marzano tomatoes, fresh mozzarella curd, torn organic basil, Sicilian olive oil',
          price: 1650,
          status: 'available',
          station: 'grill',
          allergens: ['gluten', 'dairy'],
          sort_order: 4,
          modifier_groups: [
            {
              id: 'group-toppings',
              name: 'Pizza Toppings',
              required: false,
              min_selections: 0,
              max_selections: 4,
              modifiers: [
                { id: 'mod-top-1', name: 'Prosciutto di Parma', price_adjustment: 400, is_default: false },
                { id: 'mod-top-2', name: 'Roasted Wild Mushrooms', price_adjustment: 250, is_default: false },
                { id: 'mod-top-3', name: 'Hot Honey Drizzle', price_adjustment: 150, is_default: false }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'section-3',
      name: 'Half Baked Bakery & Sweets',
      sort_order: 3,
      items: [
        {
          id: 'item-8',
          name: 'Warm Wild Maine Blueberry Hand Pie',
          description: 'Flaky butter crust filled with sweet Rockland wild blueberries, turbinado sugar & vanilla glaze',
          price: 650,
          status: 'available',
          station: 'cold',
          allergens: ['gluten', 'dairy'],
          sort_order: 1,
          modifier_groups: [
            {
              id: 'group-pie-cream',
              name: 'A La Mode',
              required: false,
              min_selections: 0,
              max_selections: 1,
              modifiers: [
                { id: 'mod-cream-1', name: 'Local Vanilla Bean Ice Cream', price_adjustment: 250, is_default: false },
                { id: 'mod-cream-2', name: 'Fresh Whipped Cream', price_adjustment: 100, is_default: false }
              ]
            }
          ]
        },
        {
          id: 'item-9',
          name: 'Triple Chocolate Salted Brownie',
          description: 'Valrhona dark chocolate fudge brownie topped with Maldon sea salt crystals',
          price: 500,
          status: 'available',
          station: 'cold',
          allergens: ['gluten', 'dairy', 'eggs'],
          sort_order: 2,
          modifier_groups: []
        }
      ]
    },
    {
      id: 'section-4',
      name: 'Beer, Wine & Non-Alcoholic',
      sort_order: 4,
      items: [
        {
          id: 'item-10',
          name: 'Masons Brewing Local IPA (16oz)',
          description: 'Hazy New England IPA brewed in Brewer, ME — tropical hops, citrus zest, smooth body',
          price: 800,
          status: 'available',
          station: 'bar',
          allergens: ['gluten'],
          sort_order: 1,
          modifier_groups: []
        },
        {
          id: 'item-11',
          name: 'Maine Root Sodas (Bottled)',
          description: 'Organic cane sugar craft soda from Portland, ME',
          price: 400,
          status: 'available',
          station: 'bar',
          allergens: [],
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-soda-flavor',
              name: 'Soda Flavor',
              required: true,
              min_selections: 1,
              max_selections: 1,
              modifiers: [
                { id: 'mod-s-1', name: 'Root Beer', price_adjustment: 0, is_default: true },
                { id: 'mod-s-2', name: 'Blueberry Soda', price_adjustment: 0, is_default: false },
                { id: 'mod-s-3', name: 'Spicy Ginger Brew', price_adjustment: 0, is_default: false }
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
            course_number: item.course_number ?? 1,
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
          notes: item.notes,
          seat_number: item.seat_number ?? 1,
          course_number: item.course_number ?? 1,
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
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async (orderId: string) => {
      const API = getApiBase();

      // Always fire through the API so kitchen tickets are created via the event bus
      // (or the shared mock kitchen store when Supabase is offline).
      if (!supabase) {
        const orders = getMockOrders();
        const order = orders.find(o => o.id === orderId);
        if (!order) throw new Error('Order not found');

        const res = await fetch(`${API}/v1/orders/${orderId}/send`, {
          method: 'PATCH',
          headers: apiHeaders(tenantId),
          body: JSON.stringify({
            order: {
              tableNumber: order.table_number,
              serverName: order.server_name,
              createdAt: order.created_at,
              items: (order.items ?? []).map((li: any) => ({
                lineItemId: li.id,
                menuItemId: li.menu_item_id,
                name: li.name,
                quantity: li.quantity,
                station: li.station ?? 'hot',
                courseNumber: li.course_number ?? 1,
                modifiers: (li.modifiers ?? []).map((m: any) =>
                  typeof m === 'string' ? m : m?.name ?? String(m)
                ),
                notes: li.notes ?? null,
              })),
            },
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? `Fire failed (${res.status})`);
        }

        order.status = 'sent';
        order.fired_at = new Date().toISOString();
        saveMockOrders(orders);
        return;
      }

      const res = await fetch(`${API}/v1/orders/${orderId}/send`, {
        method: 'PATCH',
        headers: apiHeaders(tenantId),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `Fire failed (${res.status})`);
      }
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useFireCourseByOrder() {
  const qc = useQueryClient();
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async ({ orderId, courseNumber }: { orderId: string; courseNumber: number }) => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/kds/tickets/${orderId}/fire-course`, {
        method: 'PATCH',
        headers: apiHeaders(tenantId),
        body: JSON.stringify({ courseNumber }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `Failed to fire Course ${courseNumber}`);
      }
      return res.json();
    },
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useVoidOrder() {
  const qc = useQueryClient();
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async ({
      orderId,
      managerPin,
      reasonCode,
      reason,
      isCooked,
      notes,
    }: {
      orderId: string;
      managerPin?: string;
      reasonCode?: string;
      reason?: string;
      isCooked?: boolean;
      notes?: string;
    }) => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/orders/${orderId}/void`, {
        method: 'PATCH',
        headers: apiHeaders(tenantId),
        body: JSON.stringify({
          managerPin,
          reasonCode: reasonCode || reason,
          reason: reasonCode || reason,
          isCooked,
          notes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? 'Void failed');
      return body?.data ?? body;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', vars.orderId] });
    },
  });
}

export function useVoidLineItem() {
  const qc = useQueryClient();
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async ({
      orderId,
      itemId,
      managerPin,
      reasonCode,
      reason,
      isCooked,
      notes,
    }: {
      orderId: string;
      itemId: string;
      managerPin?: string;
      reasonCode?: string;
      reason?: string;
      isCooked?: boolean;
      notes?: string;
    }) => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/orders/${orderId}/items/${itemId}/void`, {
        method: 'PATCH',
        headers: apiHeaders(tenantId),
        body: JSON.stringify({
          managerPin,
          reasonCode: reasonCode || reason,
          reason: reasonCode || reason,
          isCooked,
          notes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? 'Item void failed');
      return body?.data ?? body;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', vars.orderId] });
    },
  });
}

export function useOpenDrawer() {
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async ({
      managerPin,
      reason,
      notes,
    }: {
      managerPin: string;
      reason?: string;
      notes?: string;
    }) => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/orders/drawer/open`, {
        method: 'POST',
        headers: apiHeaders(tenantId),
        body: JSON.stringify({
          managerPin,
          reason,
          notes,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? 'Drawer open failed');
      return body?.data ?? body;
    },
  });
}

export function useVerifyManagerPin() {
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async (pin: string) => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/auth/verify-manager-pin`, {
        method: 'POST',
        headers: apiHeaders(tenantId),
        body: JSON.stringify({ pin, tenant_id: tenantId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? 'PIN verification failed');
      return body?.data ?? body;
    },
  });
}

export function useApplyDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, discountPercent, discountFlat }: { orderId: string; discountPercent: number; discountFlat: number }) => {
      if (!supabase) {
        const orders = getMockOrders();
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.discount_percent = discountPercent;
          order.discount_flat = discountFlat;
          saveMockOrders(orders);
        }
        return;
      }
      const { error } = await supabase
        .from('pos_orders')
        .update({ discount_percent: discountPercent, discount_flat: discountFlat })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// ---- TABLE OPERATIONS (MERGE, SPLIT, TRANSFER, ASSISTANCE) ----
export function useMergeTables() {
  const qc = useQueryClient();
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async (payload: { sourceTableIds: string[]; targetTableId: string; managerPin?: string }) => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/tables/merge`, {
        method: 'POST',
        headers: apiHeaders(tenantId),
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? 'Table merge failed');
      return body?.data ?? body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSplitOrder() {
  const qc = useQueryClient();
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async (payload: { orderId: string; splitType?: 'seat' | 'items' | 'custom'; partitions: { seatNumber?: number; itemIds: string[]; guestLabel?: string }[] }) => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/orders/${payload.orderId}/split`, {
        method: 'POST',
        headers: apiHeaders(tenantId),
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? 'Order split failed');
      return body?.data ?? body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useTransferTable() {
  const qc = useQueryClient();
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async (payload: { tableId: string; fromServerId: string; toServerId: string; toServerName?: string; managerPin: string }) => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/tables/transfer`, {
        method: 'POST',
        headers: apiHeaders(tenantId),
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? 'Server transfer failed');
      return body?.data ?? body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useActiveAssistance() {
  const tenantId = usePOSStore((s) => s.tenantId);
  return useQuery({
    queryKey: ['tables', 'assistance', tenantId],
    queryFn: async () => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/tables/assistance/active`, {
        headers: apiHeaders(tenantId),
      });
      if (!res.ok) return [];
      const body = await res.json().catch(() => ({}));
      return body?.data ?? [];
    },
    refetchInterval: 5_000,
  });
}

export function useDismissAssistance() {
  const qc = useQueryClient();
  const tenantId = usePOSStore((s) => s.tenantId);
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const API = getApiBase();
      const res = await fetch(`${API}/v1/tables/assistance/${notificationId}/dismiss`, {
        method: 'PATCH',
        headers: apiHeaders(tenantId),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message ?? 'Dismiss failed');
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables', 'assistance'] });
    },
  });
}


