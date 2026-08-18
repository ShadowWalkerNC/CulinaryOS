// ============================================================================
// Empirical Adversarial Stress Test Suite for packages/ratio-engine
// Challenger 1 (Milestone 1: Ratio Engine Consolidation & Database Types)
// ============================================================================

import { describe, it, expect } from '../../scripts/bun-test-impl.js';
import assert from 'node:assert';
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
  scaleBlueprint,
  computeCost,
  fromTotalWeight,
  type RecipeBlueprint,
  type InventoryStockItem,
  type WasteLogEntry,
  type RatioBlueprint,
} from '../../packages/ratio-engine/src/index.ts';

// ----------------------------------------------------------------------------
// SUITE 1: Deeply Nested Sub-Recipe Trees (3+ to 5 Levels Deep) & DAG Scaling
// ----------------------------------------------------------------------------
describe('SUITE 1: Deeply Nested Sub-Recipe Trees & DAG Scaling', () => {
  // Level 5: Herb Salt
  const herbSalt: RecipeBlueprint = {
    id: 'herb-salt',
    name: 'Herb Finishing Salt',
    baseYield: 100, // 100g
    yieldUnit: 'g',
    ingredients: [
      { id: 'sea-salt', name: 'Flaky Sea Salt', ratio: 80, unit: 'g', costPerUnit: 0.02 }, // $1.60
      { id: 'dried-rosemary', name: 'Dried Rosemary', ratio: 10, unit: 'g', costPerUnit: 0.05 }, // $0.50
      { id: 'dried-thyme', name: 'Dried Thyme', ratio: 10, unit: 'g', costPerUnit: 0.05 }, // $0.50
    ], // Base cost = 1.60 + 0.50 + 0.50 = $2.60 per 100g ($0.026/g)
  };

  // Level 4: Herb Compound Butter
  const herbButter: RecipeBlueprint = {
    id: 'herb-butter',
    name: 'Garlic Herb Compound Butter',
    baseYield: 250, // 250g
    yieldUnit: 'g',
    ingredients: [
      { id: 'unsalted-butter', name: 'Unsalted Butter', ratio: 200, unit: 'g', costPerUnit: 0.015 }, // $3.00
      { id: 'herb-salt', name: 'Herb Salt', ratio: 20, unit: 'g', subRecipe: herbSalt }, // 20g / 100g * $2.60 = $0.52
      { id: 'fresh-garlic', name: 'Minced Garlic', ratio: 30, unit: 'g', costPerUnit: 0.01 }, // $0.30
    ], // Base cost = 3.00 + 0.52 + 0.30 = $3.82 per 250g ($0.01528/g)
  };

  // Level 3: Brioche Dough
  const briocheDough: RecipeBlueprint = {
    id: 'brioche-dough',
    name: 'Enriched Brioche Dough',
    baseYield: 1000, // 1000g
    yieldUnit: 'g',
    ingredients: [
      { id: 'bread-flour', name: 'Bread Flour', ratio: 500, unit: 'g', costPerUnit: 0.002 }, // $1.00
      { id: 'eggs', name: 'Whole Eggs', ratio: 250, unit: 'g', costPerUnit: 0.006 }, // $1.50
      { id: 'milk', name: 'Whole Milk', ratio: 100, unit: 'ml', costPerUnit: 0.001 }, // $0.10
      { id: 'herb-butter', name: 'Herb Butter', ratio: 150, unit: 'g', subRecipe: herbButter }, // 150g / 250g * $3.82 = $2.292
    ], // Base cost = 1.00 + 1.50 + 0.10 + 2.292 = $4.892 per 1000g
  };

  // Level 2: Beef Wellington Filling Unit
  const wellingtonFilling: RecipeBlueprint = {
    id: 'wellington-unit',
    name: 'Single Beef Wellington',
    baseYield: 1, // 1 unit
    yieldUnit: 'portion',
    ingredients: [
      { id: 'beef-tenderloin', name: 'Beef Tenderloin Center Cut', ratio: 200, unit: 'g', costPerUnit: 0.06 }, // $12.00
      { id: 'mushroom-duxelles', name: 'Mushroom Duxelles', ratio: 60, unit: 'g', costPerUnit: 0.02 }, // $1.20
      { id: 'prosciutto', name: 'Prosciutto di Parma', ratio: 40, unit: 'g', costPerUnit: 0.05 }, // $2.00
      { id: 'brioche-dough', name: 'Brioche Dough Encasement', ratio: 150, unit: 'g', subRecipe: briocheDough }, // 150g / 1000g * $4.892 = $0.7338
    ], // Base cost = 12.00 + 1.20 + 2.00 + 0.7338 = $15.9338 per portion
  };

  // Level 1 (Root): Banquet Platter (5 levels deep down to salt/herbs)
  const banquetPlatter: RecipeBlueprint = {
    id: 'banquet-platter',
    name: 'Executive Wellington Banquet Platter',
    baseYield: 10, // 10 platters (each platter has 2 wellingtons = 20 wellington units)
    yieldUnit: 'platter',
    ingredients: [
      { id: 'wellington-unit', name: 'Beef Wellington Units', ratio: 20, unit: 'count', subRecipe: wellingtonFilling }, // 20 units
      { id: 'demi-glace', name: 'Truffle Demi-Glace', ratio: 500, unit: 'ml', costPerUnit: 0.02 }, // $10.00
      { id: 'micro-greens', name: 'Microgreen Garnish', ratio: 50, unit: 'g', costPerUnit: 0.08 }, // $4.00
    ], // Base cost = (20 * 15.9338) + 10.00 + 4.00 = $318.676 + 14.00 = $332.676 per 10 platters ($33.2676 per platter)
  };

  it('1.1: Recursively scales a 5-level deep sub-recipe tree accurately', () => {
    // Scale to 25 platters (scale factor = 25 / 10 = 2.5)
    const scaled = scaleRecipeTree(banquetPlatter, 25);

    expect(scaled.recipeId).toBe('banquet-platter');
    expect(scaled.targetYield).toBe(25);
    expect(scaled.ingredients.length).toBe(3);

    // Level 1 -> 2: Wellington count = 20 * 2.5 = 50 units
    const wellingtonIng = scaled.ingredients.find(i => i.id === 'wellington-unit');
    assert(wellingtonIng && wellingtonIng.subRecipeResult);
    expect(wellingtonIng.amount).toBe(50);
    const wellingtonTree = wellingtonIng.subRecipeResult;
    expect(wellingtonTree.targetYield).toBe(50);

    // Level 2 -> 3: Brioche dough = 150g * 50 = 7500g dough
    const doughIng = wellingtonTree.ingredients.find(i => i.id === 'brioche-dough');
    assert(doughIng && doughIng.subRecipeResult);
    expect(doughIng.amount).toBe(7500);
    const doughTree = doughIng.subRecipeResult;
    expect(doughTree.targetYield).toBe(7500);

    // Level 3 -> 4: Herb Butter in dough = (150g / 1000g) * 7500 = 1125g butter
    const butterIng = doughTree.ingredients.find(i => i.id === 'herb-butter');
    assert(butterIng && butterIng.subRecipeResult);
    expect(butterIng.amount).toBe(1125);
    const butterTree = butterIng.subRecipeResult;
    expect(butterTree.targetYield).toBe(1125);

    // Level 4 -> 5: Herb Salt in butter = (20g / 250g) * 1125 = 90g herb salt
    const saltIng = butterTree.ingredients.find(i => i.id === 'herb-salt');
    assert(saltIng && saltIng.subRecipeResult);
    expect(saltIng.amount).toBe(90);
    const saltTree = saltIng.subRecipeResult;
    expect(saltTree.targetYield).toBe(90);

    // Level 5 Leaf: Sea Salt in Herb Salt = (80g / 100g) * 90 = 72g salt
    const seaSalt = saltTree.ingredients.find(i => i.id === 'sea-salt');
    assert(seaSalt);
    expect(seaSalt.amount).toBe(72);
    expect(seaSalt.totalCost).toBeCloseTo(72 * 0.02); // $1.44

    // Cost verification: 25 platters = 2.5 * $332.676 = $831.69
    expect(scaled.totalCost).toBeCloseTo(332.676 * 2.5, 2);
  });

  it('1.2: Flattens 5-level deep tree into exact leaf raw ingredients without sub-recipe artifacts', () => {
    const scaled = scaleRecipeTree(banquetPlatter, 25);
    const flat = flattenScaledTree(scaled);

    // Sub-recipes MUST be removed from flat keys
    expect(flat['wellington-unit']).toBeUndefined();
    expect(flat['brioche-dough']).toBeUndefined();
    expect(flat['herb-butter']).toBeUndefined();
    expect(flat['herb-salt']).toBeUndefined();

    // Raw ingredients MUST exist with precise consolidated quantities:
    // Demi-glace: 500ml * 2.5 = 1250ml
    expect(flat['demi-glace'].amount).toBe(1250);
    // Micro greens: 50g * 2.5 = 125g
    expect(flat['micro-greens'].amount).toBe(125);
    // Beef Tenderloin: 200g * 50 units = 10,000g (10kg)
    expect(flat['beef-tenderloin'].amount).toBe(10000);
    // Mushroom Duxelles: 60g * 50 = 3000g
    expect(flat['mushroom-duxelles'].amount).toBe(3000);
    // Prosciutto: 40g * 50 = 2000g
    expect(flat['prosciutto'].amount).toBe(2000);
    // Bread Flour: 500g * 7.5 = 3750g
    expect(flat['bread-flour'].amount).toBe(3750);
    // Eggs: 250g * 7.5 = 1875g
    expect(flat['eggs'].amount).toBe(1875);
    // Milk: 100ml * 7.5 = 750ml
    expect(flat['milk'].amount).toBe(750);
    // Unsalted Butter: 200g * (1125 / 250) = 200 * 4.5 = 900g
    expect(flat['unsalted-butter'].amount).toBe(900);
    // Fresh Garlic: 30g * 4.5 = 135g
    expect(flat['fresh-garlic'].amount).toBe(135);
    // Sea Salt: 80g * 0.9 = 72g
    expect(flat['sea-salt'].amount).toBe(72);
    // Rosemary: 10g * 0.9 = 9g
    expect(flat['dried-rosemary'].amount).toBe(9);
    // Thyme: 10g * 0.9 = 9g
    expect(flat['dried-thyme'].amount).toBe(9);

    // Sum of all flattened items' totalCost must equal scaled.totalCost exactly
    const flattenedTotalCost = Object.values(flat).reduce((sum, item) => sum + item.totalCost, 0);
    expect(flattenedTotalCost).toBeCloseTo(scaled.totalCost, 4);
  });

  it('1.3: Handles Multi-Branch Shared Sub-Recipes (Diamond DAG) with proper additive consolidation', () => {
    // Shared Base: Garlic Confit
    const confit: RecipeBlueprint = {
      id: 'shared-confit',
      name: 'Garlic Confit',
      baseYield: 100,
      yieldUnit: 'g',
      ingredients: [
        { id: 'garlic-cloves', name: 'Garlic Cloves', ratio: 80, unit: 'g', costPerUnit: 0.01 },
        { id: 'olive-oil', name: 'Olive Oil', ratio: 50, unit: 'ml', costPerUnit: 0.02 },
      ],
    };

    // Branch A: Confit Aioli
    const aioli: RecipeBlueprint = {
      id: 'aioli',
      name: 'Confit Aioli',
      baseYield: 200,
      yieldUnit: 'g',
      ingredients: [
        { id: 'egg-yolks', name: 'Egg Yolks', ratio: 40, unit: 'g', costPerUnit: 0.01 },
        { id: 'shared-confit', name: 'Garlic Confit', ratio: 60, unit: 'g', subRecipe: confit },
      ],
    };

    // Branch B: Tomato Confit Relish
    const relish: RecipeBlueprint = {
      id: 'relish',
      name: 'Tomato Confit Relish',
      baseYield: 300,
      yieldUnit: 'g',
      ingredients: [
        { id: 'tomatoes', name: 'Diced Tomatoes', ratio: 200, unit: 'g', costPerUnit: 0.005 },
        { id: 'shared-confit', name: 'Garlic Confit', ratio: 50, unit: 'g', subRecipe: confit },
      ],
    };

    // Root Dish: Artisan Burger (uses BOTH Aioli and Relish)
    const burger: RecipeBlueprint = {
      id: 'artisan-burger',
      name: 'Artisan Burger Combo',
      baseYield: 1,
      yieldUnit: 'portion',
      ingredients: [
        { id: 'patty', name: 'Beef Patty', ratio: 180, unit: 'g', costPerUnit: 0.02 },
        { id: 'aioli', name: 'Aioli', ratio: 30, unit: 'g', subRecipe: aioli },
        { id: 'relish', name: 'Relish', ratio: 40, unit: 'g', subRecipe: relish },
      ],
    };

    // Scale to 10 burgers
    const scaled = scaleRecipeTree(burger, 10);
    const flat = flattenScaledTree(scaled);

    // In 10 burgers:
    // Aioli needed: 30g * 10 = 300g (scale factor 300 / 200 = 1.5)
    // Confit in Aioli: 60g * 1.5 = 90g confit (scale factor 90 / 100 = 0.9)
    //   -> Garlic in Aioli: 80 * 0.9 = 72g
    //   -> Olive Oil in Aioli: 50 * 0.9 = 45ml
    //
    // Relish needed: 40g * 10 = 400g (scale factor 400 / 300 = 1.33333333)
    // Confit in Relish: 50g * (400/300) = 66.6666667g confit (scale factor 66.6666667 / 100 = 0.66666667)
    //   -> Garlic in Relish: 80 * (2/3) = 53.3333333g
    //   -> Olive Oil in Relish: 50 * (2/3) = 33.3333333ml
    //
    // Total Garlic Cloves = 72 + 53.3333333 = 125.3333333g
    // Total Olive Oil = 45 + 33.3333333 = 78.3333333ml

    expect(flat['garlic-cloves'].amount).toBeCloseTo(125.3333, 3);
    expect(flat['olive-oil'].amount).toBeCloseTo(78.3333, 3);
    expect(flat['egg-yolks'].amount).toBe(60);
    expect(flat['tomatoes'].amount).toBeCloseTo(266.6667, 3);
    expect(flat['patty'].amount).toBe(1800);
  });
});

