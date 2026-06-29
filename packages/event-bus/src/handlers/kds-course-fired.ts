// ============================================================
// Handler: kds:course:fired
// Migrated from backend/event-bus/handlers/kds-course-fired.ts
//
// Advances order to 'in-progress' when a held course is released.
// Only advances — never regresses (guards on status in ['sent','ready']).
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, KdsCourseFiredPayload } from '../types';

export async function handleCourseFired(
  event:    DomainEvent<KdsCourseFiredPayload>,
  supabase: SupabaseClient
): Promise<void> {
  const { orderId, courseNumber, firedTicketIds, firedBy } = event.payload;

  console.log(
    `[kds:course:fired] order=${orderId} course=${courseNumber} ` +
    `tickets=${firedTicketIds.length} by=${firedBy}`
  );

  const { error } = await supabase
    .from('pos_orders')
    .update({ status: 'in-progress' })
    .eq('id', orderId)
    .eq('tenant_id', event.tenantId)
    .in('status', ['sent', 'ready']);

  if (error) console.error(`[kds:course:fired] Failed to update order status: ${error.message}`);
}
