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

// ---------------------------------------------------------------------------
// Baker's Math (% of Base Flour) Scaling
// ---------------------------------------------------------------------------

export interface BakersIngredient {
  name: string;
  percentage: number;
  isBaseFlour?: boolean;
}

export interface ScaledBakersIngredient extends BakersIngredient {
  weightGrams: number;
  approxKg: number;
  approxLbs: number;
}

export interface BakersScaleResult {
  targetFlourGrams: number;
  totalBatchWeightGrams: number;
  ingredients: ScaledBakersIngredient[];
}

/**
 * Scales a baking formula using Baker's Percentages (% of flour basis = 100%).
 */
export function scaleBakersPercentage(
  ingredients: BakersIngredient[],
  targetFlourGrams: number
): BakersScaleResult {
  const baseFlourGrams = Math.max(1, targetFlourGrams);
  let totalBatchWeightGrams = 0;

  const scaledIngredients: ScaledBakersIngredient[] = ingredients.map((ing) => {
    const weightGrams = Math.round((ing.percentage / 100) * baseFlourGrams * 10) / 10;
    totalBatchWeightGrams += weightGrams;

    return {
      ...ing,
      weightGrams,
      approxKg: Math.round((weightGrams / 1000) * 100) / 100,
      approxLbs: Math.round((weightGrams * 0.00220462) * 100) / 100,
    };
  });

  return {
    targetFlourGrams: baseFlourGrams,
    totalBatchWeightGrams: Math.round(totalBatchWeightGrams * 10) / 10,
    ingredients: scaledIngredients,
  };
}

// ---------------------------------------------------------------------------
// FDA FASTER Act Top 9 Allergen & Cross-Contact Intelligence
// ---------------------------------------------------------------------------

export const FDA_TOP_9_ALLERGENS = [
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'tree_nuts',
  'peanuts',
  'wheat',
  'soybeans',
  'sesame',
] as const;

export type Top9Allergen = typeof FDA_TOP_9_ALLERGENS[number];

export interface AllergenMeta {
  id: Top9Allergen;
  name: string;
  emoji: string;
  commonAliases: string[];
  crossContactRisks: string[];
}

export const ALLERGEN_REGISTRY: Record<Top9Allergen, AllergenMeta> = {
  milk: {
    id: 'milk',
    name: 'Milk / Dairy',
    emoji: '🥛',
    commonAliases: ['dairy', 'milk', 'butter', 'cream', 'cheese', 'mozzarella', 'parmigiano', 'cheddar', 'whey', 'ghee', 'curds', 'lactose'],
    crossContactRisks: ['steam wand', 'griddle surface', 'shared slicer'],
  },
  eggs: {
    id: 'eggs',
    name: 'Eggs',
    emoji: '🥚',
    commonAliases: ['egg', 'eggs', 'yolk', 'albumin', 'mayo', 'mayonnaise', 'aioli', 'meringue'],
    crossContactRisks: ['griddle', 'whisk', 'fryer'],
  },
  fish: {
    id: 'fish',
    name: 'Fish',
    emoji: '🐟',
    commonAliases: ['salmon', 'tuna', 'cod', 'halibut', 'anchovy', 'fish sauce', 'caesar'],
    crossContactRisks: ['shared fryer', 'cutting board', 'grill grates'],
  },
  shellfish: {
    id: 'shellfish',
    name: 'Crustacean Shellfish',
    emoji: '🦐',
    commonAliases: ['shrimp', 'crab', 'lobster', 'prawn', 'crawfish', 'calamari', 'squid', 'clam', 'mussel', 'oyster'],
    crossContactRisks: ['shared fryer', 'boil pot', 'grill tongs'],
  },
  tree_nuts: {
    id: 'tree_nuts',
    name: 'Tree Nuts',
    emoji: '🌰',
    commonAliases: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'marzipan'],
    crossContactRisks: ['salad station', 'blender', 'food processor', 'dessert pass'],
  },
  peanuts: {
    id: 'peanuts',
    name: 'Peanuts',
    emoji: '🥜',
    commonAliases: ['peanut', 'peanut butter', 'groundnuts', 'arachis'],
    crossContactRisks: ['deep fryer', 'sauce station', 'prep boards'],
  },
  wheat: {
    id: 'wheat',
    name: 'Wheat / Gluten',
    emoji: '🌾',
    commonAliases: ['gluten', 'flour', 'wheat', 'bread', 'pasta', 'bun', 'brioche', 'breadcrumbs', 'semolina', 'farro'],
    crossContactRisks: ['shared fryer', 'bread toaster', 'pasta cooker', 'flour dust'],
  },
  soybeans: {
    id: 'soybeans',
    name: 'Soybeans / Soy',
    emoji: '🫘',
    commonAliases: ['soy', 'tofu', 'edamame', 'tamari', 'miso', 'soy sauce', 'soy lecithin'],
    crossContactRisks: ['wok surface', 'fryer oil', 'marinade pans'],
  },
  sesame: {
    id: 'sesame',
    name: 'Sesame',
    emoji: '🥯',
    commonAliases: ['sesame', 'tahini', 'sesame oil', 'sesame seeds', 'hummus', 'gomasio', 'halva'],
    crossContactRisks: ['bun toaster', 'garnish well', 'cutting board'],
  },
};

