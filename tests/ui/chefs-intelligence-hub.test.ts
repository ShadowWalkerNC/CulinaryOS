import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ChefsIntelligenceHub,
  computeLocalDishCost72GP,
  detectAllergensForDish,
  FALLBACK_RESILIENCE_MODES,
  OPERATIONAL_PACKS_METADATA,
  REGULATED_ALLERGEN_DEFINITIONS,
} from '../../packages/ui/src/components/ChefsIntelligenceHub.tsx';

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Chef's Intelligence UI Hub (@culinaryos/ui + Admin + KitchenKit + Ops)", () => {
  it('exports ChefsIntelligenceHub from @culinaryos/ui index.ts', () => {
    const uiIndexSource = readFileSync(
      join(process.cwd(), 'packages/ui/src/index.ts'),
      'utf8'
    );
    expect(uiIndexSource).toContain("export * from './components/ChefsIntelligenceHub'");
    expect(typeof ChefsIntelligenceHub).toBe('function');
  });

  it('enforces Rule 13 ergonomics (48px touch targets, 6-state tactile spring, focus rings, zero emojis)', () => {
    const hubSource = readFileSync(
      join(process.cwd(), 'packages/ui/src/components/ChefsIntelligenceHub.tsx'),
      'utf8'
    );

    expect(emojiRegex.test(hubSource)).toBe(false);
    expect(hubSource).toContain('min-h-[48px]');
    expect(hubSource).toContain('active:scale-[0.97] transition-transform duration-75 ease-out');
    expect(hubSource).toContain('focus-visible:ring-2');
  });

  it('implements deterministic 72% GP dish costing with $0.50-rounded suggested menu price', () => {
    const res = computeLocalDishCost72GP({
      dishName: 'Pan-Seared Halibut, Brown Butter & Caper',
      targetGpPct: 72,
      isVatRegistered: true,
      vatRatePct: 20,
      ingredients: [
        {
          id: '1',
          name: 'North Atlantic Halibut Fillet',
          weightGrams: 180,
          bulkPricePerKg: 28.5,
          trimYieldPct: 78,
        },
        {
          id: '2',
          name: 'Normandy Cultured Butter',
          weightGrams: 35,
          bulkPricePerKg: 11.2,
          trimYieldPct: 100,
        },
      ],
    });

    expect(res.dish).toBe('Pan-Seared Halibut, Brown Butter & Caper');
    expect(res.targetGp).toBe('72%');
    expect(res.totalRawFoodCost).toBeGreaterThan(0);
    expect(res.minNetPrice).toBeGreaterThan(res.totalRawFoodCost);
    expect(res.minMenuPriceGross).toBeGreaterThan(res.minNetPrice);
    // Suggested menu price is rounded up to nearest $0.50 increment
    expect((res.suggestedMenuPrice * 100) % 50).toBe(0);
    expect(res.dominantIngredientAlerts.length).toBeGreaterThan(0);
  });

  it('audits all 14 FIR / Natasha Law allergens + FDA Top-9 and shared fryer/grill cross-contact', () => {
    expect(REGULATED_ALLERGEN_DEFINITIONS).toHaveLength(14);

    const detected = detectAllergensForDish({
      id: 'dish-test',
      dishName: 'Tempura Prawn & Sesame Aioli',
      station: 'Fry Station',
      ingredientsText: 'tiger prawn shrimp, wheat flour, egg mayo, sesame oil, soy tamari',
      sharedFryer: true,
      sharedGrill: false,
      overrides: {},
    });

    expect(detected.crustaceans).toBe('contains');
    expect(detected.gluten).toBe('contains');
    expect(detected.eggs).toBe('contains');
    expect(detected.sesame).toBe('contains');
    expect(detected.soybeans).toBe('contains');
    // Shared fryer cross-contact flags fish
    expect(detected.fish).toBe('cross_contact');
    expect(detected.lupin).toBe('free');
  });

  it('includes all 8 operational packs and 5 active failure-mode resilience fallbacks', () => {
    const packIds = OPERATIONAL_PACKS_METADATA.map((p) => p.id);
    expect(packIds).toEqual([
      'operations',
      'bakery',
      'food-truck',
      'bar-foh',
      'shops',
      'people',
      'care',
      'home',
    ]);

    const totalSkillsAcrossPacks = OPERATIONAL_PACKS_METADATA.reduce(
      (sum, p) => sum + p.skillCount,
      0
    );
    expect(totalSkillsAcrossPacks).toBe(121);

    const fallbackKeys = FALLBACK_RESILIENCE_MODES.map((f) => f.key);
    expect(fallbackKeys).toEqual([
      'wanOutage',
      'printerDropOrJam',
      'paymentIdempotency',
      'saasTokenExpiry',
      'aiProviderDownOrDisabled',
    ]);
  });

  it('wires ChefsIntelligenceHub into apps/admin, apps/kitchenkit, and apps/ops', () => {
    const adminPageSource = readFileSync(
      join(process.cwd(), 'apps/admin/src/pages/ChefsIntelligencePage.tsx'),
      'utf8'
    );
    const adminAppSource = readFileSync(
      join(process.cwd(), 'apps/admin/src/App.tsx'),
      'utf8'
    );
    const kitchenkitAppSource = readFileSync(
      join(process.cwd(), 'apps/kitchenkit/src/App.tsx'),
      'utf8'
    );
    const opsAppSource = readFileSync(
      join(process.cwd(), 'apps/ops/src/App.tsx'),
      'utf8'
    );

    expect(emojiRegex.test(adminPageSource)).toBe(false);
    expect(adminPageSource).toContain('ChefsIntelligenceHub');
    expect(adminPageSource).toContain('surface="admin"');
    expect(adminAppSource).toContain('ChefsIntelligencePage');
    expect(adminAppSource).toContain('/intelligence');
    expect(adminAppSource).toContain("Chef's Intelligence");

    expect(kitchenkitAppSource).toContain('ChefsIntelligenceHub');
    expect(kitchenkitAppSource).toContain('chefs-intelligence');
    expect(kitchenkitAppSource).toContain("Chef's Intelligence (121 Skills)");
    expect(kitchenkitAppSource).toContain('surface="kitchenkit"');

    expect(opsAppSource).toContain('ChefsIntelligenceHub');
    expect(opsAppSource).toContain('chefs-intelligence');
    expect(opsAppSource).toContain("Chef's Intelligence");
    expect(opsAppSource).toContain('surface="ops"');
  });
});
