/**
 * Skill runner: validates input, scopes the connector to declared
 * contracts (least privilege), runs the skill, audits the outcome.
 * Risky writes pause via gateWrite until a human approves.
 */
import type { ContractName, SkillResult } from '../schemas/types.ts';
import type { CulinaryOSConnector } from '../connectors/contracts.ts';
import { CONTRACT_NAMES } from '../connectors/contracts.ts';
import { validateInput } from '../schemas/validate.ts';
import { assertAllowed, requiresApproval } from '../policies/permissions.ts';
import type { Skill, SkillContext, WriteGate } from './types.ts';

/** Proxy that only allows the skill's declared contracts. */
export function scopedConnector(
  connector: CulinaryOSConnector,
  skillId: string,
  allowed: ContractName[],
): CulinaryOSConnector {
  return new Proxy(connector, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && (CONTRACT_NAMES as readonly string[]).includes(prop)) {
        assertAllowed({ contracts: allowed, categories: [] }, prop as ContractName);
        const fn = Reflect.get(target, prop, receiver);
        if (typeof fn !== 'function') throw new Error(`contract '${prop}' not implemented`);
        return (...args: unknown[]) => (fn as (...a: unknown[]) => unknown).apply(target, args);
      }
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(target, args);
      void skillId;
      return value;
    },
  });
}

export async function runSkill(
  skill: Skill,
  ctx: Omit<SkillContext, 'connector'> & { connector: CulinaryOSConnector },
  rawInput: Record<string, unknown>,
): Promise<SkillResult> {
  const def = skill.definition;
  const scoped = scopedConnector(ctx.connector, def.id, def.requiredTools);
  const scopedCtx: SkillContext = { ...ctx, connector: scoped };

  const validation = validateInput(def.schema, rawInput ?? {});
  if (!validation.ok) {
    ctx.audit.record({ actor: ctx.actor, action: 'skill.validation_failed', skillId: def.id, ok: false, detail: { errors: validation.errors } });
    return { ok: false, skillId: def.id, error: `invalid input: ${validation.errors.join('; ')}` };
  }

  try {
    const result = await skill.execute(scopedCtx, validation.value);
    ctx.audit.record({
      actor: ctx.actor,
      action: result.approvalRequired ? 'skill.approval_paused' : 'skill.completed',
      skillId: def.id,
      approvalId: result.approvalId,
      ok: result.ok,
    });
    return result;
  } catch (err) {
    const message = (err as Error).message;
    ctx.audit.record({ actor: ctx.actor, action: 'skill.failed', skillId: def.id, ok: false, detail: { error: message } });
    return { ok: false, skillId: def.id, error: message };
  }
}

/**
 * Gate a write step: returns a paused result (approvalRequired) when no
 * valid approval exists, otherwise runs the write.
 */
export async function gateWrite<T>(
  skill: Skill,
  ctx: SkillContext,
  gate: WriteGate,
  run: () => Promise<T>,
  summarize: (value: T) => { data: Record<string, unknown>; summary: string },
): Promise<SkillResult> {
  const def = skill.definition;
  const needsApproval = requiresApproval(
    { contracts: def.requiredTools, categories: def.permissions },
    def.risk,
    def.requiredTools,
  ) || gate.category !== 'readonly' && gate.category !== 'operational-write';

  if (needsApproval) {
    const existing = ctx.approvedId ? ctx.approvals.get(ctx.approvedId) : undefined;
    if (!existing || existing.status !== 'approved' || existing.skillId !== def.id) {
      const req = ctx.approvals.request({
        skillId: def.id,
        action: gate.action,
        category: gate.category,
        risk: def.risk,
        summary: gate.summary,
        payload: gate.payload,
      });
      ctx.audit.record({ actor: ctx.actor, action: 'approval.requested', skillId: def.id, approvalId: req.id, ok: true });
      return {
        ok: false,
        skillId: def.id,
        approvalRequired: true,
        approvalId: req.id,
        summary: `paused for approval: ${gate.summary} (approval ${req.id})`,
      };
    }
  }

  const value = await run();
  const { data, summary } = summarize(value);
  return { ok: true, skillId: def.id, data, summary, approvalId: ctx.approvedId };
}