// ----------------------------------------------------------------------------
// SUITE 2: Boundary Values, Extreme Yields, Decimal & Zero Handling
// ----------------------------------------------------------------------------
describe('SUITE 2: Boundary Values, Extreme Yields & Zero/Negative Inputs', () => {
  const simpleRecipe: RecipeBlueprint = {
    id: 'simple-syrup',
    name: 'Simple Syrup',
    baseYield: 100,
    yieldUnit: 'ml',
    ingredients: [
      { id: 'sugar', name: 'Sugar', ratio: 50, unit: 'g', costPerUnit: 0.002 },
      { id: 'water', name: 'Water', ratio: 50, unit: 'ml', costPerUnit: 0.0001 },
    ],
  };

  it('2.1: Rejects zero and negative target yields with explicit Error', () => {
    expect(() => scaleRecipeTree(simpleRecipe, 0)).toThrow();
    expect(() => scaleRecipeTree(simpleRecipe, -0.00001)).toThrow();
    expect(() => scaleRecipeTree(simpleRecipe, -1000)).toThrow();
  });

  it('2.2: Rejects recipe with invalid or non-positive baseYield', () => {
    expect(() => scaleRecipeTree({ ...simpleRecipe, baseYield: 0 }, 10)).toThrow();
    expect(() => scaleRecipeTree({ ...simpleRecipe, baseYield: -50 }, 10)).toThrow();
  });

  it('2.3: Rejects malformed recipe structures', () => {
    expect(() => scaleRecipeTree(null as any, 10)).toThrow();
    expect(() => scaleRecipeTree({} as any, 10)).toThrow();
    expect(() => scaleRecipeTree({ id: 'bad', name: 'Bad', baseYield: 10, yieldUnit: 'g' } as any, 10)).toThrow();
  });

  it('2.4: Accurately scales micro decimal yields (1e-6) without underflow', () => {
    const microYield = 0.0001; // 0.0001 ml (factor = 1e-6)
    const scaled = scaleRecipeTree(simpleRecipe, microYield);
    expect(scaled.targetYield).toBe(0.0001);
    expect(scaled.ingredients[0].amount).toBeCloseTo(0.00005, 7);
    expect(scaled.ingredients[1].amount).toBeCloseTo(0.00005, 7);
  });

  it('2.5: Accurately scales massive commercial yields (1e9) without precision degradation', () => {
    const massiveYield = 1_000_000_000; // 1 billion ml
    const scaled = scaleRecipeTree(simpleRecipe, massiveYield);
    expect(scaled.targetYield).toBe(1_000_000_000);
    expect(scaled.ingredients[0].amount).toBe(500_000_000);
    expect(scaled.ingredients[1].amount).toBe(500_000_000);
    expect(scaled.totalCost).toBeCloseTo(500_000_000 * 0.002 + 500_000_000 * 0.0001);
  });

  it('2.6: scaleByServings handles boundary target servings and invalid bases', () => {
    const items = [{ name: 'flour', amount: 100 }, { name: 'salt', amount: 2 }];

    // Target servings = 0 -> all amounts become 0
    const zeroScaled = scaleByServings(items, 4, 0);
    expect(zeroScaled[0].amount).toBe(0);
    expect(zeroScaled[1].amount).toBe(0);

    // Negative target servings -> throws
    expect(() => scaleByServings(items, 4, -1)).toThrow();

    // Base servings <= 0 -> throws
    expect(() => scaleByServings(items, 0, 4)).toThrow();
    expect(() => scaleByServings(items, -2, 4)).toThrow();

    // Fractional servings scaling
    const fractional = scaleByServings(items, 3, 4.5);
    expect(fractional[0].amount).toBe(150);
    expect(fractional[1].amount).toBe(3);
  });

  it('2.7: projectBatchRequirement handles buffer factors and rejects negative inputs', () => {
    expect(projectBatchRequirement(250, 40, 1.0)).toBe(10000);
    expect(projectBatchRequirement(250, 40, 1.15)).toBe(11500); // 15% waste buffer
    expect(projectBatchRequirement(0, 40, 1.0)).toBe(0);
    expect(projectBatchRequirement(250, 0, 1.0)).toBe(0);

    // Negative tests
    expect(() => projectBatchRequirement(-1, 40, 1.0)).toThrow();
    expect(() => projectBatchRequirement(250, -1, 1.0)).toThrow();
    expect(() => projectBatchRequirement(250, 40, -0.1)).toThrow();
  });
});

