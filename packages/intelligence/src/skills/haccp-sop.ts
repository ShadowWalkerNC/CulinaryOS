/**
 * haccp-sop: generate a HACCP-aligned SOP draft and optionally log the
 * completed check. Operational write, no approval needed.
 */
import type { SkillResult } from '../schemas/types.ts';
import type { HaccpEntry } from '../connectors/contracts.ts';
import type { Skill, SkillContext } from './types.ts';

const SOP_TEMPLATES: Record<string, { ccp: string; steps: string[] }> = {
  'cooling': {
    ccp: 'Cool cooked food from 60C to 21C within 2h, then to 5C within 4h more.',
    steps: ['Portion into shallow pans (<5cm deep)', 'Blast-chill or ice-bath; log start temp/time', 'Verify 21C within 2h; refrigerate', 'Verify 5C within 6h total; log and initial'],
  },
  'reheating': {
    ccp: 'Reheat to 75C core for 15s, once only.',
    steps: ['Reheat rapidly (stove/oven, not hot-hold)', 'Probe thickest point; must read 75C+', 'Log temp/time; serve or discard within 2h', 'Discard leftovers — never reheat twice'],
  },
  'receiving': {
    ccp: 'Cold goods at 5C or below; frozen at -18C or below.',
    steps: ['Probe a sample of each cold delivery', 'Reject out-of-temp or damaged goods', 'Log supplier, temps, accept/reject', 'Store within 15 minutes of receipt'],
  },
  'cleaning': {
    ccp: 'Food-contact surfaces cleaned and sanitized every 4h in use.',
    steps: ['Scrape and wash with detergent', 'Rinse, then sanitize at correct concentration', 'Air-dry; verify with test strip', 'Log station, time, initials'],
  },
};

export const haccpSop: Skill = {
  definition: {
    id: 'haccp-sop',
    title: 'HACCP / SOP Generation',
    description: 'Generate HACCP-aligned SOP drafts (cooling, reheating, receiving, cleaning) and log completed checks.',
    agent: 'compliance-manager',
    inputs: ['topic', 'logResult (optional)'],
    outputs: ['sop', 'logged'],
    permissions: ['operational-write'],
    requiredTools: ['haccp.log'],
    instructions:
      'Generate a concise SOP for the requested topic with its critical control point, steps, ' +
      'and corrective actions. If logResult is pass/fail/corrective, log the completed check via haccp.log.',
    schema: {
      input: [
        { name: 'topic', type: 'string', required: true, enum: ['cooling', 'reheating', 'receiving', 'cleaning'], description: 'SOP topic' },
        { name: 'logResult', type: 'string', required: false, enum: ['pass', 'fail', 'corrective'], description: 'Log a completed check' },
        { name: 'note', type: 'string', required: false, description: 'Note for the log entry' },
      ],
      output: ['sop', 'logged'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { topic, logResult, note } = input as { topic: string; logResult?: 'pass' | 'fail' | 'corrective'; note?: string };
    const tpl = SOP_TEMPLATES[topic];
    const sop = {
      title: `SOP: ${topic}`,
      criticalControlPoint: tpl.ccp,
      steps: tpl.steps,
      correctiveAction: 'If limits are missed: segregate product, notify manager, record corrective action, retrain if needed.',
      verification: 'Manager reviews logs weekly; calibrate probes monthly.',
    };
    let logged = 0;
    if (logResult) {
      const entries: HaccpEntry[] = [{ check: `SOP ${topic}`, result: logResult, note }];
      logged = (await ctx.connector['haccp.log']({ entries })).logged;
    }
    return {
      ok: true,
      skillId: 'haccp-sop',
      data: { sop, logged },
      summary: `SOP drafted for ${topic}${logResult ? `; logged ${logResult} (${logged})` : ''}`,
    };
  },
};
