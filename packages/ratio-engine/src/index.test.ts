import { describe, it, expect } from '../../../scripts/bun-test-impl.js';
import {
  scaleBlueprint,
  computeCost,
  fromTotalWeight,
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
} from './index.ts';

// ---------------------------------------------------------------------------
// Legacy Fixtures & Tests
// ---------------------------------------------------------------------------

const legacySourdough = {
  id: 'sourdough',
  name: 'Sourdough Boule',
  baseYield: 1,
  yieldUnit: 'loaf',
  ingredients: [
    { id: 'flour',   name: 'Bread Flour', ratioWeight: 100, unit: 'g' as const },
    { id: 'water',   name: 'Water',       ratioWeight: 75,  unit: 'ml' as const },
    { id: 'starter', name: 'Starter',     ratioWeight: 20,  unit: 'g' as const },
    { id: 'salt',    name: 'Salt',        ratioWeight: 2,   unit: 'g' as const },
  ],
};

describe('Legacy scaleBlueprint', () => {
  it('scales to 12 loaves preserving ratios', () => {
    const scaled = scaleBlueprint(legacySourdough, 12);
    expect(scaled.find(i => i.id === 'flour')?.ratioWeight).toBe(1200);
    expect(scaled.find(i => i.id === 'water')?.ratioWeight).toBe(900);
  });

  it('throws on zero or negative yield', () => {
    expect(() => scaleBlueprint(legacySourdough, 0)).toThrow();
    expect(() => scaleBlueprint(legacySourdough, -5)).toThrow();
  });
});

describe('Legacy computeCost', () => {
  it('computes cost correctly', () => {
    const scaled = scaleBlueprint(legacySourdough, 1);
    const cost = computeCost(scaled, { flour: 0.002, water: 0, starter: 0.01, salt: 0.001 });
    // 100*0.002 + 75*0 + 20*0.01 + 2*0.001 = 0.2 + 0 + 0.2 + 0.002 = 0.402
    expect(cost).toBeCloseTo(0.402);
  });
});

