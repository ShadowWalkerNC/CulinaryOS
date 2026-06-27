// @culinaryos/ratio-engine
// Pure TypeScript — zero dependencies.
// Models recipes as ratio relationships (baker's percentages / ratio units).
// The differentiator: Toast stores 500g. We store 100% and understand the relationship.

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

/**
 * Scale a blueprint to any target yield.
 * Returns new ingredient quantities preserving ratio relationships.
 */
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

/**
 * Compute food cost for a scaled ingredient list.
 * @param scaled - Output of scaleBlueprint()
 * @param priceMap - ingredient id → cost per unit (same unit as ingredient)
 */
export function computeCost(
  scaled: RatioBlueprintIngredient[],
  priceMap: Record<string, number>
): number {
  return scaled.reduce((total, ing) => {
    const unitCost = priceMap[ing.id] ?? 0;
    return total + ing.ratioWeight * unitCost;
  }, 0);
}

/**
 * Convert a baker's percentage blueprint to absolute grams given a total dough weight.
 * @param blueprint - Blueprint where base ingredient (flour) = 100
 * @param totalDoughWeightGrams - Target total dough weight in grams
 */
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
