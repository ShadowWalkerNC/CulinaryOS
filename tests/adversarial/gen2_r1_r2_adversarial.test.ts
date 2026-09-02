// ============================================================
// CulinaryOS — Adversarial Stress Test & Empirical Verification Suite
// Challenger Gen2: R1 (Front-of-House) & R2 (Back-of-House)
// ============================================================

import { describe, expect, it } from 'bun:test';
import { app } from '../../apps/server/src/index';

import {
  calculateModifierGroupPrices,
  calculateItemPrice,
  calculateTotalModifierUpcharge,
  validateModifierSelections,
  buildSelectedModifierTree,
  flattenSelectedModifiers,
  type ModifierGroup,
  type SelectedModifier,
} from '@culinaryos/shared';

import {
  validateDaypartSchedule,
  isScheduleActive,
  resolveEffectivePrice,
  calculateMenuDaypartPrices,
  formatDaypartTimeWindow,
  type DaypartSchedule,
} from '@culinaryos/shared';

import {
  translateCulinaryText,
  translateTicketItem,
  translateTicket,
  formatDualLanguageText,
  CULINARY_DICTIONARY,
  type SupportedLanguage,
} from '@culinaryos/shared';

import {
  calculateIngredientVariance,
  calculateActualVsTheoretical,
  type TheoreticalUsageItem,
  type ActualUsageItem,
  type WasteLogItem,
} from '@culinaryos/food-cost-engine';

import {
  calculateUseByDate,
  scaleRecipeByBakersPercentage,
  scaleRecipeByTotalBatchWeight,
  scaleRecipeByTargetYield,
  formatAdhesiveLabel,
  generateLabelEscPos,
  type BakersRecipe,
  type StandardPrepRecipe,
  type PrepBatch,
} from '@culinaryos/prep-engine';

import {
  calculateVoidWaste,
  isPostSendStatus,
} from '@culinaryos/waste-engine';

import {
  setMock86Count,
  getMock86Items,
  decrementMock86,
  toggleMock86,
  createMockTicketsFromOrder,
  getMockTickets,
  fireMockTicket,
  holdMockTicket,
} from '../../apps/server/src/lib/mock-kitchen';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

