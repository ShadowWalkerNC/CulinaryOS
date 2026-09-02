import { describe, expect, it } from 'bun:test';
import {
  calculateModifierGroupPrices,
  calculateItemPrice,
  calculateTotalModifierUpcharge,
  validateModifierSelections,
  buildSelectedModifierTree,
  flattenSelectedModifiers,
  type ModifierGroup,
} from '@culinaryos/shared';

describe('Hierarchical & Nested Modifiers Engine (F1.1)', () => {
  const pizzaCrustGroup: ModifierGroup = {
    id: 'grp-crust',
    name: 'Crust Selection',
    required: true,
    minSelections: 1,
    maxSelections: 1,
    freeQuantity: 0,
    modifiers: [
      { id: 'mod-thin', name: 'Thin & Crispy', priceAdjustmentCents: 0, isDefault: true },
      { id: 'mod-stuffed', name: 'Cheese Stuffed Crust', priceAdjustmentCents: 350 },
    ],
  };

  const pizzaToppingsGroup: ModifierGroup = {
    id: 'grp-toppings',
    name: 'Gourmet Toppings',
    required: false,
    minSelections: 0,
    maxSelections: 4,
    freeQuantity: 2, // First 2 toppings are FREE ($0.00)
    modifiers: [
      {
        id: 'mod-pepperoni',
        name: 'Artisan Pepperoni',
        priceAdjustmentCents: 200,
        nestedGroups: [
          {
            id: 'grp-pep-prep',
            name: 'Pepperoni Prep Style',
            required: false,
            minSelections: 0,
            maxSelections: 1,
            modifiers: [
              { id: 'mod-pep-crispy', name: 'Extra Crispy Cup & Char', priceAdjustmentCents: 50 },
            ],
          },
        ],
      },
      { id: 'mod-mushrooms', name: 'Wild Mushrooms', priceAdjustmentCents: 150 },
      { id: 'mod-olives', name: 'Kalamata Olives', priceAdjustmentCents: 100 },
      { id: 'mod-truffle', name: 'Black Truffle Drizzle', priceAdjustmentCents: 400 },
    ],
  };

  it('1. applies First-N Free calculation correctly across group selections', () => {
    // Select 3 toppings with prices: 200, 150, 400.
    // First 2 selections are free ($0.00), 3rd selection incurs price.
    const selectedIds = ['mod-pepperoni', 'mod-mushrooms', 'mod-truffle'];
    const results = calculateModifierGroupPrices(pizzaToppingsGroup, selectedIds);

    expect(results).toHaveLength(3);
    expect(results[0].modifierId).toBe('mod-pepperoni');
    expect(results[0].isFree).toBe(true);
    expect(results[0].effectivePriceCents).toBe(0);

    expect(results[1].modifierId).toBe('mod-mushrooms');
    expect(results[1].isFree).toBe(true);
    expect(results[1].effectivePriceCents).toBe(0);

    expect(results[2].modifierId).toBe('mod-truffle');
    expect(results[2].isFree).toBe(false);
    expect(results[2].effectivePriceCents).toBe(400);
  });

  it('2. calculates total upcharge including nested modifier groups', () => {
    const selectedTree = buildSelectedModifierTree([pizzaCrustGroup, pizzaToppingsGroup], {
      'grp-crust': ['mod-stuffed'], // +350
      'grp-toppings': ['mod-pepperoni', 'mod-mushrooms', 'mod-truffle'], // First 2 free, +400
      'grp-pep-prep': ['mod-pep-crispy'], // +50 nested
    });

    const upcharge = calculateTotalModifierUpcharge(selectedTree);
    // 350 + 0 + 0 + 400 + 50 = 800 cents ($8.00)
    expect(upcharge).toBe(800);

    const basePriceCents = 1600; // $16.00 Base Pizza
    const totalItemPrice = calculateItemPrice(basePriceCents, selectedTree, 2);
    // (1600 + 800) * 2 = 4800 ($48.00)
    expect(totalItemPrice).toBe(4800);
  });

  it('3. validates min/max rules and required constraints', () => {
    // Missing required crust selection
    const invalidValidation = validateModifierSelections([pizzaCrustGroup, pizzaToppingsGroup], {
      'grp-toppings': ['mod-pepperoni'],
    });
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.errors.length).toBeGreaterThan(0);
    expect(invalidValidation.errors[0]).toContain('Crust Selection');

    // Exceeding max selections (5 selected for max 4)
    const excessValidation = validateModifierSelections([pizzaCrustGroup, pizzaToppingsGroup], {
      'grp-crust': ['mod-thin'],
      'grp-toppings': ['mod-pepperoni', 'mod-mushrooms', 'mod-olives', 'mod-truffle', 'mod-extra'],
    });
    expect(excessValidation.valid).toBe(false);
    expect(excessValidation.errors[0]).toContain('allows at most 4');
  });

  it('4. flattens selected modifiers with nested breadcrumbs for KDS/printing', () => {
    const selectedTree = buildSelectedModifierTree([pizzaCrustGroup, pizzaToppingsGroup], {
      'grp-crust': ['mod-thin'],
      'grp-toppings': ['mod-pepperoni'],
      'grp-pep-prep': ['mod-pep-crispy'],
    });

    const flattened = flattenSelectedModifiers(selectedTree);
    expect(flattened).toHaveLength(3);
    expect(flattened[0].name).toBe('Thin & Crispy');
    expect(flattened[1].name).toBe('Artisan Pepperoni');
    expect(flattened[2].name).toBe('  ↳ Extra Crispy Cup & Char');
    expect(flattened[2].path).toBe('Artisan Pepperoni > Extra Crispy Cup & Char');
  });
});
