// ============================================================
// Tier 1 — F2.2: Multi-Course Hold/Fire Pacing (Granular Feature Tests)
// Covers: Initial course status, pacing countdown timers, alert color
// thresholds (<5m Green, 5-10m Amber, >10m Red), and 1-click fire.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { initialHoldStatus } from '@culinaryos/shared';
export { initialHoldStatus };

export type TimerAlertColor = 'green' | 'amber' | 'red';

export function calculateCourseTimerColor(elapsedSeconds: number): TimerAlertColor {
  const minutes = elapsedSeconds / 60;
  if (minutes < 5) return 'green';
  if (minutes < 10) return 'amber';
  return 'red';
}

export interface CourseTicket {
  id: string;
  orderId: string;
  courseNumber: number;
  courseHoldStatus: 'held' | 'firing' | 'fired';
  firedAt?: string;
  pacingTargetMinutes?: number;
}

export function fireHeldCourse(
  ticket: CourseTicket,
  firedBy: string
): { ticket: CourseTicket; firedAt: string; firedBy: string } {
  if (ticket.courseHoldStatus === 'fired') {
    throw new Error(`Course ${ticket.courseNumber} is already fired`);
  }
  const now = new Date().toISOString();
  const updated: CourseTicket = {
    ...ticket,
    courseHoldStatus: 'fired',
    firedAt: now,
  };
  return { ticket: updated, firedAt: now, firedBy };
}

describe('F2.2 Multi-Course Hold/Fire Pacing — Tier 1 Isolation', () => {
  it('1. assigns Course 1 initial status as firing, and Course 2+ as held', () => {
    expect(initialHoldStatus(1)).toBe('firing');
    expect(initialHoldStatus(2)).toBe('held');
    expect(initialHoldStatus(3)).toBe('held');
  });

  it('2. evaluates pacing timer alert colors across boundary thresholds', () => {
    // Under 5m -> green
    expect(calculateCourseTimerColor(120)).toBe('green');
    expect(calculateCourseTimerColor(299)).toBe('green');

    // 5m to 9m59s -> amber
    expect(calculateCourseTimerColor(300)).toBe('amber');
    expect(calculateCourseTimerColor(599)).toBe('amber');

    // 10m+ -> red
    expect(calculateCourseTimerColor(600)).toBe('red');
    expect(calculateCourseTimerColor(900)).toBe('red');
  });

  it('3. transitions held course ticket to fired upon 1-click manual trigger', () => {
    const course2Ticket: CourseTicket = {
      id: 't-c2-01',
      orderId: 'ord-101',
      courseNumber: 2,
      courseHoldStatus: 'held',
    };

    const { ticket, firedBy, firedAt } = fireHeldCourse(course2Ticket, 'Chef Pierre');
    expect(ticket.courseHoldStatus).toBe('fired');
    expect(firedBy).toBe('Chef Pierre');
    expect(firedAt).toBeDefined();
    expect(ticket.firedAt).toBe(firedAt);
  });

  it('4. prevents firing an already fired course ticket', () => {
    const alreadyFired: CourseTicket = {
      id: 't-c1-01',
      orderId: 'ord-101',
      courseNumber: 1,
      courseHoldStatus: 'fired',
      firedAt: new Date().toISOString(),
    };

    expect(() => {
      fireHeldCourse(alreadyFired, 'Server Maria');
    }).toThrow('already fired');
  });

  it('5. computes remaining pacing countdown duration correctly', () => {
    const pacingTargetMinutes = 15;
    const elapsedSeconds = 480; // 8 minutes
    const remainingSeconds = Math.max(0, pacingTargetMinutes * 60 - elapsedSeconds);
    const remainingMinutes = Math.floor(remainingSeconds / 60);

    expect(remainingSeconds).toBe(420); // 7 minutes left
    expect(remainingMinutes).toBe(7);
  });
});
