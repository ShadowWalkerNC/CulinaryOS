/**
 * Skill registry: single place where skills are registered, listed,
 * and resolved from router intents. Third-party skill packages will
 * plug in here (see docs/skill-authoring.md).
 */
import type { Skill } from './types.ts';
import { recipeCosting } from './recipe-costing.ts';
import { menuMargin } from './menu-margin.ts';
import { prepList } from './prep-list.ts';
import { productionForecast } from './production-forecast.ts';
import { inventoryPar } from './inventory-par.ts';
import { orderingSuggestions } from './ordering-suggestions.ts';
import { wasteAnalysis } from './waste-analysis.ts';
import { haccpSop } from './haccp-sop.ts';
import { tempsReview } from './temps-review.ts';
import { scheduleAnalysis } from './schedule-analysis.ts';
import { eventPlanning } from './event-planning.ts';
import { shiftHandoff } from './shift-handoff.ts';

const SKILLS: Skill[] = [
  recipeCosting,
  menuMargin,
  prepList,
  productionForecast,
  inventoryPar,
  orderingSuggestions,
  wasteAnalysis,
  haccpSop,
  tempsReview,
  scheduleAnalysis,
  eventPlanning,
  shiftHandoff,
];

const byId = new Map(SKILLS.map((s) => [s.definition.id, s]));

/** Router intent -> skill id. */
export const INTENT_SKILLS: Record<string, string> = {
  'recipe.cost': 'recipe-costing',
  'menu.margin': 'menu-margin',
  'prep.list': 'prep-list',
  'production.forecast': 'production-forecast',
  'inventory.par': 'inventory-par',
  'order.suggest': 'ordering-suggestions',
  'waste.analyze': 'waste-analysis',
  'haccp.sop': 'haccp-sop',
  'temps.review': 'temps-review',
  'schedule.analyze': 'schedule-analysis',
  'event.plan': 'event-planning',
  'shift.handoff': 'shift-handoff',
};

export function listSkills(): Skill[] {
  return [...SKILLS];
}

export function getSkill(id: string): Skill | undefined {
  return byId.get(id);
}

export function skillForIntent(intent: string): Skill | undefined {
  const id = INTENT_SKILLS[intent];
  return id ? byId.get(id) : undefined;
}

/** Register an additional skill (used by future third-party packages). */
export function registerSkill(skill: Skill): void {
  if (byId.has(skill.definition.id)) {
    throw new Error(`skill already registered: ${skill.definition.id}`);
  }
  SKILLS.push(skill);
  byId.set(skill.definition.id, skill);
}
