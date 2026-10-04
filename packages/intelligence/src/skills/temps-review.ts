/**
 * temps-review: review temperature logs against safe limits and flag
 * danger-zone readings. Pure read (low risk).
 */
import type { SkillResult } from '../schemas/types.ts';
import type { Skill, SkillContext } from './types.ts';

interface Limit { min?: number; max?: number; label: string }

function limitsFor(unit: string): Limit {
  const u = unit.toLowerCase();
  if (u.includes('freez')) return { max: -18, label: 'frozen ≤ -18C' };
  if (u.includes('hot') || u.includes('hold')) return { min: 63, label: 'hot hold ≥ 63C' };
  return { max: 5, label: 'cold ≤ 5C' };
}

export const tempsReview: Skill = {
  definition: {
    id: 'temps-review',
    title: 'Temperature Log Review',
    description: 'Review temperature logs against safe limits and flag danger-zone readings with corrective actions.',
    agent: 'compliance-manager',
    inputs: ['date (optional)'],
    outputs: ['violations', 'checked'],
    permissions: ['readonly'],
    requiredTools: ['temps.read'],
    instructions:
      'Fetch temperature readings and check each against limits (cold ≤5C, frozen ≤-18C, ' +
      'hot hold ≥63C). Flag violations with the corrective action: re-temp, move product, ' +
      'call maintenance, log outcome. Never fabricate readings — report only what was logged.',
    schema: {
      input: [{ name: 'date', type: 'string', required: false }],
      output: ['violations', 'checked'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { date } = input as { date?: string };
    const readings = await ctx.connector['temps.read'](date ? { date } : undefined);
    const violations = [];
    for (const r of readings) {
      const lim = limitsFor(r.unit);
      const bad = (lim.max !== undefined && r.tempC > lim.max) || (lim.min !== undefined && r.tempC < lim.min);
      if (bad) {
        violations.push({
          unit: r.unit,
          tempC: r.tempC,
          limit: lim.label,
          takenAt: r.takenAt,
          corrective: 're-temp in 30 min; if still out, move product and call maintenance; log outcome',
        });
      }
    }
    return {
      ok: true,
      skillId: 'temps-review',
      data: { checked: readings.length, violations },
      summary:
        violations.length === 0
          ? `all ${readings.length} readings within limits`
          : `${violations.length} of ${readings.length} readings out of limits: ${violations.map((v) => `${v.unit} ${v.tempC}C`).join(', ')}`,
    };
  },
};
