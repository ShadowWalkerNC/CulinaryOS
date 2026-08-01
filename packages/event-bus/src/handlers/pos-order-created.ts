// ============================================================
// Handler: pos:order:created
// Migrated from backend/event-bus/handlers/pos-order-created.ts
//
// When POS fires an order to the kitchen:
//   1. Group line items by station + course number
//   2. Create one KitchenTicket per (station, course) pair
//   3. Populate ticket_items for each ticket
//   4. Update pos_order status → 'sent'
// ============================================================

import type { EventHandler } from '../broker';
import type { OrderCreatedPayload, OrderItem, DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

type SupabaseClient = any;

export const handleOrderCreated: EventHandler<OrderCreatedPayload> = async (
  event: DomainEvent<OrderCreatedPayload>,
  supabase: SupabaseClient
) => {
  const { orderId, tableNumber, items } = event.payload;
  const tenantId = event.tenantId;

  const groups = groupByStationAndCourse(items);

  for (const [key, groupItems] of groups.entries()) {
    const [station, courseStr] = key.split('::');
    const courseNumber = parseInt(courseStr || '1', 10);
    const hasAllergy = groupItems.some((i) =>
      i.modifiers.some((m: string) => /allerg/i.test(m))
    );

    const ticketId = uuidv4();
    const { error: ticketErr } = await supabase.from('kitchen_tickets').insert({
      id:            ticketId,
      tenant_id:     tenantId,
      order_id:      orderId,
      station,
      status:        'fired',
      priority:      hasAllergy ? 'allergy' : 'normal',
      table_number:  tableNumber ?? null,
      course_number: courseNumber,
      fired_at:      new Date().toISOString(),
    });

    if (ticketErr) throw new Error(`Failed to create ticket for ${station} course ${courseNumber}: ${ticketErr.message}`);

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
    if (itemsErr) throw new Error(`Failed to insert ticket items for ticket ${ticketId}: ${itemsErr.message}`);
  }

  await supabase
    .from('pos_orders')
    .update({ status: 'sent', fired_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

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
