// ============================================================
// Tier 2 — F2.5: Batch Prep Scaling & Labels (Boundary & Corner Cases)
// Covers: 0 target weight, 0 shelf-life hours (immediate expiration),
// 0 covers projection, empty allergens, and all items already at par level.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { buildShiftPrep, getMiseEnPlace, projectBatchSize } from '@culinaryos/prep-engine';
import { formatAdhesiveLabel, type PrepBatch } from '../tier1-features/f2_5_batch_prep_labels.test.js';

describe('F2.5 Batch Prep & Labels — Tier 2 Boundaries', () => {
  const doughRecipe = {
    id: 'rec-brioche',
    name: 'Brioche Dough',
    baseIngredient: 'Flour',
    ingredients: [
      { name: 'Flour', ratio: 1.0, unit: 'g' },
      { name: 'Butter', ratio: 0.5, unit: 'g' },
      { name: 'Eggs', ratio: 0.5, unit: 'g' },
    ],
  };

  it('1. scales recipe to 0g target base weight returning 0g for all ingredients', () => {
    const scaled = getMiseEnPlace(doughRecipe, 0);
    expect(scaled.every((i) => i.amount === 0)).toBe(true);
  });

  it('2. returns empty shift prep list when all pantry items are at or above par level', () => {
    const fullStock = [
      { ingredient: 'Butter', currentStock: 10, parLevel: 10, unit: 'kg' },
      { ingredient: 'Flour', currentStock: 50, parLevel: 25, unit: 'kg' },
    ];
    const plan = buildShiftPrep(fullStock, 'Night Shift', '2026-09-01');
    expect(plan.items).toHaveLength(0);
  });

  it('3. calculates projected batch size as 0 when target covers is 0', () => {
    const projected = projectBatchSize(200, 0, 1.2);
    expect(projected).toBe(0);
  });

  it('4. calculates 0-hour shelf-life label setting use-by timestamp equal to prep timestamp', () => {
    const batch: PrepBatch = {
      id: 'batch-immediate',
      recipeName: 'Raw Shellfish Platter',
      prepDate: '2026-09-01T12:00:00.000Z',
      shelfLifeHours: 0, // Must serve immediately
      cookInitials: 'AM',
      batchYieldGrams: 1000,
      allergens: ['shellfish'],
    };
    const label = formatAdhesiveLabel(batch, '2x1');
    expect(label.prepDateStr).toBe(label.useByDateStr);
  });

  it('5. formats label with empty allergens array as "ALLERGEN FREE"', () => {
    const batch: PrepBatch = {
      id: 'batch-clean',
      recipeName: 'Steamed Jasmine Rice',
      prepDate: '2026-09-01T06:00:00.000Z',
      shelfLifeHours: 24,
      cookInitials: 'CK',
      batchYieldGrams: 5000,
      allergens: [],
    };
    const label = formatAdhesiveLabel(batch, '2x2');
    expect(label.allergensWarning).toBe('ALLERGEN FREE');
  });
});
