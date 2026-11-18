import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  listChefIntelligenceCatalog,
  loadChefSkillMarkdown,
  calculateDishCost72GP,
  auditRotaComplianceWTR,
  build14AllergenMatrix,
  WORKFLOW_PACKS,
  REGULATED_14_ALLERGENS,
} from '../src/index.ts';

describe('Absorbed Chef\'s Intelligence & Open Kitchen Toolkit Library', () => {
  it('exposes the full 118+ Chef\'s Intelligence skill catalog and 8 operational packs', () => {
    const all = listChefIntelligenceCatalog();
    assert.ok(all.length >= 118, `Expected at least 118 absorbed skills, got ${all.length}`);
    assert.equal(WORKFLOW_PACKS.length, 8);

    const freeCore = listChefIntelligenceCatalog({ tier: 'free_core' });
    const saasPro = listChefIntelligenceCatalog({ tier: 'saas_pro' });
    assert.ok(freeCore.length >= 20, 'Should expose free deterministic core skills');
    assert.ok(saasPro.length >= 80, 'Should expose SaaS Pro / Autopilot skills');
    assert.ok(all.every((s) => s.hasDeterministicFallback === true));
  });

  it('loads absorbed SKILL.md files by canonical ID or alias', () => {
    const brief = loadChefSkillMarkdown('daily-brief-generator');
    assert.ok(brief, 'Should load daily-brief-generator');
    assert.ok(brief.markdown.length > 50);

    const cost = loadChefSkillMarkdown('dish-costing-calculator');
    assert.ok(cost, 'Should load dish-costing-calculator');
    assert.equal(cost.tier, 'free_core');

    const byAlias = loadChefSkillMarkdown('agency-onboarding');
    assert.ok(byAlias, 'Should resolve alias agency-onboarding to agency-chef-onboarding-generator');
    assert.equal(byAlias.id, 'agency-chef-onboarding-generator');
  });

  it('calculates deterministic 72% GP dish costing with AP/EP trim yield and >40% dominant alerts', () => {
    const res = calculateDishCost72GP({
      name: 'Scottish Halibut with Brown Shrimp Butter',
      targetGpPct: 72,
      isVatRegistered: true,
      vatRatePct: 20,
      menuPriceGross: 38.0,
      ingredients: [
        { name: 'Scottish Halibut', weightGrams: 180, bulkPricePerKg: 28.0, trimYieldPct: 52 },
        { name: 'Brown Shrimp', weightGrams: 30, bulkPricePerKg: 32.0, trimYieldPct: 100 },
        { name: 'Unsalted Butter', weightGrams: 60, bulkPricePerKg: 7.2, trimYieldPct: 100 },
      ],
    });
    assert.ok(res.totalRawFoodCost > 10);
    assert.ok(res.minNetPrice > res.totalRawFoodCost);
    assert.ok(res.minMenuPriceGross > res.minNetPrice);
    assert.ok(res.dominantIngredientAlerts.length >= 1);
    assert.ok(res.currentAnalysis);
  });

  it('audits WTR Reg 10 11-hour daily rest turnaround breaches deterministically', () => {
    const report = auditRotaComplianceWTR([
      { staffId: 'chef_01', name: 'Marco (CDP)', start: '2026-10-24T15:00:00Z', end: '2026-10-24T23:30:00Z' },
      { staffId: 'chef_01', name: 'Marco (CDP)', start: '2026-10-25T07:00:00Z', end: '2026-10-25T15:30:00Z' },
    ]);
    assert.equal(report.compliant, false);
    assert.equal(report.violationCount, 1);
    assert.equal(report.violations[0]?.restHoursReceived, 7.5);
  });

  it('builds a 14-regulated-allergen FIR & Natasha\'s Law matrix across menu dishes', () => {
    assert.equal(REGULATED_14_ALLERGENS.length, 14);
    const matrix = build14AllergenMatrix([
      {
        name: 'Double Wagyu Smash Burger',
        category: 'Mains',
        ingredients: ['Brioche Bun', 'Wagyu Beef', 'Aged Cheddar Cheese', 'Dijon Mustard', 'Egg Aioli'],
      },
      {
        name: 'Charred Broccolini',
        category: 'Sides',
        ingredients: ['Broccolini', 'Olive Oil', 'Sea Salt', 'Lemon Juice'],
      },
    ]);
    assert.equal(matrix.dishesAudited, 2);
    assert.ok(matrix.matrix[0]?.allergensDetected.includes('cereals containing gluten'));
    assert.ok(matrix.matrix[0]?.allergensDetected.includes('milk'));
    assert.ok(matrix.matrix[0]?.allergensDetected.includes('mustard'));
    assert.ok(matrix.matrix[0]?.allergensDetected.includes('eggs'));
    assert.equal(matrix.matrix[1]?.allergenFree, true);
  });
});
