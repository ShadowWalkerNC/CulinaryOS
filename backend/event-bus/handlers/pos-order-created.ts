// ============================================================
// Handler: pos:order:created
//
// When POS fires an order to the kitchen:
//   1. Group line items by station
//   2. Group by course number within each station
//   3. Create one KitchenTicket per (station, course) pair
//   4. Populate ticket_items for each ticket
// ============================================================

import type { EventHandler } from '../broker';
import type { OrderCreatedPayload, OrderItem, KitchenStation } from '../types';
import type { DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

type SupabaseClient = ReturnType<typeof createClient>;

export const handleOrderCreated: EventHandler<OrderCreatedPayload> = async (
  event: DomainEvent<OrderCreatedPayload>,
  supabase: SupabaseClient
) => {
  const { orderId, tableNumber, serverName, items, createdAt } = event.payload;
  const tenantId = event.tenantId;

  // 1. Group items by station + course
  const groups = groupByStationAndCourse(items);

  for (const [key, groupItems] of groups.entries()) {
    const [station, courseStr] = key.split('::');
    const courseNumber = parseInt(courseStr, 10);

    // 2. Detect allergy modifier
    const hasAllergy = groupItems.some((i) =>
      i.modifiers.some((m) => /allerg/i.test(m))
    );

    // 3. Insert KitchenTicket
    const ticketId = uuidv4();
    const { error: ticketErr } = await supabase.from('kitchen_tickets').insert({
      id:           ticketId,
      tenant_id:    tenantId,
      order_id:     orderId,
      order_number: event.payload.items[0]?.lineItemId ? 0 : 0, // will be set by trigger
      station,
      status:       'queued',
      priority:     hasAllergy ? 'allergy' : 'normal',
      table_number: tableNumber ?? null,
      course_number: courseNumber,
      fired_at:     new Date().toISOString(), // auto-fire on order creation
      status:       'fired',
    });

    if (ticketErr) {
      throw new Error(`Failed to create ticket for ${station} course ${courseNumber}: ${ticketErr.message}`);
    }

    // 4. Insert ticket items
    const ticketItems = groupItems.map((item, idx) => ({
      ticket_id:    ticketId,
      line_item_id: item.lineItemId,
      name:         item.name,
      quantity:     item.quantity,
      modifiers:    item.modifiers,
      notes:        null,
      sort_order:   idx,
    }));

    const { error: itemsErr } = await supabase.from('ticket_items').insert(ticketItems);
    if (itemsErr) {
      throw new Error(`Failed to insert ticket items for ticket ${ticketId}: ${itemsErr.message}`);
    }
  }

  // 5. Update order status to 'sent'
  await supabase
    .from('pos_orders')
    .update({ status: 'sent', fired_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

  console.log(`[pos:order:created] Created ${groups.size} ticket(s) for order ${orderId}`);
};

function groupByStationAndCourse(
  items: OrderItem[]
): Map<string, OrderItem[]> {
  const map = new Map<string, OrderItem[]>();
  for (const item of items) {
    const key = `${item.station}::${item.courseNumber ?? 1}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}
