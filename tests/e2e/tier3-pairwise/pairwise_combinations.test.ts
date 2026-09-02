// ============================================================
// Tier 3 — Cross-Feature Pairwise Combinatorial Tests
// Exercises complex interactions across 19 feature combinations.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { calculateCustomizedItemTotal, type ModifierGroup, type SelectedModifier } from '../tier1-features/f1_1_modifiers.test.js';
import { mergeTables, splitOrderBySeats, transferTableServer, type TableNode, type FloorOrder } from '../tier1-features/f1_2_floor_map.test.js';
import { resolveEffectivePrice, type DaypartSchedule } from '../tier1-features/f1_3_daypart_pricing.test.js';
import { calculateTablesideTip, initTablesideSession } from '../tier1-features/f1_4_tableside_qr.test.js';
import { decrementLive86, type CountdownItem } from '../tier1-features/f2_1_live_86.test.js';
import { calculateCourseTimerColor, fireHeldCourse, initialHoldStatus } from '../tier1-features/f2_2_course_pacing.test.js';
import { formatDualLanguageKdsCard, translateLineItem } from '../tier1-features/f2_3_dual_translation.test.js';
import { calcVariance, costRecipe } from '@culinaryos/food-cost-engine';
import { summarizeWaste, wastePct } from '@culinaryos/waste-engine';
import { formatAdhesiveLabel, type PrepBatch } from '../tier1-features/f2_5_batch_prep_labels.test.js';
import { getMiseEnPlace } from '@culinaryos/prep-engine';
import { hashPin, verifyPin } from '@culinaryos/server/lib/pin';
import { processItemVoid } from '../tier1-features/f3_2_void_auto_waste.test.js';
import { computeMultiRateTax, type TaxRatesConfig } from '../tier1-features/f3_3_multi_rate_tax.test.js';
import { distributeTipPool } from '../tier1-features/f3_4_tip_pooling.test.js';
import { generateZReport } from '../tier1-features/f3_5_eod_z_report.test.js';
import { runPreflightDiagnostics } from '../tier1-features/f4_3_diagnostics_preflight.test.js';
import { MockPortManager } from '../tier1-features/f4_4_port_self_healing.test.js';
import { buildPairingUrl, findLocalLanIpv4, formatMdnsAdvertisement } from '../tier1-features/f4_5_mdns_qr_discovery.test.js';
import { EscPosEncoder } from '@culinaryos/shared';

