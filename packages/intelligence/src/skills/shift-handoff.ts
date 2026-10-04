/**
 * shift-handoff: compile a shift summary from sales, schedule, temps,
 * and inventory alerts. Pure read (low risk).
 */
import type { SkillResult } from '../schemas/types.ts';
import type { Skill, SkillContext } from './types.ts';

export const shiftHandoff: Skill = {
  definition: {
    id: 'shift-handoff',
    title: 'Shift Handoff Summaries',
    description: 'Compile a shift handoff: sales snapshot, staffing, temp status, low stock, and open notes.',
    agent: 'general-manager',
    inputs: ['shift (optional)', 'notes (optional)'],
    outputs: ['handoff'],
    permissions: ['readonly'],
    requiredTools: ['sales.summary', 'schedule.read', 'temps.read', 'inventory.get'],
    instructions:
      'Pull sales, roster, temp readings, and below-par items into one concise handoff the next ' +
      'shift can act on: what happened, what to watch, what is urgent. Include caller notes verbatim.',
    schema: {
      input: [
        { name: 'shift', type: 'string', required: false, description: 'e.g. dinner 2026-09-25' },
        { name: 'notes', type: 'string', required: false, description: 'Free-text notes to include' },
      ],
      output: ['handoff'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { shift, notes } = input as { shift?: string; notes?: string };
    const [sales, roster, temps, inv] = await Promise.all([
      ctx.connector['sales.summary']({ period: 'last-7d' }),
      ctx.connector['schedule.read']({}),
      ctx.connector['temps.read']({}),
      ctx.connector['inventory.get'](),
    ]);
    const lowStock = inv.filter((i) => i.onHand < i.par).map((i) => `${i.name} (${i.onHand}/${i.par} ${i.unit})`);
    const coldBad = temps.filter((t) => {
      const u = t.unit.toLowerCase();
      if (u.includes('freez')) return t.tempC > -18;
      if (u.includes('hot') || u.includes('hold')) return t.tempC < 63;
      return t.tempC > 5;
    }).map((t) => `${t.unit} ${t.tempC}C`);
    const handoff = {
      shift: shift ?? 'current',
      sales7d: { covers: sales.covers, revenue: sales.revenue },
      staffed: roster.map((r) => `${r.employee} (${r.role} ${r.start}-${r.end})`),
      tempAlerts: coldBad,
      lowStock,
      notes: notes ?? '',
    };
    return {
      ok: true,
      skillId: 'shift-handoff',
      data: { handoff },
      summary: `handoff for ${handoff.shift}: ${roster.length} staffed, ${coldBad.length} temp alerts, ${lowStock.length} low-stock items`,
    };
  },
};
