// ============================================================
// Handler: pos:order:created
// When POS fires an order to the kitchen:
//   1. Group line items by station + course number
//   2. Create one KitchenTicket per (station, course) pair
//   3. Course 1 → fired; course 2+ → held
//   4. Populate ticket_items + pending_push outbox
// ============================================================

import type { EventHandler } from '../broker';
import type { OrderCreatedPayload, OrderItem, DomainEvent } from '../types';
import { handleMenuItemSold } from './pos-menu-item-sold';
import { v4 as uuidv4 } from 'uuid';

type SupabaseClient = any;

export const handleOrderCreated: EventHandler<OrderCreatedPayload> = async (
  event: DomainEvent<OrderCreatedPayload>,
  supabase: SupabaseClient
) => {
  const { orderId, tableNumber, items, orderNumber } = event.payload as OrderCreatedPayload & { orderNumber?: number };
  const tenantId = event.tenantId;

  // Resolve human-readable order number when missing
  let resolvedOrderNumber = orderNumber;
  if (resolvedOrderNumber == null) {
    const { data: ord } = await supabase
      .from('pos_orders')
      .select('order_number')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    resolvedOrderNumber = ord?.order_number ?? Math.floor(Date.now() % 100000);
  }

  const groups = groupByStationAndCourse(items);

  for (const [key, groupItems] of groups.entries()) {
    const [station, courseStr] = key.split('::');
    const courseNumber = parseInt(courseStr || '1', 10);
    const hasAllergy = groupItems.some((i) =>
      (i.modifiers ?? []).some((m: string) => /allerg/i.test(m))
    );

    const isFirstCourse = courseNumber <= 1;
    const ticketId = uuidv4();
    const now = new Date().toISOString();

    const { error: ticketErr } = await supabase.from('kitchen_tickets').insert({
      id:                 ticketId,
      tenant_id:          tenantId,
      order_id:           orderId,
      order_number:       resolvedOrderNumber,
      station,
      status:             isFirstCourse ? 'fired' : 'queued',
      course_hold_status: isFirstCourse ? 'fired' : 'held',
      priority:           hasAllergy ? 'allergy' : 'normal',
      table_number:       tableNumber ?? null,
      course_number:      courseNumber,
      fired_at:           isFirstCourse ? now : null,
    });

    if (ticketErr) throw new Error(`Failed to create ticket for ${station} course ${courseNumber}: ${ticketErr.message}`);

    const ticketItems = groupItems.map((item, idx) => ({
      ticket_id:    ticketId,
      line_item_id: item.lineItemId || uuidv4(),
      name:         item.name,
      quantity:     item.quantity,
      modifiers:    item.modifiers ?? [],
      notes:        item.notes ?? null,
      sort_order:   idx,
    }));

    const { error: itemsErr } = await supabase.from('ticket_items').insert(ticketItems);
    if (itemsErr) throw new Error(`Failed to insert ticket items for ticket ${ticketId}: ${itemsErr.message}`);

    // Outbox for reconnect catch-up (best-effort if table exists)
    await supabase.from('pending_push').insert({
      tenant_id:  tenantId,
      station_id: station,
      event_type: isFirstCourse ? 'kds:ticket:fired' : 'kds:ticket:held',
      payload: {
        ticketId,
        orderId,
        station,
        courseNumber,
        status: isFirstCourse ? 'fired' : 'queued',
      },
    }).then(() => {}).catch(() => {});
  }

  await supabase
    .from('pos_orders')
    .update({ status: 'sent', fired_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

  // Closed-loop economics: pantry deduct + plate_economics snapshot (best-effort)
  const soldAt = new Date().toISOString();
  for (const item of items) {
    if (item.menuItemId || item.recipeId) {
      try {
        const soldPayload: {
          menuItemId: string;
          quantity: number;
          soldAt: string;
          recipeId?: string;
        } = {
          menuItemId: item.menuItemId ?? item.recipeId ?? '',
          quantity: item.quantity,
          soldAt,
        };
        if (item.recipeId) soldPayload.recipeId = item.recipeId;
        await handleMenuItemSold(
          {
            eventId: uuidv4(),
            eventType: 'pos:menu:item-sold',
            tenantId,
            source: 'pos',
            timestamp: soldAt,
            version: 1,
            payload: soldPayload,
          },
          supabase
        );
      } catch (e: any) {
        console.warn(`[pos:order:created] economics emit failed: ${e?.message ?? e}`);
      }
    }

    let theoretical: number | null = null;
    let salePrice: number | null = null;
    if (item.menuItemId) {
      const { data: mi } = await supabase
        .from('menu_items')
        .select('price')
        .eq('id', item.menuItemId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      salePrice = mi?.price ?? null;

      const { data: link } = await supabase
        .from('menu_item_recipes')
        .select('recipe_id')
        .eq('tenant_id', tenantId)
        .eq('menu_item_id', item.menuItemId)
        .maybeSingle();
      const recipeId = link?.recipe_id ?? item.recipeId;
      if (recipeId) {
        const { data: ris } = await supabase
          .from('recipe_ingredients')
          .select('quantity, ingredients(cost_per_unit)')
          .eq('recipe_id', recipeId);
        let cost = 0;
        for (const ri of ris ?? []) {
          cost += Number(ri.quantity) * Number((ri as any).ingredients?.cost_per_unit ?? 0);
        }
        theoretical = Math.round(cost * 100) * item.quantity;
      }
    }

    await supabase.from('plate_economics').insert({
      tenant_id: tenantId,
      order_id: orderId,
      menu_item_id: item.menuItemId ?? null,
      item_name: item.name,
      quantity: item.quantity,
      sale_price_cents: salePrice != null ? salePrice * item.quantity : null,
      theoretical_cost_cents: theoretical,
    }).then(() => {}).catch(() => {});
  }

  console.log(`[pos:order:created] Created ${groups.size} ticket(s) for order ${orderId}`);
};

function groupByStationAndCourse(items: OrderItem[]): Map<string, OrderItem[]> {
  const map = new Map<string, OrderItem[]>();
  for (const item of items) {
    const key = `${item.station}::${item.courseNumber ?? 1}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}
