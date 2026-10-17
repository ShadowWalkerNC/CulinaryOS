/**
 * Capability discovery document: everything an MCP host needs to know
 * about this server in one resource (culinaryos://capabilities).
 */
import { listAgents } from '../agents/agents.ts';
import { CONTRACT_NAMES } from '../connectors/contracts.ts';
import { listIntents } from '../router/router.ts';
import { listSkills } from '../skills/registry.ts';
import { BUILTIN_WORKFLOWS } from '../workflows/builtin.ts';

export const SERVER_NAME = 'culinaryos-intelligence';
export const SERVER_VERSION = '0.1.0';

export function capabilities(connectorMode: string): Record<string, unknown> {
  return {
    server: { name: SERVER_NAME, version: SERVER_VERSION },
    principle: 'Give any AI the skills to operate a restaurant.',
    connectorMode,
    contracts: [...CONTRACT_NAMES],
    intents: listIntents(),
    agents: listAgents().map((a) => ({ id: a.id, title: a.title, description: a.description, skillIds: a.skillIds })),
    skills: listSkills().map((s) => s.definition),
    workflows: BUILTIN_WORKFLOWS.map((w) => ({ id: w.id, title: w.title, description: w.description, steps: w.steps.map((st) => st.skillId) })),
    approvals: {
      requiredFor: ['money', 'purchase', 'schedule', 'employee', 'destructive', 'inventory-sensitive'],
      flow: 'skill.run returns approvalRequired + approvalId; human decides via approval.decide; caller retries skill.run with approvedId',
    },
    security: [
      'least-privilege scoped connectors per skill',
      'schema validation on all skill inputs',
      'approval gate on risky writes',
      'secret redaction in audit log and approvals',
      'no shell execution, no raw DB access',
    ],
  };
}
