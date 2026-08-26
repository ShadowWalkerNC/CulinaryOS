/**
 * RecipeOS — Shared ratio-based scaling engine
 * Single source of truth for all surfaces: web/, cli/, mcp/, mobile/
 * No platform-specific imports — pure TypeScript.
 */

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface ScaledIngredient extends Ingredient {
  scaledAmount: string;
}

/**
 * Scale a list of ingredients from baseServings to targetServings.
 * Preserves original amount strings for display; returns rounded scaled values.
 */
export function scaleIngredients(
  ingredients: Ingredient[],
  baseServings: number,
  targetServings: number
): ScaledIngredient[] {
  if (baseServings <= 0 || targetServings <= 0) {
    return ingredients.map((i) => ({ ...i, scaledAmount: i.amount }));
  }
  const factor = targetServings / baseServings;
  return ingredients.map((ing) => {
    const raw = parseFloat(ing.amount);
    if (isNaN(raw)) return { ...ing, scaledAmount: ing.amount };
    return { ...ing, scaledAmount: formatAmount(raw * factor) };
  });
}

/**
 * Calculate scale factor between two serving sizes.
 */
export function scaleFactor(base: number, target: number): number {
  if (base <= 0) return 1;
  return target / base;
}

/**
 * Round and format a scaled amount for display.
 * Whole numbers display without decimals; small amounts show 2dp.
 */
export function formatAmount(value: number): string {
  if (value >= 10) return Math.round(value).toString();
  if (value >= 1) return parseFloat(value.toFixed(1)).toString();
  return parseFloat(value.toFixed(2)).toString();
}

/**
 * Convert grams to cups for common baking ingredients.
 * Returns null if conversion not available for that ingredient.
 */
export function gramsToCups(grams: number, ingredient: string): number | null {
  const conversions: Record<string, number> = {
    flour: 125,
    sugar: 200,
    butter: 227,
    salt: 273,
    rice: 185,
    oats: 90,
  };
  const key = ingredient.toLowerCase();
  for (const [name, gramsPerCup] of Object.entries(conversions)) {
    if (key.includes(name)) return grams / gramsPerCup;
  }
  return null;
}

/**
 * Convert cups to grams for common baking ingredients.
 * Returns null if conversion not available for that ingredient.
 */
export function cupsToGrams(cups: number, ingredient: string): number | null {
  const gramsPerCup = gramsToCups(1, ingredient);
  if (gramsPerCup === null) return null;
  return cups * gramsPerCup;
}
