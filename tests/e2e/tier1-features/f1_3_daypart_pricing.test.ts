// ============================================================
// Tier 1 — F1.3: Daypart & Happy Hour Pricing (Granular Feature Tests)
// Covers: Daypart scheduling, time range matching, percent discounts,
// fixed cent adjustments, and override pricing.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface DaypartSchedule {
  id: string;
  name: string;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string;    // "16:00"
  endTime: string;      // "19:00"
  adjustmentType: 'percent' | 'fixed_cents' | 'override_cents';
  value: number;        // e.g. -20 for -20%, -200 for -$2.00, 500 for $5.00 flat
}

export function isTimeInRange(timeStr: string, startTime: string, endTime: string): boolean {
  const [h, m] = timeStr.split(':').map(Number);
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  const currentMinutes = h * 60 + m;
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export function resolveEffectivePrice(
  basePriceCents: number,
  schedules: DaypartSchedule[],
  currentTime: { dayOfWeek: number; timeStr: string }
): number {
  for (const sched of schedules) {
    if (
      sched.daysOfWeek.includes(currentTime.dayOfWeek) &&
      isTimeInRange(currentTime.timeStr, sched.startTime, sched.endTime)
    ) {
      if (sched.adjustmentType === 'override_cents') {
        return Math.max(0, sched.value);
      }
      if (sched.adjustmentType === 'percent') {
        const factor = 1 + sched.value / 100;
        return Math.max(0, Math.round(basePriceCents * factor));
      }
      if (sched.adjustmentType === 'fixed_cents') {
        return Math.max(0, basePriceCents + sched.value);
      }
    }
  }
  return basePriceCents;
}

describe('F1.3 Daypart & Happy Hour Pricing — Tier 1 Isolation', () => {
  const happyHourSchedule: DaypartSchedule = {
    id: 'dp-happy-hour',
    name: 'Weekday Happy Hour',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    startTime: '16:00',
    endTime: '18:30',
    adjustmentType: 'percent',
    value: -25, // 25% discount
  };

  const lateNightFixedDiscount: DaypartSchedule = {
    id: 'dp-late-night',
    name: 'Late Night Special',
    daysOfWeek: [5, 6], // Fri-Sat
    startTime: '22:00',
    endTime: '23:59',
    adjustmentType: 'fixed_cents',
    value: -300, // $3.00 off
  };

  const weekendBrunchOverride: DaypartSchedule = {
    id: 'dp-brunch-override',
    name: 'Weekend Mimosa Flat Rate',
    daysOfWeek: [0, 6], // Sat-Sun
    startTime: '10:00',
    endTime: '14:00',
    adjustmentType: 'override_cents',
    value: 500, // Flat $5.00
  };

  it('1. applies percent discount when order time matches active happy hour window', () => {
    const basePriceCents = 1600; // $16.00 Cocktail
    const effectivePrice = resolveEffectivePrice(basePriceCents, [happyHourSchedule], {
      dayOfWeek: 2, // Tuesday
      timeStr: '17:15',
    });
    // 1600 * (1 - 0.25) = 1200 ($12.00)
    expect(effectivePrice).toBe(1200);
  });

  it('2. retains standard base price when order is placed outside happy hour time range', () => {
    const basePriceCents = 1600;
    const effectivePrice = resolveEffectivePrice(basePriceCents, [happyHourSchedule], {
      dayOfWeek: 2, // Tuesday
      timeStr: '19:05', // After 18:30
    });
    expect(effectivePrice).toBe(1600);
  });

  it('3. retains standard base price on exempt days (e.g. Sunday during weekday promo)', () => {
    const basePriceCents = 1600;
    const effectivePrice = resolveEffectivePrice(basePriceCents, [happyHourSchedule], {
      dayOfWeek: 0, // Sunday
      timeStr: '17:00',
    });
    expect(effectivePrice).toBe(1600);
  });

  it('4. applies fixed cent reduction during late night schedule', () => {
    const basePriceCents = 1450; // $14.50 Appetizer
    const effectivePrice = resolveEffectivePrice(basePriceCents, [lateNightFixedDiscount], {
      dayOfWeek: 5, // Friday
      timeStr: '22:30',
    });
    // 1450 - 300 = 1150 ($11.50)
    expect(effectivePrice).toBe(1150);
  });

  it('5. applies flat override price during weekend brunch promotional window', () => {
    const basePriceCents = 1200; // Normal $12 Mimosa
    const effectivePrice = resolveEffectivePrice(basePriceCents, [weekendBrunchOverride], {
      dayOfWeek: 6, // Saturday
      timeStr: '11:30',
    });
    // Flat override = 500 ($5.00)
    expect(effectivePrice).toBe(500);
  });
});
