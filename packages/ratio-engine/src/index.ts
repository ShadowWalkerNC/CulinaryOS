// packages/ratio-engine/src/index.ts
// Pure TypeScript — zero dependencies.
// Mathematical engine for recipe scaling, sub-recipe trees, food costing, variance, waste, and prep planning.

export type MeasurementUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'oz'
  | 'lb'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'count';

// ---------------------------------------------------------------------------
// 1. Sub-Recipe Trees & Ratio Blueprints
// ---------------------------------------------------------------------------

export interface Ingredient {
  name: string;
  /** Ratio relative to base ingredient weight (1.0 = 100%) */
  ratio: number;
  unit?: string;
  subRecipeId?: string;
  subRecipe?: Recipe;
  sortOrder?: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** The base ingredient that all ratios are calculated against */
  baseIngredient: string;
  ingredients: Ingredient[];
  yieldUnit?: string;
  baseYieldPortions?: number;
  station?: string;
}

/** Scale a recipe to a target base ingredient weight. */
export function scaleRecipe(
  recipe: Recipe,
  targetBaseWeight: number
): Record<string, number> {
  const scaled: Record<string, number> = {};
  for (const ingredient of recipe.ingredients) {
    scaled[ingredient.name] = ingredient.ratio * targetBaseWeight;
  }
  return scaled;
}

export interface RecipeIngredientItem {
  id: string;
  name: string;
  /** Baker's percentage / ratio weight (base ingredient = 100 or standard proportion) */
  ratio: number;
  unit: MeasurementUnit;
  subRecipeId?: string | undefined;
  subRecipe?: RecipeBlueprint | undefined;
  /** Cost per unit in dollars/cents */
  costPerUnit?: number | undefined;
}


export interface RecipeBlueprint {
  id: string;
  name: string;
  baseIngredient?: string | undefined;
  /** Base yield amount for this recipe (e.g. 1 loaf, 10 portions, 500g) */
  baseYield: number;
  yieldUnit: string;
  ingredients: RecipeIngredientItem[];
  station?: string | undefined;
}

export interface ScaledIngredientResult {
  id: string;
  name: string;
  amount: number;
  unit: MeasurementUnit;
  unitCost: number;
  totalCost: number;
  subRecipeId?: string | undefined;
  subRecipeResult?: ScaledRecipeTreeResult | undefined;
}

export interface ScaledRecipeTreeResult {
  recipeId: string;
  recipeName: string;
  targetYield: number;
  yieldUnit: string;
  totalCost: number;
  ingredients: ScaledIngredientResult[];
}

export interface ScaledIngredientSummary {
  id: string;
  name: string;
  amount: number;
  unit: MeasurementUnit;
  totalCost: number;
}

/**
 * Recursively scales a recipe tree including nested sub-recipes.
 */
export function scaleRecipeTree(
  recipe: RecipeBlueprint,
  targetYield: number
): ScaledRecipeTreeResult {
  if (targetYield <= 0) {
    throw new Error('targetYield must be > 0');
  }
  if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    throw new Error('Invalid recipe blueprint');
  }
  if (recipe.baseYield <= 0) {
    throw new Error('recipe.baseYield must be > 0');
  }

  const scaleFactor = targetYield / recipe.baseYield;
  let totalCost = 0;

  const ingredients: ScaledIngredientResult[] = recipe.ingredients.map((ing) => {
    const amount = ing.ratio * scaleFactor;
    const unitCost = ing.costPerUnit ?? 0;

    let subRecipeResult: ScaledRecipeTreeResult | undefined;
    let itemTotalCost = 0;

    if (ing.subRecipe) {
      subRecipeResult = scaleRecipeTree(ing.subRecipe, amount);
      itemTotalCost = subRecipeResult.totalCost;
    } else {
      itemTotalCost = amount * unitCost;
    }

    totalCost += itemTotalCost;

    return {
      id: ing.id,
      name: ing.name,
      amount,
      unit: ing.unit,
      unitCost,
      totalCost: itemTotalCost,
      subRecipeId: ing.subRecipeId,
      subRecipeResult,
    };
  });

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    targetYield,
    yieldUnit: recipe.yieldUnit,
    totalCost,
    ingredients,
  };
}