// ----------------------------------------------------------------------------
// SUITE 3: Baker's Percentages, Non-Flour Bases, Multi-Flour Formulas
// ----------------------------------------------------------------------------
describe('SUITE 3: Baker\'s Percentages & Total Formula Weight Calculation', () => {
  it('3.1: calculateRatio calculates baker percentages relative to 100% base', () => {
    // 500g flour base, 350g water = 70% hydration
    expect(calculateRatio(350, 500)).toBe(70);
    // 10g salt = 2%
    expect(calculateRatio(10, 500)).toBe(2);
    // 0g yeast = 0%
    expect(calculateRatio(0, 500)).toBe(0);
    // 600g inclusions = 120%
    expect(calculateRatio(600, 500)).toBe(120);
  });

  it('3.2: calculateRatio enforces non-negative ingredient weights and positive base weights', () => {
    expect(() => calculateRatio(-10, 500)).toThrow();
    expect(() => calculateRatio(100, 0)).toThrow();
    expect(() => calculateRatio(100, -100)).toThrow();
  });

  it('3.3: totalFormulaWeight scales multi-flour blend formulas accurately', () => {
    // Artisanal Sourdough: 80% Bread Flour + 20% Rye Flour = 100% Total Flour
    // Hydration 78%, Starter 20%, Salt 2.2% -> Total Ratio = 80+20+78+20+2.2 = 200.2%
    const ryeSourdough: RecipeBlueprint = {
      id: 'rye-sourdough',
      name: 'Rye Country Sourdough',
      baseIngredient: 'flour-blend-base',
      baseYield: 1,
      yieldUnit: 'loaf',
      ingredients: [
        { id: 'flour-blend-base', name: 'Bread Flour Base', ratio: 100, unit: 'g' },
        { id: 'rye-flour', name: 'Dark Rye Flour', ratio: 25, unit: 'g' }, // 25% of base
        { id: 'water', name: 'Water', ratio: 80, unit: 'g' },
        { id: 'levain', name: 'Rye Levain', ratio: 20, unit: 'g' },
        { id: 'salt', name: 'Fine Sea Salt', ratio: 2.5, unit: 'g' },
      ], // Total ratio sum = 100 + 25 + 80 + 20 + 2.5 = 227.5%
    };

    // Target base weight: 4000g of Bread Flour Base
    // Total dough weight = 4000 * (227.5 / 100) = 9100g
    const totalWeight = totalFormulaWeight(ryeSourdough, 4000);
    expect(totalWeight).toBe(9100);
  });

  it('3.4: totalFormulaWeight supports non-flour bases (e.g. Charcuterie / Curing formula)', () => {
    const duckConfitCure: RecipeBlueprint = {
      id: 'duck-cure',
      name: 'Duck Leg Curing Formula',
      baseIngredient: 'duck-legs',
      baseYield: 1,
      yieldUnit: 'batch',
      ingredients: [
        { id: 'duck-legs', name: 'Duck Legs Bone-In', ratio: 100, unit: 'g' }, // Base = 100%
        { id: 'curing-salt', name: 'Kosher Salt', ratio: 2.5, unit: 'g' },      // 2.5% of meat
        { id: 'brown-sugar', name: 'Brown Sugar', ratio: 1.0, unit: 'g' },     // 1.0% of meat
        { id: 'black-pepper', name: 'Coarse Pepper', ratio: 0.5, unit: 'g' },  // 0.5% of meat
        { id: 'thyme', name: 'Fresh Thyme', ratio: 0.3, unit: 'g' },           // 0.3% of meat
      ], // Total ratio sum = 104.3%
    };

    // Target 50,000g (50kg) duck legs
    // Total weight = 50000 * 1.043 = 52150g
    const totalCureBatch = totalFormulaWeight(duckConfitCure, 50000);
    expect(totalCureBatch).toBeCloseTo(52150);
  });

  it('3.5: totalFormulaWeight rejects non-positive targetBaseWeight and zero-ratio base ingredients', () => {
    const invalidBaseRecipe: RecipeBlueprint = {
      id: 'bad-base',
      name: 'Bad Base Recipe',
      baseIngredient: 'zero-base',
      baseYield: 1,
      yieldUnit: 'loaf',
      ingredients: [
        { id: 'zero-base', name: 'Zero Ratio Base', ratio: 0, unit: 'g' },
        { id: 'water', name: 'Water', ratio: 50, unit: 'g' },
      ],
    };

    expect(() => totalFormulaWeight(invalidBaseRecipe, 1000)).toThrow();
    expect(() => totalFormulaWeight(invalidBaseRecipe, 0)).toThrow();
    expect(() => totalFormulaWeight(invalidBaseRecipe, -500)).toThrow();
  });
});

