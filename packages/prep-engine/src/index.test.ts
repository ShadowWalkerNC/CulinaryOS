import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildShiftPrep, getMiseEnPlace, projectBatchSize, type PrepItem } from './index.js';
import type { Recipe } from '@culinaryos/ratio-engine';

describe('Prep Engine: Shift Prep and Batch Projections', () => {
  it('builds a shift prep plan by calculating deficits against par levels', () => {
    const stockItems: PrepItem[] = [
      { ingredient: 'Diced Onions', currentStock: 2, parLevel: 5, unit: 'kg' },
      { ingredient: 'Demi-Glace', currentStock: 4, parLevel: 4, unit: 'L' },
      { ingredient: 'Chopped Parsley', currentStock: 0.5, parLevel: 2, unit: 'kg' },
    ];

    const plan = buildShiftPrep(stockItems, 'Dinner', '2026-10-17');

    assert.equal(plan.shift, 'Dinner');
    assert.equal(plan.date, '2026-10-17');
    assert.equal(plan.items.length, 2);
    assert.deepEqual(plan.items[0], {
      ingredient: 'Diced Onions',
      prepAmount: 3,
      unit: 'kg',
    });
    assert.deepEqual(plan.items[1], {
      ingredient: 'Chopped Parsley',
      prepAmount: 1.5,
      unit: 'kg',
    });
  });

  it('calculates mise en place based on base ingredient scaling', () => {
    const vinaigrette: Recipe = {
      id: 'vin-01',
      name: 'Vinaigrette',
      baseIngredient: 'Oil',
      ingredients: [
        { name: 'Oil', ratio: 1.0, unit: 'ml' },
        { name: 'Vinegar', ratio: 0.33, unit: 'ml' },
      ],
    };

    const mise = getMiseEnPlace(vinaigrette, 300);
    assert.equal(mise.length, 2);
    assert.deepEqual(mise[0], { ingredient: 'Oil', amount: 300, unit: 'ml' });
    assert.deepEqual(mise[1], { ingredient: 'Vinegar', amount: 99, unit: 'ml' });
  });

  it('projects required batch size considering covers and waste factor', () => {
    // 200g portion * 50 covers * 1.1 waste factor = 11000g
    const totalBatch = projectBatchSize(200, 50, 1.1);
    assert.equal(totalBatch, 11000);
  });
});
