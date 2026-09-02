// ============================================================
// Tier 1 — F3.2: Post-Send Void Auto-Waste (Granular Feature Tests)
// Covers: Pre-send cancellation vs post-send voids, auto-waste event
// generation for cooked items, inventory loss calculation, and reason codes.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface VoidItemRequest {
  orderId: string;
  lineItemId: string;
  itemName: string;
  unitPriceCents: number;
  ingredientId?: string;
  costCents: number;
  orderStatus: 'open' | 'sent' | 'in-progress' | 'ready' | 'served';
  isCooked: boolean;
  reasonCode: 'customer_change' | 'kitchen_error' | 'damaged' | 'spill';
  managerPinVerified: boolean;
}

export interface VoidItemResult {
  success: boolean;
  itemVoided: boolean;
  wasteEventCreated: boolean;
  wasteDollarLossCents: number;
  auditTrail: {
    lineItemId: string;
    reason: string;
    isCooked: boolean;
    timestamp: string;
  };
}

export function processItemVoid(req: VoidItemRequest): VoidItemResult {
  if (req.orderStatus !== 'open' && !req.managerPinVerified) {
    throw new Error('Manager PIN required to void item after order has been sent to kitchen');
  }

  const isPostSend = req.orderStatus !== 'open';
  const shouldCreateWaste = isPostSend && req.isCooked;

  return {
    success: true,
    itemVoided: true,
    wasteEventCreated: shouldCreateWaste,
    wasteDollarLossCents: shouldCreateWaste ? req.costCents : 0,
    auditTrail: {
      lineItemId: req.lineItemId,
      reason: req.reasonCode,
      isCooked: req.isCooked,
      timestamp: new Date().toISOString(),
    },
  };
}

describe('F3.2 Post-Send Void Auto-Waste — Tier 1 Isolation', () => {
  it('1. performs pre-send item removal with 0 waste generation (order still open)', () => {
    const res = processItemVoid({
      orderId: 'ord-101',
      lineItemId: 'li-01',
      itemName: 'New York Strip',
      unitPriceCents: 4200,
      costCents: 1400,
      orderStatus: 'open',
      isCooked: false,
      reasonCode: 'customer_change',
      managerPinVerified: false,
    });
    expect(res.success).toBe(true);
    expect(res.itemVoided).toBe(true);
    expect(res.wasteEventCreated).toBe(false);
    expect(res.wasteDollarLossCents).toBe(0);
  });

  it('2. generates automated waste event and logs dollar loss when post-send cooked item is voided', () => {
    const res = processItemVoid({
      orderId: 'ord-102',
      lineItemId: 'li-02',
      itemName: 'Roasted Duck Breast',
      unitPriceCents: 3600,
      costCents: 1200, // $12.00 food cost
      orderStatus: 'sent',
      isCooked: true,
      reasonCode: 'kitchen_error',
      managerPinVerified: true,
    });
    expect(res.success).toBe(true);
    expect(res.wasteEventCreated).toBe(true);
    expect(res.wasteDollarLossCents).toBe(1200);
    expect(res.auditTrail.reason).toBe('kitchen_error');
  });

  it('3. voids post-send un-cooked item without waste debit (ticket voided before firing)', () => {
    const res = processItemVoid({
      orderId: 'ord-103',
      lineItemId: 'li-03',
      itemName: 'Draft Beer',
      unitPriceCents: 800,
      costCents: 150,
      orderStatus: 'sent',
      isCooked: false,
      reasonCode: 'customer_change',
      managerPinVerified: true,
    });
    expect(res.success).toBe(true);
    expect(res.wasteEventCreated).toBe(false);
    expect(res.wasteDollarLossCents).toBe(0);
  });

  it('4. blocks post-send item void if manager PIN verification is missing', () => {
    expect(() => {
      processItemVoid({
        orderId: 'ord-104',
        lineItemId: 'li-04',
        itemName: 'Lamb Chops',
        unitPriceCents: 4800,
        costCents: 1800,
        orderStatus: 'sent',
        isCooked: true,
        reasonCode: 'spill',
        managerPinVerified: false,
      });
    }).toThrow('Manager PIN required');
  });

  it('5. records full audit trail metadata for compliance and loss tracking', () => {
    const res = processItemVoid({
      orderId: 'ord-105',
      lineItemId: 'li-05',
      itemName: 'Salmon Tartare',
      unitPriceCents: 2200,
      costCents: 750,
      orderStatus: 'in-progress',
      isCooked: true,
      reasonCode: 'damaged',
      managerPinVerified: true,
    });
    expect(res.auditTrail.lineItemId).toBe('li-05');
    expect(res.auditTrail.isCooked).toBe(true);
    expect(res.auditTrail.timestamp).toBeDefined();
  });
});