// ----------------------------------------------------------------------------
// SUITE 4: Density Unit Conversion & Fuzzy Matching Engine
// ----------------------------------------------------------------------------
describe('SUITE 4: Density Unit Conversions & Fuzzy Resolution Engine', () => {
  it('4.1: Bidirectional conversions for all canonical pantry ingredients', () => {
    const cases: Array<{ name: string; density: number }> = [
      { name: 'flour', density: 125 },
      { name: 'all-purpose flour', density: 125 },
      { name: 'bread flour', density: 125 },
      { name: 'whole wheat flour', density: 130 },
      { name: 'sugar', density: 200 },
      { name: 'white sugar', density: 200 },
      { name: 'granulated sugar', density: 200 },
      { name: 'brown sugar', density: 220 },
      { name: 'powdered sugar', density: 120 },
      { name: 'butter', density: 227 },
      { name: 'salt', density: 273 },
      { name: 'table salt', density: 273 },
      { name: 'sea salt', density: 273 },
      { name: 'kosher salt', density: 218 },
      { name: 'rice', density: 185 },
      { name: 'white rice', density: 185 },
      { name: 'brown rice', density: 190 },
      { name: 'oats', density: 90 },
      { name: 'rolled oats', density: 90 },
      { name: 'steel cut oats', density: 150 },
      { name: 'olive oil', density: 218 },
      { name: 'vegetable oil', density: 218 },
      { name: 'oil', density: 218 },
      { name: 'water', density: 240 },
      { name: 'milk', density: 240 },
      { name: 'heavy cream', density: 238 },
      { name: 'honey', density: 340 },
    ];

    for (const c of cases) {
      // 2 cups -> grams = 2 * density
      const grams = cupsToGrams(2, c.name);
      assert(grams !== null, `Failed cupsToGrams for ${c.name}`);
      expect(grams).toBeCloseTo(2 * c.density);

      // (2 * density) grams -> cups = 2
      const cups = gramsToCups(2 * c.density, c.name);
      assert(cups !== null, `Failed gramsToCups for ${c.name}`);
      expect(cups).toBeCloseTo(2);
    }
  });

  it('4.2: Invertibility / Roundtrip Property: cupsToGrams(gramsToCups(g)) === g', () => {
    const testIngredients = ['flour', 'brown sugar', 'butter', 'kosher salt', 'honey', 'steel cut oats', 'olive oil'];
    const gramAmounts = [0.1, 1, 15.5, 50, 125, 250, 500, 1000, 3333.33];

    for (const ing of testIngredients) {
      for (const g of gramAmounts) {
        const cups = gramsToCups(g, ing);
        assert(cups !== null);
        const roundtripGrams = cupsToGrams(cups, ing);
        assert(roundtripGrams !== null);
        expect(roundtripGrams).toBeCloseTo(g, 6);
      }
    }
  });

  it('4.3: Fuzzy matching: Longest prefix/key matching prevents false substring collision', () => {
    // "kosher salt" (218) must NOT match "salt" (273)
    expect(cupsToGrams(1, 'Diamond Crystal Kosher Salt')).toBe(218);
    expect(cupsToGrams(1, 'Pure Sea Salt')).toBe(273);

    // "brown sugar" (220) must NOT match "sugar" (200)
    expect(cupsToGrams(1, 'Domino Dark Brown Sugar')).toBe(220);
    expect(cupsToGrams(1, 'Pure Cane Sugar')).toBe(200);

    // "steel cut oats" (150) must NOT match "oats" (90)
    expect(cupsToGrams(1, 'Bobs Red Mill Steel Cut Oats')).toBe(150);
    expect(cupsToGrams(1, 'Quaker Old Fashioned Rolled Oats')).toBe(90);
  });

  it('4.4: Resilient case-insensitivity and whitespace trimming', () => {
    expect(cupsToGrams(1, '  ALL-PURPOSE FLOUR  \n')).toBe(125);
    expect(cupsToGrams(1, 'kOsHeR sAlT')).toBe(218);
    expect(gramsToCups(340, '  HoNeY  ')).toBe(1);
  });

  it('4.5: Returns null for unknown ingredients and invalid/negative numbers', () => {
    expect(gramsToCups(100, 'Dragonfruit Paste')).toBeNull();
    expect(cupsToGrams(2, 'Xanthan Gum')).toBeNull();
    expect(gramsToCups(100, '')).toBeNull();
    expect(gramsToCups(100, '   ')).toBeNull();
    expect(gramsToCups(100, null as any)).toBeNull();
    expect(gramsToCups(100, undefined as any)).toBeNull();

    // Negative & NaN amounts
    expect(gramsToCups(-50, 'flour')).toBeNull();
    expect(cupsToGrams(-2, 'sugar')).toBeNull();
    expect(gramsToCups(NaN, 'flour')).toBeNull();
    expect(cupsToGrams(NaN, 'sugar')).toBeNull();
  });
});

