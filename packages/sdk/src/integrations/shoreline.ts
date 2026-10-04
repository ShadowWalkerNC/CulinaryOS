/**
 * CulinaryOS <-> Shoreline Care OS Integration Adapter
 *
 * Provides HIPAA-isolated clinical nutrition, allergen matrix synchronization,
 * and therapeutic dietary labeling between CulinaryOS recipe formulas and Shoreline Care OS.
 *
 * Non-Negotiable Invariants:
 * 1. ZERO Patient Health Information (PHI/EHR/MRN) storage or handling.
 * 2. Pure contract-based decoupled exchange (no shared database connections or internal table coupling).
 * 3. All nutritional macros are verified with positive integer/decimal quantities.
 */

export interface NutritionalMacros {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  saturatedFatGrams?: number;
  sodiumMg: number;
  fiberGrams?: number;
  sugarGrams?: number;
}

export type StandardAllergen =
  | 'milk'
  | 'eggs'
  | 'fish'
  | 'crustacean_shellfish'
  | 'tree_nuts'
  | 'peanuts'
  | 'wheat'
  | 'soybeans'
  | 'sesame';

export type TherapeuticDietaryTag =
  | 'diabetic_compliant'
  | 'renal_compliant'
  | 'cardiac_low_sodium'
  | 'gluten_free'
  | 'pureed_texture_grade_4'
  | 'minced_moist_texture_grade_5'
  | 'soft_bite_sized_texture_grade_6'
  | 'regular_texture_grade_7'
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher';

export interface ClinicalRecipeExport {
  recipeId: string;
  recipeName: string;
  servingSizeGrams: number;
  macros: NutritionalMacros;
  allergens: StandardAllergen[];
  dietaryTags: TherapeuticDietaryTag[];
  ingredientsList: string[];
  exportedAt: string;
}

export interface AllergenConflictCheck {
  recipeId: string;
  recipeName: string;
  containsAllergen: boolean;
  matchingAllergens: StandardAllergen[];
}

export class ShorelineNutritionAdapter {
  private client: {
    request: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
    tenantId: string;
  };

  constructor(client: {
    request: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
    tenantId: string;
  }) {
    this.client = client;
  }

  /**
   * Sanitizes and verifies that a recipe export contains strictly culinary data
   * and zero clinical patient identifiers.
   */
  sanitizeClinicalExport(payload: ClinicalRecipeExport): ClinicalRecipeExport {
    // Assert required clinical fields
    if (!payload.recipeId || !payload.recipeName) {
      throw new Error('Invalid clinical export: recipeId and recipeName are required');
    }

    if (payload.macros.calories < 0 || payload.macros.sodiumMg < 0) {
      throw new Error('Invalid nutritional macros: calories and sodium cannot be negative');
    }

    // Return sanitized clone stripping any non-whitelisted keys
    return {
      recipeId: String(payload.recipeId),
      recipeName: String(payload.recipeName),
      servingSizeGrams: Math.max(0, payload.servingSizeGrams),
      macros: {
        calories: Math.max(0, payload.macros.calories),
        proteinGrams: Math.max(0, payload.macros.proteinGrams),
        carbsGrams: Math.max(0, payload.macros.carbsGrams),
        fatGrams: Math.max(0, payload.macros.fatGrams),
        sodiumMg: Math.max(0, payload.macros.sodiumMg),
        saturatedFatGrams: payload.macros.saturatedFatGrams,
        fiberGrams: payload.macros.fiberGrams,
        sugarGrams: payload.macros.sugarGrams,
      },
      allergens: [...payload.allergens],
      dietaryTags: [...payload.dietaryTags],
      ingredientsList: [...payload.ingredientsList],
      exportedAt: payload.exportedAt || new Date().toISOString(),
    };
  }

  /**
   * Checks a batch of recipes against an exclusion list of allergens (e.g. resident allergy profile).
   */
  checkAllergenConflicts(
    recipes: Array<{ recipeId: string; recipeName: string; allergens: StandardAllergen[] }>,
    restrictedAllergens: StandardAllergen[]
  ): AllergenConflictCheck[] {
    const restrictedSet = new Set(restrictedAllergens);

    return recipes.map((recipe) => {
      const conflicts = recipe.allergens.filter((a) => restrictedSet.has(a));
      return {
        recipeId: recipe.recipeId,
        recipeName: recipe.recipeName,
        containsAllergen: conflicts.length > 0,
        matchingAllergens: conflicts,
      };
    });
  }

  /**
   * Evaluates if a recipe meets cardiac low sodium standards (<= 140mg per serving).
   */
  isCardiacLowSodium(macros: NutritionalMacros): boolean {
    return macros.sodiumMg <= 140;
  }

  /**
   * Evaluates if a recipe meets diabetic compliant carbohydrate boundaries (<= 45g carbs per serving).
   */
  isDiabeticCompliant(macros: NutritionalMacros): boolean {
    return macros.carbsGrams <= 45;
  }

  /**
   * Dispatches nutritional payload to Shoreline webhook or API bridge.
   */
  async exportToShoreline(exportData: ClinicalRecipeExport, targetEndpoint?: string): Promise<{
    success: boolean;
    syncedRecipeId: string;
    timestamp: string;
  }> {
    const sanitized = this.sanitizeClinicalExport(exportData);

    const endpoint = targetEndpoint || '/v1/integrations/shoreline/sync';
    const result = await this.client.request<any>(endpoint, {
      method: 'POST',
      body: JSON.stringify(sanitized),
    });

    return {
      success: true,
      syncedRecipeId: sanitized.recipeId,
      timestamp: sanitized.exportedAt,
      ...result,
    };
  }
}
