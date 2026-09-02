import { describe, expect, it } from 'bun:test';
import {
  validateDaypartSchedule,
  isScheduleActive,
  resolveEffectivePrice,
  calculateMenuDaypartPrices,
  formatDaypartTimeWindow,
  type DaypartSchedule,
} from '@culinaryos/shared';

describe('Automated Daypart & Happy Hour Pricing Engine (F1.3)', () => {
  const happyHourSchedule: DaypartSchedule = {
    id: 'hh-afternoon',
    name: 'Weekday Happy Hour',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    startTime: '16:00',
    endTime: '18:30',
    adjustmentType: 'percent',
    value: 20, // 20% off
    categoryIds: ['Starters', 'Cocktails'],
    active: true,
  };

  const lateNightSchedule: DaypartSchedule = {
    id: 'late-night-pizza',
    name: 'Overnight Pizza Crave',
    daysOfWeek: [5, 6], // Fri, Sat
    startTime: '22:00',
    endTime: '02:00', // Overnight window
    adjustmentType: 'fixed_cents',
    value: 300, // $3.00 off
    itemIds: ['item-margherita-pizza'],
    active: true,
  };

  const weekendBrunchOverride: DaypartSchedule = {
    id: 'brunch-override',
    name: 'Weekend Bottomless Brunch',
    daysOfWeek: [0, 6], // Sun, Sat
    startTime: '10:00',
    endTime: '14:00',
    adjustmentType: 'override_cents',
    value: 2500, // Fixed $25.00
    categoryIds: ['Brunch'],
    active: true,
  };

  it('1. validates schedule data constraints and formats time labels', () => {
    const validCheck = validateDaypartSchedule(happyHourSchedule);
    expect(validCheck.valid).toBe(true);

    const timeLabel = formatDaypartTimeWindow(happyHourSchedule);
    expect(timeLabel).toBe('Mon, Tue, Wed, Thu, Fri • 4 PM – 6:30 PM');

    const invalidCheck = validateDaypartSchedule({
      name: '',
      daysOfWeek: [8],
      startTime: '25:00',
      endTime: '12:00',
      adjustmentType: 'invalid' as any,
      value: -10,
    });
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.errors.length).toBeGreaterThan(3);
  });

  it('2. determines schedule activity for standard and overnight windows', () => {
    // Tuesday 17:15 (Within Happy Hour 16:00-18:30)
    // Month 8 is September in 0-indexed Date (2026-09-01 is Tuesday)
    const tuesday5PM = new Date('2026-09-01T17:15:00');
    expect(isScheduleActive(happyHourSchedule, tuesday5PM)).toBe(true);

    // Tuesday 19:00 (Outside Happy Hour)
    const tuesday7PM = new Date('2026-09-01T19:00:00');
    expect(isScheduleActive(happyHourSchedule, tuesday7PM)).toBe(false);

    // Saturday 23:30 (Friday night / Saturday night 22:00-02:00 overnight)
    // 2026-09-05 is Saturday
    const saturdayNight = new Date('2026-09-05T23:30:00');
    expect(isScheduleActive(lateNightSchedule, saturdayNight)).toBe(true);

    // Sunday 01:15 (Overnight window after midnight from Saturday night)
    const sundayEarlyMorning = new Date('2026-09-06T01:15:00');
    expect(isScheduleActive(lateNightSchedule, sundayEarlyMorning)).toBe(true);
  });

  it('3. resolves effective price with percentage discounts', () => {
    const basePriceCents = 1500; // $15.00 Truffle Hummus
    const tuesday5PM = new Date('2026-09-01T17:15:00');

    const result = resolveEffectivePrice(
      basePriceCents,
      [happyHourSchedule],
      tuesday5PM,
      { categoryId: 'Starters' }
    );

    expect(result.isDiscounted).toBe(true);
    expect(result.originalPriceCents).toBe(1500);
    // 1500 * (1 - 0.20) = 1200 ($12.00)
    expect(result.effectivePriceCents).toBe(1200);
    expect(result.appliedSchedule?.name).toBe('Weekday Happy Hour');
  });

  it('4. resolves effective price with fixed cents deduction and price overrides', () => {
    const pizzaBasePrice = 1850; // $18.50
    const saturdayNight = new Date('2026-09-05T23:30:00');

    // Fixed cents deduction ($3.00 off)
    const pizzaResult = resolveEffectivePrice(
      pizzaBasePrice,
      [lateNightSchedule],
      saturdayNight,
      { itemId: 'item-margherita-pizza' }
    );
    expect(pizzaResult.isDiscounted).toBe(true);
    // 1850 - 300 = 1550
    expect(pizzaResult.effectivePriceCents).toBe(1550);

    // Fixed price override ($25.00 flat)
    const sundayBrunch = new Date('2026-09-06T11:30:00');
    const brunchResult = resolveEffectivePrice(
      3200,
      [weekendBrunchOverride],
      sundayBrunch,
      { categoryId: 'Brunch' }
    );
    expect(brunchResult.isDiscounted).toBe(true);
    expect(brunchResult.effectivePriceCents).toBe(2500);
  });

  it('5. computes multi-item menu catalog daypart price batch', () => {
    const items = [
      { id: 'it-1', categoryId: 'Starters', basePriceCents: 1000 },
      { id: 'it-2', categoryId: 'Mains', basePriceCents: 2400 },
    ];
    const tuesday5PM = new Date('2026-09-01T17:15:00');

    const pricedMap = calculateMenuDaypartPrices(items, [happyHourSchedule], tuesday5PM);
    expect(pricedMap.get('it-1')?.effectivePriceCents).toBe(800); // 20% off
    expect(pricedMap.get('it-2')?.effectivePriceCents).toBe(2400); // unaffected
  });
});
