// ============================================================
// Handler: pos:order:cancelled
// Migrated from backend/event-bus/handlers/pos-order-cancelled.ts
// ============================================================

import type { EventHandler } from '../broker';
import type { OrderCancelledPayload, DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = any;

export const handleOrderCancelled: EventHandler<OrderCancelledPayload> = async (
  event: DomainEvent<OrderCancelledPayload>,
  supabase: SupabaseClient
) => {
  const { orderId, reason } = event.payload;

  const { error } = await supabase
    .from('kitchen_tickets')
    .update({
      status:      'voided',
      void_reason: reason ?? 'Order cancelled by POS',
    })
    .eq('order_id', orderId)
    .eq('tenant_id', event.tenantId)
    .not('status', 'in', '("bumped","voided")');

  if (error) throw new Error(`Failed to void tickets for order ${orderId}: ${error.message}`);
  console.log(`[pos:order:cancelled] Voided tickets for order ${orderId}`);
};
