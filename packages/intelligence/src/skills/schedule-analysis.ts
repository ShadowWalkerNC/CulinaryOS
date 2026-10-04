/**
 * schedule-analysis: labor hours, cost, and coverage vs sales.
 * Read-only analysis (low risk). Schedule WRITES would need approval.
 */
import type { SkillResult } from '../schemas/types.ts';
import type { Skill, SkillContext } from './types.ts';

export const scheduleAnalysis: Skill = {
  definition: {
    id: 'schedule-analysis',
    title: 'Schedule Analysis',
    description: 'Analyze staffing hours, labor cost, and coverage against sales. Read-only; schedule changes need approval.',
    agent: 'general-manager',
    inputs: ['date (optional)', 'targetLaborPct (optional)'],
    outputs: ['totalHours', 'laborCost', 'laborPct', 'coverage'],
    permissions: ['readonly'],
    requiredTools: ['schedule.read', 'sales.summary'],
    instructions:
      'Summarize scheduled hours and labor cost, then compare labor % against the target ' +
      '(default 30%). Note coverage gaps (unusually long shifts, thin dinner coverage). ' +
      'This skill analyzes only — it never modifies schedules or employee records.',
    schema: {
      input: [
        { name: 'date', type: 'string', required: false },
        { name: 'targetLaborPct', type: 'number', required: false, description: 'Target labor percent, default 30' },
      ],
      output: ['totalHours', 'laborCost', 'laborPct', 'coverage'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { date, targetLaborPct } = input as { date?: string; targetLaborPct?: number };
    const target = targetLaborPct ?? 30;
    const roster = await ctx.connector['schedule.read'](date ? { date } : undefined);
    const sales = await ctx.connector['sales.summary']({ period: 'last-7d' });
    const totalHours = roster.reduce((s, r) => s + r.hours, 0);
    const laborCost = Math.round(roster.reduce((s, r) => s + r.hours * (r.hourlyRate ?? 0), 0) * 100) / 100;
    const dailyRevenue = sales.revenue / 7;
    const laborPct = dailyRevenue > 0 ? Math.round((laborCost / dailyRevenue) * 1000) / 10 : undefined;
    const longShifts = roster.filter((r) => r.hours > 9).map((r) => r.employee);
    const dinnerCrew = roster.filter((r) => r.start >= '15:00').length;
    return {
      ok: true,
      skillId: 'schedule-analysis',
      data: {
        date: date ?? 'unspecified',
        staff: roster.length,
        totalHours,
        laborCost,
        dailyRevenue: Math.round(dailyRevenue * 100) / 100,
        laborPct,
        targetLaborPct: target,
        overTarget: laborPct !== undefined && laborPct > target,
        coverage: { dinnerCrew, longShifts },
      },
      summary: `${roster.length} staff, ${totalHours}h, labor $${laborCost}` +
        (laborPct !== undefined ? ` (${laborPct}% vs ${target}% target)` : ''),
    };
  },
};