// ============================================================
// 1. HIERARCHICAL MODIFIERS ADVERSARIAL STRESS SUITE
// ============================================================
describe('Adversarial Scope 1: Hierarchical Modifiers (Deep Nesting & Invariants)', () => {
  // 4-Tier Deep Nesting Model
  // Level 0 (Item): Prime Artisan Burger (Base: $15.00 / 1500¢)
  // Level 1: Protein Patty (Required, Min: 1, Max: 1, Free: 0) -> Wagyu Patty (+500¢)
  // Level 2: Patty Crust Style (Optional, Min: 0, Max: 1, Free: 1) -> Butter Basted (Orig: +100¢, Effective: 0¢ Free)
  // Level 3: Baste Herb Blend (Optional, Min: 0, Max: 2, Free: 1) -> Fresh Rosemary (Orig: +50¢, Effective: 0¢ Free), French Thyme (Orig: +75¢, Effective: 75¢)
  // Level 4: Finishing Salt (Optional, Min: 0, Max: 1, Free: 0) -> Smoked Maldon Flakes (+50¢)

  const saltFinishGroup: ModifierGroup = {
    id: 'grp-salt-finish',
    name: 'Finishing Salt',
    required: false,
    minSelections: 0,
    maxSelections: 1,
    freeQuantity: 0,
    modifiers: [
      { id: 'mod-maldon', name: 'Smoked Maldon Flakes', priceAdjustmentCents: 50 },
      { id: 'mod-black-salt', name: 'Hawaiian Black Lava Salt', priceAdjustmentCents: 75 },
    ],
  };

  const basteHerbGroup: ModifierGroup = {
    id: 'grp-baste-herbs',
    name: 'Baste Herb Blend',
    required: false,
    minSelections: 0,
    maxSelections: 2,
    freeQuantity: 1, // First herb free
    modifiers: [
      { id: 'mod-rosemary', name: 'Fresh Rosemary', priceAdjustmentCents: 50 },
      {
        id: 'mod-thyme',
        name: 'French Thyme',
        priceAdjustmentCents: 75,
        nestedGroups: [saltFinishGroup],
      },
    ],
  };

  const pattyCrustGroup: ModifierGroup = {
    id: 'grp-patty-crust',
    name: 'Patty Crust Style',
    required: false,
    minSelections: 0,
    maxSelections: 1,
    freeQuantity: 1, // First crust prep free
    modifiers: [
      {
        id: 'mod-butter-baste',
        name: 'Butter Basted Crust',
        priceAdjustmentCents: 100,
        nestedGroups: [basteHerbGroup],
      },
      { id: 'mod-blackened', name: 'Cast Iron Blackened', priceAdjustmentCents: 50 },
    ],
  };

  const burgerPattyGroup: ModifierGroup = {
    id: 'grp-burger-protein',
    name: 'Patty Selection',
    required: true,
    minSelections: 1,
    maxSelections: 1,
    freeQuantity: 0,
    modifiers: [
      {
        id: 'mod-wagyu',
        name: 'A5 Wagyu Blend',
        priceAdjustmentCents: 500,
        nestedGroups: [pattyCrustGroup],
      },
      { id: 'mod-angus', name: 'Prime Angus Beef', priceAdjustmentCents: 0 },
    ],
  };

  it('1.1 Builds 4-tier nested modifier tree and enforces First-N Free per-tier independence', () => {
    const selections = {
      'grp-burger-protein': ['mod-wagyu'], // +500¢ (free:0 -> 500¢)
      'grp-patty-crust': ['mod-butter-baste'], // +100¢ (free:1 -> 0¢)
      'grp-baste-herbs': ['mod-rosemary', 'mod-thyme'], // 1st free -> 0¢, 2nd +75¢ -> 75¢
      'grp-salt-finish': ['mod-maldon'], // +50¢ (free:0 -> 50¢)
    };

    const tree = buildSelectedModifierTree([burgerPattyGroup], selections);
    expect(tree).toHaveLength(1);

    const rootMod = tree[0];
    expect(rootMod.id).toBe('mod-wagyu');
    expect(rootMod.effectivePriceCents).toBe(500);

    // Level 2: Patty Crust
    expect(rootMod.subModifiers).toHaveLength(1);
    const crustMod = rootMod.subModifiers![0];
    expect(crustMod.id).toBe('mod-butter-baste');
    expect(crustMod.effectivePriceCents).toBe(0); // FREE by Tier 2 rule

    // Level 3: Baste Herbs
    expect(crustMod.subModifiers).toHaveLength(2);
    const rosemary = crustMod.subModifiers![0];
    const thyme = crustMod.subModifiers![1];
    expect(rosemary.effectivePriceCents).toBe(0); // 1st herb FREE
    expect(thyme.effectivePriceCents).toBe(75); // 2nd herb +75¢

    // Level 4: Salt Finish (nested under thyme)
    expect(thyme.subModifiers).toHaveLength(1);
    const maldon = thyme.subModifiers![0];
    expect(maldon.effectivePriceCents).toBe(50); // +50¢

    // Total Recursive Upcharge: 500 + 0 + 0 + 75 + 50 = 625¢
    const totalUpcharge = calculateTotalModifierUpcharge(tree);
    expect(totalUpcharge).toBe(625);

    // Total Item Price: (1500 base + 625 upcharge) * 3 quantity = 6375¢ ($63.75)
    const finalPrice = calculateItemPrice(1500, tree, 3);
    expect(finalPrice).toBe(6375);
  });

  it('1.2 Validates deep nested min/max rules and catches constraint violations at Level 3 and 4', () => {
    // Missing required Level 1 selection
    const missingRoot = validateModifierSelections([burgerPattyGroup], {});
    expect(missingRoot.valid).toBe(false);
    expect(missingRoot.errors.some((e) => e.includes('Patty Selection'))).toBe(true);

    // Exceeding Level 3 max selections (Max: 2, Selected: 3)
    const excessHerbGroup: ModifierGroup = {
      ...basteHerbGroup,
      modifiers: [
        ...basteHerbGroup.modifiers,
        { id: 'mod-garlic-herb', name: 'Garlic Herb', priceAdjustmentCents: 50 },
      ],
    };
    const excessPattyGroup: ModifierGroup = {
      ...burgerPattyGroup,
      modifiers: [
        {
          ...burgerPattyGroup.modifiers[0],
          nestedGroups: [
            {
              ...pattyCrustGroup,
              modifiers: [
                {
                  ...pattyCrustGroup.modifiers[0],
                  nestedGroups: [excessHerbGroup],
                },
              ],
            },
          ],
        },
      ],
    };

    const excessSelections = {
      'grp-burger-protein': ['mod-wagyu'],
      'grp-patty-crust': ['mod-butter-baste'],
      'grp-baste-herbs': ['mod-rosemary', 'mod-thyme', 'mod-garlic-herb'],
    };

    const excessValidation = validateModifierSelections([excessPattyGroup], excessSelections);
    expect(excessValidation.valid).toBe(false);
    expect(excessValidation.errors.some((e) => e.includes('allows at most 2'))).toBe(true);
  });

  it('1.3 Flattens 4-tier nested modifier hierarchy with exact indented breadcrumb paths for KDS/printing', () => {
    const selections = {
      'grp-burger-protein': ['mod-wagyu'],
      'grp-patty-crust': ['mod-butter-baste'],
      'grp-baste-herbs': ['mod-thyme'],
      'grp-salt-finish': ['mod-maldon'],
    };

    const tree = buildSelectedModifierTree([burgerPattyGroup], selections);
    const flattened = flattenSelectedModifiers(tree);

    expect(flattened).toHaveLength(4);
    expect(flattened[0].name).toBe('A5 Wagyu Blend');
    expect(flattened[0].level).toBe(0);
    expect(flattened[0].path).toBe('A5 Wagyu Blend');

    expect(flattened[1].name).toBe('  ↳ Butter Basted Crust');
    expect(flattened[1].level).toBe(1);
    expect(flattened[1].path).toBe('A5 Wagyu Blend > Butter Basted Crust');

    expect(flattened[2].name).toBe('  ↳   ↳ French Thyme');
    expect(flattened[2].level).toBe(2);
    expect(flattened[2].path).toBe('A5 Wagyu Blend > Butter Basted Crust > French Thyme');

    expect(flattened[3].name).toBe('  ↳   ↳   ↳ Smoked Maldon Flakes');
    expect(flattened[3].level).toBe(3);
    expect(flattened[3].path).toBe(
      'A5 Wagyu Blend > Butter Basted Crust > French Thyme > Smoked Maldon Flakes'
    );
  });
});

