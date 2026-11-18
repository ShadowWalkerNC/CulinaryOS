import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORKFLOW_CATALOG, LIBRARY_VERSION, type WorkflowDefinition as ChefWorkflowDefinition } from './catalog.ts';
import { WORKFLOW_PACKS, PACK_IDS, PACK_CORE_IDS, type PackId, type WorkflowPack } from './packs.ts';

export { WORKFLOW_CATALOG, LIBRARY_VERSION, WORKFLOW_PACKS, PACK_IDS, PACK_CORE_IDS };
export type { ChefWorkflowDefinition, PackId, WorkflowPack };

export const REGULATED_14_ALLERGENS = [
  'celery',
  'cereals containing gluten',
  'crustaceans',
  'eggs',
  'fish',
  'lupin',
  'milk',
  'molluscs',
  'mustard',
  'nuts',
  'peanuts',
  'sesame seeds',
  'soya',
  'sulphur dioxide',
] as const;

export const FDA_TOP_9_ALLERGENS = [
  'milk',
  'eggs',
  'fish',
  'crustacean shellfish',
  'tree nuts',
  'peanuts',
  'wheat',
  'soybeans',
  'sesame',
] as const;

const FREE_CORE_SKILL_IDS = new Set<string>([
  ...Object.values(PACK_CORE_IDS).flat(),
  'allergen-management-system',
  'allergen-matrix-builder',
  'bakers-percentage-formula',
  'daily-brief-generator',
  'dish-costing-calculator',
  'foh-service-brief',
  'food-truck-loadout',
  'home-cooking-timeline',
  'home-pantry-meal-plan',
  'invoice-reconciliation',
  'menu-margin-review',
  'onboarding',
  'preferment-flour-accounting',
  'recipe-compliance-checker',
  'recipe-costing',
  'recipe-equipment-adaptation',
  'stock-variance',
]);

export interface ChefIntelligenceSkillSummary {
  id: string;
  title: string;
  zone: string;
  summary: string;
  aliases: string[];
  tier: 'free_core' | 'saas_pro';
  hasDeterministicFallback: true;
  inputs: string[];
  outputs: string[];
}

export function listChefIntelligenceCatalog(filter?: {
  zone?: string;
  pack?: PackId;
  tier?: 'free_core' | 'saas_pro';
  query?: string;
}): ChefIntelligenceSkillSummary[] {
  let items = WORKFLOW_CATALOG.map((wf): ChefIntelligenceSkillSummary => ({
    id: wf.id,
    title: wf.title,
    zone: wf.zone,
    summary: wf.summary,
    aliases: wf.aliases,
    tier: FREE_CORE_SKILL_IDS.has(wf.id) ? 'free_core' : 'saas_pro',
    hasDeterministicFallback: true,
    inputs: wf.inputs,
    outputs: wf.outputs,
  }));

  // Ensure specialized plugin skills are always present in the catalog
  const extraPluginSkills: ChefIntelligenceSkillSummary[] = [
    {
      id: 'dish-costing-calculator',
      title: 'Dish Costing Calculator (72% GP Standard)',
      zone: 'Recipe & Cost Engineering',
      summary: 'Calculate dish costings targeting 72% Gross Profit (28% food cost), AP/EP trim yield, ex-VAT net pricing, and margin sensitivity.',
      aliases: ['dish-cost', '72-gp-calculator'],
      tier: 'free_core',
      hasDeterministicFallback: true,
      inputs: ['Dish name and target GP %', 'Ingredients with gram weight, bulk price/kg, and trim yield %'],
      outputs: ['Net cost, 72% GP minimum selling price, gross menu price, and >40% dominant ingredient volatility alerts'],
    },
    {
      id: 'allergen-matrix-builder',
      title: '14-Allergen & FDA Top-9 Matrix Builder',
      zone: 'Food Safety & Allergens',
      summary: 'Construct and audit the kitchen 14-allergen matrix compliant with FIR, Natasha\'s Law, and FDA FASTER Act Top 9.',
      aliases: ['allergen-matrix', '14-allergens'],
      tier: 'free_core',
      hasDeterministicFallback: true,
      inputs: ['Dishes with ingredient lists and verified label versions'],
      outputs: ['Complete 14-allergen and FDA Top-9 matrix with explicit contains/free/cross-contact flags'],
    },
  ];

  for (const extra of extraPluginSkills) {
    if (!items.some((i) => i.id === extra.id)) {
      items.unshift(extra);
    }
  }

  if (filter?.pack) {
    const packObj = WORKFLOW_PACKS.find((p) => p.id === filter.pack);
    if (packObj) {
      const allowed = new Set(packObj.workflowIds);
      items = items.filter((i) => allowed.has(i.id));
    }
  }
  if (filter?.zone) {
    const z = filter.zone.toLowerCase();
    items = items.filter((i) => i.zone.toLowerCase().includes(z));
  }
  if (filter?.tier) {
    items = items.filter((i) => i.tier === filter.tier);
  }
  if (filter?.query) {
    const q = filter.query.toLowerCase();
    items = items.filter(
      (i) =>
        i.id.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.aliases.some((a) => a.toLowerCase().includes(q)),
    );
  }
  return items;
}

