// ============================================================
// Tier 1 — F1.1: Hierarchical Modifiers (Granular Feature Tests)
// Covers: Min/Max constraints, nested modifiers, free allowance,
// upcharge computation, and validation rules.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface Modifier {
  id: string;
  name: string;
  priceAdjustmentCents: number;
  isDefault?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  freeQuantity: number;
  required: boolean;
  modifiers: Modifier[];
  nestedGroups?: ModifierGroup[];
}

export interface SelectedModifier {
  id: string;
  modifierGroupId: string;
  name: string;
  priceAdjustmentCents: number;
  effectivePriceCents: number;
  subModifiers?: SelectedModifier[];
}

export function validateModifierSelection(
  group: ModifierGroup,
  selected: SelectedModifier[]
): { valid: boolean; error?: string } {
  if (selected.length < group.minSelections) {
    return {
      valid: false,
      error: `Group "${group.name}" requires at least ${group.minSelections} selection(s), got ${selected.length}`,
    };
  }
  if (selected.length > group.maxSelections) {
    return {
      valid: false,
      error: `Group "${group.name}" allows at most ${group.maxSelections} selection(s), got ${selected.length}`,
    };
  }
  return { valid: true };
}

export function computeGroupModifierPrice(
  group: ModifierGroup,
  selected: SelectedModifier[]
): number {
  let totalCents = 0;
  const freeAllowance = group.freeQuantity ?? 0;

  selected.forEach((sel, index) => {
    let itemPrice = 0;
    if (index >= freeAllowance) {
      itemPrice = sel.priceAdjustmentCents;
    }
    sel.effectivePriceCents = itemPrice;
    totalCents += itemPrice;

    if (sel.subModifiers && sel.subModifiers.length > 0) {
      totalCents += sumSubModifiers(sel.subModifiers);
    }
  });

  return totalCents;
}

function sumSubModifiers(subs: SelectedModifier[]): number {
  let total = 0;
  for (const sub of subs) {
    sub.effectivePriceCents = sub.priceAdjustmentCents;
    total += sub.priceAdjustmentCents;
    if (sub.subModifiers && sub.subModifiers.length > 0) {
      total += sumSubModifiers(sub.subModifiers);
    }
  }
  return total;
}

export function calculateCustomizedItemTotal(
  basePriceCents: number,
  selections: { group: ModifierGroup; selected: SelectedModifier[] }[]
): number {
  let total = basePriceCents;
  for (const { group, selected } of selections) {
    const validation = validateModifierSelection(group, selected);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    total += computeGroupModifierPrice(group, selected);
  }
  return total;
}