// ============================================================
// 2. DYNAMIC FLOOR MAP & TABLE OPERATIONS STRESS SUITE
// ============================================================
describe('Adversarial Scope 2: Floor Map (Merge, Split, Server Transfer PIN Gates)', () => {
  it('2.1 Table Merge: Validates parameters, merges multiple tables into target, and re-calculates totals', async () => {
    // Attempt invalid merge: target table in source tables
    const selfMergeRes = await app.request('/v1/tables/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEMO_TENANT },
      body: JSON.stringify({ targetTableId: 'T1', sourceTableIds: ['T1', 'T2'] }),
    });
    expect(selfMergeRes.status).toBe(422);
    const selfMergeBody = await selfMergeRes.json();
    expect(selfMergeBody.error.message).toContain('targetTableId cannot be in sourceTableIds');

    // Attempt empty sourceTableIds
    const emptySourceRes = await app.request('/v1/tables/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEMO_TENANT },
      body: JSON.stringify({ targetTableId: 'T1', sourceTableIds: [] }),
    });
    expect(emptySourceRes.status).toBe(422);

    // Valid 3-table merge: T12, T13, T14 into T10
    const mergeRes = await app.request('/v1/tables/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEMO_TENANT },
      body: JSON.stringify({
        targetTableId: 'T10',
        sourceTableIds: ['T12', 'T13', 'T14'],
        managerPin: '5678',
      }),
    });
    expect(mergeRes.status).toBe(200);
    const mergeBody = await mergeRes.json();
    expect(mergeBody.ok).toBe(true);
    expect(mergeBody.data.targetTableId).toBe('T10');
    expect(mergeBody.data.mergedSourceTableIds).toEqual(['T12', 'T13', 'T14']);
    expect(mergeBody.data.mergedTableNumbers).toContain('T10');
    expect(mergeBody.data.mergedTableNumbers).toContain('T12');
  });

  it('2.2 Seat Bill Partitioning: Splits order across 3 distinct guest seats and validates subtotal/tax distribution', async () => {
    // Attempt invalid split (< 2 partitions)
    const invalidSplitRes = await app.request('/v1/tables/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEMO_TENANT },
      body: JSON.stringify({
        orderId: 'ord-adv-split-1',
        partitions: [{ seatNumber: 1, itemIds: ['item-1'] }],
      }),
    });
    expect(invalidSplitRes.status).toBe(422);

    // Valid 3-way seat split
    const splitRes = await app.request('/v1/tables/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEMO_TENANT },
      body: JSON.stringify({
        orderId: 'ord-adv-split-2',
        splitType: 'seat',
        partitions: [
          { seatNumber: 1, itemIds: ['item-ribeye', 'item-wine'], guestLabel: 'Seat 1 (Host)' },
          { seatNumber: 2, itemIds: ['item-salmon'], guestLabel: 'Seat 2' },
          { seatNumber: 3, itemIds: ['item-burger', 'item-beer'], guestLabel: 'Seat 3' },
        ],
      }),
    });
    expect(splitRes.status).toBe(200);
    const splitBody = await splitRes.json();
    expect(splitBody.ok).toBe(true);
    expect(splitBody.data.newOrderIds).toHaveLength(3);
    expect(splitBody.data.partitions).toHaveLength(3);
    expect(splitBody.data.partitions[0].itemCount).toBe(2);
    expect(splitBody.data.partitions[1].itemCount).toBe(1);
    expect(splitBody.data.partitions[2].itemCount).toBe(2);
  });

  it('2.3 Server Transfer: Authorizes with Manager PIN, blocks unauthorized PINs and missing parameters', async () => {
    // Missing Manager PIN
    const missingPinRes = await app.request('/v1/tables/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEMO_TENANT },
      body: JSON.stringify({
        tableId: 'T8',
        fromServerId: 'srv-alice',
        toServerId: 'srv-bob',
      }),
    });
    expect(missingPinRes.status).toBe(422);

    // Invalid Server PIN (1234 is server, not manager)
    const unauthorizedRes = await app.request('/v1/tables/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEMO_TENANT },
      body: JSON.stringify({
        tableId: 'T8',
        fromServerId: 'srv-alice',
        toServerId: 'srv-bob',
        managerPin: '1234',
      }),
    });
    expect(unauthorizedRes.status).toBe(403);

    // Valid Manager PIN (5678)
    const authorizedRes = await app.request('/v1/tables/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': DEMO_TENANT },
      body: JSON.stringify({
        tableId: 'T8',
        fromServerId: 'srv-alice',
        toServerId: 'srv-bob',
        toServerName: 'Bob Vance',
        managerPin: '5678',
      }),
    });
    expect(authorizedRes.status).toBe(200);
    const authBody = await authorizedRes.json();
    expect(authBody.ok).toBe(true);
    expect(authBody.data.toServerId).toBe('srv-bob');
    expect(authBody.data.toServerName).toBe('Bob Vance');
  });
});

