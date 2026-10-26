// ============================================================================
// Empirical Adversarial Stress Test Suite: Phase P06 Ratio Engine Parity
// Challenger 1 (teamwork_preview_challenger)
// Probes edge cases, boundary inputs, floating point precision, unmatched base names,
// and legacy contract preservation in @culinaryos/ratio-engine.
// ============================================================================

import { describe, it, expect } from '../../scripts/bun-test-impl.js';
import assert from 'node:assert';
import {
  calculateRatio,
  calculateRatioFraction,
  calculateRatioLegacy,
  totalFormulaWeight,
  totalFormulaWeightLegacy,
  totalFormulaWeightFraction,
  type Recipe,
  type RecipeBlueprint,
  type RatioBlueprint,
} from '../../packages/ratio-engine/src/index.ts';

// ----------------------------------------------------------------------------
// SUITE 1: Boundary & Pathological Numeric Inputs in calculateRatio
// ----------------------------------------------------------------------------
describe('SUITE 1: Boundary & Pathological Numeric Inputs in calculateRatio', () => {
  // 1.1 Zero denominators in all modes
  it('1.1: Rejects zero base weight across all modes with distinct domain contracts', () => {
    // Percentage mode strictly throws 'baseWeight must be > 0'
    expect(() => calculateRatio(100, 0)).toThrow(/baseWeight must be > 0/);
    expect(() => calculateRatio(100, 0, 'percentage')).toThrow(/baseWeight must be > 0/);
    expect(() => calculateRatio(100, 0, { mode: 'percentage' })).toThrow(/baseWeight must be > 0/);

    // Fraction / Legacy mode throws verbatim KitchenKit error 'Base weight cannot be zero'
    expect(() => calculateRatio(100, 0, 'fraction')).toThrow(/Base weight cannot be zero/);
    expect(() => calculateRatio(100, 0, 'legacy')).toThrow(/Base weight cannot be zero/);
    expect(() => calculateRatio(100, 0, { mode: 'fraction' })).toThrow(/Base weight cannot be zero/);
    expect(() => calculateRatioFraction(100, 0)).toThrow(/Base weight cannot be zero/);
    expect(() => calculateRatioLegacy(100, 0)).toThrow(/Base weight cannot be zero/);

    // 0 / 0 edge case
    expect(() => calculateRatio(0, 0)).toThrow(/baseWeight must be > 0/);
    expect(() => calculateRatio(0, 0, 'fraction')).toThrow(/Base weight cannot be zero/);
  });

  // 1.2 Negative denominators
  it('1.2: Negative baseWeight handling across modes', () => {
    // Percentage mode: strict guard throws 'baseWeight must be > 0'
    expect(() => calculateRatio(50, -100)).toThrow(/baseWeight must be > 0/);
    expect(() => calculateRatio(50, -100, 'percentage')).toThrow(/baseWeight must be > 0/);

    // Fraction / Legacy mode: unchecked float division returns negative fraction
    expect(calculateRatio(50, -100, 'fraction')).toBe(-0.5);
    expect(calculateRatio(50, -100, 'legacy')).toBe(-0.5);
    expect(calculateRatioFraction(50, -100)).toBe(-0.5);
    expect(calculateRatioLegacy(50, -100)).toBe(-0.5);
  });

  // 1.3 Negative numerators
  it('1.3: Negative ingredientWeight handling across modes', () => {
    // Percentage mode: strict guard throws 'ingredientWeight cannot be negative'
    expect(() => calculateRatio(-50, 100)).toThrow(/ingredientWeight cannot be negative/);
    expect(() => calculateRatio(-50, 100, 'percentage')).toThrow(/ingredientWeight cannot be negative/);

    // Fraction / Legacy mode: unchecked float division returns negative fraction
    expect(calculateRatio(-50, 100, 'fraction')).toBe(-0.5);
    expect(calculateRatio(-50, 100, 'legacy')).toBe(-0.5);
    expect(calculateRatioFraction(-50, 100)).toBe(-0.5);
    expect(calculateRatioLegacy(-50, 100)).toBe(-0.5);

    // Both numerator and denominator negative
    expect(() => calculateRatio(-50, -100)).toThrow(/baseWeight must be > 0/); // base checked first
    expect(calculateRatio(-50, -100, 'fraction')).toBe(0.5);
    expect(calculateRatioFraction(-50, -100)).toBe(0.5);
  });

  // 1.4 Negative zero (-0)
  it('1.4: Handles negative zero (-0) gracefully', () => {
    // In JS: -0 === 0 is true, but -0 < 0 is false.
    // When baseWeight is -0:
    // Percentage mode: -0 <= 0 is true -> throws
    expect(() => calculateRatio(50, -0)).toThrow(/baseWeight must be > 0/);
    // Fraction mode: -0 === 0 is true -> throws
    expect(() => calculateRatio(50, -0, 'fraction')).toThrow(/Base weight cannot be zero/);

    // When ingredientWeight is -0:
    // Percentage mode: -0 < 0 is false -> evaluates (-0 / 100) * 100 = -0
    const pctNegZero = calculateRatio(-0, 100);
    expect(pctNegZero === 0).toBe(true);

    // Fraction mode: -0 / 100 = -0
    const fracNegZero = calculateRatio(-0, 100, 'fraction');
    expect(fracNegZero === 0).toBe(true);
  });

  // 1.5 NaN and Infinity
  it('1.5: NaN and Infinity behavior across modes', () => {
    // NaN ingredient weight
    expect(calculateRatio(NaN, 100)).toBeNaN();
    expect(calculateRatio(NaN, 100, 'fraction')).toBeNaN();
    expect(calculateRatioFraction(NaN, 100)).toBeNaN();

    // Infinity ingredient weight
    expect(calculateRatio(Infinity, 100)).toBe(Infinity);
    expect(calculateRatio(Infinity, 100, 'fraction')).toBe(Infinity);

    // Infinity base weight
    expect(calculateRatio(100, Infinity)).toBe(0);
    expect(calculateRatio(100, Infinity, 'fraction')).toBe(0);

    // Infinity / Infinity = NaN
    expect(calculateRatio(Infinity, Infinity)).toBeNaN();
    expect(calculateRatio(Infinity, Infinity, 'fraction')).toBeNaN();
  });

  // 1.6 Subnormal and near-zero numbers
  it('1.6: Subnormal and IEEE-754 near-zero floating point numbers', () => {
    const minVal = Number.MIN_VALUE; // ~5e-324
    // Base weight is minVal (> 0)
    expect(calculateRatio(1, minVal)).toBe(Infinity);
    expect(calculateRatio(1, minVal, 'fraction')).toBe(1 / minVal);

    // Ingredient weight is minVal
    expect(calculateRatio(minVal, 1)).toBe(minVal * 100);
    expect(calculateRatio(minVal, 1, 'fraction')).toBe(minVal);
  });
});