// ----------------------------------------------------------------------------
// SUITE 5: Formatting, Decimal Precision, Truncation & Edge Cases
// ----------------------------------------------------------------------------
describe('SUITE 5: Amount Formatting & Precision Edge Cases', () => {
  it('5.1: Cleanly formats integer values', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(1)).toBe('1');
    expect(formatAmount(250)).toBe('250');
    expect(formatAmount(10000)).toBe('10000');
  });

  it('5.2: Formats values >= 1 with 1 decimal place, stripping trailing .0', () => {
    expect(formatAmount(1.0)).toBe('1');
    expect(formatAmount(1.0000000000000002)).toBe('1'); // float precision jitter
    expect(formatAmount(1.5)).toBe('1.5');
    expect(formatAmount(1.24)).toBe('1.2');
    expect(formatAmount(1.25)).toBe('1.3'); // standard round up
    expect(formatAmount(9.99)).toBe('10');
    expect(formatAmount(24.50)).toBe('24.5');
  });

  it('5.3: Formats values < 1 with 2 decimal places, stripping unnecessary trailing zeroes', () => {
    expect(formatAmount(0.5)).toBe('0.5');
    expect(formatAmount(0.50)).toBe('0.5');
    expect(formatAmount(0.75)).toBe('0.75');
    expect(formatAmount(0.125)).toBe('0.13');
    expect(formatAmount(0.05)).toBe('0.05');
    expect(formatAmount(0.004)).toBe('0');
    expect(formatAmount(0.009)).toBe('0.01');
    expect(formatAmount(0.000001)).toBe('0');
  });

  it('5.4: Safely handles non-numbers, NaN, and extreme values', () => {
    expect(formatAmount(NaN)).toBe('0');
    expect(formatAmount(null as any)).toBe('0');
    expect(formatAmount(undefined as any)).toBe('0');
    expect(formatAmount('50' as any)).toBe('0');
  });
});