function resolveSkillsBaseDir(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(currentDir, '../../skills'),
    path.resolve(process.cwd(), 'packages/intelligence/skills'),
  ];
  return candidates.find((d) => fs.existsSync(d)) || candidates[0]!;
}

export function loadChefSkillMarkdown(skillIdOrAlias: string): {
  id: string;
  title: string;
  zone: string;
  tier: 'free_core' | 'saas_pro';
  markdown: string;
  workflow?: ChefWorkflowDefinition;
} | null {
  const normalized = skillIdOrAlias.trim().toLowerCase();
  const wf = WORKFLOW_CATALOG.find(
    (w) => w.id === normalized || w.aliases.includes(normalized),
  );
  const resolvedId = wf ? wf.id : normalized;
  const baseDir = resolveSkillsBaseDir();
  const mdPath = path.join(baseDir, resolvedId, 'SKILL.md');

  let markdown = '';
  if (fs.existsSync(mdPath)) {
    markdown = fs.readFileSync(mdPath, 'utf8');
  } else if (wf) {
    markdown = [
      `# ${wf.title}`,
      ``,
      `**Zone:** ${wf.zone}`,
      `**Summary:** ${wf.summary}`,
      ``,
      `## Required Inputs`,
      ...wf.inputs.map((inp) => `- ${inp}`),
      ``,
      `## Deterministic Outputs`,
      ...wf.outputs.map((out) => `- ${out}`),
      ``,
      `## Verified Example`,
      `**Input:** ${wf.example.input}`,
      ``,
      `**Output:**`,
      '```text',
      wf.example.output,
      '```',
    ].join('\n');
  } else {
    return null;
  }

  return {
    id: resolvedId,
    title: wf?.title || resolvedId,
    zone: wf?.zone || 'Kitchen Operations',
    tier: FREE_CORE_SKILL_IDS.has(resolvedId) ? 'free_core' : 'saas_pro',
    markdown,
    ...(wf ? { workflow: wf } : {}),
  };
}

export interface DishCostIngredientInput {
  name: string;
  weightGrams: number;
  bulkPricePerKg: number;
  trimYieldPct?: number;
}

export interface DishCostCalculationInput {
  name: string;
  ingredients: DishCostIngredientInput[];
  targetGpPct?: number;
  isVatRegistered?: boolean;
  vatRatePct?: number;
  menuPriceGross?: number | null;
}

export function calculateDishCost72GP(input: DishCostCalculationInput) {
  const name = input.name || 'Unnamed Dish';
  const targetGpPct = input.targetGpPct ?? 72;
  const isVatRegistered = input.isVatRegistered ?? false;
  const vatRatePct = input.vatRatePct ?? 20;
  const ingredients = input.ingredients || [];

  let totalRawFoodCost = 0;
  const breakdown: Array<{
    name: string;
    weightGrams: number;
    bulkPricePerKg: number;
    trimYieldPct: string;
    portionCost: number;
    pctOfPlate?: string;
  }> = [];

  for (const ing of ingredients) {
    const yieldFactor = ing.trimYieldPct && ing.trimYieldPct > 0 ? ing.trimYieldPct / 100 : 1.0;
    const effectiveCostPerKg = (ing.bulkPricePerKg || 0) / yieldFactor;
    const weightGrams = ing.weightGrams || 0;
    const itemCost = effectiveCostPerKg * (weightGrams / 1000);
    totalRawFoodCost += itemCost;

    breakdown.push({
      name: ing.name,
      weightGrams,
      bulkPricePerKg: ing.bulkPricePerKg,
      trimYieldPct: `${(yieldFactor * 100).toFixed(0)}%`,
      portionCost: itemCost,
    });
  }

  const targetFoodCostFactor = Math.max(0.01, (100 - targetGpPct) / 100);
  const minNetPrice = totalRawFoodCost / targetFoodCostFactor;
  const vatFactor = isVatRegistered ? 1 + vatRatePct / 100 : 1.0;
  const minMenuPriceGross = minNetPrice * vatFactor;

  let currentAnalysis = null;
  if (input.menuPriceGross && input.menuPriceGross > 0) {
    const currentNetPrice = isVatRegistered ? input.menuPriceGross / vatFactor : input.menuPriceGross;
    const actualFoodCostPct = (totalRawFoodCost / currentNetPrice) * 100;
    const actualGpPct = 100 - actualFoodCostPct;
    currentAnalysis = {
      menuPriceGross: input.menuPriceGross,
      currentNetPrice: Number(currentNetPrice.toFixed(2)),
      actualFoodCostPct: `${actualFoodCostPct.toFixed(1)}%`,
      actualGpPct: `${actualGpPct.toFixed(1)}%`,
      isOnTarget: actualGpPct >= targetGpPct,
      varianceGpPct: `${(actualGpPct - targetGpPct).toFixed(1)}%`,
      marginLeakPerPlate: actualGpPct < targetGpPct ? (minNetPrice - currentNetPrice).toFixed(2) : '0.00',
    };
  }

  const dominantAlerts = breakdown
    .filter((b) => totalRawFoodCost > 0 && b.portionCost / totalRawFoodCost > 0.4)
    .map(
      (b) =>
        `${b.name} represents ${((b.portionCost / totalRawFoodCost) * 100).toFixed(1)}% of total dish cost (high wholesale volatility risk)`,
    );

  return {
    dish: name,
    totalRawFoodCost: Number(totalRawFoodCost.toFixed(2)),
    targetGp: `${targetGpPct}%`,
    isVatRegistered,
    minNetPrice: Number(minNetPrice.toFixed(2)),
    minMenuPriceGross: Number(minMenuPriceGross.toFixed(2)),
    suggestedMenuPrice: Number((Math.ceil(minMenuPriceGross * 2) / 2).toFixed(2)),
    dominantIngredientAlerts: dominantAlerts,
    breakdown: breakdown.map((b) => ({
      ...b,
      portionCost: Number(b.portionCost.toFixed(2)),
      pctOfPlate: totalRawFoodCost > 0 ? `${((b.portionCost / totalRawFoodCost) * 100).toFixed(1)}%` : '0%',
    })),
    currentAnalysis,
  };
}

