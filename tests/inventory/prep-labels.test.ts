import { describe, it, expect } from 'bun:test';
import {
  scaleRecipeByBakersPercentage,
  scaleRecipeByTotalBatchWeight,
  scaleRecipeByTargetYield,
  calculateUseByDate,
  formatAdhesiveLabel,
  type BakersRecipe,
  type StandardPrepRecipe,
  type PrepBatch,
} from '@culinaryos/prep-engine';

describe('Batch Prep Recipe Scaling & Adhesive Labels Engine', () => {
  it('scales bread recipe accurately by flour weight using Baker’s Percentages', () => {
    const sourdough: BakersRecipe = {
      name: 'Country Sourdough',
      baseFlourGrams: 1000,
      ingredients: [
        { name: 'Bread Flour', percentage: 100, isBaseFlour: true },
        { name: 'Water (Hydration)', percentage: 72 },
        { name: 'Sourdough Starter', percentage: 20 },
        { name: 'Fine Sea Salt', percentage: 2.2 },
      ],
    };

    // Scale to 5,000g (5kg) flour
    const scaled = scaleRecipeByBakersPercentage(sourdough, 5000);
    expect(scaled.targetBaseFlourGrams).toBe(5000);
    expect(scaled.totalBatchWeightGrams).toBe(9710); // 5000 + 3600 + 1000 + 110 = 9710g

    const water = scaled.ingredients.find((i) => i.name === 'Water (Hydration)');
    expect(water?.weightGrams).toBe(3600); // 5000 * 0.72

    const salt = scaled.ingredients.find((i) => i.name === 'Fine Sea Salt');
    expect(salt?.weightGrams).toBe(110); // 5000 * 0.022
  });

  it('scales recipe by total dough batch weight', () => {
    const brioche: BakersRecipe = {
      name: 'Brioche Bun Dough',
      baseFlourGrams: 1000,
      ingredients: [
        { name: 'Flour', percentage: 100 },
        { name: 'Butter', percentage: 50 },
        { name: 'Eggs', percentage: 50 },
        { name: 'Milk', percentage: 20 },
        { name: 'Sugar', percentage: 12 },
        { name: 'Salt', percentage: 2 },
      ],
    };

    // Total percentage is 234%. For 4,680g total dough, required flour is 2,000g.
    const scaled = scaleRecipeByTotalBatchWeight(brioche, 4680);
    expect(scaled.targetBaseFlourGrams).toBe(2000);
    expect(scaled.totalBatchWeightGrams).toBe(4680);
  });

  it('scales standard prep recipe by target yield', () => {
    const aioli: StandardPrepRecipe = {
      name: 'Truffle Garlic Aioli',
      baseYield: 10,
      yieldUnit: 'portions',
      shelfLifeHours: 72,
      ingredients: [
        { name: 'Egg Yolks', amount: 4, unit: 'units' },
        { name: 'Canola Oil', amount: 500, unit: 'ml' },
        { name: 'Truffle Oil', amount: 50, unit: 'ml' },
        { name: 'Garlic Confit', amount: 60, unit: 'g' },
      ],
    };

    // Scale to 50 portions (5x)
    const scaled = scaleRecipeByTargetYield(aioli, 50);
    expect(scaled.scaleFactor).toBe(5);
    expect(scaled.targetYield).toBe(50);
    expect(scaled.ingredients.find((i) => i.name === 'Egg Yolks')?.amount).toBe(20);
    expect(scaled.ingredients.find((i) => i.name === 'Canola Oil')?.amount).toBe(2500);
  });

  it('calculates use-by date and expiration flags accurately', () => {
    const prep = new Date('2026-07-01T10:00:00Z');
    const { useByDate, useByFormatted } = calculateUseByDate(prep, 48);
    expect(useByDate.toISOString()).toBe('2026-07-03T10:00:00.000Z');
    expect(useByFormatted).toBeDefined();
  });

  it('formats 2"x1" and 2"x2" adhesive expiration labels with ESC/POS commands', () => {
    const batch: PrepBatch = {
      recipeName: 'House Garlic Aioli',
      batchNumber: 'LOT-202607-42',
      cookInitials: 'MK',
      prepDate: new Date('2026-07-01T08:00:00'),
      shelfLifeHours: 72,
      allergens: ['Eggs', 'Mustard'],
      storageLocation: 'Walk-In Cooler',
      storageTemp: '≤ 40°F (4°C)',
      yieldQuantity: 4,
      yieldUnit: 'quarts',
    };

    const label2x1 = formatAdhesiveLabel(batch, '2x1');
    expect(label2x1.format).toBe('2x1');
    expect(label2x1.cookInitials).toBe('MK');
    expect(label2x1.allergenWarningText).toContain('EGGS');
    expect(label2x1.formattedAscii).toContain('HOUSE GARLIC AIOLI');
    expect(label2x1.escPosCommands instanceof Uint8Array).toBe(true);
    expect(label2x1.escPosCommands.length).toBeGreaterThan(20);

    const label2x2 = formatAdhesiveLabel(batch, '2x2');
    expect(label2x2.format).toBe('2x2');
    expect(label2x2.qrCodeData).toContain('LOT-202607-42');
  });
});