// ----------------------------------------------------------------------------
// SUITE 6: Food Costing, Cost Variance, Waste & Prep Planning
// ----------------------------------------------------------------------------
describe('SUITE 6: Food Costing, Cost Variance, Waste & Shift Prep Planning', () => {
  it('6.1: computeRecipeCost computes line totals, cost per serving, and food cost %', () => {
    const ingredients = [
      { id: 'pasta', name: 'Fresh Rigatoni', quantity: 150, unitCost: 0.005 }, // $0.75
      { id: 'sauce', name: 'Vodka Sauce', quantity: 100, unitCost: 0.015 },   // $1.50
      { id: 'parm', name: 'Parmigiano Reggiano', quantity: 20, unitCost: 0.03 }, // $0.60
    ];

    const result = computeRecipeCost(ingredients, 1, 18.00);
    expect(result.totalCost).toBeCloseTo(2.85);
    expect(result.costPerServing).toBeCloseTo(2.85);
    // Food Cost % = (2.85 / 18.00) * 100 = 15.833%
    expect(result.foodCostPct).toBeCloseTo(15.8333, 3);
  });

  it('6.2: computeRecipeCost handles zero servings and zero menu price without crashing', () => {
    const ingredients = [{ id: 'item', name: 'Item', quantity: 10, unitCost: 1.0 }];
    const result = computeRecipeCost(ingredients, 0, 0);
    expect(result.totalCost).toBe(10);
    expect(result.costPerServing).toBe(0);
    expect(result.foodCostPct).toBe(0);
  });

  it('6.3: calculateCostVariance evaluates ok / warn / alert status thresholds precisely', () => {
    // 0% -> ok
    expect(calculateCostVariance(100, 100).status).toBe('ok');

    // 1.99% -> ok
    expect(calculateCostVariance(100, 101.99).status).toBe('ok');

    // 2.00% -> warn
    expect(calculateCostVariance(100, 102.00).status).toBe('warn');

    // 4.99% -> warn
    expect(calculateCostVariance(100, 104.99).status).toBe('warn');

    // 5.00% -> alert
    expect(calculateCostVariance(100, 105.00).status).toBe('alert');

    // Symmetrical negative variances (under-budget)
    expect(calculateCostVariance(100, 98.01).status).toBe('ok');
    expect(calculateCostVariance(100, 98.00).status).toBe('warn');
    expect(calculateCostVariance(100, 95.00).status).toBe('alert');

    // Theoretical cost 0
    const zeroTheo = calculateCostVariance(0, 50);
    expect(zeroTheo.variancePct).toBe(0);
    expect(zeroTheo.status).toBe('ok');
  });

  it('6.4: summarizeWaste aggregates logs, reasons, and top financial loss items', () => {
    const entries: WasteLogEntry[] = [
      { ingredient: 'Wagyu Beef', quantityGrams: 400, costPerGram: 0.15, reason: 'spoilage' }, // $60
      { ingredient: 'Truffle Oil', quantityGrams: 50, costPerGram: 0.50, reason: 'drop' },      // $25
      { ingredient: 'Wagyu Beef', quantityGrams: 200, costPerGram: 0.15, reason: 'trim' },     // $30
      { ingredient: 'Brioche', quantityGrams: 500, costPerGram: 0.01, reason: 'expired' },     // $5
    ];

    const summary = summarizeWaste(entries);
    expect(summary.totalGrams).toBe(1150);
    expect(summary.totalCost).toBeCloseTo(120.0);

    // Wagyu Beef total: $60 + $30 = $90
    expect(summary.topWastedIngredients[0].ingredient).toBe('Wagyu Beef');
    expect(summary.topWastedIngredients[0].cost).toBeCloseTo(90.0);
    expect(summary.topWastedIngredients[0].grams).toBe(600);

    // Truffle Oil: $25
    expect(summary.topWastedIngredients[1].ingredient).toBe('Truffle Oil');
    expect(summary.topWastedIngredients[1].cost).toBeCloseTo(25.0);

    // By reason
    expect(summary.byReason['spoilage'].cost).toBeCloseTo(60.0);
    expect(summary.byReason['trim'].cost).toBeCloseTo(30.0);
    expect(summary.byReason['drop'].cost).toBeCloseTo(25.0);
    expect(summary.byReason['expired'].cost).toBeCloseTo(5.0);
  });

  it('6.5: calculateWastePercentage handles zero divisors safely', () => {
    expect(calculateWastePercentage(100, 2000)).toBe(5.0);
    expect(calculateWastePercentage(0, 2000)).toBe(0);
    expect(calculateWastePercentage(100, 0)).toBe(0);
    expect(calculateWastePercentage(0, 0)).toBe(0);
  });

  it('6.6: generateShiftPrepPlan filters only shortfall items below par level', () => {
    const inventory: InventoryStockItem[] = [
      { id: '1', ingredient: 'Carrot Brunoise', currentStock: 1.5, parLevel: 5.0, unit: 'kg', station: 'prep' }, // Shortfall 3.5kg
      { id: '2', ingredient: 'Veal Stock', currentStock: 20, parLevel: 20, unit: 'l', station: 'sauce' },       // Par met (0 shortfall)
      { id: '3', ingredient: 'Tarragon Emulsion', currentStock: 6, parLevel: 4, unit: 'l', station: 'sauce' },   // Surplus (no shortfall)
      { id: '4', ingredient: 'Cured Duck', currentStock: 0, parLevel: 12, unit: 'count', station: 'charcuterie' }, // Shortfall 12 count
    ];

    const plan = generateShiftPrepPlan(inventory, 'prep', '2026-08-16');
    expect(plan.shift).toBe('prep');
    expect(plan.date).toBe('2026-08-16');
    expect(plan.tasks.length).toBe(2);

    const carrot = plan.tasks.find(t => t.ingredient === 'Carrot Brunoise');
    assert(carrot);
    expect(carrot.prepAmount).toBe(3.5);
    expect(carrot.station).toBe('prep');

    const duck = plan.tasks.find(t => t.ingredient === 'Cured Duck');
    assert(duck);
    expect(duck.prepAmount).toBe(12);
    expect(duck.station).toBe('charcuterie');
  });
});

