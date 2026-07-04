// ============================================================
// Handler: kds:ticket:bumped
// Migrated from backend/event-bus/handlers/kds-ticket-bumped.ts
//
// All tickets bumped → order 'ready'. Partial → 'in-progress'.
// ============================================================

import type { EventHandler } from '../broker';
import type { TicketBumpedPayload, DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = any;

export const handleTicketBumped: EventHandler<TicketBumpedPayload> = async (
  event: DomainEvent<TicketBumpedPayload>,
  supabase: SupabaseClient
) => {
  const { orderId } = event.payload;
  const tenantId = event.tenantId;

  const { data: tickets, error } = await supabase
    .from('kitchen_tickets')
    .select('id, status')
    .eq('order_id', orderId)
    .eq('tenant_id', tenantId)
    .neq('status', 'voided');

  if (error) throw new Error(`Failed to fetch tickets for order ${orderId}: ${error.message}`);
  if (!tickets || tickets.length === 0) return;

  const allBumped = tickets.every((t: any) => t.status === 'bumped');
  const newOrderStatus = allBumped ? 'ready' : 'in-progress';

  const { error: updateErr } = await supabase
    .from('pos_orders')
    .update({ status: newOrderStatus })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

  if (updateErr) throw new Error(`Failed to update order status: ${updateErr.message}`);
  console.log(`[kds:ticket:bumped] Order ${orderId} → ${newOrderStatus} (${tickets.filter((t: any) => t.status === 'bumped').length}/${tickets.length} tickets done)`);
};
