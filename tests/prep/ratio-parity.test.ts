import { describe, it, expect } from '../../scripts/bun-test-impl.js';
import {
  calculateRatio,
  calculateRatioFraction,
  calculateRatioLegacy,
  totalFormulaWeight,
  totalFormulaWeightLegacy,
  totalFormulaWeightFraction,
  scaleRecipe,
  type Recipe,
  type RecipeBlueprint,
} from '../../packages/ratio-engine/src/index.ts';
import {
  buildShiftPrep,
  getMiseEnPlace,
  projectBatchSize,
  type PrepItem,
} from '../../packages/prep-engine/src/index.ts';

// ============================================================================
// P06-CALC-01: Canonical Ratio Calculation Parity Test Suite
// Verifies all 29 test vectors from execution/P06_PREP_PARITY_RESULTS.json,
// including all 11 mismatch vectors between KitchenKit (Source) and RecipeOS (Target).
// ============================================================================

describe('P06-CALC-01: calculateRatio Parity (Vectors 1–11)', () => {
  // Vector 1: fraction versus percent (Mismatch #1)
  it('Vector 1: calculateRatio [25, 100] achieves parity in percentage, fraction, and legacy modes', () => {
    // RecipeOS default baker's percentage
    expect(calculateRatio(25, 100)).toBe(25);
    expect(calculateRatio(25, 100, 'percentage')).toBe(25);

    // KitchenKit decimal fraction parity
    expect(calculateRatio(25, 100, 'fraction')).toBe(0.25);
    expect(calculateRatio(25, 100, 'legacy')).toBe(0.25);
    expect(calculateRatio(25, 100, { mode: 'fraction' })).toBe(0.25);
    expect(calculateRatioFraction(25, 100)).toBe(0.25);
    expect(calculateRatioLegacy(25, 100)).toBe(0.25);
  });

  // Vector 2: identity (Mismatch #2)
  it('Vector 2: calculateRatio [100, 100] identity achieves parity across modes', () => {
    // RecipeOS percentage mode
    expect(calculateRatio(100, 100)).toBe(100);
    // KitchenKit decimal fraction mode
    expect(calculateRatio(100, 100, 'fraction')).toBe(1);
    expect(calculateRatio(100, 100, 'legacy')).toBe(1);
    expect(calculateRatioFraction(100, 100)).toBe(1);
  });

  // Vector 3: above unity (Mismatch #3)
  it('Vector 3: calculateRatio [200, 100] above unity ratio achieves parity across modes', () => {
    // RecipeOS percentage mode
    expect(calculateRatio(200, 100)).toBe(200);
    // KitchenKit decimal fraction mode
    expect(calculateRatio(200, 100, 'fraction')).toBe(2);
    expect(calculateRatio(200, 100, 'legacy')).toBe(2);
    expect(calculateRatioFraction(200, 100)).toBe(2);
  });

  // Vector 4: zero numerator (Raw Parity PASS)
  it('Vector 4: calculateRatio [0, 100] zero numerator yields zero in all modes', () => {
    expect(calculateRatio(0, 100)).toBe(0);
    expect(calculateRatio(0, 100, 'fraction')).toBe(0);
    expect(calculateRatio(0, 100, 'legacy')).toBe(0);
    expect(calculateRatioFraction(0, 100)).toBe(0);
  });

  // Vector 5: negative numerator (Mismatch #4)
  it('Vector 5: calculateRatio [-25, 100] domain validation vs legacy unchecked division', () => {
    // RecipeOS strictly fails closed on negative ingredient weight
    expect(() => calculateRatio(-25, 100)).toThrow(/ingredientWeight cannot be negative/);
    expect(() => calculateRatio(-25, 100, 'percentage')).toThrow(/ingredientWeight cannot be negative/);

    // KitchenKit legacy mode allows unchecked float division
    expect(calculateRatio(-25, 100, 'fraction')).toBe(-0.25);
    expect(calculateRatio(-25, 100, 'legacy')).toBe(-0.25);
    expect(calculateRatioLegacy(-25, 100)).toBe(-0.25);
  });

  // Vector 6: negative denominator (Mismatch #5)
  it('Vector 6: calculateRatio [25, -100] domain validation vs legacy unchecked division', () => {
    // RecipeOS strictly fails closed on non-positive base weight
    expect(() => calculateRatio(25, -100)).toThrow(/baseWeight must be > 0/);
    expect(() => calculateRatio(25, -100, 'percentage')).toThrow(/baseWeight must be > 0/);

    // KitchenKit legacy mode allows non-zero negative base weight
    expect(calculateRatio(25, -100, 'fraction')).toBe(-0.25);
    expect(calculateRatio(25, -100, 'legacy')).toBe(-0.25);
    expect(calculateRatioLegacy(25, -100)).toBe(-0.25);
  });

  // Vector 7: zero denominator (Mismatch #6)
  it('Vector 7: calculateRatio [20, 0] zero denominator error message parity', () => {
    // RecipeOS throws strict error
    expect(() => calculateRatio(20, 0)).toThrow(/baseWeight must be > 0/);

    // KitchenKit throws verbatim 'Base weight cannot be zero'
    expect(() => calculateRatio(20, 0, 'fraction')).toThrow(/Base weight cannot be zero/);
    expect(() => calculateRatio(20, 0, 'legacy')).toThrow(/Base weight cannot be zero/);
    expect(() => calculateRatioFraction(20, 0)).toThrow(/Base weight cannot be zero/);
    expect(() => calculateRatioLegacy(20, 0)).toThrow(/Base weight cannot be zero/);
  });

  // Vector 8: fractional precision (Mismatch #7)
  it('Vector 8: calculateRatio [1, 3] bit-exact floating-point precision parity', () => {
    // RecipeOS percentage
    expect(calculateRatio(1, 3)).toBe(33.33333333333333);

    // KitchenKit bit-exact fraction: 1 / 3 = 0.3333333333333333
    // Note: 33.33333333333333 / 100 in IEEE-754 produces 0.33333333333333326.
    // calculateRatioFraction preserves the bit-exact IEEE-754 division result.
    const fractionResult = calculateRatio(1, 3, 'fraction');
    expect(fractionResult).toBe(1 / 3);
    expect(fractionResult).toBe(0.3333333333333333);
    expect(calculateRatioFraction(1, 3)).toBe(0.3333333333333333);
  });

  // Vector 9: infinite denominator (Raw Parity PASS)
  it('Vector 9: calculateRatio [1, Infinity] returns zero in all modes', () => {
    expect(calculateRatio(1, Infinity)).toBe(0);
    expect(calculateRatio(1, Infinity, 'fraction')).toBe(0);
    expect(calculateRatio(1, Infinity, 'legacy')).toBe(0);
  });

  // Vector 10: infinite numerator (Raw Parity PASS)
  it('Vector 10: calculateRatio [Infinity, 100] returns Infinity in all modes', () => {
    expect(calculateRatio(Infinity, 100)).toBe(Infinity);
    expect(calculateRatio(Infinity, 100, 'fraction')).toBe(Infinity);
    expect(calculateRatio(Infinity, 100, 'legacy')).toBe(Infinity);
  });

  // Vector 11: NaN numerator (Raw Parity PASS)
  it('Vector 11: calculateRatio [NaN, 100] returns NaN in all modes', () => {
    expect(calculateRatio(NaN, 100)).toBeNaN();
    expect(calculateRatio(NaN, 100, 'fraction')).toBeNaN();
    expect(calculateRatio(NaN, 100, 'legacy')).toBeNaN();
  });
});

