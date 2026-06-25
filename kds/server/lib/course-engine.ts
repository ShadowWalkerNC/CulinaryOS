// ============================================================
// Course Firing Engine
//
// Rules:
//   - Course 1 tickets are always fired immediately (status = 'firing')
//   - Course N tickets are held (status = 'held') until all tickets
//     in course N-1 are bumped
//   - When the last course N-1 ticket is bumped:
//       1. All held tickets for course N are released (status = 'firing')
//       2. Each released ticket gets status = 'queued' on the KDS
//       3. A course_fire_log entry is written
//       4. kds:course:fired event is emitted
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CourseFiredResult {
  orderId:       string;
  courseNumber:  number;
  firedTicketIds: string[];
  firedBy:       string;
}

/**
 * Called by POST /v1/tickets/fire when assigning course numbers.
 * Returns the hold status each ticket should start with.
 */
export function initialHoldStatus(courseNumber: number): 'held' | 'firing' {
  return courseNumber === 1 ? 'firing' : 'held';
}

/**
 * Called after a ticket is bumped.
 * Checks whether all tickets in the previous course are now bumped;
 * if so, fires all held tickets for the next course.
 *
 * Returns the fired result if a course advance happened, null otherwise.
 */
export async function checkAndAdvanceCourse(
  supabase:     SupabaseClient,
  tenantId:     string,
  orderId:      string,
  bumpedCourse: number,
  firedBy      = 'auto'
): Promise<CourseFiredResult | null> {
  // 1. Are all non-voided tickets for bumpedCourse now bumped?
  const { data: prevCourseTickets, error: fetchErr } = await supabase
    .from('kitchen_tickets')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('order_id', orderId)
    .eq('course_number', bumpedCourse)
    .neq('status', 'voided');

  if (fetchErr || !prevCourseTickets) return null;
  if (prevCourseTickets.length === 0)  return null;

  const allBumped = prevCourseTickets.every((t) => t.status === 'bumped');
  if (!allBumped) return null;

  // 2. Find held tickets for the next course
  const nextCourse = bumpedCourse + 1;
  const { data: heldTickets, error: heldErr } = await supabase
    .from('kitchen_tickets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('order_id', orderId)
    .eq('course_number', nextCourse)
    .eq('course_hold_status', 'held');

  if (heldErr || !heldTickets || heldTickets.length === 0) return null;

  const heldIds = heldTickets.map((t) => t.id);
  const now     = new Date().toISOString();

  // 3. Release held tickets — set course_hold_status = 'fired' and status = 'queued'
  const { error: releaseErr } = await supabase
    .from('kitchen_tickets')
    .update({
      course_hold_status: 'fired',
      status:             'queued',
      fired_at:           now,
    })
    .in('id', heldIds)
    .eq('tenant_id', tenantId);

  if (releaseErr) {
    console.error('[CourseEngine] Failed to release tickets:', releaseErr.message);
    return null;
  }

  // 4. Write course_fire_log entry
  await supabase.from('course_fire_log').insert({
    tenant_id:     tenantId,
    order_id:      orderId,
    course_number: nextCourse,
    fired_by:      firedBy,
    fired_at:      now,
    ticket_ids:    heldIds,
  });

  return {
    orderId,
    courseNumber:   nextCourse,
    firedTicketIds: heldIds,
    firedBy,
  };
}

/**
 * Manual server-triggered fire for a specific course.
 * Used by POST /v1/orders/:orderId/fire-course.
 * Bypasses the "all previous bumped" check — server decides.
 */
export async function manualFireCourse(
  supabase:     SupabaseClient,
  tenantId:     string,
  orderId:      string,
  courseNumber: number,
  firedBy:      string
): Promise<CourseFiredResult | null> {
  const { data: heldTickets, error } = await supabase
    .from('kitchen_tickets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('order_id', orderId)
    .eq('course_number', courseNumber)
    .eq('course_hold_status', 'held');

  if (error || !heldTickets || heldTickets.length === 0) return null;

  const heldIds = heldTickets.map((t) => t.id);
  const now     = new Date().toISOString();

  await supabase
    .from('kitchen_tickets')
    .update({
      course_hold_status: 'fired',
      status:             'queued',
      fired_at:           now,
    })
    .in('id', heldIds)
    .eq('tenant_id', tenantId);

  await supabase.from('course_fire_log').insert({
    tenant_id:     tenantId,
    order_id:      orderId,
    course_number: courseNumber,
    fired_by:      firedBy,
    fired_at:      now,
    ticket_ids:    heldIds,
  });

  return { orderId, courseNumber, firedTicketIds: heldIds, firedBy };
}