export interface RotaShiftEntry {
  staffId: string;
  name?: string;
  start: string;
  end: string;
}

export function auditRotaComplianceWTR(shifts: RotaShiftEntry[] = []) {
  const violations: Array<{
    type: string;
    staffId: string;
    name: string;
    restHoursReceived: number;
    requiredHours: number;
    severity: 'CRITICAL';
    details: string;
  }> = [];

  const sorted = [...shifts].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i]!;
    const next = sorted[i + 1]!;
    if (curr.staffId === next.staffId) {
      const finishTime = new Date(curr.end).getTime();
      const startTimeNext = new Date(next.start).getTime();
      const restHours = (startTimeNext - finishTime) / (1000 * 60 * 60);
      if (restHours < 11) {
        violations.push({
          type: 'WTR_REG_10_REST_INTERVAL_BREACH',
          staffId: curr.staffId,
          name: curr.name || curr.staffId,
          restHoursReceived: Number(restHours.toFixed(1)),
          requiredHours: 11,
          severity: 'CRITICAL',
          details: `Shift ending ${curr.end} followed by ${next.start} provides only ${restHours.toFixed(1)}h turnaround (minimum 11h required).`,
        });
      }
    }
  }

  return {
    totalShiftsChecked: sorted.length,
    compliant: violations.length === 0,
    violationCount: violations.length,
    violations,
  };
}

export function build14AllergenMatrix(
  dishes: Array<{ name: string; category?: string; ingredients: string[] }>,
) {
  const keywordMap: Record<string, string[]> = {
    celery: ['celery', 'celeriac'],
    'cereals containing gluten': ['wheat', 'flour', 'bread', 'brioche', 'pasta', 'rigatoni', 'barley', 'rye', 'oats', 'malt', 'crouton', 'panko'],
    crustaceans: ['shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'langoustine'],
    eggs: ['egg', 'mayonnaise', 'aioli', 'brioche', 'meringue', 'hollandaise', 'tiramisu'],
    fish: ['halibut', 'salmon', 'cod', 'anchovy', 'fish', 'tuna', 'trout', 'sea bass', 'worcestershire'],
    lupin: ['lupin'],
    milk: ['milk', 'cream', 'butter', 'cheese', 'cheddar', 'mozzarella', 'burrata', 'parmesan', 'pecorino', 'mascarpone', 'whey', 'yogurt'],
    molluscs: ['calamari', 'squid', 'mussel', 'oyster', 'clam', 'scallop', 'octopus'],
    mustard: ['mustard', 'dijon'],
    nuts: ['almond', 'walnut', 'hazelnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'pine nut'],
    peanuts: ['peanut', 'groundnut'],
    'sesame seeds': ['sesame', 'tahini'],
    soya: ['soy', 'soya', 'tofu', 'edamame', 'miso', 'tamari'],
    'sulphur dioxide': ['wine', 'vinegar', 'sulphite', 'sulfite', 'dried fruit'],
  };

  const rows = dishes.map((dish) => {
    const joined = dish.ingredients.join(' ').toLowerCase();
    const detected14: string[] = [];
    for (const [allergen, keywords] of Object.entries(keywordMap)) {
      if (keywords.some((kw) => joined.includes(kw))) {
        detected14.push(allergen);
      }
    }
    return {
      dish: dish.name,
      category: dish.category || 'Mains',
      ingredientsCount: dish.ingredients.length,
      allergensDetected: detected14,
      allergenFree: detected14.length === 0,
    };
  });

  return {
    standard: 'FIR 14 Regulated Allergens & Natasha\'s Law / FDA FASTER Act',
    regulatedAllergens: [...REGULATED_14_ALLERGENS],
    dishesAudited: rows.length,
    matrix: rows,
  };
}