describe('P06-CALC-01: scaleRecipe Parity (Vectors 12–14)', () => {
  const doughRecipe: Recipe = {
    id: 'r1',
    name: 'Dough',
    baseIngredient: 'Flour',
    ingredients: [
      { name: 'Flour', ratio: 1, unit: 'g' },
      { name: 'Water', ratio: 0.5, unit: 'g' },
    ],
  };

  // Vector 12: normal ratio scaling (Raw Parity PASS)
  it('Vector 12: scaleRecipe normal ratio scaling', () => {
    const scaled = scaleRecipe(doughRecipe, 1000);
    expect(scaled).toEqual({ Flour: 1000, Water: 500 });
  });

  // Vector 13: zero target (Raw Parity PASS)
  it('Vector 13: scaleRecipe with targetBaseWeight = 0 yields zero amounts', () => {
    const scaled = scaleRecipe(doughRecipe, 0);
    expect(scaled).toEqual({ Flour: 0, Water: 0 });
  });

  // Vector 14: duplicate name last-write (Raw Parity PASS)
  it('Vector 14: scaleRecipe duplicate ingredient name last-write semantics', () => {
    const duplicateRecipe: Recipe = {
      id: 'r1',
      name: 'Dough',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: 1 },
        { name: 'Water', ratio: 0.5 },
        { name: 'Water', ratio: 0.25 },
      ],
    };
    const scaled = scaleRecipe(duplicateRecipe, 100);
    expect(scaled).toEqual({ Flour: 100, Water: 25 });
  });
});

