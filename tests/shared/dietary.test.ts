import { describe, it, expect } from 'bun:test';
import {
  FDA_TOP_9_ALLERGENS,
  ALLERGEN_REGISTRY,
  normalizeAllergen,
  evaluateDietaryProfile,
  ALLERGEN_SUBSTITUTIONS,
} from '@culinaryos/shared';

describe('Dietary & Allergen Intelligence Engine', () => {
  it('defines all 9 FDA FASTER Act major allergens', () => {
    expect(FDA_TOP_9_ALLERGENS).toHaveLength(9);
    expect(FDA_TOP_9_ALLERGENS).toContain('milk');
    expect(FDA_TOP_9_ALLERGENS).toContain('eggs');
    expect(FDA_TOP_9_ALLERGENS).toContain('fish');
    expect(FDA_TOP_9_ALLERGENS).toContain('shellfish');
    expect(FDA_TOP_9_ALLERGENS).toContain('tree_nuts');
    expect(FDA_TOP_9_ALLERGENS).toContain('peanuts');
    expect(FDA_TOP_9_ALLERGENS).toContain('wheat');
    expect(FDA_TOP_9_ALLERGENS).toContain('soybeans');
    expect(FDA_TOP_9_ALLERGENS).toContain('sesame');
  });

  it('normalizes common ingredient aliases to canonical allergen IDs', () => {
    expect(normalizeAllergen('dairy')).toBe('milk');
    expect(normalizeAllergen('cheese')).toBe('milk');
    expect(normalizeAllergen('butter')).toBe('milk');
    expect(normalizeAllergen('flour')).toBe('wheat');
    expect(normalizeAllergen('gluten')).toBe('wheat');
    expect(normalizeAllergen('mayo')).toBe('eggs');
    expect(normalizeAllergen('tahini')).toBe('sesame');
    expect(normalizeAllergen('shrimp')).toBe('shellfish');
    expect(normalizeAllergen('almond')).toBe('tree_nuts');
  });

  it('evaluates vegan and vegetarian status correctly', () => {
    // Vegan salad
    const veganSalad = evaluateDietaryProfile([], ['Mixed Greens', 'Cucumber', 'Olive Oil', 'Lemon Juice']);
    expect(veganSalad.isVegan).toBe(true);
    expect(veganSalad.isVegetarian).toBe(true);
    expect(veganSalad.isGlutenFree).toBe(true);
    expect(veganSalad.isDairyFree).toBe(true);

    // Vegetarian Margherita Pizza (has dairy & gluten)
    const pizza = evaluateDietaryProfile(['gluten', 'dairy'], ['00 Flour', 'San Marzano Tomato', 'Mozzarella (Milk)']);
    expect(pizza.isVegan).toBe(false);
    expect(pizza.isVegetarian).toBe(true);
    expect(pizza.isGlutenFree).toBe(false);
    expect(pizza.isDairyFree).toBe(false);

    // Burger with beef
    const burger = evaluateDietaryProfile(['gluten', 'dairy'], ['Dry-Aged Beef', 'Cheddar', 'Brioche Bun']);
    expect(burger.isVegan).toBe(false);
    expect(burger.isVegetarian).toBe(false);
    expect(burger.isPescatarian).toBe(false);
  });

  it('detects shared fryer and toaster cross-contact risks', () => {
    const friedFish = evaluateDietaryProfile(['fish'], ['Cod', 'Cornstarch'], { sharedFryer: true });
    expect(friedFish.crossContactWarnings.length).toBeGreaterThan(0);
    expect(friedFish.crossContactWarnings[0]).toContain('shared fryer');
    expect(friedFish.isGlutenFree).toBe(false); // Shared fryer breaks strict celiac GF status

    const toastedBread = evaluateDietaryProfile([], ['Gluten-Free Bread'], { sharedToaster: true });
    expect(toastedBread.crossContactWarnings.length).toBeGreaterThan(0);
    expect(toastedBread.isGlutenFree).toBe(false); // Shared bread toaster creates wheat cross-contact
  });

  it('provides valid culinary substitutions for top allergens', () => {
    expect(ALLERGEN_SUBSTITUTIONS.milk).toContain('Oat Milk');
    expect(ALLERGEN_SUBSTITUTIONS.wheat).toContain('Gluten-Free Bun');
    expect(ALLERGEN_SUBSTITUTIONS.sesame).toContain('Sunflower Seed Tahini');
  });
});
