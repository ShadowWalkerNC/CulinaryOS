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
