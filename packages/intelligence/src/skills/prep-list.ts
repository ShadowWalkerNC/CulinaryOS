/**
 * prep-list: build a dated prep list from expected covers and recent
 * sales mix. Operational write (prep.create), no approval needed.
 */
import type { SkillResult } from '../schemas/types.ts';
import type { PrepTask } from '../connectors/contracts.ts';
import type { Skill, SkillContext } from './types.ts';

export const prepList: Skill = {
  definition: {
    id: 'prep-list',
    title: 'Prep List',
    description: 'Generate a dated prep list scaled to expected covers using recent sales mix and recipe yields.',
    agent: 'kitchen-manager',
    inputs: ['date (optional, defaults to today)', 'expectedCovers (optional)', 'station (optional)'],
    outputs: ['prepId', 'tasks'],
    permissions: ['operational-write'],
    requiredTools: ['sales.summary', 'recipes.search', 'inventory.get', 'prep.create'],
    instructions:
      'Take expected covers (default: recent daily average) and scale top-selling recipes into ' +
      'prep tasks. Cross-check on-hand inventory and mark tasks high priority when stock is ' +
      'below par. Create the list via prep.create and return the task breakdown.',
    schema: {
      input: [
        { name: 'date', type: 'string', required: false, description: 'Prep date YYYY-MM-DD (default today)' },
        { name: 'expectedCovers', type: 'number', required: false, description: 'Expected covers' },
        { name: 'station', type: 'string', required: false, description: 'Filter to one station' },
      ],
      output: ['prepId', 'tasks'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { date: dateIn, expectedCovers, station } = input as { date?: string; expectedCovers?: number; station?: string };
    const date = dateIn ?? new Date().toISOString().slice(0, 10);
    const sales = await ctx.connector['sales.summary']({ period: 'last-7d' });
    const covers = expectedCovers ?? Math.max(1, Math.round(sales.covers / 7));
    const recipes = await ctx.connector['recipes.search']({});
    const inv = await ctx.connector['inventory.get']();
    const byName = new Map(inv.map((i) => [i.name.toLowerCase(), i]));

    const totalQty = sales.topItems.reduce((s, t) => s + t.qty, 0) || 1;
    const tasks: PrepTask[] = [];
    for (const item of sales.topItems) {
      const share = item.qty / totalQty;
      const portions = Math.ceil(covers * share);
      const recipe = recipes.find((r) => r.name.toLowerCase() === item.name.toLowerCase());
      const lowStock = recipe?.ingredients.some((ing) => {
        const invItem = byName.get(ing.name.toLowerCase());
        return invItem !== undefined && invItem.onHand < invItem.par;
      });
      tasks.push({
        item: item.name,
        qty: portions,
        unit: 'portions',
        station: station ?? 'hot line',
        priority: lowStock ? 'high' : portions > covers * 0.3 ? 'normal' : 'low',
      });
    }

    const created = await ctx.connector['prep.create']({ date, tasks });
    return {
      ok: true,
      skillId: 'prep-list',
      data: { prepId: created.id, date, expectedCovers: covers, tasks: created.tasks },
      summary: `prep list ${created.id} for ${date}: ${tasks.length} tasks for ~${covers} covers`,
    };
  },
};