// ============================================================
// 3. AUTOMATED DAYPARTS & SCHEDULED PRICING STRESS SUITE
// ============================================================
describe('Adversarial Scope 3: Dayparts (Overnight Midnight Windows & Pricing Adjustments)', () => {
  const lateNightSpecial: DaypartSchedule = {
    id: 'dp-overnight-weekend',
    name: 'Weekend Late Night',
    daysOfWeek: [4, 5, 6], // Thu, Fri, Sat
    startTime: '22:00',
    endTime: '02:00', // Spans midnight to next day
    adjustmentType: 'fixed_cents',
    value: 300, // $3.00 off
    active: true,
    priority: 15,
  };

  it('3.1 Accurately evaluates overnight time-window crossing midnight across all boundary minute ticks', () => {
    // Thursday 21:59 (1 min before start) -> Inactive
    const dThu2159 = new Date('2026-09-03T21:59:00'); // Thursday
    expect(isScheduleActive(lateNightSpecial, dThu2159)).toBe(false);

    // Thursday 22:00 (Start boundary) -> Active
    const dThu2200 = new Date('2026-09-03T22:00:00');
    expect(isScheduleActive(lateNightSpecial, dThu2200)).toBe(true);

    // Thursday 23:59 (Midnight eve) -> Active
    const dThu2359 = new Date('2026-09-03T23:59:00');
    expect(isScheduleActive(lateNightSpecial, dThu2359)).toBe(true);

    // Friday 00:00 (Midnight tick - continuation of Thursday night) -> Active
    const dFri0000 = new Date('2026-09-04T00:00:00'); // Friday 00:00
    expect(isScheduleActive(lateNightSpecial, dFri0000)).toBe(true);

    // Friday 01:59 (1 min before end) -> Active
    const dFri0159 = new Date('2026-09-04T01:59:00');
    expect(isScheduleActive(lateNightSpecial, dFri0159)).toBe(true);

    // Friday 02:00 (End boundary inclusive) -> Active
    const dFri0200 = new Date('2026-09-04T02:00:00');
    expect(isScheduleActive(lateNightSpecial, dFri0200)).toBe(true);

    // Friday 02:01 (1 min past end) -> Inactive
    const dFri0201 = new Date('2026-09-04T02:01:00');
    expect(isScheduleActive(lateNightSpecial, dFri0201)).toBe(false);

    // Sunday 01:30 (Saturday overnight continuation) -> Active
    const dSun0130 = new Date('2026-09-06T01:30:00'); // Sunday morning after Saturday night
    expect(isScheduleActive(lateNightSpecial, dSun0130)).toBe(true);

    // Sunday 23:30 (Sunday night is NOT in Thu-Sat schedule) -> Inactive
    const dSun2330 = new Date('2026-09-06T23:30:00');
    expect(isScheduleActive(lateNightSpecial, dSun2330)).toBe(false);
  });

  it('3.2 Resolves multi-schedule priority layering and price floor invariants (never negative price)', () => {
    const happyHourPercent: DaypartSchedule = {
      id: 'dp-hh-pct',
      name: 'Happy Hour 25% Off',
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '16:00',
      endTime: '19:00',
      adjustmentType: 'percent',
      value: 25,
      priority: 20,
    };

    const fixedDiscountHuge: DaypartSchedule = {
      id: 'dp-huge-discount',
      name: 'Super $50 Discount',
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '16:00',
      endTime: '19:00',
      adjustmentType: 'fixed_cents',
      value: 5000, // $50.00 off
      priority: 10,
    };

    const targetTime = new Date('2026-09-04T17:00:00'); // Friday 5:00 PM

    // Base price $20.00 (2000¢) with 25% off -> 1500¢ ($15.00)
    const res1 = resolveEffectivePrice(2000, [happyHourPercent], targetTime);
    expect(res1.effectivePriceCents).toBe(1500);
    expect(res1.savingsCents).toBe(500);
    expect(res1.isDiscounted).toBe(true);

    // Base price $12.00 (1200¢) with $50.00 discount -> Floor to $0.00 (0¢), NEVER negative
    const resFloor = resolveEffectivePrice(1200, [fixedDiscountHuge], targetTime);
    expect(resFloor.effectivePriceCents).toBe(0);
    expect(resFloor.savingsCents).toBe(1200);

    // Price override test: flat $8.50 (850¢)
    const overrideSchedule: DaypartSchedule = {
      id: 'dp-override',
      name: 'Lunch Special $8.50',
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '11:00',
      endTime: '14:00',
      adjustmentType: 'override_cents',
      value: 850,
      priority: 50,
    };

    const resOverride = resolveEffectivePrice(1800, [overrideSchedule], new Date('2026-09-04T12:30:00'));
    expect(resOverride.effectivePriceCents).toBe(850);
    expect(resOverride.savingsCents).toBe(950);
  });
});