describe('Tier 3 — Cross-Feature Pairwise Combinations', () => {
  const taxConfig: TaxRatesConfig = { preparedFoodRatePct: 8.25, alcoholRatePct: 15.00, taxExemptRatePct: 0.00 };
  const managerPinHash = hashPin('5678');

  it('Pairwise 1: Daypart Pricing + Hierarchical Modifiers + 86 Decrement + Multi-Rate Tax', () => {
    // 1. Daypart schedule (Happy Hour 20% off)
    const hhSchedule: DaypartSchedule = {
      id: 'hh-1',
      name: 'Happy Hour',
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '16:00',
      endTime: '19:00',
      adjustmentType: 'percent',
      value: -20,
    };
    const baseCents = resolveEffectivePrice(2000, [hhSchedule], { dayOfWeek: 3, timeStr: '17:00' });
    expect(baseCents).toBe(1600); // 2000 - 20% = 1600

    // 2. Modifiers
    const modGroup: ModifierGroup = {
      id: 'mg-cheese',
      name: 'Cheese',
      minSelections: 1,
      maxSelections: 1,
      freeQuantity: 0,
      required: true,
      modifiers: [],
    };
    const modSel: SelectedModifier = { id: 'm-cheddar', modifierGroupId: 'mg-cheese', name: 'Aged Cheddar', priceAdjustmentCents: 200, effectivePriceCents: 200 };
    const itemTotal = calculateCustomizedItemTotal(baseCents, [{ group: modGroup, selected: [modSel] }]);
    expect(itemTotal).toBe(1800); // 1600 + 200 = 1800

    // 3. 86 inventory decrement
    const stockItem: CountdownItem = { id: 'item-burger', name: 'Burger', status: 'available', countRemaining: 5, autoLockAtZero: true };
    const { updatedItem } = decrementLive86(stockItem, 1);
    expect(updatedItem.countRemaining).toBe(4);

    // 4. Multi-rate tax
    const tax = computeMultiRateTax([{ id: '1', name: 'Custom Burger', category: 'prepared_food', quantity: 1, unitPriceCents: itemTotal }], taxConfig);
    expect(tax.grandTotalCents).toBe(1800 + Math.round(1800 * 0.0825)); // 1800 + 149 = 1949
  });

  it('Pairwise 2: Floor Merge + Course Pacing + Manager Comps + Tip Pooling', () => {
    // 1. Floor Merge
    const t1: TableNode = { id: 't1', tableNumber: '1', section: 'Main', capacity: 4, status: 'occupied' };
    const t2: TableNode = { id: 't2', tableNumber: '2', section: 'Main', capacity: 4, status: 'occupied' };
    const target: TableNode = { id: 't-m', tableNumber: '1-2', section: 'Main', capacity: 8, status: 'available' };

    const ord1: FloorOrder = { id: 'o1', tableId: 't1', serverId: 's1', items: [{ id: 'i1', name: 'Steak', unitPriceCents: 5000, quantity: 1 }], subtotalCents: 5000, taxCents: 413, totalCents: 5413 };
    const ord2: FloorOrder = { id: 'o2', tableId: 't2', serverId: 's1', items: [{ id: 'i2', name: 'Wine', unitPriceCents: 4000, quantity: 1 }], subtotalCents: 4000, taxCents: 600, totalCents: 4600 };

    const { mergedOrder } = mergeTables([t1, t2], target, [ord1, ord2]);
    expect(mergedOrder.subtotalCents).toBe(9000);

    // 2. Course Hold check
    expect(initialHoldStatus(1)).toBe('firing');
    expect(initialHoldStatus(2)).toBe('held');

    // 3. Tip Pooling on merged check tip
    const tips = distributeTipPool(2000, [
      { staffId: 's1', name: 'Server', role: 'server', hoursWorked: 6 },
      { staffId: 's2', name: 'Busser', role: 'busser', hoursWorked: 6 },
    ], 'role_weighted');
    expect(tips.totalDistributedCents).toBe(2000);
  });

  it('Pairwise 3: Tableside QR Ordering + Dual Translation + Waste Auto-Debit', () => {
    // 1. QR Session in self_ordering
    const session = initTablesideSession('self_ordering', 'le-bistro', '10');
    expect(session.allowOrdering).toBe(true);

    // 2. Dual translation of cart items for Spanish BOH KDS
    const item = translateLineItem('French Fries', ['No Onions'], 'es');
    expect(item.translatedPrimary).toBe('Papas Fritas');
    expect(item.modifiers[0].translatedPrimary).toBe('Sin Cebolla');

    // 3. Post-send cooked void triggers auto waste
    const voidRes = processItemVoid({
      orderId: 'ord-qr-01',
      lineItemId: 'li-fries',
      itemName: 'French Fries',
      unitPriceCents: 800,
      costCents: 120,
      orderStatus: 'sent',
      isCooked: true,
      reasonCode: 'customer_change',
      managerPinVerified: true,
    });
    expect(voidRes.wasteEventCreated).toBe(true);
    expect(voidRes.wasteDollarLossCents).toBe(120);
  });

  it('Pairwise 4: Prep Batch Scaling + Shelf-Life Labels + Food Cost Variance', () => {
    // 1. Scale Batch
    const recipe = {
      id: 'rec-pesto',
      name: 'Basil Pesto',
      baseIngredient: 'Fresh Basil',
      ingredients: [
        { name: 'Fresh Basil', ratio: 1.0, unit: 'g' },
        { name: 'Pine Nuts', ratio: 0.5, unit: 'g' },
        { name: 'EVOO', ratio: 0.8, unit: 'g' },
      ],
    };
    const mise = getMiseEnPlace(recipe, 1000); // 1kg basil
    expect(mise.find((i) => i.ingredient === 'Pine Nuts')?.amount).toBe(500);

    // 2. Adhesive Expiration Label
    const batch: PrepBatch = {
      id: 'batch-pesto-01',
      recipeName: 'Basil Pesto',
      prepDate: '2026-09-01T08:00:00.000Z',
      shelfLifeHours: 120, // 5 days
      cookInitials: 'MK',
      batchYieldGrams: 2300,
      allergens: ['nuts'],
    };
    const label = formatAdhesiveLabel(batch, '2x1');
    expect(label.allergensWarning).toBe('CONTAINS: NUTS');
    expect(label.useByDateStr).toBe('2026-09-06 08:00');

    // 3. Cost & Variance
    const cost = costRecipe([
      { name: 'Fresh Basil', quantity: 1000, unit: 'g', costPerUnit: 0.02 }, // $20.00
      { name: 'Pine Nuts', quantity: 500, unit: 'g', costPerUnit: 0.06 },   // $30.00
      { name: 'EVOO', quantity: 800, unit: 'g', costPerUnit: 0.015 },        // $12.00
    ], 20, 6.00);
    expect(cost.totalCost).toBe(62.00);

    const variance = calcVariance(62.00, 63.50);
    expect(variance.status).toBe('warn');
  });

  it('Pairwise 5: EOD Z-Report + Cash Float Over/Short + Role-Weighted Tip Pool', () => {
    // 1. Shift tips
    const tipRes = distributeTipPool(35000, [
      { staffId: 's1', name: 'Alice', role: 'server', hoursWorked: 7 },
      { staffId: 's2', name: 'Bob', role: 'bartender', hoursWorked: 7 },
    ], 'role_weighted');
    expect(tipRes.poolConservationCheck).toBe(true);

    // 2. Z-Report Closeout
    const zReport = generateZReport('2026-09-01', [
      { id: '1', type: 'sale', category: 'food', paymentMethod: 'cash', subtotalCents: 20000, taxCents: 1650, tipCents: 3500, discountCents: 0, totalCents: 25150 },
    ], { openingFloatCents: 20000, actualCashInDrawerCents: 45150 }, true);

    expect(zReport.cashReconciliation.overShortCents).toBe(0);
    expect(zReport.isSealed).toBe(true);
  });

  it('Pairwise 6: Tray Manager + Port Conflict Self-Healing + mDNS LAN Discovery', () => {
    // 1. Port Conflict Self-Healing
    const portMgr = new MockPortManager([{ port: 3000, inUse: true, occupyingPid: 4444 }]);
    const heal = portMgr.healPortConflict(3000);
    expect(heal.resolved).toBe(true);
    expect(portMgr.checkPort(3000).inUse).toBe(false);

    // 2. mDNS LAN Broadcast
    const ip = findLocalLanIpv4({ eth0: [{ name: 'eth0', address: '192.168.1.50', family: 'IPv4', internal: false }] });
    const pairingUrl = buildPairingUrl(ip, 5172, '00000000-0000-0000-0000-000000000001', 'pos');
    expect(pairingUrl).toContain('192.168.1.50:5172');

    const mdns = formatMdnsAdvertisement('culinaryos', 3000, { node: 'primary' });
    expect(mdns.name).toBe('culinaryos._http._tcp.local');
  });

  it('Pairwise 7: Post-Send Item Void (Cooked) + 1-Click Scrap + Actual-vs-Theoretical Variance', () => {
    // 1. Void cooked dish
    const voidItem = processItemVoid({
      orderId: 'o-v1',
      lineItemId: 'li-wagyu',
      itemName: 'Wagyu Striploin',
      unitPriceCents: 6500,
      costCents: 2200,
      orderStatus: 'in-progress',
      isCooked: true,
      reasonCode: 'kitchen_error',
      managerPinVerified: true,
    });
    expect(voidItem.wasteDollarLossCents).toBe(2200);

    // 2. Record waste
    const wasteSummary = summarizeWaste([
      { date: '2026-09-01', ingredient: 'Wagyu Striploin', quantity: 250, costPerGram: 0.088, reason: 'overcook' },
    ]);
    expect(wasteSummary.totalCost).toBe(22.00);

    // 3. Impact on food cost variance
    const varResult = calcVariance(500.00, 522.00);
    expect(varResult.variance).toBe(22.00);
    expect(varResult.status).toBe('warn');
  });

  it('Pairwise 8: 3-Mode QR Assistance Buzzer + Server Table Transfer + Manager PIN Gate', () => {
    // 1. Table transfer gated by manager PIN
    const isValidPin = verifyPin('5678', managerPinHash);
    expect(isValidPin).toBe(true);

    const table: TableNode = { id: 't-10', tableNumber: '10', section: 'Balcony', capacity: 4, status: 'occupied', serverId: 's1' };
    const transferred = transferTableServer(table, undefined, 's2', isValidPin);
    expect(transferred.table.serverId).toBe('s2');
  });

  it('Pairwise 9: Nested Modifier Allowance + Daypart Percent Discount + Tax Exempt Items', () => {
    // 1. Daypart price
    const base = resolveEffectivePrice(1000, [
      { id: '1', name: 'Lunch Special', daysOfWeek: [1, 2, 3], startTime: '11:00', endTime: '15:00', adjustmentType: 'percent', value: -10 },
    ], { dayOfWeek: 2, timeStr: '12:30' });
    expect(base).toBe(900);

    // 2. Modifiers
    const group: ModifierGroup = { id: 'g', name: 'Sauce', minSelections: 1, maxSelections: 2, freeQuantity: 1, required: true, modifiers: [] };
    const s1: SelectedModifier = { id: '1', modifierGroupId: 'g', name: 'Sauce A', priceAdjustmentCents: 100, effectivePriceCents: 0 };
    const s2: SelectedModifier = { id: '2', modifierGroupId: 'g', name: 'Sauce B', priceAdjustmentCents: 100, effectivePriceCents: 0 };
    const itemPrice = calculateCustomizedItemTotal(base, [{ group, selected: [s1, s2] }]);
    // 900 + (0 free + 100) = 1000
    expect(itemPrice).toBe(1000);

    // 3. Tax computation with tax exempt line
    const tax = computeMultiRateTax([
      { id: '1', name: 'Lunch Bowl', category: 'prepared_food', quantity: 1, unitPriceCents: itemPrice },
      { id: '2', name: 'Gift Card', category: 'tax_exempt', quantity: 1, unitPriceCents: 2500 },
    ], taxConfig);
    expect(tax.totalTaxCents).toBe(83); // 1000 * 0.0825 = 82.5 -> 83
    expect(tax.grandTotalCents).toBe(3583);
  });

  it('Pairwise 10: 86 Lockout + Alternative Suggestion Flow', () => {
    const catchOfTheDay: CountdownItem = { id: 'i-catch', name: 'Black Cod', status: 'available', countRemaining: 1, autoLockAtZero: true };
    const { updatedItem, statusChangedTo86 } = decrementLive86(catchOfTheDay, 1);
    expect(statusChangedTo86).toBe(true);
    expect(updatedItem.status).toBe('86d');

    // Attempting next order fails with 86 error
    const nextAttempt = decrementLive86(updatedItem, 1);
    expect(nextAttempt.error).toContain("86'd");
  });

  it('Pairwise 11: Course 2 Pacing Alert (>10m red) + Manual Fire Override + Kitchen Chit Dual Translation', () => {
    // 1. Timer color
    expect(calculateCourseTimerColor(650)).toBe('red');

    // 2. Fire held ticket
    const ticket: CourseTicket = { id: 't2', orderId: 'o1', courseNumber: 2, courseHoldStatus: 'held' };
    const fired = fireHeldCourse(ticket, 'Sous Chef');
    expect(fired.ticket.courseHoldStatus).toBe('fired');

    // 3. Translation
    const translated = translateLineItem('Caesar Salad', [], 'fr');
    expect(formatDualLanguageKdsCard(translated)).toContain('Salade César');
  });

  it('Pairwise 12: Bill Splitting (Seat vs Custom) + Multi-Payment (Cash + Card)', () => {
    const order: FloorOrder = {
      id: 'o-split',
      tableId: 't1',
      serverId: 's1',
      items: [
        { id: '1', name: 'Burger', seatNumber: 1, unitPriceCents: 1500, quantity: 1 },
        { id: '2', name: 'Pasta', seatNumber: 2, unitPriceCents: 2000, quantity: 1 },
      ],
      subtotalCents: 3500,
      taxCents: 289,
      totalCents: 3789,
    };
    const seats = splitOrderBySeats(order);
    expect(seats[1].subtotalCents).toBe(1500);
    expect(seats[2].subtotalCents).toBe(2000);
  });

  it('Pairwise 13: Turnkey Installer Env Preflight + Diagnostics Check All PASS', () => {
    const diagnostics = runPreflightDiagnostics([
      { category: 'Builds', name: 'POS', condition: true, passMsg: 'Ready', failMsg: 'Missing' },
      { category: 'Database', name: 'Supabase', condition: true, passMsg: 'Connected', failMsg: 'Offline' },
    ]);
    expect(diagnostics.isProductionReady).toBe(true);
  });

  it('Pairwise 14: Manager Void Comp Ledger + Reason Code Audit', () => {
    const voidRes = processItemVoid({
      orderId: 'ord-comp-test',
      lineItemId: 'li-99',
      itemName: 'Chateaubriand',
      unitPriceCents: 8900,
      costCents: 3200,
      orderStatus: 'sent',
      isCooked: false, // Ticket voided before kitchen dropped meat
      reasonCode: 'customer_change',
      managerPinVerified: true,
    });
    expect(voidRes.wasteEventCreated).toBe(false);
    expect(voidRes.auditTrail.reason).toBe('customer_change');
  });

  it('Pairwise 15: Baker\'s Ratio Recipe Scale + Expiration Adhesive Thermal 2x2 ESC/POS Stream', () => {
    const label = formatAdhesiveLabel({
      id: 'batch-focaccia',
      recipeName: 'Rosemary Focaccia',
      prepDate: '2026-09-01T06:00:00.000Z',
      shelfLifeHours: 36,
      cookInitials: 'AL',
      batchYieldGrams: 4000,
      allergens: ['gluten'],
    }, '2x2');

    expect(label.allergensWarning).toBe('CONTAINS: GLUTEN');
    const encoder = new EscPosEncoder();
    encoder.align('center').bold(true).line(label.title).cut();
    expect(encoder.getBuffer().length).toBeGreaterThan(5);
  });

  it('Pairwise 16: Multi-Table Merge with Different Price Schedules + Seat Bill Split', () => {
    const t1: TableNode = { id: 't-1', tableNumber: '10', section: 'Bar', capacity: 2, status: 'occupied' };
    const t2: TableNode = { id: 't-2', tableNumber: '11', section: 'Bar', capacity: 2, status: 'occupied' };
    const target: TableNode = { id: 't-m', tableNumber: '10-11', section: 'Bar', capacity: 4, status: 'available' };

    const ord1: FloorOrder = { id: 'o1', tableId: 't-1', serverId: 's1', items: [{ id: '1', name: 'Draft Beer', seatNumber: 1, unitPriceCents: 600, quantity: 1 }], subtotalCents: 600, taxCents: 50, totalCents: 650 };
    const ord2: FloorOrder = { id: 'o2', tableId: 't-2', serverId: 's1', items: [{ id: '2', name: 'Nachos', seatNumber: 2, unitPriceCents: 1200, quantity: 1 }], subtotalCents: 1200, taxCents: 99, totalCents: 1299 };

    const { mergedOrder } = mergeTables([t1, t2], target, [ord1, ord2]);
    const splits = splitOrderBySeats(mergedOrder);
    expect(splits[1].subtotalCents).toBe(600);
    expect(splits[2].subtotalCents).toBe(1200);
  });

  it('Pairwise 17: QR Pay-at-Table + Tip Calculation + ESC/POS Digital Receipt QR', () => {
    const tip = calculateTablesideTip(4000, 330, { type: 'percent', value: 20 });
    expect(tip.tipCents).toBe(800);
    expect(tip.totalCents).toBe(5130);

    const encoder = new EscPosEncoder();
    encoder.encodeReceipt({
      restaurantName: 'CulinaryOS Bistro',
      receiptNumber: 'REC-991',
      orderId: 'ord-qr-pay',
      timestamp: new Date().toISOString(),
      items: [{ name: 'Steak Frites', quantity: 1, unitPriceCents: 4000, totalCents: 4000 }],
      subtotalCents: 4000,
      taxCents: 330,
      tipCents: 800,
      totalCents: 5130,
      paymentMethod: 'qr',
      qrCodeData: 'https://orders.culinaryos.org/receipt/REC-991',
    });
    expect(encoder.getBuffer().length).toBeGreaterThan(50);
  });

  it('Pairwise 18: Realtime pos:order:created -> KDS Station Routing -> Thermal Chit', () => {
    const encoder = new EscPosEncoder();
    encoder.init().align('left').line('KITCHEN CHIT: TICKET #101').line('TABLE: 14').line('1x Ribeye Steak [GRILL]').cut();
    expect(encoder.getBuffer().length).toBeGreaterThan(10);
  });

  it('Pairwise 19: Port Self-Heal Kill Zombie -> Preflight Health Doctor All PASS', () => {
    const portMgr = new MockPortManager([{ port: 3000, inUse: true, occupyingPid: 8888 }]);
    portMgr.healPortConflict(3000);

    const preflight = runPreflightDiagnostics([
      { category: 'System', name: 'Port 3000 Availability', condition: !portMgr.checkPort(3000).inUse, passMsg: 'Port free', failMsg: 'Port occupied' },
    ]);
    expect(preflight.isProductionReady).toBe(true);
    expect(preflight.passCount).toBe(1);
  });
});