// ----------------------------------------------------------------------------
// SUITE 2: Extreme Fractional & Percentage Inputs & Floating-Point Precision
// ----------------------------------------------------------------------------
describe('SUITE 2: Extreme Fractional & Percentage Inputs & Floating-Point Precision', () => {
  // 2.1 Repeating decimal precision parity (1/3, 2/3, 1/7, 1/6)
  it('2.1: Repeating decimals maintain bit-exact IEEE-754 direct division in fraction mode', () => {
    // 1 / 3
    const fracThird = calculateRatio(1, 3, 'fraction');
    expect(fracThird).toBe(1 / 3);
    expect(fracThird).toBe(0.3333333333333333);
    // Baker's percentage
    const pctThird = calculateRatio(1, 3);
    expect(pctThird).toBe(33.33333333333333);
    // Crucial check: naive pctThird / 100 loses bit-exact precision
    expect(pctThird / 100).not.toBe(1 / 3);
    expect(fracThird).toBe(1 / 3);

    // 2 / 3
    const fracTwoThirds = calculateRatio(2, 3, 'fraction');
    expect(fracTwoThirds).toBe(2 / 3);
    expect(fracTwoThirds).toBe(0.6666666666666666);
    expect(calculateRatio(2, 3)).toBe(66.66666666666666);

    // 1 / 7
    const fracSeventh = calculateRatio(1, 7, 'fraction');
    expect(fracSeventh).toBe(1 / 7);
    expect(calculateRatio(1, 7)).toBe((1 / 7) * 100);

    // 1 / 6
    const fracSixth = calculateRatio(1, 6, 'fraction');
    expect(fracSixth).toBe(1 / 6);
    expect(calculateRatio(1, 6)).toBe((1 / 6) * 100);
  });

  // 2.2 Micro-scale ingredient weights (e.g. saffron, enzymes, gold leaf)
  it('2.2: Micro-scale ingredient weights (1e-6g to 1e-12g) scale without underflow', () => {
    // 1 microgram saffron in 1000g base = 1e-6 / 1000 = 9.999999999999999e-10 in IEEE-754
    const microResult = calculateRatio(1e-6, 1000, 'fraction');
    expect(microResult).toBe(1e-6 / 1000);
    expect(microResult).toBeCloseTo(1e-9, 12);
    expect(calculateRatio(1e-6, 1000)).toBeCloseTo(1e-7, 10);

    // 1 picogram in 1000g base
    const picoResult = calculateRatio(1e-12, 1000, 'fraction');
    expect(picoResult).toBe(1e-12 / 1000);
    expect(picoResult).toBeCloseTo(1e-15, 18);
    expect(calculateRatio(1e-12, 1000)).toBeCloseTo(1e-13, 16);
  });

  // 2.3 Mega-scale commercial industrial production
  it('2.3: Mega-scale commercial batch quantities scale accurately', () => {
    // 50,000 kg water on 100,000 kg flour = 50% hydration
    expect(calculateRatio(50_000_000, 100_000_000)).toBe(50);
    expect(calculateRatio(50_000_000, 100_000_000, 'fraction')).toBe(0.5);

    // Massive ratio (e.g., 10x inclusion)
    expect(calculateRatio(1_000_000, 100_000)).toBe(1000);
    expect(calculateRatio(1_000_000, 100_000, 'fraction')).toBe(10);
  });

  // 2.4 Floating-point addition jitter (0.1 + 0.2)
  it('2.4: Preserves floating-point behavior for binary float representations (0.1 + 0.2)', () => {
    const sum = 0.1 + 0.2; // 0.30000000000000004
    const ratioFrac = calculateRatio(sum, 0.3, 'fraction');
    expect(ratioFrac).toBe(sum / 0.3);
    expect(ratioFrac).toBeCloseTo(1.0, 14);

    const ratioPct = calculateRatio(sum, 0.3);
    expect(ratioPct).toBe((sum / 0.3) * 100);
    expect(ratioPct).toBeCloseTo(100.0, 12);
  });
});

