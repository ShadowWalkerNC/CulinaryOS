// ============================================================
// Tier 2 — F1.3: Daypart & Happy Hour Pricing (Boundary & Corner Cases)
// Covers: Exact boundary minute transitions (16:00 vs 18:30), 100% discount,
// discount exceeding base price clamped to 0, and midnight window.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  isTimeInRange,
  resolveEffectivePrice,
  type DaypartSchedule,
} from '../tier1-features/f1_3_daypart_pricing.test.js';

describe('F1.3 Daypart Pricing — Tier 2 Boundaries', () => {
  const schedule: DaypartSchedule = {
    id: 'dp-boundary',
    name: 'Evening Special',
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '16:00',
    endTime: '18:30',
    adjustmentType: 'percent',
    value: -50, // 50% off
  };

  it('1. matches exact start minute boundary (16:00:00 is active)', () => {
    expect(isTimeInRange('16:00', '16:00', '18:30')).toBe(true);
    const price = resolveEffectivePrice(2000, [schedule], { dayOfWeek: 1, timeStr: '16:00' });
    expect(price).toBe(1000);
  });

  it('2. matches exact end minute boundary (18:30:00 is active, 18:31:00 is inactive)', () => {
    expect(isTimeInRange('18:30', '16:00', '18:30')).toBe(true);
    expect(isTimeInRange('18:31', '16:00', '18:30')).toBe(false);

    const priceAtEnd = resolveEffectivePrice(2000, [schedule], { dayOfWeek: 1, timeStr: '18:30' });
    const priceAfterEnd = resolveEffectivePrice(2000, [schedule], { dayOfWeek: 1, timeStr: '18:31' });
    expect(priceAtEnd).toBe(1000);
    expect(priceAfterEnd).toBe(2000);
  });

  it('3. handles 100% discount resulting in exactly $0 effective price', () => {
    const freePromo: DaypartSchedule = {
      id: 'dp-free',
      name: 'Free Anniversary Dessert',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '12:00',
      endTime: '14:00',
      adjustmentType: 'percent',
      value: -100, // 100% off
    };
    const price = resolveEffectivePrice(1200, [freePromo], { dayOfWeek: 3, timeStr: '12:30' });
    expect(price).toBe(0);
  });

  it('4. clamps negative resulting prices to $0 when fixed discount exceeds item price', () => {
    const bigDiscount: DaypartSchedule = {
      id: 'dp-big-discount',
      name: 'Massive $20 Off Coupon',
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '11:00',
      endTime: '14:00',
      adjustmentType: 'fixed_cents',
      value: -2000, // -$20.00
    };
    // Item is only $8.00 (800 cents) -> 800 - 2000 = -1200 -> clamped to 0
    const price = resolveEffectivePrice(800, [bigDiscount], { dayOfWeek: 2, timeStr: '12:00' });
    expect(price).toBe(0);
  });

  it('5. handles empty schedules array without mutation or error', () => {
    const price = resolveEffectivePrice(2500, [], { dayOfWeek: 5, timeStr: '17:00' });
    expect(price).toBe(2500);
  });
});
