// ============================================================
// CulinaryOS — Dietary, Allergen & Nutrition Engine
// Supports FDA FASTER Act Top 9 allergens, dietary classifications,
// cross-contact risk matrix, and allergen substitution mapping.
// ============================================================

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

export interface AllergenDefinition {
  id: string;
  name: string;
  category: 'top_9' | 'secondary' | 'intolerance';
  emoji: string;
  severity: 'high' | 'medium' | 'low';
  commonAliases: string[];
  crossContactRisk: string[];
}

export const ALLERGEN_REGISTRY: Record<string, AllergenDefinition> = {
  milk: {
    id: 'milk',
    name: 'Milk / Dairy',
    category: 'top_9',
    emoji: '🥛',
    severity: 'high',
    commonAliases: ['dairy', 'butter', 'cream', 'cheese', 'whey', 'casein', 'ghee', 'curds', 'lactose'],
    crossContactRisk: ['griddle', 'steam_wand', 'fryer_batter', 'shared_slicer'],
  },
  eggs: {
    id: 'eggs',
    name: 'Eggs',
    category: 'top_9',
    emoji: '🥚',
    severity: 'high',
    commonAliases: ['egg', 'albumin', 'mayo', 'mayonnaise', 'aioli', 'meringue', 'lysozyme', 'ovalbumin'],
    crossContactRisk: ['griddle', 'whisk', 'baking_sheet', 'fryer'],
  },
  fish: {
    id: 'fish',
    name: 'Fish',
    category: 'top_9',
    emoji: '🐟',
    severity: 'high',
    commonAliases: ['salmon', 'tuna', 'cod', 'halibut', 'anchovy', 'worcestershire', 'caesar_dressing', 'fish_sauce'],
    crossContactRisk: ['shared_fryer', 'cutting_board', 'grill_grates', 'knife'],
  },
  shellfish: {
    id: 'shellfish',
    name: 'Crustacean Shellfish',
    category: 'top_9',
    emoji: '🦐',
    severity: 'high',
    commonAliases: ['shrimp', 'crab', 'lobster', 'prawn', 'crawfish', 'clam', 'mussel', 'oyster', 'scallop'],
    crossContactRisk: ['shared_fryer', 'boil_pot', 'grill_tongs', 'prep_station'],
  },
  tree_nuts: {
    id: 'tree_nuts',
    name: 'Tree Nuts',
    category: 'top_9',
    emoji: '🌰',
    severity: 'high',
    commonAliases: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'macadamia', 'praline', 'marzipan'],
    crossContactRisk: ['food_processor', 'salad_station', 'dessert_pass', 'blender'],
  },
  peanuts: {
    id: 'peanuts',
    name: 'Peanuts',
    category: 'top_9',
    emoji: '🥜',
    severity: 'high',
    commonAliases: ['peanut', 'peanut_butter', 'arachis_oil', 'groundnuts'],
    crossContactRisk: ['deep_fryer', 'sauce_station', 'baking_prep', 'cutting_boards'],
  },
  wheat: {
    id: 'wheat',
    name: 'Wheat / Gluten',
    category: 'top_9',
    emoji: '🌾',
    severity: 'high',
    commonAliases: ['gluten', 'flour', 'bread', 'pasta', 'breadcrumbs', 'semolina', 'spelt', 'farro', 'couscous', 'soy_sauce'],
    crossContactRisk: ['shared_fryer', 'toaster', 'pizza_oven', 'pasta_cooker', 'prep_flour_air'],
  },
  soybeans: {
    id: 'soybeans',
    name: 'Soybeans / Soy',
    category: 'top_9',
    emoji: '🫘',
    severity: 'high',
    commonAliases: ['soy', 'tofu', 'edamame', 'tamari', 'miso', 'soy_lecithin', 'textured_vegetable_protein'],
    crossContactRisk: ['wok', 'fryer', 'ladles', 'marinade_containers'],
  },
  sesame: {
    id: 'sesame',
    name: 'Sesame',
    category: 'top_9',
    emoji: '🥯',
    severity: 'high',
    commonAliases: ['tahini', 'sesame_oil', 'sesame_seeds', 'hummus', 'gomasio'],
    crossContactRisk: ['cutting_board', 'bun_toaster', 'garnish_well'],
  },
};

export type DietaryLifestyle =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'keto'
  | 'halal'
  | 'kosher';

