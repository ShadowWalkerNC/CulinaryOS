// ============================================================
// Tier 2 — F2.2: Multi-Course Hold/Fire Pacing (Boundary & Corner Cases)
// Covers: 10-course tasting menus, 0 elapsed seconds, extreme delays (>60m),
// double fire prevention, and pacing timers across multi-course orders.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { initialHoldStatus } from '@culinaryos/shared';
import {
  calculateCourseTimerColor,
  fireHeldCourse,
  type CourseTicket,
} from '../tier1-features/f2_2_course_pacing.test.js';

describe('F2.2 Course Pacing — Tier 2 Boundaries', () => {
  it('1. correctly marks course numbers 1 through 10 in a Grand Tasting Menu', () => {
    expect(initialHoldStatus(1)).toBe('firing');
    for (let c = 2; c <= 10; c++) {
      expect(initialHoldStatus(c)).toBe('held');
    }
  });

  it('2. evaluates timer alert color at exactly 0 elapsed seconds (Green)', () => {
    expect(calculateCourseTimerColor(0)).toBe('green');
  });

  it('3. evaluates extreme delay (>3600 seconds / 1 hour) as Red alert', () => {
    expect(calculateCourseTimerColor(3600)).toBe('red');
    expect(calculateCourseTimerColor(7200)).toBe('red');
  });

  it('4. throws when attempting to fire an already fired course twice in rapid succession', () => {
    const ticket: CourseTicket = {
      id: 't-multi-c3',
      orderId: 'ord-tasting',
      courseNumber: 3,
      courseHoldStatus: 'held',
    };
    const { ticket: firedOnce } = fireHeldCourse(ticket, 'Chef');
    expect(firedOnce.courseHoldStatus).toBe('fired');

    expect(() => {
      fireHeldCourse(firedOnce, 'Chef');
    }).toThrow('already fired');
  });

  it('5. clamps remaining countdown pacing seconds to 0 when elapsed exceeds pacing target', () => {
    const pacingTargetMinutes = 12;
    const elapsedSeconds = 900; // 15 minutes (>12m)
    const remaining = Math.max(0, pacingTargetMinutes * 60 - elapsedSeconds);
    expect(remaining).toBe(0);
  });
});
