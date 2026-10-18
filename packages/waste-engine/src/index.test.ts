import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWaste, wastePct, type WasteEntry } from './index.js';

describe('Waste Engine: Waste Summary and Loss Percentage', () => {
  it('summarizes multiple waste entries by reason and identifies top wasted items', () => {
    const entries: WasteEntry[] = [
      { date: '2026-10-17', ingredient: 'Tenderloin', quantity: 2000, reason: 'trim', costPerGram: 0.05 },
      { date: '2026-10-17', ingredient: 'Tenderloin', quantity: 500, reason: 'overcook', costPerGram: 0.05 },
      { date: '2026-10-17', ingredient: 'Heavy Cream', quantity: 1000, reason: 'expired', costPerGram: 0.01 },
    ];

    const summary = summarizeWaste(entries);

    assert.equal(summary.totalGrams, 3500);
    assert.equal(summary.totalCost, 135);
    assert.equal(summary.byReason['trim']?.grams, 2000);
    assert.equal(summary.byReason['trim']?.cost, 100);
    assert.equal(summary.byReason['overcook']?.cost, 25);
    assert.equal(summary.byReason['expired']?.cost, 10);
    assert.equal(summary.topWastedIngredients[0]?.ingredient, 'Tenderloin');
    assert.equal(summary.topWastedIngredients[0]?.cost, 125);
  });

  it('calculates waste percentage of total food cost accurately', () => {
    assert.equal(wastePct(150, 5000), 3.0);
    assert.equal(wastePct(0, 5000), 0);
    assert.equal(wastePct(100, 0), 0);
  });
});