describe('P06-CALC-01: totalFormulaWeight Parity (Vectors 15–20)', () => {
  const normalDoughRecipe: Recipe = {
    id: 'r1',
    name: 'Dough',
    baseIngredient: 'Flour',
    ingredients: [
      { name: 'Flour', ratio: 1, unit: 'g' },
      { name: 'Water', ratio: 0.5, unit: 'g' },
    ],
  };

  // Vector 15: normal fractional formula (Raw Parity PASS)
  it('Vector 15: totalFormulaWeight normal fractional formula yields 1500g', () => {
    expect(totalFormulaWeight(normalDoughRecipe, 1000)).toBe(1500);
    expect(totalFormulaWeight(normalDoughRecipe, 1000, 'legacy')).toBe(1500);
    expect(totalFormulaWeightLegacy(normalDoughRecipe, 1000)).toBe(1500);
  });

  // Vector 16: zero target (Mismatch #8)
  it('Vector 16: totalFormulaWeight with targetBaseWeight = 0 throws in standard, returns 0 in legacy', () => {
    // RecipeOS default strictly validates targetBaseWeight > 0
    expect(() => totalFormulaWeight(normalDoughRecipe, 0)).toThrow(/targetBaseWeight must be > 0/);
    expect(() => totalFormulaWeight(normalDoughRecipe, 0, 'percentage')).toThrow(/targetBaseWeight must be > 0/);

    // KitchenKit legacy mode returns linear sum: 0
    expect(totalFormulaWeight(normalDoughRecipe, 0, 'legacy')).toBe(0);
    expect(totalFormulaWeight(normalDoughRecipe, 0, 'fraction')).toBe(0);
    expect(totalFormulaWeightLegacy(normalDoughRecipe, 0)).toBe(0);
    expect(totalFormulaWeightFraction(normalDoughRecipe, 0)).toBe(0);
  });

  // Vector 17: negative target (Mismatch #9)
  it('Vector 17: totalFormulaWeight with negative targetBaseWeight throws in standard, returns negative in legacy', () => {
    // RecipeOS default strictly validates targetBaseWeight > 0
    expect(() => totalFormulaWeight(normalDoughRecipe, -100)).toThrow(/targetBaseWeight must be > 0/);

    // KitchenKit legacy mode returns linear sum: -150
    expect(totalFormulaWeight(normalDoughRecipe, -100, 'legacy')).toBe(-150);
    expect(totalFormulaWeight(normalDoughRecipe, -100, 'fraction')).toBe(-150);
    expect(totalFormulaWeightLegacy(normalDoughRecipe, -100)).toBe(-150);
  });

  // Vector 18: empty ingredients (Raw Parity PASS)
  it('Vector 18: totalFormulaWeight with empty ingredients returns 0 in all modes', () => {
    const emptyRecipe: Recipe = {
      id: 'r1',
      name: 'Dough',
      baseIngredient: 'Flour',
      ingredients: [],
    };
    expect(totalFormulaWeight(emptyRecipe, 100)).toBe(0);
    expect(totalFormulaWeight(emptyRecipe, 100, 'legacy')).toBe(0);
    expect(totalFormulaWeightLegacy(emptyRecipe, 100)).toBe(0);
  });

  // Vector 19: non-unit positive base ratio (Mismatch #10)
  it('Vector 19: totalFormulaWeight non-unit positive base ratio normalization vs linear sum', () => {
    const doubleBaseRecipe: Recipe = {
      id: 'r1',
      name: 'Dough',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: 2 },
        { name: 'Water', ratio: 1 },
      ],
    };

    // RecipeOS normalized calculation:
    // baseRatio = 2, unitWeight = 100 / 2 = 50, total = (2 + 1) * 50 = 150
    expect(totalFormulaWeight(doubleBaseRecipe, 100)).toBe(150);
    expect(totalFormulaWeight(doubleBaseRecipe, 100, 'percentage')).toBe(150);

    // KitchenKit legacy unnormalized sum:
    // (2 * 100) + (1 * 100) = 300
    expect(totalFormulaWeight(doubleBaseRecipe, 100, 'legacy')).toBe(300);
    expect(totalFormulaWeight(doubleBaseRecipe, 100, 'fraction')).toBe(300);
    expect(totalFormulaWeightLegacy(doubleBaseRecipe, 100)).toBe(300);
  });

  // Vector 20: unmatched base name (Mismatch #11)
  it('Vector 20: totalFormulaWeight unmatched base name auto-detects decimal fraction ratios', () => {
    const unmatchedRecipe: Recipe = {
      id: 'r1',
      name: 'Dough',
      baseIngredient: 'Missing',
      ingredients: [
        { name: 'Flour', ratio: 1, unit: 'g' },
        { name: 'Water', ratio: 0.5, unit: 'g' },
      ],
    };

    // Before fix: defaulting baseRatio to 100 caused 100x deflation (total = 1.5).
    // With decimal ratio detection (all ratios <= 2.0), baseRatio defaults to 1.0:
    // unitWeight = 100 / 1.0 = 100, total = (1 + 0.5) * 100 = 150.
    expect(totalFormulaWeight(unmatchedRecipe, 100)).toBe(150);
    expect(totalFormulaWeight(unmatchedRecipe, 100, 'percentage')).toBe(150);

    // KitchenKit legacy mode also evaluates to 150:
    expect(totalFormulaWeight(unmatchedRecipe, 100, 'legacy')).toBe(150);
    expect(totalFormulaWeight(unmatchedRecipe, 100, 'fraction')).toBe(150);
    expect(totalFormulaWeightLegacy(unmatchedRecipe, 100)).toBe(150);
  });
});