export interface DietaryProfileResult {
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  matchedAllergens: AllergenMeta[];
  crossContactWarnings: string[];
}

/**
 * Evaluates recipe ingredients list for FDA Top 9 allergens, dietary attributes,
 * and commercial kitchen cross-contact risks.
 */
export function evaluateDietaryAndAllergens(
  ingredientNames: string[],
  cookingRisks?: { sharedFryer?: boolean; sharedGrill?: boolean; sharedToaster?: boolean }
): DietaryProfileResult {
  const matchedSet = new Set<Top9Allergen>();
  let hasMeat = false;

  for (const rawName of ingredientNames) {
    const name = rawName.toLowerCase().trim();

    // Check meat
    if (['beef', 'pork', 'bacon', 'chicken', 'lamb', 'duck', 'veal', 'steak', 'patty', 'prosciutto', 'sausage'].some((m) => name.includes(m))) {
      hasMeat = true;
    }

    // Check allergens
    for (const [key, meta] of Object.entries(ALLERGEN_REGISTRY) as Array<[Top9Allergen, AllergenMeta]>) {
      if (meta.commonAliases.some((alias) => name.includes(alias))) {
        matchedSet.add(key);
      }
    }
  }

  const matchedAllergens = Array.from(matchedSet).map((id) => ALLERGEN_REGISTRY[id]);
  const crossContactWarnings: string[] = [];

  if (cookingRisks?.sharedFryer) {
    crossContactWarnings.push('Shared Fryer Alert: High cross-contact risk for Wheat, Fish, and Shellfish.');
  }
  if (cookingRisks?.sharedToaster) {
    crossContactWarnings.push('Shared Toaster Alert: Wheat and Sesame cross-contact risk on toasted items.');
  }
  if (cookingRisks?.sharedGrill) {
    crossContactWarnings.push('Shared Grill Alert: Meat, Dairy, and Marinade cross-contact risk.');
  }

  // Cross-contact warnings based on present allergens
  for (const meta of matchedAllergens) {
    if (meta.id === 'wheat' && !cookingRisks?.sharedToaster) {
      crossContactWarnings.push('Airborne Flour Warning: Dust contact risk for dedicated gluten-sensitive prep.');
    }
    if ((meta.id === 'peanuts' || meta.id === 'tree_nuts') && !crossContactWarnings.some((w) => w.includes('Nut Station'))) {
      crossContactWarnings.push('Nut Station Warning: Dedicated prep wells and sanitized utensils mandatory.');
    }
  }

  const hasFish = matchedSet.has('fish') || matchedSet.has('shellfish');
  const hasDairy = matchedSet.has('milk');
  const hasEggs = matchedSet.has('eggs');
  const hasGluten = matchedSet.has('wheat');
  const hasNuts = matchedSet.has('peanuts') || matchedSet.has('tree_nuts');

  const isVegan = !hasMeat && !hasFish && !hasDairy && !hasEggs;
  const isVegetarian = !hasMeat && !hasFish;
  const isGlutenFree = !hasGluten && !cookingRisks?.sharedFryer && !cookingRisks?.sharedToaster;
  const isDairyFree = !hasDairy;
  const isNutFree = !hasNuts;

  return {
    isVegan,
    isVegetarian,
    isGlutenFree,
    isDairyFree,
    isNutFree,
    matchedAllergens,
    crossContactWarnings,
  };
}

export const ALLERGEN_SUBSTITUTIONS: Record<string, string[]> = {
  milk: ['Oat Milk', 'Almond Milk', 'Coconut Oil / Vegan Butter', 'Vegan Cheddar'],
  eggs: ['Aquafaba (Whipped Chickpea Liquid)', 'Applesauce (Baking)', 'Flaxseed Meal Blend'],
  wheat: ['Gluten-Free Flour Blend', 'Tamari (Gluten-Free Soy)', 'Corn Tortillas', 'Almond Flour'],
  soybeans: ['Coconut Aminos (Soy-Free)', 'Chickpea Miso'],
  peanuts: ['Sunflower Seed Butter (SunButter)', 'Pumpkin Seed Butter'],
  tree_nuts: ['Toasted Pumpkin Seeds (Pepitas)', 'Sunflower Seeds', 'Toasted Rolled Oats'],
  sesame: ['Sunflower Seed Tahini', 'Poppy Seeds', 'Hemp Hearts'],
};