/**
 * Flattens a scaled recipe tree into consolidated raw ingredients with summed quantities and costs.
 */
export function flattenScaledTree(
  tree: ScaledRecipeTreeResult
): Record<string, ScaledIngredientSummary> {
  const summary: Record<string, ScaledIngredientSummary> = {};

  function traverse(node: ScaledRecipeTreeResult) {
    for (const item of node.ingredients) {
      if (item.subRecipeResult) {
        traverse(item.subRecipeResult);
      } else {
        const key = item.id || item.name;
        const existing = summary[key];
        if (existing) {
          existing.amount += item.amount;
          existing.totalCost += item.totalCost;
        } else {
          summary[key] = {
            id: item.id,
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            totalCost: item.totalCost,
          };
        }
      }
    }
  }

  traverse(tree);
  return summary;
}

/**
 * Scales an array of items with an `amount` property by serving ratio.
 */
export function scaleByServings<T extends { amount: number }>(
  items: T[],
  baseServings: number,
  targetServings: number
): T[] {
  if (baseServings <= 0) {
    throw new Error('baseServings must be > 0');
  }
  if (targetServings < 0) {
    throw new Error('targetServings cannot be negative');
  }
  if (targetServings === 0) {
    return items.map((item) => ({
      ...item,
      amount: 0,
    }));
  }

  const factor = targetServings / baseServings;
  return items.map((item) => ({
    ...item,
    amount: item.amount * factor,
  }));
}

/**
 * Calculates baker's percentage (base ingredient = 100%).
 */
export function calculateRatio(ingredientWeight: number, baseWeight: number): number {
  if (baseWeight <= 0) {
    throw new Error('baseWeight must be > 0');
  }
  if (ingredientWeight < 0) {
    throw new Error('ingredientWeight cannot be negative');
  }
  return (ingredientWeight / baseWeight) * 100;
}

/**
 * Calculates total formula dough weight given base ingredient weight.
 * Handles both RecipeBlueprint and legacy RatioBlueprint objects.
 */
export function totalFormulaWeight(
  recipe: RecipeBlueprint | RatioBlueprint,
  targetBaseWeight: number
): number {
  if (targetBaseWeight <= 0) {
    throw new Error('targetBaseWeight must be > 0');
  }
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
    return 0;
  }

  const getRatio = (i: any) => (i.ratio !== undefined ? i.ratio : i.ratioWeight !== undefined ? i.ratioWeight : 0);
  const baseIngredientName = (recipe as RecipeBlueprint).baseIngredient;

  const baseIng = recipe.ingredients.find(
    (i: any) => i.id === baseIngredientName || i.name === baseIngredientName || getRatio(i) === 100
  );
  const baseRatio = baseIng ? getRatio(baseIng) : 100;
  if (baseRatio <= 0) {
    throw new Error('Base ingredient ratio must be > 0');
  }

  const ratioSum = recipe.ingredients.reduce((sum: number, ing: any) => sum + getRatio(ing), 0);
  const unitWeight = targetBaseWeight / baseRatio;
  return ratioSum * unitWeight;
}

/**
 * Formats a numeric portion quantity cleanly (integers -> whole, >=1 -> 1dp, <1 -> 2dp).
 */
export function formatAmount(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }
  if (value === 0) {
    return '0';
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  if (Math.abs(value) >= 1) {
    const formatted = value.toFixed(1);
    return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
  }
  const formatted = value.toFixed(2);
  const trimmed = formatted.replace(/\.?0+$/, '');
  return trimmed === '' ? '0' : trimmed;
}

// ---------------------------------------------------------------------------
// 2. Density-Based Unit Conversions
// ---------------------------------------------------------------------------

