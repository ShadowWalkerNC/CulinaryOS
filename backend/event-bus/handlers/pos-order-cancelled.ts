// ============================================================
// Handler: pos:order:cancelled
//
// When POS voids an order:
//   - Void all non-bumped kitchen tickets for that order
// ============================================================

import type { EventHandler } from '../broker';
import type { DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';

interface OrderCancelledPayload {
  orderId: string;
  reason?: string;
}

type SupabaseClient = ReturnType<typeof createClient>;

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