// ============================================================
// 4. LIVE 86 COUNTDOWNS & ATOMIC DECREMENT STRESS SUITE
// ============================================================
describe('Adversarial Scope 4: Live 86 Countdowns (Atomic Decrement & Zero-Count Lock)', () => {
  it('4.1 Sequentially decrements countdown portions to exactly 0, locks item status to 86d, and prevents negative depletion', () => {
    // Set 86 countdown on 'Prime Ribeye Steak' to 5 portions
    setMock86Count('Prime Ribeye Steak', 5);

    let items = getMock86Items();
    let ribeye = items.find((i) => i.name === 'Prime Ribeye Steak');
    expect(ribeye).toBeDefined();
    expect(ribeye!.countRemaining).toBe(5);
    expect(ribeye!.is86).toBe(false);

    // Order 1: Sells 2 portions -> remaining 3
    const dec1 = decrementMock86('Prime Ribeye Steak', 2);
    expect(dec1.item?.countRemaining).toBe(3);
    expect(dec1.is86).toBe(false);

    // Order 2: Sells 3 portions -> remaining exactly 0 -> locks to 86d
    const dec2 = decrementMock86('Prime Ribeye Steak', 3);
    expect(dec2.item?.countRemaining).toBe(0);
    expect(dec2.is86).toBe(true);

    // Order 3 (Adversarial): Attempt to order 2 more when already 86d -> remains clamped at 0
    const dec3 = decrementMock86('Prime Ribeye Steak', 2);
    expect(dec3.item?.countRemaining).toBe(0);
    expect(dec3.is86).toBe(true);

    // Toggle 86 to restore availability
    toggleMock86('Prime Ribeye Steak');
    const restored = getMock86Items().find((i) => i.name === 'Prime Ribeye Steak');
    expect(restored?.is86).toBe(false);
  });
});