describe('F1.1 Hierarchical Modifiers — Tier 1 Isolation', () => {
  const burgerSauceGroup: ModifierGroup = {
    id: 'mg-sauce',
    name: 'Sauces',
    minSelections: 1,
    maxSelections: 3,
    freeQuantity: 1,
    required: true,
    modifiers: [
      { id: 'm-ketchup', name: 'House Ketchup', priceAdjustmentCents: 50 },
      { id: 'm-truffle-mayo', name: 'Truffle Mayo', priceAdjustmentCents: 150 },
      { id: 'm-bbq', name: 'Smoked BBQ', priceAdjustmentCents: 75 },
    ],
  };

  const steakDonenessGroup: ModifierGroup = {
    id: 'mg-doneness',
    name: 'Meat Temperature',
    minSelections: 1,
    maxSelections: 1,
    freeQuantity: 1,
    required: true,
    modifiers: [
      { id: 'm-rare', name: 'Rare', priceAdjustmentCents: 0 },
      { id: 'm-med-rare', name: 'Medium Rare', priceAdjustmentCents: 0 },
      { id: 'm-well', name: 'Well Done', priceAdjustmentCents: 0 },
    ],
  };

  it('1. applies free allowance: first selection in group is $0, second incurs upcharge', () => {
    const selections: SelectedModifier[] = [
      { id: 'm-ketchup', modifierGroupId: 'mg-sauce', name: 'House Ketchup', priceAdjustmentCents: 50, effectivePriceCents: 0 },
      { id: 'm-truffle-mayo', modifierGroupId: 'mg-sauce', name: 'Truffle Mayo', priceAdjustmentCents: 150, effectivePriceCents: 0 },
    ];

    const groupPrice = computeGroupModifierPrice(burgerSauceGroup, selections);
    expect(selections[0].effectivePriceCents).toBe(0);
    expect(selections[1].effectivePriceCents).toBe(150);
    expect(groupPrice).toBe(150);
  });

  it('2. validates minSelections constraint: throws when fewer than min selected', () => {
    const emptySelections: SelectedModifier[] = [];
    const validation = validateModifierSelection(steakDonenessGroup, emptySelections);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('requires at least 1 selection');
  });

  it('3. validates maxSelections constraint: rejects when exceeding upper limit', () => {
    const excessSelections: SelectedModifier[] = [
      { id: 'm-ketchup', modifierGroupId: 'mg-sauce', name: 'House Ketchup', priceAdjustmentCents: 50, effectivePriceCents: 0 },
      { id: 'm-truffle-mayo', modifierGroupId: 'mg-sauce', name: 'Truffle Mayo', priceAdjustmentCents: 150, effectivePriceCents: 0 },
      { id: 'm-bbq', modifierGroupId: 'mg-sauce', name: 'Smoked BBQ', priceAdjustmentCents: 75, effectivePriceCents: 0 },
      { id: 'm-extra', modifierGroupId: 'mg-sauce', name: 'Extra Sauce', priceAdjustmentCents: 50, effectivePriceCents: 0 },
    ];
    const validation = validateModifierSelection(burgerSauceGroup, excessSelections);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('allows at most 3 selection');
  });

  it('4. computes nested sub-modifiers with nested upcharges correctly', () => {
    const sideSelection: SelectedModifier = {
      id: 'm-loaded-fries',
      modifierGroupId: 'mg-side',
      name: 'Loaded Fries',
      priceAdjustmentCents: 300,
      effectivePriceCents: 300,
      subModifiers: [
        { id: 'sub-bacon', modifierGroupId: 'mg-fries-toppings', name: 'Crispy Bacon', priceAdjustmentCents: 150, effectivePriceCents: 150 },
        { id: 'sub-cheese', modifierGroupId: 'mg-fries-toppings', name: 'Aged Cheddar Melt', priceAdjustmentCents: 100, effectivePriceCents: 100 },
      ],
    };

    const sideGroup: ModifierGroup = {
      id: 'mg-side',
      name: 'Side Options',
      minSelections: 1,
      maxSelections: 1,
      freeQuantity: 0,
      required: true,
      modifiers: [],
    };

    const cost = computeGroupModifierPrice(sideGroup, [sideSelection]);
    // 300 base + 150 sub + 100 sub = 550
    expect(cost).toBe(550);
  });

  it('5. calculates complete customized item total with base price + nested modifiers', () => {
    const basePriceCents = 1800; // $18.00 Artisan Burger
    const donenessSel: SelectedModifier[] = [
      { id: 'm-med-rare', modifierGroupId: 'mg-doneness', name: 'Medium Rare', priceAdjustmentCents: 0, effectivePriceCents: 0 },
    ];
    const sauceSel: SelectedModifier[] = [
      { id: 'm-ketchup', modifierGroupId: 'mg-sauce', name: 'House Ketchup', priceAdjustmentCents: 50, effectivePriceCents: 0 },
      { id: 'm-truffle-mayo', modifierGroupId: 'mg-sauce', name: 'Truffle Mayo', priceAdjustmentCents: 150, effectivePriceCents: 0 },
    ];

    const total = calculateCustomizedItemTotal(basePriceCents, [
      { group: steakDonenessGroup, selected: donenessSel },
      { group: burgerSauceGroup, selected: sauceSel },
    ]);

    // Base 1800 + Doneness (0) + Sauce (0 + 150) = 1950 ($19.50)
    expect(total).toBe(1950);
  });
});
