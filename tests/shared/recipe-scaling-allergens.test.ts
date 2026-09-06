// ==============================================================================
// Unit Test Suite: Recipe Vault BOM Scaling & FDA FASTER Act 9-Allergen Engine (Stage F)
// ==============================================================================

import { describe, it, expect } from "bun:test";
import {
  scaleIngredients,
  scaleBakersPercentage,
  evaluateDietaryAndAllergens,
  ALLERGEN_SUBSTITUTIONS,
  FDA_TOP_9_ALLERGENS,
} from "../../apps/recipeos/shared/ratio-engine.js";
import { evaluateDietaryProfile } from "../../packages/shared/src/dietary.js";

describe("Recipe Vault BOM Scaling Engine", () => {
  it("scales baker percentage formula accurately from base flour weight", () => {
    const formula = [
      { name: "Bread Flour", percentage: 100, isBaseFlour: true },
      { name: "Water", percentage: 72 },
      { name: "Levain Starter", percentage: 20 },
      { name: "Salt", percentage: 2 },
      { name: "Olive Oil", percentage: 5 },
    ];

    const result = scaleBakersPercentage(formula, 2000);
    expect(result.targetFlourGrams).toBe(2000);
    expect(result.totalBatchWeightGrams).toBe(3980);

    const flour = result.ingredients.find((i) => i.name === "Bread Flour")!;
    expect(flour.weightGrams).toBe(2000);
    expect(flour.approxKg).toBe(2);

    const water = result.ingredients.find((i) => i.name === "Water")!;
    expect(water.weightGrams).toBe(1440);

    const salt = result.ingredients.find((i) => i.name === "Salt")!;
    expect(salt.weightGrams).toBe(40);
  });

  it("scales portion servings multiplier accurately preserving unit strings", () => {
    const ingredients = [
      { name: "Dry Pasta", amount: "200", unit: "g" },
      { name: "Egg Yolks", amount: "4", unit: "count" },
      { name: "Guanciale", amount: "100", unit: "g" },
      { name: "Pecorino Romano", amount: "50", unit: "g" },
    ];

    const scaled = scaleIngredients(ingredients, 2, 6);
    expect(scaled[0].scaledAmount).toBe("600");
    expect(scaled[1].scaledAmount).toBe("12");
    expect(scaled[2].scaledAmount).toBe("300");
    expect(scaled[3].scaledAmount).toBe("150");
  });
});

describe("FDA FASTER Act Top 9 Allergen & Cross-Contact Detection", () => {
  it("recognizes all 9 FDA FASTER Act major allergens from recipe ingredients", () => {
    expect(FDA_TOP_9_ALLERGENS).toHaveLength(9);

    const testCases = [
      { ingredients: ["Whole Milk", "Cheddar Cheese", "Heavy Cream"], expectedId: "milk" },
      { ingredients: ["Egg Yolks", "Mayonnaise", "Aioli"], expectedId: "eggs" },
      { ingredients: ["Atlantic Salmon Fillet", "Anchovy Paste"], expectedId: "fish" },
      { ingredients: ["Tiger Prawns", "Lump Crab Meat", "Lobster Tail"], expectedId: "shellfish" },
      { ingredients: ["Almond Flour", "Crushed Walnuts", "Pistachio Paste"], expectedId: "tree_nuts" },
      { ingredients: ["Creamy Peanut Butter", "Roasted Groundnuts"], expectedId: "peanuts" },
      { ingredients: ["All-Purpose Flour", "Bread Crumbs", "Brioche Bun"], expectedId: "wheat" },
      { ingredients: ["Tofu Cubes", "Edamame", "Soy Sauce", "Miso Paste"], expectedId: "soybeans" },
      { ingredients: ["Toasted Sesame Seeds", "Tahini Paste", "Sesame Oil"], expectedId: "sesame" },
    ];

    for (const tc of testCases) {
      const evaluation = evaluateDietaryAndAllergens(tc.ingredients);
      const matched = evaluation.matchedAllergens.some((a) => a.id === tc.expectedId);
      expect(matched).toBe(true);
    }
  });

  it("detects commercial kitchen station cross-contact risks", () => {
    const fries = evaluateDietaryAndAllergens(["Potatoes", "Canola Oil", "Salt"], {
      sharedFryer: true,
    });
    expect(fries.crossContactWarnings.some((w) => w.includes("Shared Fryer Alert"))).toBe(true);
    expect(fries.isGlutenFree).toBe(false);

    const toast = evaluateDietaryAndAllergens(["Gluten-Free Sourdough"], {
      sharedToaster: true,
    });
    expect(toast.crossContactWarnings.some((w) => w.includes("Shared Toaster Alert"))).toBe(true);
    expect(toast.isGlutenFree).toBe(false);

    const vegetables = evaluateDietaryAndAllergens(["Zucchini", "Bell Peppers", "Olive Oil"], {
      sharedGrill: true,
    });
    expect(vegetables.crossContactWarnings.some((w) => w.includes("Shared Grill Alert"))).toBe(true);
  });

  it("correctly maps dietary lifestyle classifications", () => {
    const veganPasta = evaluateDietaryAndAllergens([
      "Rice Noodles",
      "Garlic",
      "Olive Oil",
      "Cherry Tomatoes",
      "Fresh Basil",
    ]);
    expect(veganPasta.isVegan).toBe(true);
    expect(veganPasta.isVegetarian).toBe(true);
    expect(veganPasta.isGlutenFree).toBe(true);
    expect(veganPasta.isDairyFree).toBe(true);
    expect(veganPasta.isNutFree).toBe(true);

    const fettuccine = evaluateDietaryAndAllergens([
      "Fresh Fettuccine (Wheat)",
      "Heavy Cream",
      "Parmigiano-Reggiano",
      "Butter",
    ]);
    expect(fettuccine.isVegan).toBe(false);
    expect(fettuccine.isVegetarian).toBe(true);
    expect(fettuccine.isDairyFree).toBe(false);
    expect(fettuccine.isGlutenFree).toBe(false);

    const steak = evaluateDietaryAndAllergens(["Prime Ribeye Beef", "Sea Salt", "Black Pepper"]);
    expect(steak.isVegan).toBe(false);
    expect(steak.isVegetarian).toBe(false);
    expect(steak.isGlutenFree).toBe(true);
    expect(steak.isDairyFree).toBe(true);
  });

  it("provides safe, culinary-sound substitutions for allergens", () => {
    expect(ALLERGEN_SUBSTITUTIONS.milk).toBeDefined();
    expect(ALLERGEN_SUBSTITUTIONS.milk).toContain("Oat Milk");

    expect(ALLERGEN_SUBSTITUTIONS.wheat).toBeDefined();
    expect(ALLERGEN_SUBSTITUTIONS.wheat).toContain("Gluten-Free Flour Blend");

    expect(ALLERGEN_SUBSTITUTIONS.peanuts).toBeDefined();
    expect(ALLERGEN_SUBSTITUTIONS.peanuts).toContain("Sunflower Seed Butter (SunButter)");

    expect(ALLERGEN_SUBSTITUTIONS.eggs).toBeDefined();
    expect(ALLERGEN_SUBSTITUTIONS.eggs).toContain("Aquafaba (Whipped Chickpea Liquid)");
  });
});
