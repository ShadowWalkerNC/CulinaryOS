// ============================================================
// Tier 4 — Scenario 4: Morning Prep Batch Scaling, Adhesive Labels & Waste
// Features Exercised: F2.4 (1-Click Waste & Food Cost Variance),
// F2.5 (Batch Prep Recipe Scaling & Adhesive Thermal Labels),
// F3.2 (Post-Send Void Auto-Waste / Inventory Write-Off).
// ============================================================

import { describe, expect, it } from 'bun:test';
import { buildShiftPrep, getMiseEnPlace, projectBatchSize } from '@culinaryos/prep-engine';
import { formatAdhesiveLabel, type PrepBatch } from '../tier1-features/f2_5_batch_prep_labels.test.js';
import { summarizeWaste, wastePct, type WasteEntry } from '@culinaryos/waste-engine';
import { calcVariance, costRecipe } from '@culinaryos/food-cost-engine';
import { EscPosEncoder } from '@culinaryos/shared';

describe('Tier 4 — Scenario 4: Morning Prep Scaling, Labels & Waste', () => {
  it('executes end-to-end BOH morning prep workflow with label printing and waste variance analysis', () => {
    // 1. Shift Inventory Inspection & Par Level Prep Planning
    const pantryStock = [
      { ingredient: 'Hollandaise Base', currentStock: 1, parLevel: 6, unit: 'L' },
      { ingredient: 'Diced Shallots', currentStock: 2, parLevel: 5, unit: 'kg' },
      { ingredient: 'Béarnaise Reduction', currentStock: 0.5, parLevel: 3, unit: 'L' },
    ];
    const prepPlan = buildShiftPrep(pantryStock, 'AM Prep', '2026-09-01');
    expect(prepPlan.items).toHaveLength(3);
    expect(prepPlan.items.find((i) => i.ingredient === 'Hollandaise Base')?.prepAmount).toBe(5);

    // 2. Project Batch Requirement for Expected 120 Brunch Covers
    const portionGrams = 60; // 60g Hollandaise per egg benedict
    const expectedCovers = 120;
    const requiredBatchWeightGrams = projectBatchSize(portionGrams, expectedCovers, 1.15); // 15% safety
    expect(requiredBatchWeightGrams).toBe(8280); // 8.28 kg

    // 3. Scale Hollandaise Recipe using Baker's Percentages
    const hollandaiseRecipe = {
      id: 'rec-holl',
      name: 'Classic Hollandaise',
      baseIngredient: 'Egg Yolks',
      ingredients: [
        { name: 'Egg Yolks', ratio: 1.0, unit: 'g' },
        { name: 'Clarified Butter', ratio: 3.0, unit: 'g' },
        { name: 'Lemon Juice', ratio: 0.25, unit: 'g' },
        { name: 'White Wine Reduction', ratio: 0.2, unit: 'g' },
        { name: 'Kosher Salt & Cayenne', ratio: 0.05, unit: 'g' },
      ],
    };
    const mise = getMiseEnPlace(hollandaiseRecipe, 1800); // 1.8kg egg yolks base
    expect(mise.find((i) => i.ingredient === 'Clarified Butter')?.amount).toBe(5400); // 300% of 1800

    // 4. Print 2"x1" and 2"x2" Thermal Expiration Labels
    const batchData: PrepBatch = {
      id: 'batch-holl-0901',
      recipeName: 'Classic Hollandaise',
      prepDate: '2026-09-01T07:00:00.000Z',
      shelfLifeHours: 6, // Warm holding limit 6 hours for food safety
      cookInitials: 'EB',
      batchYieldGrams: 8200,
      allergens: ['dairy', 'egg'],
    };

    const label2x1 = formatAdhesiveLabel(batchData, '2x1');
    expect(label2x1.prepDateStr).toBe('2026-09-01 07:00');
    expect(label2x1.useByDateStr).toBe('2026-09-01 13:00');
    expect(label2x1.allergensWarning).toBe('CONTAINS: DAIRY, EGG');

    // Test ESC/POS printer stream output for thermal label
    const printer = new EscPosEncoder();
    printer.init().align('center').bold(true).line(label2x1.title).feed(1).line(`USE BY: ${label2x1.useByDateStr}`).cut();
    expect(printer.getBuffer().length).toBeGreaterThan(20);

    // 5. Morning Scrap & Trim Waste Logging
    const morningWaste: WasteEntry[] = [
      { date: '2026-09-01', ingredient: 'Clarified Butter Scum', quantity: 200, reason: 'trim', costPerGram: 0.015 }, // $3.00
      { date: '2026-09-01', ingredient: 'Broken Emulsion Test Batch', quantity: 300, reason: 'overcook', costPerGram: 0.02 }, // $6.00
    ];
    const wasteSummary = summarizeWaste(morningWaste);
    expect(wasteSummary.totalCost).toBe(9.00);

    // 6. Actual-vs-Theoretical Food Cost Variance Analysis
    const theoreticalFoodCost = 250.00;
    const actualFoodCost = 259.00; // Theoretical + $9.00 waste
    const variance = calcVariance(theoreticalFoodCost, actualFoodCost);
    // Variance = $9.00, Pct = (9 / 250) * 100 = 3.6% (WARN status)
    expect(variance.variance).toBe(9.00);
    expect(variance.variancePct).toBe(3.6);
    expect(variance.status).toBe('warn');
  });
});