describe('P06-CALC-01: buildShiftPrep Parity (Vectors 21–23)', () => {
  // Vector 21: below/equal/above par (Raw Parity PASS)
  it('Vector 21: buildShiftPrep below/equal/above par stock levels', () => {
    const stock: PrepItem[] = [
      { ingredient: 'Flour', currentStock: 1, parLevel: 5, unit: 'kg' },
      { ingredient: 'Water', currentStock: 5, parLevel: 5, unit: 'l' },
      { ingredient: 'Salt', currentStock: 6, parLevel: 5, unit: 'kg' },
    ];
    const plan = buildShiftPrep(stock, 'AM', '2026-10-04');
    expect(plan).toEqual({
      shift: 'AM',
      date: '2026-10-04',
      items: [{ ingredient: 'Flour', prepAmount: 4, unit: 'kg' }],
    });
  });

  // Vector 22: negative stock (Raw Parity PASS)
  it('Vector 22: buildShiftPrep handles negative currentStock correctly', () => {
    const stock: PrepItem[] = [
      { ingredient: 'Flour', currentStock: -1, parLevel: 5, unit: 'kg' },
    ];
    const plan = buildShiftPrep(stock, 'PM', '2026-10-04');
    expect(plan).toEqual({
      shift: 'PM',
      date: '2026-10-04',
      items: [{ ingredient: 'Flour', prepAmount: 6, unit: 'kg' }],
    });
  });

  // Vector 23: empty stock (Raw Parity PASS)
  it('Vector 23: buildShiftPrep handles empty stock list gracefully', () => {
    const plan = buildShiftPrep([], 'AM', '2026-10-04');
    expect(plan).toEqual({
      shift: 'AM',
      date: '2026-10-04',
      items: [],
    });
  });
});

describe('P06-CALC-01: getMiseEnPlace Parity (Vectors 24–26)', () => {
  // Vector 24: normal recipe (Raw Parity PASS)
  it('Vector 24: getMiseEnPlace normal recipe scaling', () => {
    const recipe: Recipe = {
      id: 'r1',
      name: 'Dough',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: 1, unit: 'g' },
        { name: 'Water', ratio: 0.5, unit: 'g' },
      ],
    };
    const mise = getMiseEnPlace(recipe, 1000);
    expect(mise).toEqual([
      { ingredient: 'Flour', amount: 1000, unit: 'g' },
      { ingredient: 'Water', amount: 500, unit: 'g' },
    ]);
  });

  // Vector 25: omitted units (Raw Parity PASS)
  it('Vector 25: getMiseEnPlace recipe with omitted units and duplicate names', () => {
    const recipe: Recipe = {
      id: 'r1',
      name: 'Dough',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: 1 },
        { name: 'Water', ratio: 0.5 },
        { name: 'Water', ratio: 0.25 },
      ],
    };
    const mise = getMiseEnPlace(recipe, 100);
    expect(mise).toEqual([
      { ingredient: 'Flour', amount: 100, unit: undefined },
      { ingredient: 'Water', amount: 25, unit: undefined },
      { ingredient: 'Water', amount: 25, unit: undefined },
    ]);
  });

  // Vector 26: empty recipe (Raw Parity PASS)
  it('Vector 26: getMiseEnPlace with empty ingredients list', () => {
    const recipe: Recipe = {
      id: 'r1',
      name: 'Dough',
      baseIngredient: 'Flour',
      ingredients: [],
    };
    const mise = getMiseEnPlace(recipe, 100);
    expect(mise).toEqual([]);
  });
});

describe('P06-CALC-01: projectBatchSize Parity (Vectors 27–29)', () => {
  // Vector 27: default waste (Raw Parity PASS)
  it('Vector 27: projectBatchSize default waste factor (1.1)', () => {
    const batch = projectBatchSize(100, 10);
    expect(batch).toBe(1100);
  });

  // Vector 28: explicit waste (Raw Parity PASS)
  it('Vector 28: projectBatchSize explicit waste factor (1.2)', () => {
    const batch = projectBatchSize(100, 10, 1.2);
    expect(batch).toBe(1200);
  });

  // Vector 29: zero covers (Raw Parity PASS)
  it('Vector 29: projectBatchSize with zero covers yields 0', () => {
    const batch = projectBatchSize(100, 0);
    expect(batch).toBe(0);
  });
});