describe('Legacy fromTotalWeight', () => {
  it('distributes total dough weight by ratio', () => {
    const result = fromTotalWeight(legacySourdough, 1970); // 100+75+20+2 = 197 ratio units, ×10
    expect(result.find(i => i.id === 'flour')?.ratioWeight).toBeCloseTo(1000);
    expect(result.find(i => i.id === 'water')?.ratioWeight).toBeCloseTo(750);
  });

  it('throws on zero ratio sum', () => {
    const emptyBlueprint = {
      id: 'empty',
      name: 'Empty',
      baseYield: 1,
      yieldUnit: 'item',
      ingredients: [],
    };
    expect(() => fromTotalWeight(emptyBlueprint, 500)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 1. Sub-Recipe Tree Scaling & Flattening Tests
// ---------------------------------------------------------------------------

const garlicConfit: RecipeBlueprint = {
  id: 'garlic-confit',
  name: 'Garlic Confit',
  baseYield: 100, // 100g
  yieldUnit: 'g',
  ingredients: [
    { id: 'garlic-cloves', name: 'Garlic Cloves', ratio: 80, unit: 'g', costPerUnit: 0.01 },
    { id: 'olive-oil', name: 'Olive Oil', ratio: 50, unit: 'ml', costPerUnit: 0.02 },
  ],
};

const tomatoSauce: RecipeBlueprint = {
  id: 'tomato-sauce',
  name: 'House Tomato Sauce',
  baseYield: 500, // 500g
  yieldUnit: 'g',
  ingredients: [
    { id: 'san-marzano', name: 'San Marzano Tomatoes', ratio: 400, unit: 'g', costPerUnit: 0.005 },
    { id: 'garlic-confit', name: 'Garlic Confit', ratio: 50, unit: 'g', subRecipe: garlicConfit },
    { id: 'salt', name: 'Kosher Salt', ratio: 5, unit: 'g', costPerUnit: 0.001 },
  ],
};

const margheritaPizza: RecipeBlueprint = {
  id: 'margherita-pizza',
  name: 'Margherita Pizza',
  baseYield: 1, // 1 pizza
  yieldUnit: 'pizza',
  ingredients: [
    { id: 'dough-ball', name: 'Pizza Dough Ball', ratio: 250, unit: 'g', costPerUnit: 0.003 },
    { id: 'tomato-sauce', name: 'Tomato Sauce', ratio: 80, unit: 'g', subRecipe: tomatoSauce },
    { id: 'mozzarella', name: 'Fresh Mozzarella', ratio: 100, unit: 'g', costPerUnit: 0.015 },
    { id: 'basil', name: 'Fresh Basil', ratio: 5, unit: 'g', costPerUnit: 0.04 },
  ],
};

describe('scaleRecipeTree', () => {
  it('scales nested sub-recipe trees recursively with correct costs', () => {
    const result = scaleRecipeTree(margheritaPizza, 10);
    expect(result.recipeId).toBe('margherita-pizza');
    expect(result.targetYield).toBe(10);
    expect(result.ingredients.length).toBe(4);

    // Dough: 250 * 10 = 2500g, cost = 2500 * 0.003 = 7.5
    const dough = result.ingredients.find(i => i.id === 'dough-ball');
    expect(dough?.amount).toBe(2500);
    expect(dough?.totalCost).toBeCloseTo(7.5);

    // Tomato sauce: 80 * 10 = 800g needed. Base yield is 500g, so sub-recipe scaleFactor = 800 / 500 = 1.6
    const sauce = result.ingredients.find(i => i.id === 'tomato-sauce');
    expect(sauce?.amount).toBe(800);
    expect(sauce?.subRecipeResult).toBeDefined();

    const sauceTree = sauce!.subRecipeResult!;
    expect(sauceTree.targetYield).toBe(800);

    // Nested garlic confit inside sauce: 50 * 1.6 = 80g needed. Base yield is 100g, scaleFactor = 80 / 100 = 0.8
    const confitInSauce = sauceTree.ingredients.find(i => i.id === 'garlic-confit');
    expect(confitInSauce?.amount).toBe(80);
    expect(confitInSauce?.subRecipeResult).toBeDefined();

    const confitTree = confitInSauce!.subRecipeResult!;
    expect(confitTree.targetYield).toBe(80);
    // Garlic cloves in confit: 80 * 0.8 = 64g, cost = 64 * 0.01 = 0.64
    const garlic = confitTree.ingredients.find(i => i.id === 'garlic-cloves');
    expect(garlic?.amount).toBe(64);
    expect(garlic?.totalCost).toBeCloseTo(0.64);

    // Olive oil in confit: 50 * 0.8 = 40ml, cost = 40 * 0.02 = 0.80
    const oil = confitTree.ingredients.find(i => i.id === 'olive-oil');
    expect(oil?.amount).toBe(40);
    expect(oil?.totalCost).toBeCloseTo(0.80);
    expect(confitTree.totalCost).toBeCloseTo(1.44);

    expect(result.totalCost).toBeGreaterThan(0);
  });

  it('throws on invalid targetYield or baseYield', () => {
    expect(() => scaleRecipeTree(margheritaPizza, 0)).toThrow();
    expect(() => scaleRecipeTree(margheritaPizza, -1)).toThrow();
    expect(() => scaleRecipeTree({ ...margheritaPizza, baseYield: 0 }, 5)).toThrow();
  });
});

describe('flattenScaledTree', () => {
  it('flattens nested recipe tree into consolidated raw ingredients', () => {
    const scaled = scaleRecipeTree(margheritaPizza, 10);
    const flat = flattenScaledTree(scaled);

    expect(flat['dough-ball']).toBeDefined();
    expect(flat['dough-ball'].amount).toBe(2500);
    expect(flat['mozzarella']).toBeDefined();
    expect(flat['mozzarella'].amount).toBe(1000);
    expect(flat['san-marzano']).toBeDefined();
    expect(flat['san-marzano'].amount).toBe(640); // 400 * 1.6
    expect(flat['garlic-cloves']).toBeDefined();
    expect(flat['garlic-cloves'].amount).toBe(64);
    expect(flat['olive-oil']).toBeDefined();
    expect(flat['olive-oil'].amount).toBe(40);

    // Sub-recipes themselves are flattened away into raw ingredients
    expect(flat['tomato-sauce']).toBeUndefined();
    expect(flat['garlic-confit']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Portion Scaling & Baker's Percentage Tests
// ---------------------------------------------------------------------------

describe('scaleByServings', () => {
  const portions = [
    { name: 'flour', amount: 100 },
    { name: 'sugar', amount: 50 },
    { name: 'eggs', amount: 2 },
  ];

  it('scales items by servings ratio', () => {
    const scaled = scaleByServings(portions, 4, 8);
    expect(scaled[0].amount).toBe(200);
    expect(scaled[1].amount).toBe(100);
    expect(scaled[2].amount).toBe(4);
  });

  it('handles 0 target servings', () => {
    const scaled = scaleByServings(portions, 4, 0);
    expect(scaled[0].amount).toBe(0);
  });

  it('throws on invalid baseServings or negative targetServings', () => {
    expect(() => scaleByServings(portions, 0, 4)).toThrow();
    expect(() => scaleByServings(portions, 4, -1)).toThrow();
  });
});

describe('calculateRatio', () => {
  it('calculates baker percentage relative to base ingredient (100%)', () => {
    expect(calculateRatio(375, 500)).toBe(75); // 75% hydration
    expect(calculateRatio(10, 500)).toBe(2);   // 2% salt
  });

  it('throws on zero or negative base weight', () => {
    expect(() => calculateRatio(100, 0)).toThrow();
    expect(() => calculateRatio(100, -500)).toThrow();
    expect(() => calculateRatio(-10, 500)).toThrow();
  });
});

describe('totalFormulaWeight', () => {
  const breadRecipe: RecipeBlueprint = {
    id: 'bread',
    name: 'Country Bread',
    baseIngredient: 'flour',
    baseYield: 1,
    yieldUnit: 'loaf',
    ingredients: [
      { id: 'flour', name: 'Flour', ratio: 100, unit: 'g' },
      { id: 'water', name: 'Water', ratio: 70, unit: 'g' },
      { id: 'starter', name: 'Starter', ratio: 20, unit: 'g' },
      { id: 'salt', name: 'Salt', ratio: 2, unit: 'g' },
    ],
  };

  it('calculates total formula dough weight given base ingredient weight', () => {
    // Total ratio = 100 + 70 + 20 + 2 = 192%
    // Base weight = 1000g flour -> total = 1920g dough
    expect(totalFormulaWeight(breadRecipe, 1000)).toBe(1920);
  });

  it('throws on zero or negative targetBaseWeight', () => {
    expect(() => totalFormulaWeight(breadRecipe, 0)).toThrow();
    expect(() => totalFormulaWeight(breadRecipe, -500)).toThrow();
  });
});

describe('formatAmount', () => {
  it('formats whole numbers cleanly', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(5)).toBe('5');
    expect(formatAmount(120)).toBe('120');
  });

  it('formats values >= 1 with up to 1 decimal place', () => {
    expect(formatAmount(1.5)).toBe('1.5');
    expect(formatAmount(2.0)).toBe('2');
    expect(formatAmount(3.25)).toBe('3.3');
  });

  it('formats values < 1 with up to 2 decimal places', () => {
    expect(formatAmount(0.75)).toBe('0.75');
    expect(formatAmount(0.5)).toBe('0.5');
    expect(formatAmount(0.125)).toBe('0.13');
    expect(formatAmount(0.004)).toBe('0');
  });

  it('handles invalid inputs gracefully', () => {
    expect(formatAmount(NaN)).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// 3. Density Unit Conversion Tests
// ---------------------------------------------------------------------------

describe('Density Unit Conversions (gramsToCups & cupsToGrams)', () => {
  it('converts flour (125g/cup) bidirectionally', () => {
    expect(gramsToCups(250, 'flour')).toBe(2);
    expect(cupsToGrams(2, 'flour')).toBe(250);
    expect(gramsToCups(125, 'All-Purpose Flour')).toBe(1);
    expect(gramsToCups(250, 'Unbleached Bread Flour')).toBe(2);
  });

  it('converts granulated sugar (200g/cup) and brown sugar (220g/cup)', () => {
    expect(gramsToCups(400, 'sugar')).toBe(2);
    expect(cupsToGrams(1, 'brown sugar')).toBe(220);
    expect(gramsToCups(200, 'White Granulated Sugar')).toBe(1);
  });

  it('converts butter (227g/cup), salt (273g/cup), kosher salt (218g/cup)', () => {
    expect(cupsToGrams(1, 'butter')).toBe(227);
    expect(cupsToGrams(1, 'kosher salt')).toBe(218);
    expect(cupsToGrams(1, 'table salt')).toBe(273);
  });

  it('converts rice (185g/cup) and oats (90g/cup)', () => {
    expect(cupsToGrams(2, 'rice')).toBe(370);
    expect(cupsToGrams(3, 'rolled oats')).toBe(270);
  });

  it('converts liquids: water (240g/cup), milk (240g/cup), oil (218g/cup), honey (340g/cup)', () => {
    expect(cupsToGrams(1, 'water')).toBe(240);
    expect(cupsToGrams(1, 'milk')).toBe(240);
    expect(cupsToGrams(1, 'olive oil')).toBe(218);
    expect(cupsToGrams(1, 'honey')).toBe(340);
  });

  it('returns null for unknown ingredients or invalid amounts', () => {
    expect(gramsToCups(100, 'unknown-exotic-fruit')).toBeNull();
    expect(cupsToGrams(2, 'unobtanium')).toBeNull();
    expect(gramsToCups(-50, 'flour')).toBeNull();
    expect(cupsToGrams(-1, 'sugar')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Food Costing & Variance Analysis Tests
// ---------------------------------------------------------------------------

describe('computeRecipeCost', () => {
  const ingredients = [
    { id: 'beef', name: 'Ground Beef', quantity: 200, unitCost: 0.015 }, // $3.00
    { id: 'bun', name: 'Brioche Bun', quantity: 1, unitCost: 0.75 },     // $0.75
    { id: 'cheese', name: 'Cheddar', quantity: 30, unitCost: 0.01 },     // $0.30
  ];

  it('computes recipe costs, per serving cost, and food cost percentage', () => {
    const analysis = computeRecipeCost(ingredients, 1, 15.0);
    expect(analysis.totalCost).toBeCloseTo(4.05);
    expect(analysis.costPerServing).toBeCloseTo(4.05);
    // 4.05 / 15.00 = 27%
    expect(analysis.foodCostPct).toBeCloseTo(27.0);
    expect(analysis.ingredientCosts.length).toBe(3);
  });

  it('handles zero servings and zero price gracefully', () => {
    const analysis = computeRecipeCost(ingredients, 0, 0);
    expect(analysis.costPerServing).toBe(0);
    expect(analysis.foodCostPct).toBe(0);
  });
});

describe('calculateCostVariance', () => {
  it('returns ok status for variance < 2%', () => {
    const result = calculateCostVariance(100, 101.5);
    expect(result.varianceDollars).toBeCloseTo(1.5);
    expect(result.variancePct).toBeCloseTo(1.5);
    expect(result.status).toBe('ok');
  });

  it('returns warn status for variance between 2% and 5%', () => {
    const result = calculateCostVariance(100, 103.5);
    expect(result.varianceDollars).toBeCloseTo(3.5);
    expect(result.variancePct).toBeCloseTo(3.5);
    expect(result.status).toBe('warn');
  });

  it('returns alert status for variance >= 5%', () => {
    const result = calculateCostVariance(100, 108.0);
    expect(result.varianceDollars).toBeCloseTo(8.0);
    expect(result.variancePct).toBeCloseTo(8.0);
    expect(result.status).toBe('alert');
  });

  it('evaluates status on absolute variance percentage (under-budget / negative variance)', () => {
    const result = calculateCostVariance(100, 94.0);
    expect(result.varianceDollars).toBeCloseTo(-6.0);
    expect(result.variancePct).toBeCloseTo(-6.0);
    expect(result.status).toBe('alert');
  });
});

// ---------------------------------------------------------------------------
// 5. Waste & Operations Summarization Tests
// ---------------------------------------------------------------------------

describe('summarizeWaste', () => {
  const wasteEntries: WasteLogEntry[] = [
    { ingredient: 'Salmon', quantityGrams: 500, costPerGram: 0.04, reason: 'spoilage' }, // $20
    { ingredient: 'Ribeye', quantityGrams: 300, costPerGram: 0.08, reason: 'overcook' }, // $24
    { ingredient: 'Salmon', quantityGrams: 200, costPerGram: 0.04, reason: 'trim' },     // $8
    { ingredient: 'Lettuce', quantityGrams: 400, costPerGram: 0.005, reason: 'spoilage' }, // $2
  ];

  it('aggregates waste weight, dollar loss, reasons, and top offenders', () => {
    const summary = summarizeWaste(wasteEntries);
    expect(summary.totalGrams).toBe(1400);
    expect(summary.totalCost).toBeCloseTo(54.0);

    // By reason breakdown
    expect(summary.byReason['spoilage'].grams).toBe(900);
    expect(summary.byReason['spoilage'].cost).toBeCloseTo(22.0);
    expect(summary.byReason['overcook'].cost).toBeCloseTo(24.0);
    expect(summary.byReason['trim'].cost).toBeCloseTo(8.0);

    // Top wasted items sorted by cost
    expect(summary.topWastedIngredients[0].ingredient).toBe('Salmon'); // $28 total
    expect(summary.topWastedIngredients[0].cost).toBeCloseTo(28.0);
    expect(summary.topWastedIngredients[1].ingredient).toBe('Ribeye'); // $24 total
    expect(summary.topWastedIngredients[2].ingredient).toBe('Lettuce'); // $2 total
  });
});

describe('calculateWastePercentage', () => {
  it('calculates waste as a percentage of total food cost', () => {
    expect(calculateWastePercentage(50, 1000)).toBe(5.0);
    expect(calculateWastePercentage(0, 1000)).toBe(0);
    expect(calculateWastePercentage(50, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Shift Prep & Projection Tests
// ---------------------------------------------------------------------------

describe('generateShiftPrepPlan', () => {
  const stockItems: InventoryStockItem[] = [
    { id: '1', ingredient: 'Diced Onions', currentStock: 2, parLevel: 10, unit: 'kg', station: 'prep' },
    { id: '2', ingredient: 'Tomato Sauce', currentStock: 8, parLevel: 8, unit: 'l', station: 'sauce' },
    { id: '3', ingredient: 'Burger Patties', currentStock: 15, parLevel: 50, unit: 'count', station: 'grill' },
  ];

  it('generates prep tasks only for items with a shortfall below par level', () => {
    const plan = generateShiftPrepPlan(stockItems, 'morning', '2026-08-16');
    expect(plan.shift).toBe('morning');
    expect(plan.date).toBe('2026-08-16');
    expect(plan.tasks.length).toBe(2);

    const onions = plan.tasks.find(t => t.ingredient === 'Diced Onions');
    expect(onions?.prepAmount).toBe(8);
    expect(onions?.station).toBe('prep');

    const patties = plan.tasks.find(t => t.ingredient === 'Burger Patties');
    expect(patties?.prepAmount).toBe(35);
    expect(patties?.station).toBe('grill');

    // Tomato sauce is at par, should not be in tasks
    expect(plan.tasks.find(t => t.ingredient === 'Tomato Sauce')).toBeUndefined();
  });
});

describe('projectBatchRequirement', () => {
  it('projects total batch weight with waste buffer factor', () => {
    // 200g portion * 50 covers * 1.10 buffer = 11000g
    expect(projectBatchRequirement(200, 50, 1.1)).toBeCloseTo(11000);
    // Default factor 1.0
    expect(projectBatchRequirement(150, 100)).toBe(15000);
  });

  it('throws on negative inputs', () => {
    expect(() => projectBatchRequirement(-100, 50)).toThrow();
    expect(() => projectBatchRequirement(100, -50)).toThrow();
    expect(() => projectBatchRequirement(100, 50, -1)).toThrow();
  });
});

