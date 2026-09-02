// ============================================================
// Tier 2 — F1.1: Hierarchical Modifiers (Boundary & Corner Cases)
// Covers: 0 selections, max+1 overflow, negative adjustments,
// deep 4-level nesting, and zero base price with free modifiers.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  calculateCustomizedItemTotal,
  computeGroupModifierPrice,
  validateModifierSelection,
  type ModifierGroup,
  type SelectedModifier,
} from '../tier1-features/f1_1_modifiers.test.js';

describe('F1.1 Hierarchical Modifiers — Tier 2 Boundaries', () => {
  const optionalGroup: ModifierGroup = {
    id: 'mg-opt',
    name: 'Optional Garnish',
    minSelections: 0,
    maxSelections: 2,
    freeQuantity: 2,
    required: false,
    modifiers: [
      { id: 'm-parsley', name: 'Fresh Parsley', priceAdjustmentCents: 0 },
      { id: 'm-chives', name: 'Chives', priceAdjustmentCents: 0 },
    ],
  };

  it('1. permits 0 selections when minSelections is 0 for optional modifier groups', () => {
    const res = validateModifierSelection(optionalGroup, []);
    expect(res.valid).toBe(true);
    expect(computeGroupModifierPrice(optionalGroup, [])).toBe(0);
  });

  it('2. rejects exactly maxSelections + 1 boundary overflow', () => {
    const threeSelections: SelectedModifier[] = [
      { id: '1', modifierGroupId: 'mg-opt', name: 'Parsley', priceAdjustmentCents: 0, effectivePriceCents: 0 },
      { id: '2', modifierGroupId: 'mg-opt', name: 'Chives', priceAdjustmentCents: 0, effectivePriceCents: 0 },
      { id: '3', modifierGroupId: 'mg-opt', name: 'Cilantro', priceAdjustmentCents: 0, effectivePriceCents: 0 },
    ];
    const res = validateModifierSelection(optionalGroup, threeSelections);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('allows at most 2');
  });

  it('3. handles negative price adjustments (e.g. "No Cheese -$1.00" discount)', () => {
    const discountMod: SelectedModifier = {
      id: 'm-no-cheese',
      modifierGroupId: 'mg-discount',
      name: 'No Artisan Cheese',
      priceAdjustmentCents: -100, // -$1.00 discount
      effectivePriceCents: -100,
    };
    const discountGroup: ModifierGroup = {
      id: 'mg-discount',
      name: 'Deductions',
      minSelections: 0,
      maxSelections: 1,
      freeQuantity: 0,
      required: false,
      modifiers: [],
    };

    const cost = computeGroupModifierPrice(discountGroup, [discountMod]);
    expect(cost).toBe(-100);

    const total = calculateCustomizedItemTotal(1500, [{ group: discountGroup, selected: [discountMod] }]);
    expect(total).toBe(1400); // 1500 - 100 = 1400 ($14.00)
  });

  it('4. evaluates deep 4-level recursive nesting of choices without stack overflow', () => {
    const level4: SelectedModifier = { id: 'l4', modifierGroupId: 'g4', name: 'Extra Crispy Sear', priceAdjustmentCents: 50, effectivePriceCents: 50 };
    const level3: SelectedModifier = { id: 'l3', modifierGroupId: 'g3', name: 'Garlic Butter Crust', priceAdjustmentCents: 100, effectivePriceCents: 100, subModifiers: [level4] };
    const level2: SelectedModifier = { id: 'l2', modifierGroupId: 'g2', name: 'Truffle Glaze', priceAdjustmentCents: 200, effectivePriceCents: 200, subModifiers: [level3] };
    const level1: SelectedModifier = { id: 'l1', modifierGroupId: 'g1', name: 'Prime Rib Cap', priceAdjustmentCents: 500, effectivePriceCents: 500, subModifiers: [level2] };

    const rootGroup: ModifierGroup = { id: 'g1', name: 'Meat Customization', minSelections: 1, maxSelections: 1, freeQuantity: 0, required: true, modifiers: [] };
    const totalCost = computeGroupModifierPrice(rootGroup, [level1]);
    // 500 (L1) + 200 (L2) + 100 (L3) + 50 (L4) = 850 cents ($8.50)
    expect(totalCost).toBe(850);
  });

  it('5. handles $0 base price items with 100% free modifiers preserving $0 total', () => {
    const complimentaryGroup: ModifierGroup = {
      id: 'mg-comp',
      name: 'Bread Service',
      minSelections: 1,
      maxSelections: 2,
      freeQuantity: 2,
      required: true,
      modifiers: [],
    };
    const sel: SelectedModifier[] = [
      { id: 'b1', modifierGroupId: 'mg-comp', name: 'Warm Sourdough', priceAdjustmentCents: 0, effectivePriceCents: 0 },
      { id: 'b2', modifierGroupId: 'mg-comp', name: 'Whipped Butter', priceAdjustmentCents: 0, effectivePriceCents: 0 },
    ];
    const total = calculateCustomizedItemTotal(0, [{ group: complimentaryGroup, selected: sel }]);
    expect(total).toBe(0);
  });
});