// ----------------------------------------------------------------------------
// SUITE 3: Mode Dispatch, Interface Signatures & Options Contract
// ----------------------------------------------------------------------------
describe('SUITE 3: Mode Dispatch, Interface Signatures & Options Contract', () => {
  it('3.1: calculateRatio mode dispatch contract', () => {
    // Default when omitted -> 'percentage'
    expect(calculateRatio(50, 100)).toBe(50);
    // Explicit string modes
    expect(calculateRatio(50, 100, 'percentage')).toBe(50);
    expect(calculateRatio(50, 100, 'fraction')).toBe(0.5);
    expect(calculateRatio(50, 100, 'legacy')).toBe(0.5);

    // Options object syntax
    expect(calculateRatio(50, 100, { mode: 'percentage' })).toBe(50);
    expect(calculateRatio(50, 100, { mode: 'fraction' })).toBe(0.5);
    expect(calculateRatio(50, 100, { mode: 'legacy' })).toBe(0.5);

    // Empty options object defaults to 'percentage'
    expect(calculateRatio(50, 100, {})).toBe(50);

    // Dedicated helpers
    expect(calculateRatioFraction(50, 100)).toBe(0.5);
    expect(calculateRatioLegacy(50, 100)).toBe(0.5);
  });

  it('3.2: totalFormulaWeight mode dispatch contract', () => {
    const testRecipe: Recipe = {
      id: 'r-test',
      name: 'Test',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: 1.0 },
        { name: 'Water', ratio: 0.6 },
      ],
    };

    // Default mode -> 'percentage' (for matched base, returns 160)
    expect(totalFormulaWeight(testRecipe, 100)).toBe(160);
    expect(totalFormulaWeight(testRecipe, 100, 'percentage')).toBe(160);
    expect(totalFormulaWeight(testRecipe, 100, { mode: 'percentage' })).toBe(160);

    // Fraction / Legacy mode -> linear sum (returns 160)
    expect(totalFormulaWeight(testRecipe, 100, 'fraction')).toBe(160);
    expect(totalFormulaWeight(testRecipe, 100, 'legacy')).toBe(160);
    expect(totalFormulaWeight(testRecipe, 100, { mode: 'fraction' })).toBe(160);
    expect(totalFormulaWeight(testRecipe, 100, { mode: 'legacy' })).toBe(160);

    // Dedicated helpers
    expect(totalFormulaWeightFraction(testRecipe, 100)).toBe(160);
    expect(totalFormulaWeightLegacy(testRecipe, 100)).toBe(160);
  });
});

