// ============================================================
// Tier 1 — F2.3: Per-Station Dual Translation (Granular Feature Tests)
// Covers: English FOH ➔ Spanish / French KDS & Chit translation,
// culinary terminology glossary, and primary/secondary formatting.
// ============================================================

import { describe, expect, it } from 'bun:test';

export type LanguageCode = 'es' | 'fr' | 'en';

export interface CulinaryTerm {
  en: string;
  es: string;
  fr: string;
}

export const CULINARY_DICTIONARY: Record<string, CulinaryTerm> = {
  'Ribeye Steak': { en: 'Ribeye Steak', es: 'Ojo de Bife', fr: 'Entrecôte' },
  'Caesar Salad': { en: 'Caesar Salad', es: 'Ensalada César', fr: 'Salade César' },
  'French Fries': { en: 'French Fries', es: 'Papas Fritas', fr: 'Frites' },
  'Medium Rare': { en: 'Medium Rare', es: 'Término Medio', fr: 'À point' },
  'Rare': { en: 'Rare', es: 'Poco Hecho', fr: 'Saignant' },
  'Well Done': { en: 'Well Done', es: 'Bien Cocido', fr: 'Bien Cuit' },
  'No Onions': { en: 'No Onions', es: 'Sin Cebolla', fr: 'Sans Oignon' },
  'Extra Sauce': { en: 'Extra Sauce', es: 'Salsa Extra', fr: 'Sauce Supplémentaire' },
  'Gluten Allergy': { en: 'Gluten Allergy', es: 'Alergia al Gluten', fr: 'Allergie au Gluten' },
};

export interface DualLanguageLineItem {
  originalEn: string;
  translatedPrimary: string;
  originalSubtitle: string;
  modifiers: Array<{ originalEn: string; translatedPrimary: string }>;
}

export function translateLineItem(
  nameEn: string,
  modifiersEn: string[],
  targetLanguage: LanguageCode
): DualLanguageLineItem {
  if (targetLanguage === 'en') {
    return {
      originalEn: nameEn,
      translatedPrimary: nameEn,
      originalSubtitle: '',
      modifiers: modifiersEn.map((m) => ({ originalEn: m, translatedPrimary: m })),
    };
  }

  const itemTerm = CULINARY_DICTIONARY[nameEn];
  const translatedPrimary = itemTerm ? itemTerm[targetLanguage] : nameEn;

  const translatedMods = modifiersEn.map((mod) => {
    const modTerm = CULINARY_DICTIONARY[mod];
    return {
      originalEn: mod,
      translatedPrimary: modTerm ? modTerm[targetLanguage] : mod,
    };
  });

  return {
    originalEn: nameEn,
    translatedPrimary,
    originalSubtitle: translatedPrimary !== nameEn ? `(${nameEn})` : '',
    modifiers: translatedMods,
  };
}

export function formatDualLanguageKdsCard(lineItem: DualLanguageLineItem): string {
  let card = `${lineItem.translatedPrimary}`;
  if (lineItem.originalSubtitle) {
    card += ` ${lineItem.originalSubtitle}`;
  }
  if (lineItem.modifiers.length > 0) {
    card += '\n' + lineItem.modifiers.map((m) => `  * ${m.translatedPrimary}`).join('\n');
  }
  return card;
}

describe('F2.3 Per-Station Dual Translation — Tier 1 Isolation', () => {
  it('1. translates English menu items to Spanish for Latin-American line cooks', () => {
    const result = translateLineItem('Ribeye Steak', ['Medium Rare', 'No Onions'], 'es');
    expect(result.translatedPrimary).toBe('Ojo de Bife');
    expect(result.originalSubtitle).toBe('(Ribeye Steak)');
    expect(result.modifiers[0].translatedPrimary).toBe('Término Medio');
    expect(result.modifiers[1].translatedPrimary).toBe('Sin Cebolla');
  });

  it('2. translates English menu items to French for French haute cuisine stations', () => {
    const result = translateLineItem('Caesar Salad', ['Extra Sauce'], 'fr');
    expect(result.translatedPrimary).toBe('Salade César');
    expect(result.originalSubtitle).toBe('(Caesar Salad)');
    expect(result.modifiers[0].translatedPrimary).toBe('Sauce Supplémentaire');
  });

  it('3. falls back to English verbatim for unknown custom modifications', () => {
    const customMod = 'Extra crispy on iron skillet with garlic butter';
    const result = translateLineItem('French Fries', [customMod], 'es');
    expect(result.translatedPrimary).toBe('Papas Fritas');
    expect(result.modifiers[0].translatedPrimary).toBe(customMod);
  });

  it('4. handles targetLanguage = "en" without redundant subtitle brackets', () => {
    const result = translateLineItem('Ribeye Steak', ['Rare'], 'en');
    expect(result.translatedPrimary).toBe('Ribeye Steak');
    expect(result.originalSubtitle).toBe('');
    expect(result.modifiers[0].translatedPrimary).toBe('Rare');
  });

  it('5. formats dual-language KDS card block with primary header and modifier list', () => {
    const item = translateLineItem('Ribeye Steak', ['Medium Rare', 'Gluten Allergy'], 'es');
    const cardText = formatDualLanguageKdsCard(item);
    expect(cardText).toContain('Ojo de Bife (Ribeye Steak)');
    expect(cardText).toContain('* Término Medio');
    expect(cardText).toContain('* Alergia al Gluten');
  });
});