export interface DietaryClassification {
  isVegan: boolean;
  isVegetarian: boolean;
  isPescatarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  matchedAllergens: string[];
  crossContactWarnings: string[];
}

/**
 * Normalizes user/ingredient allergen strings to standard IDs.
 */
export function normalizeAllergen(input: string): string {
  const clean = input.toLowerCase().trim().replace(/[-\s]/g, '_');
  for (const [key, def] of Object.entries(ALLERGEN_REGISTRY)) {
    if (key === clean || def.commonAliases.includes(clean)) {
      return key;
    }
  }
  return clean;
}

/**
 * Classifies a dish or ingredients list for dietary attributes and allergen tags.
 */
export function evaluateDietaryProfile(
  allergens: string[] = [],
  ingredients: string[] = [],
  cookingMethods: { sharedFryer?: boolean; sharedGrill?: boolean; sharedToaster?: boolean } = {}
): DietaryClassification {
  const normalizedAllergens = new Set<string>();

  for (const a of allergens) {
    normalizedAllergens.add(normalizeAllergen(a));
  }

  // Scan ingredients list for undeclared allergens
  for (const ing of ingredients) {
    const norm = ing.toLowerCase();
    for (const [key, def] of Object.entries(ALLERGEN_REGISTRY)) {
      if (def.commonAliases.some(alias => norm.includes(alias))) {
        normalizedAllergens.add(key);
      }
    }
  }

  const allergenList = Array.from(normalizedAllergens);
  const crossContactWarnings: string[] = [];

  if (cookingMethods.sharedFryer) {
    crossContactWarnings.push('Cooked in shared fryer: potential wheat/shellfish/fish cross-contact');
  }
  if (cookingMethods.sharedGrill) {
    crossContactWarnings.push('Prepared on shared grill surface: potential meat/dairy cross-contact');
  }
  if (cookingMethods.sharedToaster) {
    crossContactWarnings.push('Toasted in shared bread toaster: potential wheat cross-contact');
  }

  const hasMeat = ingredients.some(i => {
    const lower = i.toLowerCase();
    return ['beef', 'pork', 'chicken', 'bacon', 'lamb', 'duck', 'veal', 'turkey', 'prosciutto', 'sausage'].some(m => lower.includes(m));
  });

  const hasFish = allergenList.includes('fish') || allergenList.includes('shellfish');
  const hasDairy = allergenList.includes('milk');
  const hasEgg = allergenList.includes('eggs');
  const hasGluten = allergenList.includes('wheat') || allergenList.includes('gluten');
  const hasNuts = allergenList.includes('tree_nuts') || allergenList.includes('peanuts');

  const isVegan = !hasMeat && !hasFish && !hasDairy && !hasEgg;
  const isVegetarian = !hasMeat && !hasFish;
  const isPescatarian = !hasMeat;
  const isGlutenFree = !hasGluten && !cookingMethods.sharedFryer && !cookingMethods.sharedToaster;
  const isDairyFree = !hasDairy;
  const isNutFree = !hasNuts;

  return {
    isVegan,
    isVegetarian,
    isPescatarian,
    isGlutenFree,
    isDairyFree,
    isNutFree,
    matchedAllergens: allergenList,
    crossContactWarnings,
  };
}

/**
 * Suggested safe allergen substitutions.
 */
export const ALLERGEN_SUBSTITUTIONS: Record<string, string[]> = {
  milk: ['Oat Milk', 'Almond Milk', 'Vegan Cheddar', 'Coconut Oil / Vegan Butter'],
  eggs: ['Aquafaba', 'Applesauce (Baking)', 'Flaxseed Meal Blend', 'Tofu Scramble'],
  wheat: ['Gluten-Free Bun', 'Tamari (Gluten-Free Soy)', 'Corn Tortillas', 'Rice Noodles', 'Almond Flour'],
  soybeans: ['Coconut Aminos (Soy-Free)', 'Chickpea Miso'],
  peanuts: ['Sunflower Seed Butter (SunButter)', 'Pumpkin Seed Butter'],
  tree_nuts: ['Toasted Pumpkin Seeds (Pepitas)', 'Sunflower Seeds', 'Toasted Oats'],
  sesame: ['Sunflower Seed Tahini', 'Poppy Seeds', 'Hemp Hearts'],
};
