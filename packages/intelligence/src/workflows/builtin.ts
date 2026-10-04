/**
 * Built-in workflows: one production example. Add more as data, not code.
 */
import type { WorkflowDefinition } from './engine.ts';

/** Morning routine: forecast covers -> build prep list -> check pars. */
export const dailyOpen: WorkflowDefinition = {
  id: 'daily-open',
  title: 'Daily Open',
  description: 'Forecast covers, generate the dated prep list, and flag below-par items before service.',
  steps: [
    { id: 'forecast', skillId: 'production-forecast', input: {} },
    {
      id: 'prep',
      skillId: 'prep-list',
      input: {},
      from: { expectedCovers: 'steps.forecast.data.covers' },
    },
    { id: 'pars', skillId: 'inventory-par', input: {} },
  ],
};

export const BUILTIN_WORKFLOWS: WorkflowDefinition[] = [dailyOpen];

export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return BUILTIN_WORKFLOWS.find((w) => w.id === id);
}
