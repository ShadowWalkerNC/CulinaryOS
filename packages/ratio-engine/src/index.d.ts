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
export declare function scaleBlueprint(blueprint: RatioBlueprint, targetYield: number): RatioBlueprintIngredient[];
/**
 * Compute food cost for a scaled ingredient list.
 * @param scaled - Output of scaleBlueprint()
 * @param priceMap - ingredient id → cost per unit (same unit as ingredient)
 */
export declare function computeCost(scaled: RatioBlueprintIngredient[], priceMap: Record<string, number>): number;
/**
 * Convert a baker's percentage blueprint to absolute grams given a total dough weight.
 * @param blueprint - Blueprint where base ingredient (flour) = 100
 * @param totalDoughWeightGrams - Target total dough weight in grams
 */
export declare function fromTotalWeight(blueprint: RatioBlueprint, totalDoughWeightGrams: number): RatioBlueprintIngredient[];
