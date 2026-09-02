/**
 * @culinaryos/prep-engine
 * Shift prep planning — par levels, mise en place, batch projections.
 */

import { scaleRecipe, type Recipe } from '@culinaryos/ratio-engine';

export interface PrepItem {
  ingredient: string;
  currentStock: number;
  parLevel: number;
  unit: string;
}

export interface ShiftPrepPlan {
  shift: string;
  date: string;
  items: Array<{
    ingredient: string;
    prepAmount: number;
    unit: string;
    note?: string;
  }>;
}

/** Build a shift prep plan from par levels and current stock. */
export function buildShiftPrep(
  prepItems: PrepItem[],
  shift: string,
  date: string
): ShiftPrepPlan {
  const items = prepItems
    .filter((item) => item.currentStock < item.parLevel)
    .map((item) => ({
      ingredient: item.ingredient,
      prepAmount: item.parLevel - item.currentStock,
      unit: item.unit,
    }));
  return { shift, date, items };
}

/** Generate mise en place list for a recipe at a given batch size. */
export function getMiseEnPlace(
  recipe: Recipe,
  targetBaseWeight: number
): Array<{ ingredient: string; amount: number; unit?: string | undefined }> {
  const scaled = scaleRecipe(recipe, targetBaseWeight);
  return recipe.ingredients.map((ing: { name: string; unit?: string | undefined }) => ({
    ingredient: ing.name,
    amount: scaled[ing.name] ?? 0,
    unit: ing.unit,
  }));
}



/** Project batch size needed to cover a target cover count. */
export function projectBatchSize(
  portionWeight: number,
  covers: number,
  wasteFactor = 1.1
): number {
  return portionWeight * covers * wasteFactor;
}

export * from './labels.js';
