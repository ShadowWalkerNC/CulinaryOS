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
  scaleRecipe,
  type RecipeBlueprint,
  type Recipe,
} from './ratio.ts';

describe('Recipes Ratio Blueprint Engine', () => {
  const sourdoughBlueprint = {
    id: 'sourdough-artisan',
    name: 'Artisan Sourdough Boule',
    baseYield: 1,
    yieldUnit: 'loaf',
    ingredients: [
      { id: 'flour', name: 'Bread Flour', ratioWeight: 100, unit: 'g' as const },
      { id: 'water', name: 'Filtered Water', ratioWeight: 75, unit: 'ml' as const },
      { id: 'levain', name: 'Active Levain', ratioWeight: 20, unit: 'g' as const },
      { id: 'salt', name: 'Fine Sea Salt', ratioWeight: 2, unit: 'g' as const },
    ],
  };

  const sourdoughTree: RecipeBlueprint = {
    id: 'sourdough-tree',
    name: 'Artisan Sourdough Tree',
    baseYield: 1,
    yieldUnit: 'loaf',
    ingredients: [
      { id: 'flour', name: 'Bread Flour', ratio: 500, unit: 'g' as const, costPerUnit: 0.002 },
      { id: 'water', name: 'Filtered Water', ratio: 375, unit: 'ml' as const, costPerUnit: 0.0001 },
      { id: 'levain', name: 'Active Levain', ratio: 100, unit: 'g' as const, costPerUnit: 0.008 },
      { id: 'salt', name: 'Fine Sea Salt', ratio: 10, unit: 'g' as const, costPerUnit: 0.001 },
    ],
  };

  it('verifies exact mathematical yield when scaling sourdough blueprint', () => {
    const scaledTen = scaleBlueprint(sourdoughBlueprint, 10);
    expect(scaledTen.length).toBe(4);

    const flour = scaledTen.find((i) => i.id === 'flour');
    const water = scaledTen.find((i) => i.id === 'water');
    const levain = scaledTen.find((i) => i.id === 'levain');
    const salt = scaledTen.find((i) => i.id === 'salt');

    expect(flour?.ratioWeight).toBe(1000);
    expect(water?.ratioWeight).toBe(750);
    expect(levain?.ratioWeight).toBe(200);
    expect(salt?.ratioWeight).toBe(20);
  });

  it('scales sub-recipe tree accurately across yields and costs', () => {
    const scaledTree = scaleRecipeTree(sourdoughTree, 10);
    expect(scaledTree.targetYield).toBe(10);
    expect(scaledTree.ingredients.length).toBe(4);

    const flour = scaledTree.ingredients.find((i) => i.id === 'flour');
    expect(flour?.amount).toBe(5000);
    expect(flour?.totalCost).toBeCloseTo(10); // 5000 * 0.002
  });

  it('calculates total formula weight and baker percentages accurately', () => {
    const simpleRecipe: Recipe = {
      id: 'pizza-dough',
      name: 'Neapolitan Pizza Dough',
      baseIngredient: 'Tipo 00 Flour',
      ingredients: [
        { name: 'Tipo 00 Flour', ratio: 1.0 },
        { name: 'Water', ratio: 0.65 },
        { name: 'Yeast', ratio: 0.003 },
        { name: 'Salt', ratio: 0.025 },
      ],
    };

    const targetBaseWeight = 1000; // 1 kg flour
    const scaled = scaleRecipe(simpleRecipe, targetBaseWeight);
    expect(scaled['Tipo 00 Flour']).toBe(1000);
    expect(scaled['Water']).toBe(650);
    expect(scaled['Yeast']).toBe(3);
    expect(scaled['Salt']).toBe(25);

    const totalWeight = totalFormulaWeight(simpleRecipe, targetBaseWeight);
    expect(totalWeight).toBeCloseTo(1678);
  });

  it('computes recipe costs based on exact ingredient weights', () => {
    const ingredients = [
      { id: 'beef', name: 'Ground Beef', quantity: 200, unitCost: 0.015 },
      { id: 'bun', name: 'Brioche Bun', quantity: 1, unitCost: 0.5 },
      { id: 'cheese', name: 'Cheddar', quantity: 30, unitCost: 0.01 },
    ];
    const costAnalysis = computeRecipeCost(ingredients, 1, 12.0);
    // 200*0.015 = 3.0 + 0.5 + 30*0.01 = 0.3 = 3.8
    expect(costAnalysis.totalCost).toBeCloseTo(3.8);
    expect(costAnalysis.costPerServing).toBeCloseTo(3.8);
    expect(costAnalysis.foodCostPct).toBeCloseTo((3.8 / 12.0) * 100);
  });

  it('calculates unit conversions between grams and cups reliably', () => {
    const gramsFlour = cupsToGrams(2, 'flour');
    expect(gramsFlour).toBe(250); // 125g per cup

    const cupsBack = gramsToCups(250, 'flour');
    expect(cupsBack).toBe(2);
  });
});
