/**
 * @culinaryops/food-cost-engine
 * Pure functions for recipe costing and actual vs theoretical variance.
 */

export interface CostIngredient {
  name: string;
  quantity: number;  // in grams or yield unit
  unit: string;
  costPerUnit: number; // cost per gram/unit in dollars
}

export interface RecipeCost {
  ingredientCosts: Array<{ name: string; cost: number }>;
  totalCost: number;
  costPerServing: number;
  foodCostPct: number;
}

/** Calculate total recipe cost and cost per serving. */
export function costRecipe(
  ingredients: CostIngredient[],
  servings: number,
  menuPrice: number
): RecipeCost {
  const ingredientCosts = ingredients.map(i => ({
    name: i.name,
    cost: Math.round(i.quantity * i.costPerUnit * 100) / 100,
  }));

  const totalCost     = ingredientCosts.reduce((sum, i) => sum + i.cost, 0);
  const costPerServing = servings > 0 ? Math.round((totalCost / servings) * 100) / 100 : 0;
  const foodCostPct   = menuPrice > 0 ? Math.round((costPerServing / menuPrice) * 10_000) / 100 : 0;

  return { ingredientCosts, totalCost: Math.round(totalCost * 100) / 100, costPerServing, foodCostPct };
}

export interface VarianceResult {
  theoretical: number;
  actual: number;
  variance: number;
  variancePct: number;
  status: 'ok' | 'warn' | 'alert';
}

/**
 * Compare theoretical food cost to actual food cost.
 * warn threshold: >2% variance. alert threshold: >5%.
 */
export function calcVariance(theoretical: number, actual: number): VarianceResult {
  const variance    = Math.round((actual - theoretical) * 100) / 100;
  const variancePct = theoretical > 0 ? Math.round((variance / theoretical) * 10_000) / 100 : 0;
  const absV        = Math.abs(variancePct);
  const status      = absV >= 5 ? 'alert' : absV >= 2 ? 'warn' : 'ok';
  return { theoretical, actual, variance, variancePct, status };
}
