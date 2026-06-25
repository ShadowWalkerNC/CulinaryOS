// ============================================================
// Handler: kds:ticket:bumped
//
// When a chef bumps a ticket:
//   1. Check if ALL tickets for this order are now bumped
//   2. If yes → update order status to 'ready'
//   3. If no  → update order status to 'in-progress'
// ============================================================

import type { EventHandler } from '../broker';
import type { TicketBumpedPayload, DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;

export const handleTicketBumped: EventHandler<TicketBumpedPayload> = async (
  event: DomainEvent<TicketBumpedPayload>,
  supabase: SupabaseClient
) => {
  const { orderId } = event.payload;
  const tenantId = event.tenantId;

  // Fetch all tickets for this order
  const { data: tickets, error } = await supabase
    .from('kitchen_tickets')
    .select('id, status')
    .eq('order_id', orderId)
    .eq('tenant_id', tenantId)
    .neq('status', 'voided');

  if (error) throw new Error(`Failed to fetch tickets for order ${orderId}: ${error.message}`);
  if (!tickets || tickets.length === 0) return;

  const allBumped = tickets.every((t) => t.status === 'bumped');
  const newOrderStatus = allBumped ? 'ready' : 'in-progress';

  const { error: updateErr } = await supabase
    .from('pos_orders')
    .update({ status: newOrderStatus })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

  if (updateErr) throw new Error(`Failed to update order status: ${updateErr.message}`);

  console.log(`[kds:ticket:bumped] Order ${orderId} → ${newOrderStatus} (${tickets.filter((t) => t.status === 'bumped').length}/${tickets.length} tickets done)`);
};