// ----------------------------------------------------------------------------
// SUITE 7: Legacy Backward Compatibility (scaleBlueprint, fromTotalWeight, computeCost)
// ----------------------------------------------------------------------------
describe('SUITE 7: Legacy Backward Compatibility Stress', () => {
  const legacyCiabatta: RatioBlueprint = {
    id: 'ciabatta',
    name: 'High Hydration Ciabatta',
    baseYield: 2,
    yieldUnit: 'loaves',
    ingredients: [
      { id: 'flour', name: 'High Gluten Flour', ratioWeight: 100, unit: 'g' },
      { id: 'water', name: 'Water', ratioWeight: 85, unit: 'ml' },
      { id: 'poolish', name: 'Poolish', ratioWeight: 30, unit: 'g' },
      { id: 'olive-oil', name: 'Olive Oil', ratioWeight: 4, unit: 'g' },
      { id: 'salt', name: 'Fine Salt', ratioWeight: 2.2, unit: 'g' },
      { id: 'yeast', name: 'Instant Yeast', ratioWeight: 0.5, unit: 'g' },
    ], // Ratio sum = 221.7
  };

  it('7.1: scaleBlueprint scales ratio weights cleanly', () => {
    const scaled = scaleBlueprint(legacyCiabatta, 10);
    // Factor = 10 / 2 = 5
    expect(scaled.find(i => i.id === 'flour')?.ratioWeight).toBe(500);
    expect(scaled.find(i => i.id === 'water')?.ratioWeight).toBe(425);
    expect(scaled.find(i => i.id === 'poolish')?.ratioWeight).toBe(150);
  });

  it('7.2: fromTotalWeight distributes exact dough weight by ratio', () => {
    // Total dough weight = 2217g (10x ratio sum)
    const scaled = fromTotalWeight(legacyCiabatta, 2217);
    expect(scaled.find(i => i.id === 'flour')?.ratioWeight).toBeCloseTo(1000);
    expect(scaled.find(i => i.id === 'water')?.ratioWeight).toBeCloseTo(850);
    expect(scaled.find(i => i.id === 'salt')?.ratioWeight).toBeCloseTo(22);
  });

  it('7.3: computeCost handles price map lookup including missing keys (default $0)', () => {
    const scaled = scaleBlueprint(legacyCiabatta, 2);
    const cost = computeCost(scaled, {
      flour: 0.0015,
      water: 0.0001,
      // poolish missing -> should be 0
      'olive-oil': 0.01,
      salt: 0.001,
      yeast: 0.02,
    });
    // 100*0.0015 + 85*0.0001 + 0 + 4*0.01 + 2.2*0.001 + 0.5*0.02
    // = 0.15 + 0.0085 + 0 + 0.04 + 0.0022 + 0.01 = 0.2107
    expect(cost).toBeCloseTo(0.2107, 4);
  });
});
