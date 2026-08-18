import {
  scaleRecipeTree,
  flattenScaledTree,
  scaleByServings,
  calculateRatio,
  totalFormulaWeight,
  formatAmount,
  gramsToCups,
  cupsToGrams,
  computeRecipeCost,
  calculateCostVariance,
  summarizeWaste,
  calculateWastePercentage,
  generateShiftPrepPlan,
  projectBatchRequirement,
  type RecipeBlueprint,
  type InventoryStockItem,
  type WasteLogEntry,
} from '../../../packages/ratio-engine/src/index.ts';

console.log('--- STARTING ADVERSARIAL STRESS TESTS ---');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${msg}`);
  }
}

// 1. Deeply nested 3-level tree & multiple shared raw ingredients
const lev3Starter: RecipeBlueprint = {
  id: 'lev3-starter',
  name: 'Levain Starter',
  baseYield: 100,
  yieldUnit: 'g',
  ingredients: [
    { id: 'flour', name: 'Flour', ratio: 50, unit: 'g', costPerUnit: 0.002 },
    { id: 'water', name: 'Water', ratio: 50, unit: 'g', costPerUnit: 0.0001 },
  ],
};

const lev2Biga: RecipeBlueprint = {
  id: 'lev2-biga',
  name: 'Biga Pre-ferment',
  baseYield: 200,
  yieldUnit: 'g',
  ingredients: [
    { id: 'flour', name: 'Flour', ratio: 150, unit: 'g', costPerUnit: 0.002 },
    { id: 'lev3-starter', name: 'Levain Starter', ratio: 50, unit: 'g', subRecipe: lev3Starter },
  ],
};

const lev1Dough: RecipeBlueprint = {
  id: 'lev1-dough',
  name: 'Artisan Dough',
  baseYield: 1000,
  yieldUnit: 'g',
  ingredients: [
    { id: 'flour', name: 'Flour', ratio: 600, unit: 'g', costPerUnit: 0.002 },
    { id: 'water', name: 'Water', ratio: 400, unit: 'g', costPerUnit: 0.0001 },
    { id: 'salt', name: 'Salt', ratio: 20, unit: 'g', costPerUnit: 0.001 },
    { id: 'lev2-biga', name: 'Biga', ratio: 200, unit: 'g', subRecipe: lev2Biga },
  ],
};

const scaledDough = scaleRecipeTree(lev1Dough, 2000); // 2x
assert(scaledDough.targetYield === 2000, 'scaledDough targetYield is 2000');
assert(scaledDough.ingredients.length === 4, 'scaledDough ingredients count is 4');

const flatDough = flattenScaledTree(scaledDough);
// Expected Flour:
// lev1: 600 * 2 = 1200g
// lev2 (biga needed: 200 * 2 = 400g -> scaleFactor = 400/200 = 2): 150 * 2 = 300g
// lev3 (starter needed: 50 * 2 = 100g -> scaleFactor = 100/100 = 1): 50 * 1 = 50g
// Total Flour = 1200 + 300 + 50 = 1550g
assert(flatDough['flour'].amount === 1550, `Flat flour amount expected 1550, got ${flatDough['flour']?.amount}`);

// Expected Water:
// lev1: 400 * 2 = 800g
// lev3: 50 * 1 = 50g
// Total Water = 850g
assert(flatDough['water'].amount === 850, `Flat water amount expected 850, got ${flatDough['water']?.amount}`);
assert(flatDough['salt'].amount === 40, `Flat salt amount expected 40, got ${flatDough['salt']?.amount}`);

// 2. Format Amount Edge Cases
assert(formatAmount(0) === '0', 'formatAmount(0) is 0');
assert(formatAmount(-0) === '0', 'formatAmount(-0) is 0');
assert(formatAmount(1.0000) === '1', 'formatAmount(1.000) is 1');
assert(formatAmount(1.04) === '1', 'formatAmount(1.04) is 1');
assert(formatAmount(1.06) === '1.1', 'formatAmount(1.06) is 1.1');
assert(formatAmount(0.001) === '0', 'formatAmount(0.001) is 0');
assert(formatAmount(0.05) === '0.05', 'formatAmount(0.05) is 0.05');
assert(formatAmount(0.999) === '1', 'formatAmount(0.999) is 1');

// 3. Density Unit Conversions & Substring Priority
// Bread flour density = 125, Whole wheat = 130
assert(gramsToCups(130, 'whole wheat flour') === 1, 'whole wheat flour 130g = 1 cup');
assert(gramsToCups(125, 'bread flour') === 1, 'bread flour 125g = 1 cup');
assert(gramsToCups(220, 'dark brown sugar') === 1, 'dark brown sugar 220g = 1 cup');
assert(gramsToCups(0, 'flour') === 0, '0 grams = 0 cups');
assert(cupsToGrams(0, 'sugar') === 0, '0 cups = 0 grams');

// 4. Cost Variance Thresholds
const vExactOk = calculateCostVariance(100, 101.99);
assert(vExactOk.status === 'ok', '1.99% is ok');
const vExactWarnLow = calculateCostVariance(100, 102.0);
assert(vExactWarnLow.status === 'warn', '2.0% is warn');
const vExactWarnHigh = calculateCostVariance(100, 104.99);
assert(vExactWarnHigh.status === 'warn', '4.99% is warn');
const vExactAlert = calculateCostVariance(100, 105.0);
assert(vExactAlert.status === 'alert', '5.0% is alert');
const vNegAlert = calculateCostVariance(100, 95.0);
assert(vNegAlert.status === 'alert', '-5.0% is alert');

// 5. Shift Prep Plan with Overstocked Items
const overstockItems: InventoryStockItem[] = [
  { id: '1', ingredient: 'Eggs', currentStock: 50, parLevel: 30, unit: 'count' }, // overstocked
  { id: '2', ingredient: 'Butter', currentStock: 10, parLevel: 10, unit: 'kg' }, // at par
  { id: '3', ingredient: 'Milk', currentStock: 2, parLevel: 10, unit: 'l' }, // shortfall 8
];
const prepPlan = generateShiftPrepPlan(overstockItems, 'prep', '2026-08-16');
assert(prepPlan.tasks.length === 1, 'Only 1 task for understocked item');
assert(prepPlan.tasks[0]?.ingredient === 'Milk', 'Prep task is Milk');
assert(prepPlan.tasks[0]?.prepAmount === 8, 'Prep task amount is 8');

// 6. Waste Summarization Empty & Ties
const emptyWaste = summarizeWaste([]);
assert(emptyWaste.totalGrams === 0, 'Empty waste totalGrams is 0');
assert(emptyWaste.totalCost === 0, 'Empty waste totalCost is 0');
assert(emptyWaste.topWastedIngredients.length === 0, 'Empty waste topWastedIngredients is empty');

console.log(`\nADVERSARIAL STRESS TEST SUMMARY: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
