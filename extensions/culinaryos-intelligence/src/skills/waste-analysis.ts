/**
 * waste-analysis: summarize waste drivers and estimated cost.
 * Read-only analysis (low risk). Recording waste entries is done by
 * the waste.record contract only through approved flows.
 */
import type { SkillResult } from '../schemas/types.ts';
import type { Skill, SkillContext } from './types.ts';

export const wasteAnalysis: Skill = {
  definition: {
    id: 'waste-analysis',
    title: 'Waste Analysis',
    description: 'Analyze recorded waste by item and reason, estimate cost impact, and suggest reductions.',
    agent: 'cost-controller',
    inputs: [],
    outputs: ['totalCost', 'byReason', 'byItem', 'recommendations'],
    permissions: ['readonly'],
    requiredTools: ['inventory.get', 'sales.summary'],
    instructions:
      'Combine waste history with inventory costs to rank waste by cost. Attribute waste to ' +
      'reasons (spoilage, overproduction, trim) and recommend concrete fixes: par adjustments, ' +
      'smaller batches, FIFO checks. This skill analyzes only; it never writes waste records.',
    schema: { input: [], output: ['totalCost', 'byReason', 'byItem', 'recommendations'] },
    risk: 'low',
  },

  async execute(ctx: SkillContext): Promise<SkillResult> {
    // Waste history source: mock/file connectors expose recent waste via
    // inventory context; when unavailable, report coverage gap honestly.
    const connector = ctx.connector as unknown as { wasteLog?: Array<{ item: string; qty: number; unit: string; reason: string; cost?: number }> };
    const log = connector.wasteLog ?? [];
    const inv = await ctx.connector['inventory.get']();
    const costs = new Map(inv.map((i) => [i.name.toLowerCase(), i.unitCost]));

    const byReason = new Map<string, { qty: number; cost: number; count: number }>();
    const byItem = new Map<string, { qty: number; cost: number; reasons: string[] }>();
    for (const e of log) {
      const cost = e.cost ?? e.qty * (costs.get(e.item.toLowerCase()) ?? 0);
      const r = byReason.get(e.reason) ?? { qty: 0, cost: 0, count: 0 };
      r.qty += e.qty; r.cost += cost; r.count += 1;
      byReason.set(e.reason, r);
      const it = byItem.get(e.item) ?? { qty: 0, cost: 0, reasons: [] };
      it.qty += e.qty; it.cost += cost;
      if (!it.reasons.includes(e.reason)) it.reasons.push(e.reason);
      byItem.set(e.item, it);
    }
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const totalCost = round2([...byReason.values()].reduce((s, r) => s + r.cost, 0));
    const recommendations: string[] = [];
    if ((byReason.get('expired')?.cost ?? 0) > 0 || (byReason.get('spoilage')?.cost ?? 0) > 0) {
      recommendations.push('tighten FIFO rotation and date-dot checks on perishables');
    }
    if ((byReason.get('overproduction')?.cost ?? 0) > 0) recommendations.push('reduce batch sizes on low-velocity items');
    if (totalCost > 0 && recommendations.length === 0) recommendations.push('review top waste items with the kitchen manager weekly');

    return {
      ok: true,
      skillId: 'waste-analysis',
      data: {
        entries: log.length,
        totalCost,
        byReason: [...byReason.entries()].map(([reason, v]) => ({ reason, ...v, cost: round2(v.cost) })),
        byItem: [...byItem.entries()].map(([item, v]) => ({ item, ...v, cost: round2(v.cost) })),
        recommendations,
        coverage: log.length > 0 ? 'connector waste log' : 'no waste history available',
      },
      summary: log.length === 0 ? 'no waste history available' : `${log.length} waste entries, est cost $${totalCost}`,
    };
  },
};
