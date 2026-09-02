// ============================================================
// Tier 4 — Scenario 1: High-Volume Saturday Night Dinner Rush
// Features Exercised: F1.1 (Hierarchical Modifiers), F1.2 (Floor Operations),
// F2.1 (Live 86 Countdowns), F2.2 (Multi-Course Pacing), F2.3 (Dual Translation),
// F3.1 (Manager PIN Gatekeeper).
// ============================================================

import { describe, expect, it } from 'bun:test';
import { calculateCustomizedItemTotal, type ModifierGroup, type SelectedModifier } from '../tier1-features/f1_1_modifiers.test.js';
import { mergeTables, splitOrderBySeats, type TableNode, type FloorOrder } from '../tier1-features/f1_2_floor_map.test.js';
import { decrementLive86, type CountdownItem } from '../tier1-features/f2_1_live_86.test.js';
import { calculateCourseTimerColor, fireHeldCourse, initialHoldStatus } from '../tier1-features/f2_2_course_pacing.test.js';
import { formatDualLanguageKdsCard, translateLineItem } from '../tier1-features/f2_3_dual_translation.test.js';
import { hashPin, verifyPin } from '@culinaryos/server/lib/pin';

describe('Tier 4 — Scenario 1: High-Volume Saturday Night Dinner Rush', () => {
  const managerPinHash = hashPin('5678');

  it('executes full Saturday Night rush workflow from order creation to KDS pacing & 86 depletion', () => {
    // Phase A: Party of 6 seated at merged Tables 21 & 22
    const table21: TableNode = { id: 't-21', tableNumber: '21', section: 'Dining Room', capacity: 4, status: 'occupied', serverId: 'srv-sarah' };
    const table22: TableNode = { id: 't-22', tableNumber: '22', section: 'Dining Room', capacity: 4, status: 'occupied', serverId: 'srv-sarah' };
    const masterTable: TableNode = { id: 't-21-22M', tableNumber: '21-22', section: 'Dining Room', capacity: 8, status: 'available', serverId: 'srv-sarah' };

    const { updatedTables, mergedOrder } = mergeTables([table21, table22], masterTable, []);
    expect(updatedTables.find((t) => t.id === 't-21-22M')?.status).toBe('occupied');

    // Phase B: Custom modifier orders for Ribeye and Salmon with rare catch countdown
    const donenessGroup: ModifierGroup = {
      id: 'mg-temp',
      name: 'Steak Doneness',
      minSelections: 1,
      maxSelections: 1,
      freeQuantity: 1,
      required: true,
      modifiers: [],
    };
    const donenessSel: SelectedModifier = { id: 'm-rare', modifierGroupId: 'mg-temp', name: 'Rare', priceAdjustmentCents: 0, effectivePriceCents: 0 };
    const steakPrice = calculateCustomizedItemTotal(4800, [{ group: donenessGroup, selected: [donenessSel] }]);
    expect(steakPrice).toBe(4800);

    // Phase C: Limited Catch Halibut (only 2 left in kitchen)
    let halibutStock: CountdownItem = {
      id: 'item-halibut-rush',
      name: 'Wild Alaskan Halibut',
      status: 'available',
      countRemaining: 2,
      autoLockAtZero: true,
    };

    // First guest orders Halibut
    const step1 = decrementLive86(halibutStock, 1);
    halibutStock = step1.updatedItem;
    expect(halibutStock.countRemaining).toBe(1);
    expect(halibutStock.status).toBe('available');

    // Second guest orders Halibut (depleting inventory to 0 -> 86'd)
    const step2 = decrementLive86(halibutStock, 1);
    halibutStock = step2.updatedItem;
    expect(halibutStock.countRemaining).toBe(0);
    expect(halibutStock.status).toBe('86d');
    expect(step2.statusChangedTo86).toBe(true);

    // Third guest attempts to order Halibut -> BLOCKED
    const step3 = decrementLive86(halibutStock, 1);
    expect(step3.error).toContain("86'd");

    // Phase D: Course Pacing & Staging
    expect(initialHoldStatus(1)).toBe('firing'); // Appetizers fire immediately
    expect(initialHoldStatus(2)).toBe('held');   // Entrees held

    // Appetizers cooking: 8 minutes elapsed (Amber alert)
    expect(calculateCourseTimerColor(480)).toBe('amber');

    // Server fires Course 2 (Entrees)
    const c2Ticket = { id: 't-rush-c2', orderId: mergedOrder.id, courseNumber: 2, courseHoldStatus: 'held' as const };
    const fired = fireHeldCourse(c2Ticket, 'Server Sarah');
    expect(fired.ticket.courseHoldStatus).toBe('fired');

    // Phase E: Bilingual Kitchen Display Translation for Line Cooks
    const translatedEntree = translateLineItem('Ribeye Steak', ['Rare'], 'es');
    expect(translatedEntree.translatedPrimary).toBe('Ojo de Bife');
    expect(translatedEntree.modifiers[0].translatedPrimary).toBe('Poco Hecho');
    const card = formatDualLanguageKdsCard(translatedEntree);
    expect(card).toContain('Ojo de Bife (Ribeye Steak)');
    expect(card).toContain('* Poco Hecho');

    // Phase F: Manager Comp authorized via Manager PIN
    expect(verifyPin('5678', managerPinHash)).toBe(true);
  });
});