const DENSITY_GRAMS_PER_CUP: Record<string, number> = {
  'brown sugar': 220,
  'granulated sugar': 200,
  'white sugar': 200,
  'powdered sugar': 120,
  'sugar': 200,
  'all-purpose flour': 125,
  'bread flour': 125,
  'whole wheat flour': 130,
  'flour': 125,
  'kosher salt': 218,
  'table salt': 273,
  'sea salt': 273,
  'salt': 273,
  'butter': 227,
  'white rice': 185,
  'brown rice': 190,
  'rice': 185,
  'rolled oats': 90,
  'steel cut oats': 150,
  'oats': 90,
  'olive oil': 218,
  'vegetable oil': 218,
  'oil': 218,
  'water': 240,
  'milk': 240,
  'heavy cream': 238,
  'honey': 340,
};

function lookupDensity(ingredient: string): number | null {
  if (!ingredient || typeof ingredient !== 'string') return null;
  const normalized = ingredient.trim().toLowerCase();
  const direct = DENSITY_GRAMS_PER_CUP[normalized];
  if (direct !== undefined) {
    return direct;
  }
  const sortedKeys = Object.keys(DENSITY_GRAMS_PER_CUP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (normalized.includes(key)) {
      const val = DENSITY_GRAMS_PER_CUP[key];
      if (val !== undefined) {
        return val;
      }
    }
  }
  return null;
}

/**
 * Converts grams to cups based on ingredient density. Returns null if unknown or invalid.
 */
export function gramsToCups(grams: number, ingredient: string): number | null {
  if (grams < 0 || typeof grams !== 'number' || isNaN(grams)) return null;
  const density = lookupDensity(ingredient);
  if (!density || density <= 0) return null;
  return grams / density;
}

/**
 * Converts cups to grams based on ingredient density. Returns null if unknown or invalid.
 */
export function cupsToGrams(cups: number, ingredient: string): number | null {
  if (cups < 0 || typeof cups !== 'number' || isNaN(cups)) return null;
  const density = lookupDensity(ingredient);
  if (!density || density <= 0) return null;
  return cups * density;
}

// ---------------------------------------------------------------------------
// 3. Food Costing & Variance Analysis
// ---------------------------------------------------------------------------

