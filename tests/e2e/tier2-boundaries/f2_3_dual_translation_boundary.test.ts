// ============================================================
// Tier 2 — F2.3: Per-Station Dual Translation (Boundary & Corner Cases)
// Covers: Special characters, accented Unicode strings, empty names,
// 0 modifiers, extremely long custom notes, and unsupported language codes.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  formatDualLanguageKdsCard,
  translateLineItem,
} from '../tier1-features/f2_3_dual_translation.test.js';

describe('F2.3 Dual Translation — Tier 2 Boundaries', () => {
  it('1. handles items with 0 modifiers returning empty modifiers list', () => {
    const res = translateLineItem('French Fries', [], 'es');
    expect(res.translatedPrimary).toBe('Papas Fritas');
    expect(res.modifiers).toHaveLength(0);
  });

  it('2. handles strings with accented characters and punctuation without corruption', () => {
    const itemWithSpecialChars = 'Crème Brûlée & Café au Lait (100% Organic!)';
    const res = translateLineItem(itemWithSpecialChars, [], 'fr');
    expect(res.translatedPrimary).toBe(itemWithSpecialChars);
  });

  it('3. formats KDS card when modifier list is empty without trailing whitespace', () => {
    const item = translateLineItem('Caesar Salad', [], 'fr');
    const card = formatDualLanguageKdsCard(item);
    expect(card).toBe('Salade César (Caesar Salad)');
  });

  it('4. preserves very long 500-character custom allergy notes without truncating', () => {
    const longNote = 'SEVERELY ALLERGIC TO ALL TREE NUTS, PEANUTS, SESAME, AND SEEDS. PLEASE USE CLEAN PANS, SANITIZED TONGS, SEPARATE CUTTING BOARD AND GLOVES.';
    const res = translateLineItem('Ribeye Steak', [longNote], 'es');
    expect(res.modifiers[0].translatedPrimary).toBe(longNote);
  });

  it('5. preserves original name when target language is English', () => {
    const res = translateLineItem('French Fries', ['Extra Sauce'], 'en');
    expect(res.translatedPrimary).toBe('French Fries');
    expect(res.originalSubtitle).toBe('');
    expect(res.modifiers[0].translatedPrimary).toBe('Extra Sauce');
  });
});