// ----------------------------------------------------------------------------
// SUITE 4: totalFormulaWeight Base Matching & Heuristic Boundary Stress
// ----------------------------------------------------------------------------
describe('SUITE 4: totalFormulaWeight Base Matching & Heuristic Boundary Stress', () => {
  // 4.1 Base matching by ID vs by Name
  it('4.1: Matches base ingredient by id or by name', () => {
    const recipeMatchingById: RecipeBlueprint = {
      id: 'bp-id',
      name: 'Match By Id',
      baseIngredient: 'ing-flour-id',
      baseYield: 1,
      yieldUnit: 'loaf',
      ingredients: [
        { id: 'ing-flour-id', name: 'High Protein Flour', ratio: 100, unit: 'g' },
        { id: 'ing-water-id', name: 'Filtered Water', ratio: 70, unit: 'ml' },
      ],
    };
    expect(totalFormulaWeight(recipeMatchingById, 500)).toBe(850);

    const recipeMatchingByName: Recipe = {
      id: 'r-name',
      name: 'Match By Name',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: 100 },
        { name: 'Water', ratio: 70 },
      ],
    };
    expect(totalFormulaWeight(recipeMatchingByName, 500)).toBe(850);
  });

  // 4.2 Auto-detection of 100% ratio when baseIngredient is undefined
  it('4.2: Auto-detects base ingredient by ratio === 100 when baseIngredient is omitted', () => {
    const recipeNoBaseName: RecipeBlueprint = {
      id: 'no-base-name',
      name: 'No Base Name Specified',
      baseIngredient: undefined,
      baseYield: 1,
      yieldUnit: 'loaf',
      ingredients: [
        { id: 'water', name: 'Water', ratio: 65, unit: 'ml' },
        { id: 'flour', name: 'Flour', ratio: 100, unit: 'g' }, // ratio === 100
        { id: 'salt', name: 'Salt', ratio: 2, unit: 'g' },
      ],
    };
    // Total ratio = 65 + 100 + 2 = 167. Unit weight = 1000 / 100 = 10. Total = 1670.
    expect(totalFormulaWeight(recipeNoBaseName, 1000)).toBe(1670);
  });

  // 4.3 Unmatched base name with decimal fraction ratios (all <= 2.0)
  it('4.3: Unmatched base name with decimal ratios (all <= 2.0) sets fallbackRatio = 1.0 (Vector 20)', () => {
    const decimalRecipe: Recipe = {
      id: 'dec-1',
      name: 'Decimal Bread',
      baseIngredient: 'NonExistentBase',
      ingredients: [
        { name: 'Flour', ratio: 1.0 },
        { name: 'Water', ratio: 0.7 },
        { name: 'Salt', ratio: 0.02 },
      ],
    };
    // In percentage mode: all <= 2.0 -> fallbackRatio = 1.0. Unit weight = 1000 / 1.0 = 1000.
    // Total = (1.0 + 0.7 + 0.02) * 1000 = 1720g.
    expect(totalFormulaWeight(decimalRecipe, 1000)).toBe(1720);
    // In legacy / fraction mode: linear sum = (1.0 + 0.7 + 0.02) * 1000 = 1720g.
    expect(totalFormulaWeight(decimalRecipe, 1000, 'fraction')).toBe(1720);
    expect(totalFormulaWeight(decimalRecipe, 1000, 'legacy')).toBe(1720);
  });

  // 4.4 Boundary at ratio <= 2.0: Heuristic stress probing
  it('4.4: Probes the ratio <= 2.0 threshold boundary when base is unmatched', () => {
    // Exactly 2.0
    const recipeAtBoundary: Recipe = {
      id: 'boundary-2.0',
      name: 'Boundary 2.0',
      baseIngredient: 'Missing',
      ingredients: [
        { name: 'Base', ratio: 1.0 },
        { name: 'Liquid', ratio: 2.0 },
      ],
    };
    // All ratios <= 2.0 -> fallbackRatio = 1.0. Total = (1 + 2) * 100 = 300.
    expect(totalFormulaWeight(recipeAtBoundary, 100)).toBe(300);

    // Slightly above 2.0: ratio = 2.01 (e.g. 2.01x liquid in a broth)
    const recipeAboveBoundary: Recipe = {
      id: 'above-2.0',
      name: 'Above Boundary 2.0',
      baseIngredient: 'Missing',
      ingredients: [
        { name: 'Base', ratio: 1.0 },
        { name: 'Liquid', ratio: 2.01 },
      ],
    };
    // In fraction mode: linear sum always works regardless of heuristic!
    // (1.0 * 100) + (2.01 * 100) = 301.
    expect(totalFormulaWeight(recipeAboveBoundary, 100, 'fraction')).toBe(301);
    expect(totalFormulaWeight(recipeAboveBoundary, 100, 'legacy')).toBe(301);

    // In default percentage mode: 2.01 > 2.0 means allDecimal is false -> fallbackRatio = 100.
    // Result: (1.0 + 2.01) * (100 / 100) = 3.01 (reveals the 100x deflation boundary).
    expect(totalFormulaWeight(recipeAboveBoundary, 100)).toBe(3.01);
  });

  // 4.5 Spice / Curing rub recipe where all percentages happen to be <= 2.0
  it('4.5: Spice / curing rub where all percentages <= 2.0 with unmatched base', () => {
    // A curing mix where base ingredient (meat) was omitted from ingredients array:
    // Salt: 2.0%, Sugar: 1.0%, Nitrate: 0.25%
    const curingMix: Recipe = {
      id: 'curing-rub',
      name: 'Curing Rub',
      baseIngredient: 'PorkBelly', // Not present in ingredients
      ingredients: [
        { name: 'Kosher Salt', ratio: 2.0 },
        { name: 'Brown Sugar', ratio: 1.0 },
        { name: 'InstaCure #1', ratio: 0.25 },
      ],
    };

    // When called in fraction / legacy mode: linear sum treats them as multipliers (3.25 * 1000 = 3250)
    expect(totalFormulaWeight(curingMix, 1000, 'fraction')).toBe(3250);

    // In percentage mode, because all <= 2.0, allDecimal evaluates to true, defaulting baseRatio to 1.0:
    // (2.0 + 1.0 + 0.25) * (1000 / 1.0) = 3250.
    // If baseIngredient: 'PorkBelly' had been included with ratio: 100, total would be 32.5g.
    expect(totalFormulaWeight(curingMix, 1000)).toBe(3250);

    // If meat base is properly included with ratio 100:
    const completeCure: Recipe = {
      ...curingMix,
      ingredients: [
        { name: 'PorkBelly', ratio: 100 },
        ...curingMix.ingredients,
      ],
    };
    // Total weight = (100 + 2.0 + 1.0 + 0.25) * (1000 / 100) = 1032.5g
    expect(totalFormulaWeight(completeCure, 1000)).toBe(1032.5);
  });
});

