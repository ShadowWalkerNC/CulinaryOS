/**
 * @culinaryos/prep-engine
 * Shift prep planning — par levels, mise en place, batch projections.
 */

import { scaleRecipe, type Recipe } from '@culinaryos/ratio-engine';

// Consolidated Prep domain surface: scaling + baker's-ratio blueprints re-exported
// alongside mise en place and adhesive label generators (see ./labels.js).
export * from '@culinaryos/ratio-engine';
export type { ShiftPrepPlan as RatioShiftPrepPlan } from '@culinaryos/ratio-engine';

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

export interface PrepTaskIngredientDecrement {
  ingredient: string;
  quantity: number;
  unit?: string | undefined;
  ingredientId?: string | undefined;
}

export interface PrepTaskCompletedPayload {
  taskId: string;
  completedAt: string;
  decrements: PrepTaskIngredientDecrement[];
  recipeId?: string | undefined;
  recipeName?: string | undefined;
  completedBy?: string | undefined;
}

export interface PrepTaskCompletedEvent {
  eventId: string;
  eventType: 'prep.task.completed';
  tenantId: string;
  source: string;
  timestamp: string;
  version: 1;
  payload: PrepTaskCompletedPayload;
}

/**
 * Build a standard `prep.task.completed` domain event with ingredient decrements.
 * Accepts `scaleRecipe` output (Record) or `getMiseEnPlace` output (amount[]) directly.
 */
export function emitPrepTaskCompleted(input: {
  taskId: string;
  tenantId: string;
  decrements:
    | Array<{
        ingredient: string;
        quantity?: number | undefined;
        amount?: number | undefined;
        unit?: string | undefined;
        ingredientId?: string | undefined;
      }>
    | Record<string, number>;
  recipeId?: string | undefined;
  recipeName?: string | undefined;
  completedBy?: string | undefined;
  completedAt?: string | undefined;
  eventId?: string | undefined;
  source?: string | undefined;
  timestamp?: string | undefined;
}): PrepTaskCompletedEvent {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const decrements: PrepTaskIngredientDecrement[] = Array.isArray(input.decrements)
    ? input.decrements.map((d) => ({
        ingredient: d.ingredient,
        quantity: d.quantity ?? d.amount ?? 0,
        ...(d.unit !== undefined ? { unit: d.unit } : {}),
        ...(d.ingredientId !== undefined ? { ingredientId: d.ingredientId } : {}),
      }))
    : Object.entries(input.decrements).map(([ingredient, quantity]) => ({
        ingredient,
        quantity,
      }));
  return {
    eventId:
      input.eventId ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    eventType: 'prep.task.completed',
    tenantId: input.tenantId,
    source: input.source ?? 'prep-engine',
    timestamp,
    version: 1,
    payload: {
      taskId: input.taskId,
      completedAt: input.completedAt ?? timestamp,
      decrements,
      ...(input.recipeId !== undefined ? { recipeId: input.recipeId } : {}),
      ...(input.recipeName !== undefined ? { recipeName: input.recipeName } : {}),
      ...(input.completedBy !== undefined ? { completedBy: input.completedBy } : {}),
    },
  };
}
