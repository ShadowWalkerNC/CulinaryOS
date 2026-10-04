/**
 * production-forecast: expected covers and per-item quantities from
 * recent sales plus upcoming events. Pure read (low risk).
 */
import type { SkillResult } from '../schemas/types.ts';
import type { Skill, SkillContext } from './types.ts';

export const productionForecast: Skill = {
  definition: {
    id: 'production-forecast',
    title: 'Production Forecasting',
    description: 'Forecast covers and per-item production quantities from recent sales trends and upcoming events.',
    agent: 'kitchen-manager',
    inputs: ['date (optional)', 'expectedCovers (optional)'],
    outputs: ['covers', 'items', 'eventUplift'],
    permissions: ['readonly'],
    requiredTools: ['sales.summary', 'events.read'],
    instructions:
      'Use the 7-day daily average as the baseline, add confirmed event guests on the target ' +
      'date as uplift, then split covers across the sales mix to get per-item quantities. ' +
      'State baseline vs uplift so the kitchen sees what is certain and what is assumed.',
    schema: {
      input: [
        { name: 'date', type: 'string', required: false, description: 'Forecast date YYYY-MM-DD' },
        { name: 'expectedCovers', type: 'number', required: false, description: 'Override baseline covers' },
      ],
      output: ['covers', 'items', 'eventUplift'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { date, expectedCovers } = input as { date?: string; expectedCovers?: number };
    const sales = await ctx.connector['sales.summary']({ period: 'last-7d' });
    const events = await ctx.connector['events.read']({});
    const baseline = expectedCovers ?? Math.max(1, Math.round(sales.covers / 7));
    const eventUplift = date
      ? events.filter((e) => e.date === date).reduce((s, e) => s + e.guests, 0)
      : 0;
    const covers = baseline + eventUplift;
    const totalQty = sales.topItems.reduce((s, t) => s + t.qty, 0) || 1;
    const items = sales.topItems.map((t) => ({
      name: t.name,
      qty: Math.ceil(covers * (t.qty / totalQty)),
    }));
    return {
      ok: true,
      skillId: 'production-forecast',
      data: { date: date ?? 'unspecified', baseline, eventUplift, covers, items },
      summary: `forecast ${covers} covers (baseline ${baseline} + event uplift ${eventUplift})`,
    };
  },
};
