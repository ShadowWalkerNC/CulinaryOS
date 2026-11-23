import * as path from 'node:path';
import {
  type ActorContext,
  type AgentRole,
  ImmutableEvidenceError,
  type LedgerCategory,
  MissingApprovalGateError,
  type ProductionFixApproval,
  SelfVerificationDeniedError,
  UnauthorizedActionError,
  ValidationError,
} from '../types.js';
import {
  appendJsonl,
  assertSafeIdentifier,
  assertValidActorContext,
  atomicWriteJson,
  generateId,
  readJsonSafe,
} from '../storage/atomic-fs.js';
import { withStoreLock } from '../storage/lock.js';

export type GovernanceAction =
  | 'approve_production_fix'
  | 'revoke_production_fix'
  | 'approve_subtask'
  | 'reject_subtask'
  | 'advance_stage'
  | 'execute_stage_7_fix'
  | 'record_fix'
  | 'verify_independent_retest'
  | 'ledger_write'
  | 'ledger_mutate_immutable';

export interface GovernanceAuditRecord {
  audit_id: string;
  mission_id: string;
  action: GovernanceAction;
  actor_agent: string;
  actor_role: AgentRole;
  outcome: 'allowed' | 'denied';
  detail: string;
  target_id?: string | undefined;
  timestamp_utc: string;
}

const ROLE_LEDGER_WRITE_MATRIX: Record<AgentRole, ReadonlySet<LedgerCategory>> = {
  owner: new Set<LedgerCategory>([
    'feature_inventory',
    'positive_findings',
    'defects',
    'usability_difficulties',
    'missing_capabilities',
    'competitor_comparisons',
    'differentiation_opportunities',
    'recommendations',
    'agent_assignments',
    'checkpoints_recovery',
    'token_cost',
    'evidence',
    'fix_regression',
  ]),
  orchestrator: new Set<LedgerCategory>([
    'feature_inventory',
    'recommendations',
    'agent_assignments',
    'checkpoints_recovery',
    'token_cost',
  ]),
  muse_visual_tester: new Set<LedgerCategory>([
    'feature_inventory',
    'positive_findings',
    'defects',
    'usability_difficulties',
    'missing_capabilities',
    'recommendations',
    'checkpoints_recovery',
    'evidence',
  ]),
  gemini_ux_auditor: new Set<LedgerCategory>([
    'feature_inventory',
    'positive_findings',
    'defects',
    'usability_difficulties',
    'missing_capabilities',
    'competitor_comparisons',
    'differentiation_opportunities',
    'recommendations',
    'checkpoints_recovery',
    'evidence',
  ]),
  claude_tech_auditor: new Set<LedgerCategory>([
    'feature_inventory',
    'positive_findings',
    'defects',
    'usability_difficulties',
    'missing_capabilities',
    'recommendations',
    'checkpoints_recovery',
    'evidence',
    'fix_regression',
  ]),
  codex_engineer: new Set<LedgerCategory>([
    'checkpoints_recovery',
    'evidence',
    'fix_regression',
  ]),
  chatgpt_supervisor: new Set<LedgerCategory>([
    'positive_findings',
    'missing_capabilities',
    'competitor_comparisons',
    'differentiation_opportunities',
    'recommendations',
    'checkpoints_recovery',
    'fix_regression',
  ]),
};

export const IMMUTABLE_LEDGER_CATEGORIES: ReadonlySet<LedgerCategory> = new Set([
  'defects',
  'evidence',
]);

export interface IssueProductionFixApprovalInput {
  mission_id: string;
  scope: string;
  target_defect_ids: string[];
  worktree_branch?: string | undefined;
  notes?: string | undefined;
}

export class GovernanceGuard {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  private missionDir(missionId: string): string {
    assertSafeIdentifier(missionId, 'mission_id');
    return path.join(this.dataDir, 'missions', missionId);
  }