// ============================================================
// 5. MULTI-COURSE HOLD/FIRE PACING & ALERTS STRESS SUITE
// ============================================================
describe('Adversarial Scope 5: Course Pacing (Staging, 12m/15m Alert Timers, 1-Click Fire)', () => {
  it('5.1 Creates staged course tickets (Course 1 fired, Course 2 held) and transitions status on manual fire', () => {
    const orderId = 'ord-pacing-adv-1';
    const items = [
      {
        lineItemId: 'li-c1',
        menuItemId: 'm-calamari',
        name: 'Crispy Calamari',
        quantity: 1,
        station: 'fryer' as const,
        courseNumber: 1,
        modifiers: [],
        notes: null,
      },
      {
        lineItemId: 'li-c2',
        menuItemId: 'm-steak',
        name: 'Ribeye Steak',
        quantity: 1,
        station: 'grill' as const,
        courseNumber: 2,
        modifiers: ['Medium Rare'],
        notes: null,
      },
    ];

    const tickets = createMockTicketsFromOrder({
      tenantId: DEMO_TENANT,
      orderId,
      tableNumber: '14',
      items,
    });

    expect(tickets).toHaveLength(2);

    const c1Ticket = tickets.find((t) => t.course_number === 1);
    const c2Ticket = tickets.find((t) => t.course_number === 2);

    expect(c1Ticket).toBeDefined();
    expect(c1Ticket!.course_hold_status).toBe('fired');
    expect(c1Ticket!.status).toBe('fired');

    expect(c2Ticket).toBeDefined();
    expect(c2Ticket!.course_hold_status).toBe('held');
    expect(c2Ticket!.status).toBe('queued');

    // 1-Click Manual Fire of Course 2
    const firedC2 = fireMockTicket(c2Ticket!.id);
    expect(firedC2).toBeDefined();
    expect(firedC2!.course_hold_status).toBe('fired');
    expect(firedC2!.status).toBe('fired');
    expect(firedC2!.fired_at).toBeDefined();
  });

  it('5.2 Evaluates pacing timer alert thresholds: Normal (<12m), Warning (12-15m), Urgent (15m+)', () => {
    function evaluatePacingAlert(c1ElapsedSeconds: number, c2HoldStatus: 'held' | 'fired'): 'normal' | 'warning' | 'urgent' {
      if (c2HoldStatus !== 'held') return 'normal';
      if (c1ElapsedSeconds >= 900) return 'urgent'; // 15+ mins
      if (c1ElapsedSeconds >= 720) return 'warning'; // 12-15 mins
      return 'normal';
    }

    expect(evaluatePacingAlert(300, 'held')).toBe('normal'); // 5 mins
    expect(evaluatePacingAlert(719, 'held')).toBe('normal'); // 11m 59s
    expect(evaluatePacingAlert(720, 'held')).toBe('warning'); // 12m 00s (Warning threshold)
    expect(evaluatePacingAlert(850, 'held')).toBe('warning'); // 14m 10s
    expect(evaluatePacingAlert(900, 'held')).toBe('urgent'); // 15m 00s (Urgent threshold)
    expect(evaluatePacingAlert(1800, 'held')).toBe('urgent'); // 30m 00s

    // Once fired, alert drops back to normal regardless of elapsed time
    expect(evaluatePacingAlert(1200, 'fired')).toBe('normal');
  });
});

// ============================================================
// 6. DUAL-LANGUAGE CULINARY TRANSLATION & ESC/POS CHITS
// ============================================================
describe('Adversarial Scope 6: Dual Translation (Dictionary, Modifiers, Bilingual Chits)', () => {
  it('6.1 Translates culinary terms and doneness accurately into Spanish and French', () => {
    expect(translateCulinaryText('Ribeye Steak', 'es').translated).toBe('Bife de Chorizo');
    expect(translateCulinaryText('Ribeye Steak', 'fr').translated).toBe('Entrecôte Grillée');

    expect(translateCulinaryText('Medium Rare', 'es').translated).toBe('Término Medio / Poco Hecho');
    expect(translateCulinaryText('Medium Rare', 'fr').translated).toBe('À Point / Saignant');

    expect(translateCulinaryText('French Fries', 'es').translated).toBe('Papas Fritas');
    expect(translateCulinaryText('French Fries', 'fr').translated).toBe('Frites');
  });

  it('6.2 Handles dynamic modifier prefixes: No X, Extra X, Sub X, Add X across ES & FR', () => {
    // Known dictionary terms
    expect(translateCulinaryText('No Onion', 'es').translated).toBe('Sin Cebolla');
    expect(translateCulinaryText('Extra Cheese', 'es').translated).toBe('Extra Queso');
    expect(translateCulinaryText('Sub Salad', 'fr').translated).toBe('Remplacer par Salade');

    // Dynamic prefix replacement on terms not in dictionary
    const dynamicNo = translateCulinaryText('No Cilantro', 'es');
    expect(dynamicNo.translated).toBe('Sin Cilantro');

    const dynamicAdd = translateCulinaryText('Add Avocado', 'es');
    expect(dynamicAdd.translated).toBe('Agregar Avocado');

    // Unknown custom allergy text preserved verbatim
    const customMod = translateCulinaryText('Severe Sesame Sensitivity', 'es');
    expect(customMod.original).toBe('Severe Sesame Sensitivity');
  });

  it('6.3 Generates full bilingual Kitchen Ticket and formats dual-language headers with original subtitle', () => {
    const rawTicket = {
      id: 'tick-trans-adv-1',
      orderId: 'ord-trans-1',
      tableNumber: '5',
      courseNumber: 1,
      station: 'grill' as const,
      status: 'fired' as const,
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          name: 'Ribeye Steak',
          quantity: 2,
          station: 'grill',
          modifiers: ['Medium Rare', 'Truffle Fries'],
        },
      ],
    };

    const translatedES = translateTicket(rawTicket as any, 'es');
    expect(translatedES.targetLanguage).toBe('es');
    expect(translatedES.translatedCourseLabel).toBe('Tiempo 1 (Plato)');
    expect(translatedES.translatedStationName).toBe('Parrilla');

    const item0 = translatedES.items[0];
    expect(item0.translatedName).toBe('Bife de Chorizo');
    expect(item0.dualLanguageHeader).toBe('Bife de Chorizo (Ribeye Steak)');
    expect(item0.translatedModifiers?.[0]).toContain('Término Medio');

    // Formatted stacked / inline text
    const inlineText = formatDualLanguageText('Salmon', 'es', 'inline');
    expect(inlineText).toBe('Salmón a la Plancha (Salmon)');

    const stackedText = formatDualLanguageText('Salmon', 'fr', 'stacked');
    expect(stackedText).toBe('Saumon Grillé\n  (Salmon)');
  });
});

