// ============================================================
// Event Handler: kds:course:fired
//
// Fired when a held course is released — either automatically
// after the previous course is all bumped, or manually by server.
//
// This handler:
//   1. Updates order status to 'in-progress' if not already
//   2. Notifies the admin event log (written by broker automatically)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent }    from '../types';

export interface KdsCourseFiredPayload {
  orderId:        string;
  courseNumber:   number;
  firedTicketIds: string[];
  firedBy:        string;
}

export async function handleCourseFired(
  event:    DomainEvent<KdsCourseFiredPayload>,
  supabase: SupabaseClient
): Promise<void> {
  const { orderId, courseNumber, firedTicketIds, firedBy } = event.payload;

  console.log(
    `[kds:course:fired] order=${orderId} course=${courseNumber} ` +
    `tickets=${firedTicketIds.length} by=${firedBy}`
  );

  // Ensure order is in-progress when a new course fires
  const { error } = await supabase
    .from('pos_orders')
    .update({ status: 'in-progress' })
    .eq('id', orderId)
    .eq('tenant_id', event.tenantId)
    .in('status', ['sent','ready']);  // only advance, never regress

  if (error) {
    console.error(`[kds:course:fired] Failed to update order status: ${error.message}`);
  }
}
