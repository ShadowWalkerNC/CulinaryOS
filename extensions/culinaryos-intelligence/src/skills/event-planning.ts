/**
 * event-planning: scale recipes to guest counts for banquets/catering.
 * Pure planning math (low risk, read-only).
 */
import type { SkillResult } from '../schemas/types.ts';
import type { Skill, SkillContext } from './types.ts';

export const eventPlanning: Skill = {
  definition: {
    id: 'event-planning',
    title: 'Event Quantity Planning',
    description: 'Plan production quantities for events by scaling recipes to guest counts with buffer.',
    agent: 'executive-chef',
    inputs: ['eventId (optional)', 'guests (optional)', 'menu (optional)', 'bufferPct (optional)'],
    outputs: ['plan'],
    permissions: ['readonly'],
    requiredTools: ['events.read', 'recipes.search'],
    instructions:
      'Load the event (or take explicit guests + menu), scale each recipe from its yield to ' +
      'guest count plus buffer (default 5%), and output ingredient totals. Flag missing recipes.',
    schema: {
      input: [
        { name: 'eventId', type: 'string', required: false },
        { name: 'guests', type: 'number', required: false },
        { name: 'menu', type: 'string[]', required: false, description: 'Recipe ids' },
        { name: 'bufferPct', type: 'number', required: false, description: 'Buffer percent, default 5' },
      ],
      output: ['plan'],
    },
    risk: 'low',
  },

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { eventId, guests, menu, bufferPct } = input as {
      eventId?: string;
      guests?: number;
      menu?: string[];
      bufferPct?: number;
    };
    let headcount = guests ?? 0;
    let menuIds = menu ?? [];
    let eventName = 'ad-hoc';
    if (eventId) {
      const events = await ctx.connector['events.read']({});
      const evt = events.find((e) => e.id === eventId);
      if (!evt) return { ok: false, skillId: 'event-planning', error: `event not found: ${eventId}` };
      eventName = evt.name;
      headcount = guests ?? evt.guests;
      menuIds = menu ?? evt.menu ?? [];
    }
    if (!headcount || menuIds.length === 0) {
      return { ok: false, skillId: 'event-planning', error: 'need guests + menu (or an eventId with both)' };
    }
    const recipes = await ctx.connector['recipes.search']({ ids: menuIds });
    const found = new Set(recipes.map((r) => r.id));
    const missing = menuIds.filter((id) => !found.has(id));
    const factor = (headcount * (1 + (bufferPct ?? 5) / 100)) ;
    const plan = recipes.map((r) => ({
      recipe: r.name,
      portions: Math.ceil(factor),
      ingredients: r.ingredients.map((ing) => ({
        name: ing.name,
        qty: Math.round(((ing.qty / r.yieldQty) * factor) * 100) / 100,
        unit: ing.unit,
      })),
    }));
    return {
      ok: true,
      skillId: 'event-planning',
      data: { event: eventName, guests: headcount, bufferPct: bufferPct ?? 5, plan, missingRecipes: missing },
      summary: `${eventName}: ${plan.length} dishes for ${headcount} guests (+${bufferPct ?? 5}% buffer)` +
        (missing.length > 0 ? `; missing recipes: ${missing.join(', ')}` : ''),
    };
  },
};
