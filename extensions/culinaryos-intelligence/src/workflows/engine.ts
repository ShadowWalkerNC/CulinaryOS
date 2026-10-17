/**
 * Workflow engine: small sequential runner over skill steps.
 * Steps can reference prior outputs via {{steps.<id>.data.<path>}}.
 * Halts on first failure or pending approval; resume with approvals.
 */
import type { CulinaryOSConnector } from '../connectors/contracts.ts';
import type { ApprovalQueue } from '../policies/approvals.ts';
import type { AuditLog } from '../policies/audit.ts';
import { getSkill } from '../skills/registry.ts';
import { runSkill } from '../skills/runner.ts';
import type { SkillResult } from '../schemas/types.ts';

export interface WorkflowStep {
  id: string;
  skillId: string;
  /** Static input merged under templated values. */
  input?: Record<string, unknown>;
  /** Map output paths from prior steps into this step's input. */
  from?: Record<string, string>;
}

export interface WorkflowDefinition {
  id: string;
  title: string;
  description?: string;
  steps: WorkflowStep[];
}

export interface WorkflowRunResult {
  ok: boolean;
  workflowId: string;
  /** Step results in execution order. */
  steps: Array<{ stepId: string; skillId: string; result: SkillResult }>;
  /** Set when halted for human approval. */
  approvalRequired?: boolean;
  approvalId?: string;
  error?: string;
}

export interface WorkflowContext {
  connector: CulinaryOSConnector;
  approvals: ApprovalQueue;
  audit: AuditLog;
  actor: string;
  /** Approval ids granted for this run, by step id. */
  approvedByStep?: Record<string, string>;
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export async function runWorkflow(
  workflow: WorkflowDefinition,
  ctx: WorkflowContext,
): Promise<WorkflowRunResult> {
  const outputs = new Map<string, SkillResult>();
  const steps: WorkflowRunResult['steps'] = [];

  for (const step of workflow.steps) {
    const skill = getSkill(step.skillId);
    if (!skill) {
      const error = `unknown skill: ${step.skillId}`;
      ctx.audit.record({ actor: ctx.actor, action: 'workflow.failed', ok: false, detail: { workflowId: workflow.id, error } });
      return { ok: false, workflowId: workflow.id, steps, error };
    }
    const input: Record<string, unknown> = { ...(step.input ?? {}) };
    for (const [key, ref] of Object.entries(step.from ?? {})) {
      const m = /^steps\.([^.]+)\.data\.(.+)$/.exec(ref);
      if (!m) return { ok: false, workflowId: workflow.id, steps, error: `bad ref '${ref}' in step ${step.id}` };
      const [, srcStep, path] = m;
      const value = getPath(outputs.get(srcStep)?.data, path);
      if (value !== undefined) input[key] = value;
    }

    const result = await runSkill(
      skill,
      { connector: ctx.connector, approvals: ctx.approvals, audit: ctx.audit, actor: ctx.actor, approvedId: ctx.approvedByStep?.[step.id] },
      input,
    );
    outputs.set(step.id, result);
    steps.push({ stepId: step.id, skillId: step.skillId, result });

    if (result.approvalRequired) {
      return { ok: false, workflowId: workflow.id, steps, approvalRequired: true, approvalId: result.approvalId };
    }
    if (!result.ok) {
      return { ok: false, workflowId: workflow.id, steps, error: result.error ?? `step ${step.id} failed` };
    }
  }

  ctx.audit.record({ actor: ctx.actor, action: 'workflow.completed', ok: true, detail: { workflowId: workflow.id, steps: steps.length } });
  return { ok: true, workflowId: workflow.id, steps };
}