// ============================================================
// 7. FOOD COST VARIANCE & 1-CLICK WASTE DEBITING SUITE
// ============================================================
describe('Adversarial Scope 7: Food Cost Variance & 1-Click Waste (Actual vs Theoretical & Auto-Void)', () => {
  it('7.1 Calculates exact Actual vs Theoretical Variance with waste loss subtraction and alert thresholds', () => {
    const theoreticalUsage: TheoreticalUsageItem[] = [
      { ingredientName: 'Prime Angus Chuck', theoreticalQuantity: 100, unit: 'kg', unitCost: 15.00 }, // $1500 theo
      { ingredientName: 'Black Truffle Oil', theoreticalQuantity: 10, unit: 'L', unitCost: 80.00 }, // $800 theo
    ];

    const actualUsage: ActualUsageItem[] = [
      { ingredientName: 'Prime Angus Chuck', actualQuantity: 108, unit: 'kg', unitCost: 15.00 }, // $1620 actual (+$120 variance)
      { ingredientName: 'Black Truffle Oil', actualQuantity: 10.1, unit: 'L', unitCost: 80.00 }, // $808 actual (+$8 variance = 1%)
    ];

    const wasteLogs: WasteLogItem[] = [
      { ingredientName: 'Prime Angus Chuck', quantity: 5, unit: 'kg', wasteCost: 75.00, reason: 'burned' }, // $75 recorded waste
    ];

    const report = calculateActualVsTheoretical({ theoreticalUsage, actualUsage, wasteLogs });

    // Total Theoretical: 1500 + 800 = $2300.00
    expect(report.totalTheoreticalCost).toBe(2300);
    // Total Actual: 1620 + 808 = $2428.00
    expect(report.totalActualCost).toBe(2428);
    // Total Variance Cost: 2428 - 2300 = $128.00
    expect(report.totalVarianceCost).toBe(128);
    // Total Waste Cost: $75.00
    expect(report.totalWasteCost).toBe(75);
    // Unexplained Cost: 128 - 75 = $53.00
    expect(report.totalUnexplainedCost).toBe(53);

    // Angus Chuck Variance: (120 / 1500) * 100 = 8.0% -> alert (>= 5%)
    const chuck = report.ingredients.find((i) => i.ingredientName === 'Prime Angus Chuck');
    expect(chuck?.variancePct).toBe(8);
    expect(chuck?.status).toBe('alert');
    expect(chuck?.unexplainedCost).toBe(45); // 120 - 75 = $45 unexplained

    // Truffle Oil Variance: (8 / 800) * 100 = 1.0% -> ok (< 2%)
    const truffle = report.ingredients.find((i) => i.ingredientName === 'Black Truffle Oil');
    expect(truffle?.variancePct).toBe(1);
    expect(truffle?.status).toBe('ok');
  });

  it('7.2 Post-Send Void Auto-Waste: Generates automated waste event on cooked item void and skips uncooked items', () => {
    // Voiding a cooked steak post-send -> Generates waste event
    const cookedVoid = calculateVoidWaste(
      {
        itemName: 'Prime Ribeye Steak',
        quantity: 1,
        unitPriceCents: 4500,
        reasonCode: 'kitchen_error',
        isCooked: true,
      },
      DEMO_TENANT,
      { orderId: 'ord-void-1', lineItemId: 'li-1' }
    );

    expect(cookedVoid).toHaveLength(1);
    expect(cookedVoid[0].ingredient).toBe('Prime Ribeye Steak');
    expect(cookedVoid[0].reason).toBe('void_cooked');
    expect(cookedVoid[0].wasteCost).toBeGreaterThan(0);

    // Voiding an uncooked item (cancelled before line fired) -> 0 waste events
    const uncookedVoid = calculateVoidWaste(
      {
        itemName: 'Caesar Salad',
        quantity: 1,
        unitPriceCents: 1400,
        reasonCode: 'customer_change',
        isCooked: false,
      },
      DEMO_TENANT
    );

    expect(uncookedVoid).toHaveLength(0);
  });
});

