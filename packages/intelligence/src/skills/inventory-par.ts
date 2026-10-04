/**
 * inventory-par: compare on-hand vs par, flag shorts and stockouts.
 * Pure read skill (low risk, no approval).
 */
import type { SkillResult } from '../schemas/types.ts';
import type { Skill, SkillContext } from './types.ts';

export const inventoryPar: Skill = {
  definition: {
    id: 'inventory-par',
    title: 'Inventory / Par Check',
    description: 'Check on-hand quantities against par levels and flag shorts, stockouts, and reorder urgency.',
    agent: 'inventory-manager',
    inputs: ['ids (optional)'],
    outputs: ['shorts', 'ok', 'coveragePct'],
    permissions: ['readonly'],
    requiredTools: ['inventory.get'],
    instructions:
      'Fetch inventory and compute coverage (onHand / par) per item. Flag stockouts (0 on hand) ' +
      'and shorts (below par), sorted most urgent first. Never adjust counts — this skill only reports.',
    schema: {
      input: [{ name: 'ids', type: 'string[]', required: false, description: 'Limit to item ids' }],
      output: ['shorts', 'ok', 'coveragePct'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { ids } = input as { ids?: string[] };
    const items = await ctx.connector['inventory.get'](ids ? { ids } : undefined);
    const rows = items.map((i) => ({
      id: i.id,
      name: i.name,
      onHand: i.onHand,
      par: i.par,
      unit: i.unit,
      coveragePct: i.par > 0 ? Math.round((i.onHand / i.par) * 1000) / 10 : 100,
      status: i.onHand <= 0 ? 'stockout' : i.onHand < i.par ? 'short' : 'ok',
    }));
    const shorts = rows.filter((r) => r.status !== 'ok').sort((a, b) => a.coveragePct - b.coveragePct);
    const ok = rows.filter((r) => r.status === 'ok').length;
    const coveragePct = rows.length > 0 ? Math.round((ok / rows.length) * 1000) / 10 : 100;
    return {
      ok: true,
      skillId: 'inventory-par',
      data: { shorts, okCount: ok, coveragePct, checked: rows.length },
      summary:
        shorts.length === 0
          ? `all ${rows.length} items at or above par`
          : `${shorts.length} of ${rows.length} items below par: ${shorts.map((s) => `${s.name} (${s.coveragePct}%)`).join(', ')}`,
    };
  },
};