export interface RecipeCostIngredient {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface RecipeCostLineItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface RecipeCostAnalysis {
  ingredientCosts: RecipeCostLineItem[];
  totalCost: number;
  costPerServing: number;
  foodCostPct: number;
}

export interface CostVarianceResult {
  theoreticalCost: number;
  actualCost: number;
  varianceDollars: number;
  variancePct: number;
  status: 'ok' | 'warn' | 'alert';
}

/**
 * Computes recipe food cost breakdown, cost per serving, and food cost percentage.
 */
export function computeRecipeCost(
  ingredients: Array<{ id: string; name: string; quantity: number; unitCost: number }>,
  servings: number,
  menuPrice: number
): RecipeCostAnalysis {
  let totalCost = 0;
  const ingredientCosts: RecipeCostLineItem[] = (ingredients || []).map((ing) => {
    const itemTotal = (ing.quantity ?? 0) * (ing.unitCost ?? 0);
    totalCost += itemTotal;
    return {
      id: ing.id,
      name: ing.name,
      quantity: ing.quantity,
      unitCost: ing.unitCost,
      totalCost: itemTotal,
    };
  });

  const costPerServing = servings > 0 ? totalCost / servings : 0;
  const foodCostPct = menuPrice > 0 ? (costPerServing / menuPrice) * 100 : 0;

  return {
    ingredientCosts,
    totalCost,
    costPerServing,
    foodCostPct,
  };
}

/**
 * Calculates actual vs theoretical cost variance and status.
 */
export function calculateCostVariance(
  theoretical: number,
  actual: number
): CostVarianceResult {
  const varianceDollars = actual - theoretical;
  const variancePct = theoretical > 0 ? (varianceDollars / theoretical) * 100 : 0;

  const absPct = Math.abs(variancePct);
  let status: 'ok' | 'warn' | 'alert' = 'ok';
  if (absPct >= 5) {
    status = 'alert';
  } else if (absPct >= 2) {
    status = 'warn';
  } else {
    status = 'ok';
  }

  return {
    theoreticalCost: theoretical,
    actualCost: actual,
    varianceDollars,
    variancePct,
    status,
  };
}

// ---------------------------------------------------------------------------
// 4. Waste & Ops Summarization
// ---------------------------------------------------------------------------

export type WasteReason =
  | 'spoilage'
  | 'trim'
  | 'overcook'
  | 'drop'
  | 'expired'
  | 'other'
  | string;

export interface WasteLogEntry {
  ingredient: string;
  quantityGrams: number;
  costPerGram: number;
  reason: WasteReason;
  logDate?: string | undefined;
}

export interface WasteSummaryReport {
  totalGrams: number;
  totalCost: number;
  byReason: Record<string, { grams: number; cost: number }>;
  topWastedIngredients: Array<{ ingredient: string; grams: number; cost: number }>;
}

/**
 * Summarizes waste log entries into totals, reason breakdowns, and top financial loss items.
 */
export function summarizeWaste(entries: WasteLogEntry[]): WasteSummaryReport {
  let totalGrams = 0;
  let totalCost = 0;
  const byReason: Record<string, { grams: number; cost: number }> = {};
  const byIngredient: Record<string, { grams: number; cost: number }> = {};

  for (const entry of entries || []) {
    const cost = entry.quantityGrams * entry.costPerGram;
    totalGrams += entry.quantityGrams;
    totalCost += cost;

    const reason = entry.reason || 'other';
    const reasonGroup = byReason[reason];
    if (reasonGroup) {
      reasonGroup.grams += entry.quantityGrams;
      reasonGroup.cost += cost;
    } else {
      byReason[reason] = { grams: entry.quantityGrams, cost };
    }

    const ing = entry.ingredient || 'unknown';
    const ingGroup = byIngredient[ing];
    if (ingGroup) {
      ingGroup.grams += entry.quantityGrams;
      ingGroup.cost += cost;
    } else {
      byIngredient[ing] = { grams: entry.quantityGrams, cost };
    }
  }

  const topWastedIngredients = Object.entries(byIngredient)
    .map(([ingredient, data]) => ({
      ingredient,
      grams: data.grams,
      cost: data.cost,
    }))
    .sort((a, b) => b.cost - a.cost);

  return {
    totalGrams,
    totalCost,
    byReason,
    topWastedIngredients,
  };
}

/**
 * Calculates total waste as a percentage of total food cost.
 */
export function calculateWastePercentage(
  totalWasteCost: number,
  totalFoodCost: number
): number {
  if (totalFoodCost <= 0 || totalWasteCost <= 0) {
    return 0;
  }
  return (totalWasteCost / totalFoodCost) * 100;
}

// ---------------------------------------------------------------------------
// 5. Shift Prep Planning & Projections
// ---------------------------------------------------------------------------

export interface InventoryStockItem {
  id: string;
  ingredient: string;
  currentStock: number;
  parLevel: number;
  unit: MeasurementUnit | string;
  station?: string | undefined;
}

export interface ShiftPrepTask {
  ingredientId: string;
  ingredient: string;
  prepAmount: number;
  unit: MeasurementUnit | string;
  station?: string | undefined;
}

export interface ShiftPrepPlan {
  shift: 'morning' | 'evening' | 'prep';
  date: string;
  tasks: ShiftPrepTask[];
}

/**
 * Generates shift prep plan based on par level shortfalls.
 */
export function generateShiftPrepPlan(
  items: InventoryStockItem[],
  shift: 'morning' | 'evening' | 'prep',
  date: string
): ShiftPrepPlan {
  const tasks: ShiftPrepTask[] = [];

  for (const item of items || []) {
    const shortfall = item.parLevel - item.currentStock;
    if (shortfall > 0) {
      tasks.push({
        ingredientId: item.id,
        ingredient: item.ingredient,
        prepAmount: shortfall,
        unit: item.unit,
        ...(item.station ? { station: item.station } : {}),
      });
    }
  }

  return {
    shift,
    date,
    tasks,
  };
}

/**
 * Projects total batch requirement given portion weight, cover count, and waste buffer.
 */
export function projectBatchRequirement(
  portionWeight: number,
  covers: number,
  wasteFactor: number = 1.0
): number {
  if (portionWeight < 0 || covers < 0 || wasteFactor < 0) {
    throw new Error('Inputs cannot be negative');
  }
  return portionWeight * covers * wasteFactor;
}

// ---------------------------------------------------------------------------
// 6. Backward Compatibility Layer (Legacy Blueprint Functions)
// ---------------------------------------------------------------------------

export interface RatioBlueprintIngredient {
  id: string;
  name: string;
  /** Baker's percentage or ratio unit. Base ingredient = 100. */
  ratioWeight: number;
  unit: 'g' | 'ml' | 'oz' | 'count';
}

export interface RatioBlueprint {
  id: string;
  name: string;
  /** The yield this ratio describes at ratioWeight = 100. */
  baseYield: number;
  yieldUnit: string;
  ingredients: RatioBlueprintIngredient[];
}

export function scaleBlueprint(
  blueprint: RatioBlueprint,
  targetYield: number
): RatioBlueprintIngredient[] {
  if (targetYield <= 0) throw new Error('targetYield must be > 0');
  const scaleFactor = targetYield / blueprint.baseYield;
  return blueprint.ingredients.map((ing) => ({
    ...ing,
    ratioWeight: ing.ratioWeight * scaleFactor,
  }));
}

export function computeCost(
  scaled: RatioBlueprintIngredient[],
  priceMap: Record<string, number>
): number {
  return scaled.reduce((total, ing) => {
    const unitCost = priceMap[ing.id] ?? 0;
    return total + ing.ratioWeight * unitCost;
  }, 0);
}

export function fromTotalWeight(
  blueprint: RatioBlueprint,
  totalDoughWeightGrams: number
): RatioBlueprintIngredient[] {
  const ratioSum = blueprint.ingredients.reduce((s, i) => s + i.ratioWeight, 0);
  if (ratioSum === 0) throw new Error('Ratio sum cannot be zero');
  const factor = totalDoughWeightGrams / ratioSum;
  return blueprint.ingredients.map((ing) => ({
    ...ing,
    ratioWeight: ing.ratioWeight * factor,
  }));
}

// ---------------------------------------------------------------------------
// 7. USDA Nutritional Analysis & FDA Top 9 Allergen Detection Engine
// ---------------------------------------------------------------------------

export type FdaAllergen =
  | 'dairy'
  | 'eggs'
  | 'fish'
  | 'shellfish'
  | 'tree_nuts'
  | 'peanuts'
  | 'wheat'
  | 'soy'
  | 'sesame'
  | 'gluten'
  | 'vegetarian'
  | 'vegan';

export interface NutritionPer100g {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  allergens: FdaAllergen[];
}

export interface RecipeNutritionSummary {
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalSodiumMg: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  allergens: FdaAllergen[];
  dietaryBadges: string[];
}

// USDA FoodData Central Reference Density & Macro Lookup Table (per 100g)
export const USDA_INGREDIENT_DATABASE: Record<string, NutritionPer100g> = {
  flour: { calories: 364, protein_g: 10.3, carbs_g: 76.3, fat_g: 1.0, fiber_g: 2.7, sodium_mg: 2, allergens: ['wheat', 'gluten'] },
  bread_flour: { calories: 366, protein_g: 12.7, carbs_g: 73.2, fat_g: 1.5, fiber_g: 2.4, sodium_mg: 2, allergens: ['wheat', 'gluten'] },
  butter: { calories: 717, protein_g: 0.9, carbs_g: 0.1, fat_g: 81.1, fiber_g: 0, sodium_mg: 11, allergens: ['dairy', 'vegetarian'] },
  mozzarella: { calories: 300, protein_g: 22.2, carbs_g: 2.2, fat_g: 22.4, fiber_g: 0, sodium_mg: 627, allergens: ['dairy', 'vegetarian'] },
  cheddar: { calories: 403, protein_g: 24.9, carbs_g: 1.3, fat_g: 33.1, fiber_g: 0, sodium_mg: 621, allergens: ['dairy', 'vegetarian'] },
  beef: { calories: 250, protein_g: 26.0, carbs_g: 0, fat_g: 15.0, fiber_g: 0, sodium_mg: 72, allergens: [] },
  chicken: { calories: 165, protein_g: 31.0, carbs_g: 0, fat_g: 3.6, fiber_g: 0, sodium_mg: 74, allergens: [] },
  bacon: { calories: 541, protein_g: 37.0, carbs_g: 1.4, fat_g: 42.0, fiber_g: 0, sodium_mg: 1717, allergens: [] },
  salmon: { calories: 208, protein_g: 20.4, carbs_g: 0, fat_g: 13.4, fiber_g: 0, sodium_mg: 59, allergens: ['fish'] },
  shrimp: { calories: 99, protein_g: 24.0, carbs_g: 0.2, fat_g: 0.3, fiber_g: 0, sodium_mg: 111, allergens: ['shellfish'] },
  eggs: { calories: 143, protein_g: 12.6, carbs_g: 0.7, fat_g: 9.5, fiber_g: 0, sodium_mg: 142, allergens: ['eggs', 'vegetarian'] },
  olive_oil: { calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100.0, fiber_g: 0, sodium_mg: 2, allergens: ['vegan', 'vegetarian'] },
  tomatoes: { calories: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, fiber_g: 1.2, sodium_mg: 5, allergens: ['vegan', 'vegetarian'] },
  potatoes: { calories: 77, protein_g: 2.0, carbs_g: 17.5, fat_g: 0.1, fiber_g: 2.2, sodium_mg: 6, allergens: ['vegan', 'vegetarian'] },
  milk: { calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3, fiber_g: 0, sodium_mg: 43, allergens: ['dairy', 'vegetarian'] },
  heavy_cream: { calories: 340, protein_g: 2.8, carbs_g: 2.7, fat_g: 36.1, fiber_g: 0, sodium_mg: 38, allergens: ['dairy', 'vegetarian'] },
  sugar: { calories: 387, protein_g: 0, carbs_g: 100.0, fat_g: 0, fiber_g: 0, sodium_mg: 1, allergens: ['vegan', 'vegetarian'] },
  sesame_oil: { calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100.0, fiber_g: 0, sodium_mg: 0, allergens: ['sesame', 'vegan', 'vegetarian'] },
  soy_sauce: { calories: 53, protein_g: 8.1, carbs_g: 4.9, fat_g: 0.6, fiber_g: 0.8, sodium_mg: 5493, allergens: ['soy', 'wheat', 'gluten', 'vegan', 'vegetarian'] },
  peanuts: { calories: 567, protein_g: 25.8, carbs_g: 16.1, fat_g: 49.2, fiber_g: 8.5, sodium_mg: 18, allergens: ['peanuts', 'vegan', 'vegetarian'] },
  walnuts: { calories: 654, protein_g: 15.2, carbs_g: 13.7, fat_g: 65.2, fiber_g: 6.7, sodium_mg: 2, allergens: ['tree_nuts', 'vegan', 'vegetarian'] },
};

/**
 * Detect FDA Top 9 Allergens and dietary tags from a list of ingredient strings.
 */
export function detectAllergensFromIngredients(ingredientNames: string[]): {
  allergens: FdaAllergen[];
  dietaryBadges: string[];
} {
  const allergenSet = new Set<FdaAllergen>();
  let hasMeat = false;
  let hasDairyOrEggs = false;

  for (const rawName of ingredientNames) {
    const name = rawName.toLowerCase();
    if (name.includes('flour') || name.includes('wheat') || name.includes('bread') || name.includes('pasta') || name.includes('bun') || name.includes('brioche')) {
      allergenSet.add('wheat');
      allergenSet.add('gluten');
    }
    if (name.includes('milk') || name.includes('cream') || name.includes('butter') || name.includes('cheese') || name.includes('mozzarella') || name.includes('parmigiano') || name.includes('cheddar')) {
      allergenSet.add('dairy');
      hasDairyOrEggs = true;
    }
    if (name.includes('egg') || name.includes('mayo') || name.includes('aioli')) {
      allergenSet.add('eggs');
      hasDairyOrEggs = true;
    }
    if (name.includes('salmon') || name.includes('tuna') || name.includes('cod') || name.includes('fish') || name.includes('anchovy')) {
      allergenSet.add('fish');
      hasMeat = true;
    }
    if (name.includes('shrimp') || name.includes('crab') || name.includes('lobster') || name.includes('calamari') || name.includes('squid')) {
      allergenSet.add('shellfish');
      hasMeat = true;
    }
    if (name.includes('peanut')) allergenSet.add('peanuts');
    if (name.includes('almond') || name.includes('walnut') || name.includes('pecan') || name.includes('cashew') || name.includes('pistachio')) {
      allergenSet.add('tree_nuts');
    }
    if (name.includes('soy') || name.includes('tofu') || name.includes('edamame')) allergenSet.add('soy');
    if (name.includes('sesame') || name.includes('tahini')) allergenSet.add('sesame');

    if (name.includes('beef') || name.includes('pork') || name.includes('bacon') || name.includes('chicken') || name.includes('steak') || name.includes('patty') || name.includes('chuck')) {
      hasMeat = true;
    }
  }

  const dietaryBadges: string[] = [];
  if (!hasMeat && !hasDairyOrEggs) {
    dietaryBadges.push('Vegan', 'Vegetarian');
  } else if (!hasMeat) {
    dietaryBadges.push('Vegetarian');
  }

  if (!allergenSet.has('wheat') && !allergenSet.has('gluten')) {
    dietaryBadges.push('Gluten-Free');
  }
  if (!allergenSet.has('dairy')) {
    dietaryBadges.push('Dairy-Free');
  }

  return {
    allergens: Array.from(allergenSet),
    dietaryBadges,
  };
}

/**
 * Calculate full nutritional facts profile and calorie count for a multi-ingredient recipe.
 */
export function calculateRecipeNutrition(
  ingredients: Array<{ name: string; amountGrams: number }>,
  servings: number = 1
): RecipeNutritionSummary {
  let totalCals = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalSodium = 0;

  const names = ingredients.map((i) => i.name);
  const { allergens, dietaryBadges } = detectAllergensFromIngredients(names);

  for (const ing of ingredients) {
    const nameLower = ing.name.toLowerCase();
    // Find closest match in USDA database
    const matchedKey = Object.keys(USDA_INGREDIENT_DATABASE).find((k) => nameLower.includes(k)) || 'flour';
    const profile = USDA_INGREDIENT_DATABASE[matchedKey] ?? USDA_INGREDIENT_DATABASE['flour']!;

    const factor = ing.amountGrams / 100;
    totalCals += profile.calories * factor;
    totalProtein += profile.protein_g * factor;
    totalCarbs += profile.carbs_g * factor;
    totalFat += profile.fat_g * factor;
    totalSodium += profile.sodium_mg * factor;
  }

  const s = Math.max(1, servings);

  return {
    totalCalories: Math.round(totalCals),
    totalProteinG: Math.round(totalProtein),
    totalCarbsG: Math.round(totalCarbs),
    totalFatG: Math.round(totalFat),
    totalSodiumMg: Math.round(totalSodium),
    caloriesPerServing: Math.round(totalCals / s),
    proteinPerServing: Math.round(totalProtein / s),
    carbsPerServing: Math.round(totalCarbs / s),
    fatPerServing: Math.round(totalFat / s),
    allergens,
    dietaryBadges,
  };
}

