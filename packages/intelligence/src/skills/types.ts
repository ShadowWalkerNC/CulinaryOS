/**
 * Skill interface: every skill is a definition (governance metadata)
 * plus an execute function (business logic). Business logic stays in
 * skills — never in model adapters.
 */
import type { CulinaryOSConnector } from '../connectors/contracts.ts';
import type { ApprovalCategory, SkillDefinition, SkillResult } from '../schemas/types.ts';
import type { ApprovalQueue } from '../policies/approvals.ts';
import type { AuditLog } from '../policies/audit.ts';

export interface SkillContext {
  /** Least-privilege scoped connector (only the skill's contracts). */
  connector: CulinaryOSConnector;
  approvals: ApprovalQueue;
  audit: AuditLog;
  actor: string;
  /** Approval id granted for this run (resume after approval pause). */
  approvedId?: string;
}

export interface Skill {
  definition: SkillDefinition;
  execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult>;
}

/** A write step that may pause for human approval. */
export interface WriteGate {
  action: string;
  category: ApprovalCategory;
  summary: string;
  payload: Record<string, unknown>;
}