  private approvalsPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'approvals.json');
  }

  private auditLogPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'governance_audit.jsonl');
  }

  public async recordAudit(
    missionId: string,
    actor: ActorContext,
    action: GovernanceAction,
    outcome: 'allowed' | 'denied',
    detail: string,
    targetId?: string,
  ): Promise<GovernanceAuditRecord> {
    const entry: GovernanceAuditRecord = {
      audit_id: generateId('GOV'),
      mission_id: missionId,
      action,
      actor_agent: typeof actor?.agent === 'string' ? actor.agent.trim() : '',
      actor_role: actor.role,
      outcome,
      detail,
      target_id: targetId,
      timestamp_utc: new Date().toISOString(),
    };
    await appendJsonl(this.auditLogPath(missionId), entry);
    return entry;
  }

  public async issueProductionFixApproval(
    actor: ActorContext,
    input: IssueProductionFixApprovalInput,
  ): Promise<ProductionFixApproval> {
    const normalizedAgent = assertValidActorContext(actor);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ValidationError('ProductionFixApproval input must be an object');
    }
    assertSafeIdentifier(input.mission_id, 'mission_id');
    if (actor.role !== 'owner') {
      await this.recordAudit(
        input.mission_id,
        actor,
        'approve_production_fix',
        'denied',
        `Role "${actor.role}" is not permitted to approve production fixes; owner required`,
      );
      throw new UnauthorizedActionError(
        `Only role "owner" may approve production fixes (attempted by "${actor.role}")`,
      );
    }

    if (typeof input.scope !== 'string' || !input.scope.trim()) {
      throw new ValidationError('ProductionFixApproval scope must be non-empty');
    }
    if (!Array.isArray(input.target_defect_ids) || input.target_defect_ids.length === 0) {
      throw new ValidationError('ProductionFixApproval requires at least one target_defect_id');
    }
    const normalizedDefectIds = input.target_defect_ids.map((id) => {
      if (typeof id !== 'string' || id.trim().length === 0) {
        throw new ValidationError('ProductionFixApproval target_defect_ids must contain non-empty strings');
      }
      return id.trim();
    });
    if (
      input.worktree_branch !== undefined &&
      (typeof input.worktree_branch !== 'string' || input.worktree_branch.trim().length === 0)
    ) {
      throw new ValidationError('ProductionFixApproval worktree_branch cannot be blank when provided');
    }

    return withStoreLock(this.dataDir, `approvals_${input.mission_id}`, async () => {
      const approvals = await readJsonSafe<Record<string, ProductionFixApproval>>(
        this.approvalsPath(input.mission_id),
        {},
      );
      const approval: ProductionFixApproval = {
        approval_id: generateId('APR'),
        mission_id: input.mission_id,
        approved_by_agent: normalizedAgent,
        approved_by_role: 'owner',
        scope: input.scope.trim(),
        target_defect_ids: normalizedDefectIds,
        worktree_branch: input.worktree_branch?.trim(),
        notes: input.notes,
        status: 'active',
        created_at: new Date().toISOString(),
      };
      approvals[approval.approval_id] = approval;
      await atomicWriteJson(this.approvalsPath(input.mission_id), approvals);
      await this.recordAudit(
        input.mission_id,
        actor,
        'approve_production_fix',
        'allowed',
        `Approved production fix scope "${approval.scope}" for defects [${approval.target_defect_ids.join(', ')}]`,
        approval.approval_id,
      );
      return approval;
    });
  }

  public async revokeProductionFixApproval(
    actor: ActorContext,
    missionId: string,
    approvalId: string,
  ): Promise<ProductionFixApproval> {
    assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    if (typeof approvalId !== 'string') {
      throw new ValidationError('approvalId must be a string');
    }
    if (actor.role !== 'owner') {
      await this.recordAudit(
        missionId,
        actor,
        'revoke_production_fix',
        'denied',
        `Role "${actor.role}" cannot revoke production fix approvals`,
        approvalId,
      );
      throw new UnauthorizedActionError('Only role "owner" may revoke production fix approvals');
    }
    return withStoreLock(this.dataDir, `approvals_${missionId}`, async () => {
      const approvals = await readJsonSafe<Record<string, ProductionFixApproval>>(
        this.approvalsPath(missionId),
        {},
      );
      const existing = Object.hasOwn(approvals, approvalId) ? approvals[approvalId] : undefined;
      if (!existing) {
        throw new MissingApprovalGateError(`Approval "${approvalId}" not found in mission "${missionId}"`);
      }
      const updated: ProductionFixApproval = { ...existing, status: 'revoked' };
      approvals[approvalId] = updated;
      await atomicWriteJson(this.approvalsPath(missionId), approvals);
      await this.recordAudit(
        missionId,
        actor,
        'revoke_production_fix',
        'allowed',
        `Revoked approval ${approvalId}`,
        approvalId,
      );
      return updated;
    });
  }

  public async getProductionFixApproval(
    missionId: string,
    approvalId: string,
  ): Promise<ProductionFixApproval | null> {
    const approvals = await readJsonSafe<Record<string, ProductionFixApproval>>(
      this.approvalsPath(missionId),
      {},
    );
    return Object.hasOwn(approvals, approvalId) ? approvals[approvalId]! : null;
  }

  public async listApprovals(missionId: string): Promise<ProductionFixApproval[]> {
    const approvals = await readJsonSafe<Record<string, ProductionFixApproval>>(
      this.approvalsPath(missionId),
      {},
    );
    return Object.values(approvals);
  }

  public async assertValidProductionFixApproval(
    missionId: string,
    approvalId: string | null | undefined,
    actor: ActorContext,
    scopeContext?: {
      defect_id?: string | undefined;
      worktree_branch?: string | undefined;
      action?: GovernanceAction | undefined;
    },
  ): Promise<ProductionFixApproval> {
    assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    if (scopeContext !== undefined) {
      if (scopeContext === null || typeof scopeContext !== 'object' || Array.isArray(scopeContext)) {
        throw new ValidationError('scopeContext must be an object when provided');
      }
      if (scopeContext.defect_id !== undefined && typeof scopeContext.defect_id !== 'string') {
        throw new ValidationError('scopeContext.defect_id must be a string when provided');
      }
      if (
        scopeContext.worktree_branch !== undefined &&
        typeof scopeContext.worktree_branch !== 'string'
      ) {
        throw new ValidationError('scopeContext.worktree_branch must be a string when provided');
      }
    }
    const auditAction = scopeContext?.action ?? 'execute_stage_7_fix';
    if (!approvalId || typeof approvalId !== 'string' || !approvalId.trim()) {
      await this.recordAudit(
        missionId,
        actor,
        auditAction,
        'denied',
        'Missing owner approval_id for Stage 7 / production fix',
      );
      throw new MissingApprovalGateError(
        'Production fixes / Stage 7 transitions require an active owner-issued approval_id',
      );
    }
    const approval = await this.getProductionFixApproval(missionId, approvalId);
    if (!approval || approval.status !== 'active' || approval.approved_by_role !== 'owner') {
      await this.recordAudit(
        missionId,
        actor,
        auditAction,
        'denied',
        `Invalid or inactive approval_id "${approvalId}"`,
        approvalId,
      );
      throw new MissingApprovalGateError(
        `Approval "${approvalId}" is missing, revoked, or not signed by owner`,
      );
    }

    if (scopeContext?.defect_id !== undefined) {
      const defectId = scopeContext.defect_id.trim();
      if (!defectId || !approval.target_defect_ids.includes(defectId)) {
        await this.recordAudit(
          missionId,
          actor,
          auditAction,
          'denied',
          `Approval "${approvalId}" scope mismatch: defect_id "${scopeContext.defect_id}" not in [${approval.target_defect_ids.join(', ')}]`,
          approvalId,
        );
        throw new MissingApprovalGateError(
          `Approval "${approvalId}" does not cover defect "${scopeContext.defect_id}"`,
        );
      }
    }

    if (approval.worktree_branch && scopeContext?.worktree_branch !== undefined) {
      const branch = scopeContext.worktree_branch.trim();
      if (approval.worktree_branch !== branch) {
        await this.recordAudit(
          missionId,
          actor,
          auditAction,
          'denied',
          `Approval "${approvalId}" branch mismatch: expected "${approval.worktree_branch}", got "${scopeContext.worktree_branch}"`,
          approvalId,
        );
        throw new MissingApprovalGateError(
          `Approval "${approvalId}" is scoped to branch "${approval.worktree_branch}", not "${scopeContext.worktree_branch}"`,
        );
      }
    }

    return approval;
  }

  public async assertCanApproveSubtask(actor: ActorContext, missionId: string): Promise<void> {
    assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    if (actor.role !== 'orchestrator' && actor.role !== 'owner') {
      await this.recordAudit(
        missionId,
        actor,
        'approve_subtask',
        'denied',
        `Role "${actor.role}" is not permitted to approve or reject specialist subtasks`,
      );
      throw new UnauthorizedActionError(
        `Role "${actor.role}" cannot approve specialist subtasks; orchestrator or owner required`,
      );
    }
  }

  public async assertImmutableEntryCannotBeMutated(
    actor: ActorContext,
    missionId: string,
    category: LedgerCategory,
    entryId: string,
  ): Promise<never> {
    assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    await this.recordAudit(
      missionId,
      actor,
      'ledger_mutate_immutable',
      'denied',
      `Attempted destructive mutation/deletion of immutable ${category} entry ${entryId}`,
      entryId,
    );
    throw new ImmutableEvidenceError(category, entryId);
  }

  public async assertLedgerWriteAllowed(
    actor: ActorContext,
    missionId: string,
    category: LedgerCategory,
    payload: unknown,
  ): Promise<void> {
    const normalizedActorAgent = assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    const allowedCategories = Object.hasOwn(ROLE_LEDGER_WRITE_MATRIX, actor.role)
      ? ROLE_LEDGER_WRITE_MATRIX[actor.role]
      : undefined;
    if (!allowedCategories || !allowedCategories.has(category)) {
      await this.recordAudit(
        missionId,
        actor,
        'ledger_write',
        'denied',
        `Role "${actor.role}" is not allowed to write category "${category}"`,
      );
      throw new UnauthorizedActionError(
        `Role "${actor.role}" is not permitted to write to ledger category "${category}"`,
      );
    }

    if (category === 'fix_regression') {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new ValidationError('fix_regression payload must be an object');
      }
      const fixPayload = payload as {
        defect_id?: unknown;
        approval_id?: unknown;
        worktree_branch?: unknown;
        retest_status?: unknown;
        fixed_by?: unknown;
        retested_by?: unknown;
      };

      if (typeof fixPayload.defect_id !== 'string' || fixPayload.defect_id.trim().length === 0) {
        await this.recordAudit(
          missionId,
          actor,
          'record_fix',
          'denied',
          'fix_regression requires non-empty defect_id',
        );
        throw new ValidationError('fix_regression requires non-empty defect_id');
      }
      const defectId = fixPayload.defect_id.trim();
      const approvalId =
        typeof fixPayload.approval_id === 'string' ? fixPayload.approval_id : undefined;
      if (
        typeof fixPayload.worktree_branch !== 'string' ||
        fixPayload.worktree_branch.trim().length === 0
      ) {
        await this.recordAudit(
          missionId,
          actor,
          'record_fix',
          'denied',
          'fix_regression requires non-empty worktree_branch',
          defectId,
        );
        throw new ValidationError('fix_regression requires non-empty worktree_branch');
      }
      const worktreeBranch = fixPayload.worktree_branch.trim();
      const retestStatus = fixPayload.retest_status;
      const fixedBy = typeof fixPayload.fixed_by === 'string' ? fixPayload.fixed_by.trim() : undefined;
      const retestedBy =
        typeof fixPayload.retested_by === 'string' ? fixPayload.retested_by.trim() : undefined;

      if (!fixedBy) {
        await this.recordAudit(
          missionId,
          actor,
          'record_fix',
          'denied',
          'fix_regression requires non-empty fixed_by',
          defectId,
        );
        throw new ValidationError('fix_regression requires non-empty fixed_by');
      }
      if (fixPayload.retested_by !== undefined && !retestedBy) {
        await this.recordAudit(
          missionId,
          actor,
          'verify_independent_retest',
          'denied',
          'fix_regression.retested_by cannot be blank when provided',
          defectId,
        );
        throw new ValidationError('fix_regression.retested_by cannot be blank when provided');
      }

      if (actor.role === 'codex_engineer') {
        if (retestStatus === 'passed' || retestStatus === 'failed') {
          await this.recordAudit(
            missionId,
            actor,
            'verify_independent_retest',
            'denied',
            `Engineering role "${actor.role}" cannot submit retest verdict "${String(retestStatus)}"`,
          );
          throw new SelfVerificationDeniedError(normalizedActorAgent);
        }
        await this.assertValidProductionFixApproval(missionId, approvalId, actor, {
          defect_id: defectId,
          worktree_branch: worktreeBranch,
          action: 'record_fix',
        });
      } else if (retestStatus === 'passed' || retestStatus === 'failed') {
        if (
          actor.role !== 'claude_tech_auditor' &&
          actor.role !== 'chatgpt_supervisor'
        ) {
          await this.recordAudit(
            missionId,
            actor,
            'verify_independent_retest',
            'denied',
            `Role "${actor.role}" cannot certify independent retest`,
          );
          throw new UnauthorizedActionError(
            `Independent retest requires claude_tech_auditor or chatgpt_supervisor (got "${actor.role}")`,
          );
        }
        await this.assertValidProductionFixApproval(missionId, approvalId, actor, {
          defect_id: defectId,
          worktree_branch: worktreeBranch,
          action: 'verify_independent_retest',
        });
        const effectiveRetester = retestedBy ?? normalizedActorAgent;
        if (effectiveRetester === fixedBy || normalizedActorAgent === fixedBy) {
          await this.recordAudit(
            missionId,
            actor,
            'verify_independent_retest',
            'denied',
            `Self-verification blocked: actor "${normalizedActorAgent}" / retested_by "${effectiveRetester}" matches fixed_by "${fixedBy}"`,
          );
          throw new SelfVerificationDeniedError(effectiveRetester);
        }
      } else {
        await this.assertValidProductionFixApproval(missionId, approvalId, actor, {
          defect_id: defectId,
          worktree_branch: worktreeBranch,
          action: 'record_fix',
        });
      }
    }
  }
}
