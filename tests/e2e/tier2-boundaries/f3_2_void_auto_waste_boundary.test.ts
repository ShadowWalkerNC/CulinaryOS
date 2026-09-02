// ============================================================
// Tier 2 — F3.2: Post-Send Void Auto-Waste (Boundary & Corner Cases)
// Covers: $0 cost items, voiding served dishes, ready-at-pass voids,
// zero dollar loss, and reason code persistence.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  processItemVoid,
  type VoidItemRequest,
} from '../tier1-features/f3_2_void_auto_waste.test.js';

describe('F3.2 Void Auto-Waste — Tier 2 Boundaries', () => {
  it('1. voids $0 cost complimentary items without producing negative or invalid waste cost', () => {
    const req: VoidItemRequest = {
      orderId: 'ord-comp',
      lineItemId: 'li-water',
      itemName: 'Ice Water with Lemon',
      unitPriceCents: 0,
      costCents: 0,
      orderStatus: 'sent',
      isCooked: true,
      reasonCode: 'spill',
      managerPinVerified: true,
    };
    const res = processItemVoid(req);
    expect(res.success).toBe(true);
    expect(res.wasteEventCreated).toBe(true);
    expect(res.wasteDollarLossCents).toBe(0);
  });

  it('2. allows voiding items in "ready" at expo pass stage with waste debit', () => {
    const req: VoidItemRequest = {
      orderId: 'ord-expo',
      lineItemId: 'li-steak',
      itemName: 'Tomahawk Ribeye',
      unitPriceCents: 9500,
      costCents: 3800,
      orderStatus: 'ready',
      isCooked: true,
      reasonCode: 'customer_change', // Customer walked out before food ran to table
      managerPinVerified: true,
    };
    const res = processItemVoid(req);
    expect(res.wasteEventCreated).toBe(true);
    expect(res.wasteDollarLossCents).toBe(3800);
  });

  it('3. allows voiding items in "served" stage (e.g. food sent back after guest tasted it)', () => {
    const req: VoidItemRequest = {
      orderId: 'ord-served',
      lineItemId: 'li-soup',
      itemName: 'French Onion Soup',
      unitPriceCents: 1400,
      costCents: 350,
      orderStatus: 'served',
      isCooked: true,
      reasonCode: 'damaged',
      managerPinVerified: true,
    };
    const res = processItemVoid(req);
    expect(res.wasteEventCreated).toBe(true);
    expect(res.wasteDollarLossCents).toBe(350);
  });

  it('4. prevents non-manager staff from voiding cooked dishes at served stage', () => {
    const req: VoidItemRequest = {
      orderId: 'ord-unauth',
      lineItemId: 'li-duck',
      itemName: 'Duck Confit',
      unitPriceCents: 3200,
      costCents: 1100,
      orderStatus: 'served',
      isCooked: true,
      reasonCode: 'customer_change',
      managerPinVerified: false,
    };
    expect(() => {
      processItemVoid(req);
    }).toThrow('Manager PIN required');
  });

  it('5. captures reason code "spill" for floor drop waste events', () => {
    const req: VoidItemRequest = {
      orderId: 'ord-spill',
      lineItemId: 'li-pasta',
      itemName: 'Truffle Fettuccine',
      unitPriceCents: 2600,
      costCents: 600,
      orderStatus: 'in-progress',
      isCooked: true,
      reasonCode: 'spill',
      managerPinVerified: true,
    };
    const res = processItemVoid(req);
    expect(res.auditTrail.reason).toBe('spill');
  });
});
