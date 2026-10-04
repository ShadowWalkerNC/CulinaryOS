/**
 * recipe-costing: portion cost, food-cost %, margin at menu price.
 * Pure read skill (low risk, no approval).
 */
import type { SkillResult } from '../schemas/types.ts';
import type { Skill, SkillContext } from './types.ts';

export const recipeCosting: Skill = {
  definition: {
    id: 'recipe-costing',
    title: 'Recipe Costing',
    description: 'Cost a recipe from ingredient quantities and inventory unit costs; report portion cost, food-cost %, and margin.',
    agent: 'executive-chef',
    inputs: ['recipeId or query', 'servings (optional)', 'targetFoodCostPct (optional)'],
    outputs: ['lines', 'totalCost', 'portionCost', 'foodCostPct', 'marginPct', 'suggestedPrice'],
    permissions: ['readonly'],
    requiredTools: ['recipes.search', 'inventory.get'],
    instructions:
      'Look up the recipe and current inventory unit costs. Price each ingredient line, ' +
      'sum to batch and portion cost, then compare against menu price. If a target food-cost % ' +
      'is given, suggest the menu price that hits it. Flag any ingredient missing a unit cost.',
    schema: {
      input: [
        { name: 'recipeId', type: 'string', required: false, description: 'Exact recipe id' },
        { name: 'query', type: 'string', required: false, description: 'Recipe name search' },
        { name: 'servings', type: 'number', required: false, description: 'Scale to N servings' },
        { name: 'targetFoodCostPct', type: 'number', required: false, description: 'Target food cost percent, e.g. 28' },
      ],
      output: ['lines', 'totalCost', 'portionCost', 'foodCostPct', 'marginPct', 'suggestedPrice'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { recipeId, query, servings, targetFoodCostPct } = input as {
      recipeId?: string;
      query?: string;
      servings?: number;
      targetFoodCostPct?: number;
    };
    if (!recipeId && !query) {
      return { ok: false, skillId: 'recipe-costing', error: 'provide recipeId or query' };
    }
    const recipes = await ctx.connector['recipes.search'](
      recipeId ? { ids: [recipeId] } : { query: query as string },
    );
    if (recipes.length === 0) {
      return { ok: false, skillId: 'recipe-costing', error: 'recipe not found' };
    }
    const recipe = recipes[0];
    const inv = await ctx.connector['inventory.get']();
    const unitCosts = new Map(inv.map((i) => [i.id, i.unitCost]));
    const missing: string[] = [];

    const lines = recipe.ingredients.map((ing) => {
      const unitCost = ing.unitCost ?? unitCosts.get(ing.itemId ?? '');
      if (unitCost === undefined) missing.push(ing.name);
      const cost = Math.round(ing.qty * (unitCost ?? 0) * 1000) / 1000;
      return { name: ing.name, qty: ing.qty, unit: ing.unit, unitCost: unitCost ?? 0, cost };
    });

    const scale = servings ? servings / recipe.yieldQty : 1;
    const totalCost = Math.round(lines.reduce((s, l) => s + l.cost, 0) * scale * 100) / 100;
    const portionCost = Math.round((totalCost / (servings ?? recipe.yieldQty)) * 100) / 100;
    const price = recipe.menuPrice ?? 0;
    const foodCostPct = price > 0 ? Math.round((portionCost / price) * 1000) / 10 : undefined;
    const marginPct = price > 0 ? Math.round((1 - portionCost / price) * 1000) / 10 : undefined;
    const suggestedPrice =
      targetFoodCostPct && targetFoodCostPct > 0
        ? Math.round((portionCost / (targetFoodCostPct / 100)) * 100) / 100
        : undefined;

    return {
      ok: true,
      skillId: 'recipe-costing',
      data: {
        recipe: recipe.name,
        servings: servings ?? recipe.yieldQty,
        lines,
        totalCost,
        portionCost,
        menuPrice: price || undefined,
        foodCostPct,
        marginPct,
        suggestedPrice,
        missingCosts: missing,
      },
      summary: `${recipe.name}: portion cost $${portionCost}` +
        (foodCostPct !== undefined ? `, food cost ${foodCostPct}%, margin ${marginPct}%` : ' (no menu price)') +
        (missing.length > 0 ? `; missing costs: ${missing.join(', ')}` : ''),
    };
  },
};
