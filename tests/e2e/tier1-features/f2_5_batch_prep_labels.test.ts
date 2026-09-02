// ============================================================
// Tier 1 — F2.5: Batch Prep Scaling & Labels (Granular Feature Tests)
// Covers: Baker's ratio recipe scaling, mise en place generation,
// shelf-life expiration calculation, and 2"x1" / 2"x2" adhesive thermal label formatting.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { buildShiftPrep, getMiseEnPlace, projectBatchSize } from '@culinaryos/prep-engine';

export interface PrepBatch {
  id: string;
  recipeName: string;
  prepDate: string; // ISO string
  shelfLifeHours: number;
  cookInitials: string;
  batchYieldGrams: number;
  allergens: string[];
}

export interface AdhesiveLabel {
  format: '2x1' | '2x2';
  title: string;
  prepDateStr: string;
  useByDateStr: string;
  cookInitials: string;
  batchId: string;
  allergensWarning: string;
  qrPayload: string;
}

export function formatAdhesiveLabel(batch: PrepBatch, format: '2x1' | '2x2'): AdhesiveLabel {
  const prepTime = new Date(batch.prepDate);
  const useByTime = new Date(prepTime.getTime() + batch.shelfLifeHours * 3600 * 1000);

  return {
    format,
    title: batch.recipeName.toUpperCase(),
    prepDateStr: prepTime.toISOString().slice(0, 16).replace('T', ' '),
    useByDateStr: useByTime.toISOString().slice(0, 16).replace('T', ' '),
    cookInitials: batch.cookInitials.toUpperCase(),
    batchId: batch.id,
    allergensWarning: batch.allergens.length > 0 ? `CONTAINS: ${batch.allergens.join(', ').toUpperCase()}` : 'ALLERGEN FREE',
    qrPayload: `culinaryos://batch/${batch.id}?item=${encodeURIComponent(batch.recipeName)}&exp=${useByTime.getTime()}`,
  };
}

describe('F2.5 Batch Prep Scaling & Labels — Tier 1 Isolation', () => {
  const sourdoughRecipe = {
    id: 'rec-sourdough',
    name: 'Artisan Sourdough',
    baseIngredient: 'Bread Flour',
    ingredients: [
      { name: 'Bread Flour', ratio: 1.0, unit: 'g' },
      { name: 'Water', ratio: 0.72, unit: 'g' },
      { name: 'Sourdough Starter', ratio: 0.2, unit: 'g' },
      { name: 'Fine Sea Salt', ratio: 0.02, unit: 'g' },
    ],
  };

  it('1. scales recipe ingredients based on target base flour weight', () => {
    const miseList = getMiseEnPlace(sourdoughRecipe, 5000); // 5kg flour
    const flour = miseList.find((i) => i.ingredient === 'Bread Flour');
    const water = miseList.find((i) => i.ingredient === 'Water');
    const starter = miseList.find((i) => i.ingredient === 'Sourdough Starter');
    const salt = miseList.find((i) => i.ingredient === 'Fine Sea Salt');

    expect(flour?.amount).toBe(5000);
    expect(water?.amount).toBe(3600); // 72% of 5000
    expect(starter?.amount).toBe(1000); // 20% of 5000
    expect(salt?.amount).toBe(100); // 2% of 5000
  });

  it('2. projects required batch size covering expected covers with waste buffer', () => {
    const portionWeight = 250; // 250g portion
    const covers = 80;
    const wasteFactor = 1.15; // 15% safety buffer
    const projected = projectBatchSize(portionWeight, covers, wasteFactor);
    // 250 * 80 * 1.15 = 23,000g (23kg)
    expect(projected).toBe(23000);
  });

  it('3. builds shift prep list prioritizing items under par levels', () => {
    const stock = [
      { ingredient: 'Hollandaise Sauce', currentStock: 2, parLevel: 8, unit: 'L' },
      { ingredient: 'Diced Shallots', currentStock: 5, parLevel: 5, unit: 'kg' },
      { ingredient: 'Veal Demi-Glace', currentStock: 1, parLevel: 4, unit: 'L' },
    ];
    const plan = buildShiftPrep(stock, 'Morning Prep', '2026-09-01');
    expect(plan.items).toHaveLength(2);
    expect(plan.items.find((i) => i.ingredient === 'Hollandaise Sauce')?.prepAmount).toBe(6);
    expect(plan.items.find((i) => i.ingredient === 'Veal Demi-Glace')?.prepAmount).toBe(3);
  });

  it('4. calculates shelf-life use-by timestamp and formats 2"x1" adhesive label', () => {
    const batch: PrepBatch = {
      id: 'batch-0901-01',
      recipeName: 'Caesar Dressing',
      prepDate: '2026-09-01T08:00:00.000Z',
      shelfLifeHours: 72, // 3 days
      cookInitials: 'JD',
      batchYieldGrams: 4000,
      allergens: ['egg', 'fish', 'dairy'],
    };

    const label = formatAdhesiveLabel(batch, '2x1');
    expect(label.format).toBe('2x1');
    expect(label.title).toBe('CAESAR DRESSING');
    expect(label.prepDateStr).toBe('2026-09-01 08:00');
    expect(label.useByDateStr).toBe('2026-09-04 08:00');
    expect(label.cookInitials).toBe('JD');
    expect(label.allergensWarning).toBe('CONTAINS: EGG, FISH, DAIRY');
  });

  it('5. formats 2"x2" adhesive label with embedded QR verification payload', () => {
    const batch: PrepBatch = {
      id: 'batch-0901-02',
      recipeName: 'Chimichurri',
      prepDate: '2026-09-01T10:00:00.000Z',
      shelfLifeHours: 48,
      cookInitials: 'AM',
      batchYieldGrams: 2500,
      allergens: [],
    };

    const label = formatAdhesiveLabel(batch, '2x2');
    expect(label.format).toBe('2x2');
    expect(label.allergensWarning).toBe('ALLERGEN FREE');
    expect(label.qrPayload).toContain('culinaryos://batch/batch-0901-02');
  });
});