// ----------------------------------------------------------------------------
// SUITE 5: totalFormulaWeight Boundary & Pathological Inputs
// ----------------------------------------------------------------------------
describe('SUITE 5: totalFormulaWeight Boundary & Pathological Inputs', () => {
  const sampleRecipe: Recipe = {
    id: 's-1',
    name: 'Sample',
    baseIngredient: 'Flour',
    ingredients: [
      { name: 'Flour', ratio: 100 },
      { name: 'Water', ratio: 60 },
    ],
  };

  // 5.1 Zero and negative target base weights
  it('5.1: Zero and negative targetBaseWeight rejection vs legacy return', () => {
    // Percentage mode strictly rejects targetBaseWeight <= 0
    expect(() => totalFormulaWeight(sampleRecipe, 0)).toThrow(/targetBaseWeight must be > 0/);
    expect(() => totalFormulaWeight(sampleRecipe, -10)).toThrow(/targetBaseWeight must be > 0/);
    expect(() => totalFormulaWeight(sampleRecipe, -0.0001)).toThrow(/targetBaseWeight must be > 0/);

    // Fraction / Legacy mode returns linear sum: 0 or negative
    expect(totalFormulaWeight(sampleRecipe, 0, 'fraction')).toBe(0);
    expect(totalFormulaWeight(sampleRecipe, 0, 'legacy')).toBe(0);
    expect(totalFormulaWeight(sampleRecipe, -10, 'fraction')).toBe(-1600);
    expect(totalFormulaWeight(sampleRecipe, -10, 'legacy')).toBe(-1600);
  });

  // 5.2 Empty or missing recipe structures
  it('5.2: Safely handles empty or missing recipe structures', () => {
    expect(totalFormulaWeight(null as any, 100)).toBe(0);
    expect(totalFormulaWeight(undefined as any, 100)).toBe(0);
    expect(totalFormulaWeight({} as any, 100)).toBe(0);
    expect(totalFormulaWeight({ ingredients: [] } as any, 100)).toBe(0);

    // In legacy / fraction mode:
    expect(totalFormulaWeight(null as any, 100, 'fraction')).toBe(0);
    expect(totalFormulaWeight(undefined as any, 100, 'fraction')).toBe(0);
    expect(totalFormulaWeight({} as any, 100, 'fraction')).toBe(0);
    expect(totalFormulaWeight({ ingredients: [] } as any, 100, 'fraction')).toBe(0);
  });

  // 5.3 Zero base ratio error rejection
  it('5.3: Throws explicit error when base ingredient ratio is zero or negative in percentage mode', () => {
    const zeroBaseRecipe: Recipe = {
      id: 'zero-base',
      name: 'Zero Base',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: 0 },
        { name: 'Water', ratio: 60 },
      ],
    };
    expect(() => totalFormulaWeight(zeroBaseRecipe, 100)).toThrow(/Base ingredient ratio must be > 0/);

    const negativeBaseRecipe: Recipe = {
      id: 'neg-base',
      name: 'Negative Base',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: -10 },
        { name: 'Water', ratio: 60 },
      ],
    };
    expect(() => totalFormulaWeight(negativeBaseRecipe, 100)).toThrow(/Base ingredient ratio must be > 0/);
  });

  // 5.4 Support for legacy RatioBlueprint (ratioWeight field)
  it('5.4: Supports RatioBlueprint objects with ratioWeight fields across all modes', () => {
    const legacyBlueprint: RatioBlueprint = {
      id: 'bp-legacy',
      name: 'Legacy Blueprint',
      baseYield: 1,
      yieldUnit: 'loaf',
      ingredients: [
        { id: 'flour', name: 'Flour', ratioWeight: 100, unit: 'g' },
        { id: 'water', name: 'Water', ratioWeight: 75, unit: 'ml' },
        { id: 'salt', name: 'Salt', ratioWeight: 2, unit: 'g' },
      ],
    };
    // Percentage mode (finds ratioWeight === 100)
    expect(totalFormulaWeight(legacyBlueprint, 1000)).toBe(1770);
    // Legacy / fraction mode
    expect(totalFormulaWeight(legacyBlueprint, 1000, 'fraction')).toBe(177000); // 177 * 1000
    expect(totalFormulaWeightLegacy(legacyBlueprint, 1000)).toBe(177000);
  });

  // 5.5 Multi-flour blend formulas with baseIngredient specified
  it('5.5: Multi-flour blend with base ratio 100 scales correctly', () => {
    const multiFlourRecipe: Recipe = {
      id: 'multi-flour',
      name: 'Artisan Multi-Flour',
      baseIngredient: 'Bread Flour',
      ingredients: [
        { name: 'Bread Flour', ratio: 100 },
        { name: 'Whole Wheat Flour', ratio: 30 },
        { name: 'Rye Flour', ratio: 10 },
        { name: 'Water', ratio: 100 }, // 100% of base flour = ~71% total flour hydration
        { name: 'Salt', ratio: 3 },
      ],
    };
    // Total ratio = 100 + 30 + 10 + 100 + 3 = 243.
    // Target base: 1000g of Bread Flour -> Total weight = 2430g.
    expect(totalFormulaWeight(multiFlourRecipe, 1000)).toBe(2430);
  });
});

