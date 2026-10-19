/**
 * @culinaryops/food-cost-engine
 * Pure functions for recipe costing and actual vs theoretical variance.
 */

export interface CostIngredient {
  name: string;
  quantity: number;  // in grams or yield unit
  unit: string;
  costPerUnit: number; // cost per gram/unit in dollars
  trimYieldPct?: number; // e.g. 75 for 75% prep/trim yield (AP vs EP)
  cookShrinkPct?: number; // e.g. 25 for 25% thermal moisture/fat shrinkage
}

export interface RecipeCost {
  ingredientCosts: Array<{ name: string; cost: number; portionCost: number; pctOfPlate: number }>;
  totalCost: number;
  costPerServing: number;
  foodCostPct: number;
  grossProfitPct: number;
  minMenuPrice72Gp: number;
  dominantCostAlerts?: string[];
}

/** Calculate total recipe cost and cost per serving with yield compensation and 72% GP target. */
export function costRecipe(
  ingredients: CostIngredient[],
  servings: number,
  menuPrice: number,
  targetGpPct: number = 72
): RecipeCost {
  const ingredientCosts = ingredients.map(i => {
    // 1. Account for butcher trim yield (As-Purchased vs Edible Portion)
    const trimFactor = (i.trimYieldPct && i.trimYieldPct > 0) ? (i.trimYieldPct / 100) : 1.0;
    // 2. Account for cooking shrinkage (thermal rendering / moisture loss)
    const shrinkFactor = (i.cookShrinkPct && i.cookShrinkPct > 0) ? (1 - i.cookShrinkPct / 100) : 1.0;
    const combinedYield = Math.max(0.01, trimFactor * shrinkFactor);
    const effectiveCostPerUnit = i.costPerUnit / combinedYield;
    const cost = Math.round(i.quantity * effectiveCostPerUnit * 100) / 100;
    return {
      name: i.name,
      cost,
      portionCost: servings > 0 ? Math.round((cost / servings) * 100) / 100 : cost,
      pctOfPlate: 0 // calculated after totalCost
    };
  });

  const totalCost      = ingredientCosts.reduce((sum, i) => sum + i.cost, 0);
  const costPerServing = servings > 0 ? Math.round((totalCost / servings) * 100) / 100 : 0;
  const foodCostPct    = menuPrice > 0 ? Math.round((costPerServing / menuPrice) * 10_000) / 100 : 0;
  const grossProfitPct = Math.round((100 - foodCostPct) * 100) / 100;
  const targetCostFactor = Math.max(0.01, (100 - targetGpPct) / 100);
  const minMenuPrice72Gp = Math.round((costPerServing / targetCostFactor) * 100) / 100;

  // Decorate percentage of plate and identify dominant cost ingredient (>40% of plate cost)
  const dominantCostAlerts: string[] = [];
  for (const item of ingredientCosts) {
    item.pctOfPlate = totalCost > 0 ? Math.round((item.cost / totalCost) * 10_000) / 100 : 0;
    if (item.pctOfPlate >= 40) {
      dominantCostAlerts.push(`${item.name} represents ${item.pctOfPlate}% of dish cost (wholesale volatility risk)`);
    }
  }

  return { 
    ingredientCosts, 
    totalCost: Math.round(totalCost * 100) / 100, 
    costPerServing, 
    foodCostPct,
    grossProfitPct,
    minMenuPrice72Gp,
    dominantCostAlerts
  };
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

export * from './variance.js';
