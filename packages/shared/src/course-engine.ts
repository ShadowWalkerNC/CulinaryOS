// ============================================================
// CulinaryOS — Course Engine Utilities
// Canonical course hold state calculation
// ============================================================

import type { CourseHoldStatus, KitchenTicket } from './types/order';

export function initialHoldStatus(courseNumber: number): CourseHoldStatus {
  return courseNumber === 1 ? 'firing' : 'held';
}

export type PacingAlertLevel = 'normal' | 'warning' | 'urgent';

export interface PacingOrderSummary {
  orderId: string;
  tableNumber: string | null;
  c1Status: string;
  c1ElapsedSeconds: number;
  c2Status: string;
  c2TicketId: string | null;
  c3Status: string;
  c3TicketId: string | null;
  targetC2FireSeconds: number;
  remainingToC2Seconds: number;
  pacingAlert: PacingAlertLevel;
}

/** Standard course pacing target: Course 2 should be fired within 12-15m (720-900s) after Course 1 */
export const STANDARD_PACING_CONFIG = {
  targetC2FireSeconds: 720,  // 12 minutes
  urgentC2FireSeconds: 900,  // 15 minutes
} as const;

/**
 * Calculates pacing alert level for a held Course 2 ticket given Course 1 elapsed time.
 */
export function calculateCoursePacingAlert(
  c1ElapsedSeconds: number,
  c2HoldStatus?: string
): PacingAlertLevel {
  if (c2HoldStatus !== 'held') {
    return 'normal';
  }
  if (c1ElapsedSeconds >= STANDARD_PACING_CONFIG.urgentC2FireSeconds) {
    return 'urgent';
  }
  if (c1ElapsedSeconds >= STANDARD_PACING_CONFIG.targetC2FireSeconds) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Pure, high-performance batch computation of course pacing across tickets.
 * Minimizes CPU cycles by grouping tickets once and calculating elapsed pacing in-memory.
 */
export function computePacingOverview(
  tickets: Array<{
    id: string;
    order_id?: string;
    orderId?: string;
    table_number?: string | null;
    tableNumber?: string | null;
    course_number?: number;
    courseNumber?: number;
    status: string;
    course_hold_status?: string;
    courseHoldStatus?: string;
    fired_at?: string | null;
    firedAt?: string | null;
    created_at?: string;
    createdAt?: string;
  }>,
  nowMs = Date.now()
): PacingOrderSummary[] {
  const pacingOrders: PacingOrderSummary[] = [];
  const orderGroups = new Map<string, typeof tickets>();

  for (const t of tickets) {
    const key = t.order_id || t.orderId || t.id;
    let group = orderGroups.get(key);
    if (!group) {
      group = [];
      orderGroups.set(key, group);
    }
    group.push(t);
  }

  for (const [orderId, orderTickets] of orderGroups.entries()) {
    let c1: (typeof tickets)[0] | undefined;
    let c2: (typeof tickets)[0] | undefined;
    let c3: (typeof tickets)[0] | undefined;

    for (const it of orderTickets) {
      const courseNum = it.course_number ?? it.courseNumber ?? 1;
      if (courseNum === 1 && !c1) c1 = it;
      else if (courseNum === 2 && !c2) c2 = it;
      else if (courseNum === 3 && !c3) c3 = it;
    }

    const c1FiredIso = c1?.fired_at ?? c1?.firedAt ?? c1?.created_at ?? c1?.createdAt;
    const c1FiredAt = c1FiredIso ? new Date(c1FiredIso).getTime() : null;
    const c1ElapsedSeconds = c1FiredAt ? Math.max(0, Math.round((nowMs - c1FiredAt) / 1000)) : 0;

    const targetC2FireSeconds = STANDARD_PACING_CONFIG.targetC2FireSeconds;
    const remainingToC2Seconds = Math.max(0, targetC2FireSeconds - c1ElapsedSeconds);

    const c2HoldStatus = c2?.course_hold_status ?? c2?.courseHoldStatus ?? (c2?.status || 'none');
    const pacingAlert = calculateCoursePacingAlert(c1ElapsedSeconds, c2HoldStatus);

    pacingOrders.push({
      orderId,
      tableNumber: c1?.table_number ?? c1?.tableNumber ?? null,
      c1Status: c1?.status ?? 'none',
      c1ElapsedSeconds,
      c2Status: c2HoldStatus,
      c2TicketId: c2?.id ?? null,
      c3Status: c3?.course_hold_status ?? c3?.courseHoldStatus ?? (c3?.status || 'none'),
      c3TicketId: c3?.id ?? null,
      targetC2FireSeconds,
      remainingToC2Seconds,
      pacingAlert,
    });
  }

  return pacingOrders;
}