// ----------------------------------------------------------------------------
// SUITE 6: Verification of All 11 Mismatch Resolution Vectors
// ----------------------------------------------------------------------------
describe('SUITE 6: Verification of All 11 Mismatch Resolution Vectors', () => {
  // Vector 1: fraction versus percent [25, 100]
  it('Vector 1: calculateRatio [25, 100] -> 25 (pct) vs 0.25 (frac)', () => {
    expect(calculateRatio(25, 100)).toBe(25);
    expect(calculateRatio(25, 100, 'fraction')).toBe(0.25);
    expect(calculateRatioFraction(25, 100)).toBe(0.25);
  });

  // Vector 2: identity [100, 100]
  it('Vector 2: calculateRatio [100, 100] -> 100 (pct) vs 1 (frac)', () => {
    expect(calculateRatio(100, 100)).toBe(100);
    expect(calculateRatio(100, 100, 'fraction')).toBe(1);
    expect(calculateRatioFraction(100, 100)).toBe(1);
  });

  // Vector 3: above unity [200, 100]
  it('Vector 3: calculateRatio [200, 100] -> 200 (pct) vs 2 (frac)', () => {
    expect(calculateRatio(200, 100)).toBe(200);
    expect(calculateRatio(200, 100, 'fraction')).toBe(2);
    expect(calculateRatioFraction(200, 100)).toBe(2);
  });

  // Vector 5: negative numerator [-25, 100]
  it('Vector 5: calculateRatio [-25, 100] -> throws (pct) vs -0.25 (frac)', () => {
    expect(() => calculateRatio(-25, 100)).toThrow(/ingredientWeight cannot be negative/);
    expect(calculateRatio(-25, 100, 'fraction')).toBe(-0.25);
    expect(calculateRatioFraction(-25, 100)).toBe(-0.25);
  });

  // Vector 6: negative denominator [25, -100]
  it('Vector 6: calculateRatio [25, -100] -> throws (pct) vs -0.25 (frac)', () => {
    expect(() => calculateRatio(25, -100)).toThrow(/baseWeight must be > 0/);
    expect(calculateRatio(25, -100, 'fraction')).toBe(-0.25);
    expect(calculateRatioFraction(25, -100)).toBe(-0.25);
  });

  // Vector 7: zero denominator [20, 0]
  it('Vector 7: calculateRatio [20, 0] -> throws > 0 (pct) vs Base weight cannot be zero (frac)', () => {
    expect(() => calculateRatio(20, 0)).toThrow(/baseWeight must be > 0/);
    expect(() => calculateRatio(20, 0, 'fraction')).toThrow(/Base weight cannot be zero/);
    expect(() => calculateRatioFraction(20, 0)).toThrow(/Base weight cannot be zero/);
  });

  // Vector 8: fractional precision [1, 3]
  it('Vector 8: calculateRatio [1, 3] -> 33.33333333333333 (pct) vs 0.3333333333333333 (frac)', () => {
    expect(calculateRatio(1, 3)).toBe(33.33333333333333);
    expect(calculateRatio(1, 3, 'fraction')).toBe(1 / 3);
    expect(calculateRatioFraction(1, 3)).toBe(0.3333333333333333);
  });

  const normalRecipe: Recipe = {
    id: 'r1',
    name: 'Dough',
    baseIngredient: 'Flour',
    ingredients: [
      { name: 'Flour', ratio: 1, unit: 'g' },
      { name: 'Water', ratio: 0.5, unit: 'g' },
    ],
  };

  // Vector 16: zero target [recipe, 0]
  it('Vector 16: totalFormulaWeight [recipe, 0] -> throws (pct) vs 0 (frac)', () => {
    expect(() => totalFormulaWeight(normalRecipe, 0)).toThrow(/targetBaseWeight must be > 0/);
    expect(totalFormulaWeight(normalRecipe, 0, 'fraction')).toBe(0);
    expect(totalFormulaWeightFraction(normalRecipe, 0)).toBe(0);
  });

  // Vector 17: negative target [recipe, -100]
  it('Vector 17: totalFormulaWeight [recipe, -100] -> throws (pct) vs -150 (frac)', () => {
    expect(() => totalFormulaWeight(normalRecipe, -100)).toThrow(/targetBaseWeight must be > 0/);
    expect(totalFormulaWeight(normalRecipe, -100, 'fraction')).toBe(-150);
    expect(totalFormulaWeightFraction(normalRecipe, -100)).toBe(-150);
  });

  // Vector 19: non-unit positive base ratio [recipe(Flour: 2, Water: 1), 100]
  it('Vector 19: totalFormulaWeight non-unit base -> 150 (pct normalized) vs 300 (frac unnormalized)', () => {
    const doubleBaseRecipe: Recipe = {
      id: 'r1',
      name: 'Dough',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: 2 },
        { name: 'Water', ratio: 1 },
      ],
    };
    expect(totalFormulaWeight(doubleBaseRecipe, 100)).toBe(150);
    expect(totalFormulaWeight(doubleBaseRecipe, 100, 'fraction')).toBe(300);
    expect(totalFormulaWeightFraction(doubleBaseRecipe, 100)).toBe(300);
  });

  // Vector 20: unmatched base name [recipe(baseIngredient: 'Missing', Flour: 1, Water: 0.5), 100]
  it('Vector 20: totalFormulaWeight unmatched base -> 150 across both pct and frac', () => {
    const unmatchedRecipe: Recipe = {
      id: 'r1',
      name: 'Dough',
      baseIngredient: 'Missing',
      ingredients: [
        { name: 'Flour', ratio: 1, unit: 'g' },
        { name: 'Water', ratio: 0.5, unit: 'g' },
      ],
    };
    expect(totalFormulaWeight(unmatchedRecipe, 100)).toBe(150);
    expect(totalFormulaWeight(unmatchedRecipe, 100, 'percentage')).toBe(150);
    expect(totalFormulaWeight(unmatchedRecipe, 100, 'fraction')).toBe(150);
    expect(totalFormulaWeight(unmatchedRecipe, 100, 'legacy')).toBe(150);
    expect(totalFormulaWeightFraction(unmatchedRecipe, 100)).toBe(150);
    expect(totalFormulaWeightLegacy(unmatchedRecipe, 100)).toBe(150);
  });
});
