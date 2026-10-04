/**
 * menu-margin: margin analysis + simple menu engineering quadrants.
 * Pure read skill (low risk, no approval).
 */
import type { SkillResult } from '../schemas/types.ts';
import type { Skill, SkillContext } from './types.ts';

export const menuMargin: Skill = {
  definition: {
    id: 'menu-margin',
    title: 'Menu Margin Analysis',
    description: 'Analyze menu item margins and classify stars, plowhorses, puzzles, and dogs by popularity and margin.',
    agent: 'cost-controller',
    inputs: ['recipeIds (optional)'],
    outputs: ['items', 'avgMarginPct'],
    permissions: ['readonly'],
    requiredTools: ['menu.cost', 'sales.summary'],
    instructions:
      'Fetch menu costs and recent sales. Compute margin % per item and classify each into a ' +
      'menu-engineering quadrant using median popularity and median margin as splits. ' +
      'Recommend actions: protect stars, reprice/reposition puzzles, engineer plowhorses, drop or fix dogs.',
    schema: {
      input: [{ name: 'recipeIds', type: 'string[]', required: false }],
      output: ['items', 'avgMarginPct'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { recipeIds } = input as { recipeIds?: string[] };
    const costs = await ctx.connector['menu.cost'](recipeIds ? { recipeIds } : undefined);
    const sales = await ctx.connector['sales.summary']({ period: 'last-7d' });
    const qtyByName = new Map(sales.topItems.map((t) => [t.name.toLowerCase(), t.qty]));

    const margins = costs.map((c) => c.marginPct ?? 0).sort((a, b) => a - b);
    const medianMargin = margins.length > 0 ? margins[Math.floor(margins.length / 2)] : 0;
    const qtys = costs.map((c) => qtyByName.get(c.name.toLowerCase()) ?? 0).sort((a, b) => a - b);
    const medianQty = qtys.length > 0 ? qtys[Math.floor(qtys.length / 2)] : 0;

    const items = costs.map((c) => {
      const qty = qtyByName.get(c.name.toLowerCase()) ?? 0;
      const highMargin = (c.marginPct ?? 0) >= medianMargin;
      const popular = qty >= medianQty;
      const quadrant = highMargin && popular ? 'star' : !highMargin && popular ? 'plowhorse' : highMargin ? 'puzzle' : 'dog';
      return { name: c.name, portionCost: c.portionCost, menuPrice: c.menuPrice, marginPct: c.marginPct, qtySold: qty, quadrant };
    });
    const avgMarginPct =
      items.length > 0 ? Math.round((items.reduce((s, i) => s + (i.marginPct ?? 0), 0) / items.length) * 10) / 10 : 0;
    return {
      ok: true,
      skillId: 'menu-margin',
      data: { items, avgMarginPct },
      summary: `${items.length} items, avg margin ${avgMarginPct}%; stars: ${items.filter((i) => i.quadrant === 'star').map((i) => i.name).join(', ') || 'none'}`,
    };
  },
};