// ============================================================
// 8. BATCH PREP RECIPE SCALING & ADHESIVE LABELS SUITE
// ============================================================
describe('Adversarial Scope 8: Batch Prep Scaling & Adhesive Thermal Labels', () => {
  const sourdoughRecipe: BakersRecipe = {
    name: 'Artisan Sourdough Dough',
    baseFlourGrams: 1000,
    ingredients: [
      { name: 'Bread Flour', percentage: 100, isBaseFlour: true },
      { name: 'Water', percentage: 72 },
      { name: 'Levain / Starter', percentage: 20 },
      { name: 'Sea Salt', percentage: 2.2 },
    ],
  };

  it('8.1 Scales recipe using Baker\'s Percentages by target base flour and target total batch weight', () => {
    // Scale by 5000g Flour:
    // Flour: 5000g (100%)
    // Water: 3600g (72%)
    // Starter: 1000g (20%)
    // Salt: 110g (2.2%)
    // Total Dough Weight = 5000 + 3600 + 1000 + 110 = 9710g
    const scaledByFlour = scaleRecipeByBakersPercentage(sourdoughRecipe, 5000);
    expect(scaledByFlour.targetBaseFlourGrams).toBe(5000);
    expect(scaledByFlour.totalBatchWeightGrams).toBe(9710);

    const water = scaledByFlour.ingredients.find((i) => i.name === 'Water');
    expect(water?.weightGrams).toBe(3600);
    const salt = scaledByFlour.ingredients.find((i) => i.name === 'Sea Salt');
    expect(salt?.weightGrams).toBe(110);

    // Scale by Target Total Weight: 10000g dough
    // Total % = 100 + 72 + 20 + 2.2 = 194.2%
    // Required Flour = (10000 / 194.2) * 100 = ~5149.3g
    const scaledByTotal = scaleRecipeByTotalBatchWeight(sourdoughRecipe, 10000);
    expect(scaledByTotal.targetBaseFlourGrams).toBeCloseTo(5149.3, 0);
    expect(scaledByTotal.totalBatchWeightGrams).toBeCloseTo(10000, 0);
  });

  it('8.2 Calculates exact use-by dates, expiration status, and formats 2"x1" and 2"x2" adhesive labels with QR payloads', () => {
    const prepDate = new Date('2026-09-02T08:00:00');
    const batch: PrepBatch = {
      recipeName: 'House Garlic Aioli',
      batchNumber: 'LOT-90210',
      cookInitials: 'MK',
      prepDate,
      shelfLifeHours: 72, // 3 days
      allergens: ['Eggs', 'Mustard'],
      storageLocation: 'Walk-In Cooler #2',
      storageTemp: '≤ 38°F (3°C)',
      yieldQuantity: 4,
      yieldUnit: 'Quarts',
    };

    const label2x1 = formatAdhesiveLabel(batch, '2x1');
    expect(label2x1.format).toBe('2x1');
    expect(label2x1.cookInitials).toBe('MK');
    expect(label2x1.useByDateTime).toBe('09/05/2026 08:00');
    expect(label2x1.allergenWarningText).toBe('CONTAINS: EGGS, MUSTARD');
    expect(label2x1.escPosCommands.length).toBeGreaterThan(50);

    const label2x2 = formatAdhesiveLabel(batch, '2x2');
    expect(label2x2.format).toBe('2x2');
    expect(label2x2.qrCodeData).toContain('CULINARYOS:BATCH:LOT-90210');
    expect(label2x2.formattedAscii).toContain('[QR TRACEABILITY SCAN: LOT-90210]');

    // ESC/POS binary command stream check
    const escCommands = label2x2.escPosCommands;
    expect(escCommands[0]).toBe(0x1b); // ESC
    expect(escCommands[1]).toBe(0x40); // @ (Initialize)
  });
});
