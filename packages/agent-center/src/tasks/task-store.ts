import * as path from 'node:path';
import {
  ADAPTER_CHANNELS,
  AGENT_CENTER_DEFAULTS,
  AGENT_ROLES,
  type ActorContext,
  type AdapterChannel,
  type AgentRole,
  CircularDelegationError,
  DelegationDepthError,
  DuplicateTaskKeyError,
  type FallbackHistoryEntry,
  type MissionBudgetPolicy,
  type MissionLimits,
  type MissionRecord,
  PROVIDER_IDS,
  type ProviderId,
  RetryLimitExceededError,
  STAGES,
  type SpecialistSubtaskRequest,
  type StageId,
  type StructuredTaskResult,
  type TaskRecord,
  type TaskWriteScope,
  UnauthorizedActionError,
  ValidationError,
} from '../types.js';
import {
  assertSafeIdentifier,
  assertValidActorContext,
  atomicWriteJson,
  generateId,
  parseStrictIsoDateMs,
  readJsonSafe,
} from '../storage/atomic-fs.js';
import { withStoreLock } from '../storage/lock.js';
import { BudgetController } from '../budget/budget-controller.js';
import { GovernanceGuard } from '../governance/permissions.js';
import { IntelligenceLedger } from '../ledger/intelligence-ledger.js';
import {
  assertConcurrencyWithinCap,
  assertDelegationDepth,
  assertNoCycle,
  assertNoDuplicateActiveKey,
  assertNoWriteConflict,
  computeRetryDelayMs,
  normalizeTaskKey,
} from './delegation.js';

export interface CreateMissionInput {
  mission_id?: string | undefined;
  title: string;
  budget_policy?: Partial<MissionBudgetPolicy> | undefined;
  limits?: Partial<MissionLimits> | undefined;
}

export interface CreateRootTaskInput {
  mission_id: string;
  active_task_key: string;
  owner_agent: string;
  role: AgentRole;
  provider: ProviderId;
  model: string;
  channel?: AdapterChannel | undefined;
  stage?: StageId | undefined;
  title: string;
  acceptance_criteria: string[];
  budget_allocation_usd: number;
  is_optional_analysis?: boolean | undefined;
  auto_dispatch?: boolean | undefined;
  write_scope?: TaskWriteScope | undefined;
}

export interface RequestSpecialistSubtaskInput {
  mission_id: string;
  parent_task_id: string;
  requested_role: AgentRole;
  requested_provider: ProviderId;
  requested_model: string;
  requested_channel?: AdapterChannel | undefined;
  stage?: StageId | undefined;
  title: string;
  acceptance_criteria: string[];
  active_task_key: string;
  estimated_cost_usd: number;
  rationale: string;
  is_optional_analysis?: boolean | undefined;
  write_scope?: TaskWriteScope | undefined;
  command_preview?: string | undefined;
  target_urls?: string[] | undefined;
}

export interface ApproveSubtaskAssignment {
  owner_agent: string;
  role?: AgentRole | undefined;
  provider?: ProviderId | undefined;
  model?: string | undefined;
  channel?: AdapterChannel | undefined;
  budget_allocation_usd?: number | undefined;
  auto_dispatch?: boolean | undefined;
  write_scope?: TaskWriteScope | undefined;
}

export interface RetryResult {
  retryable: boolean;
  delay_ms: number | null;
  next_retry_at: string | null;
  task: TaskRecord;
}

export class TaskManager {
  private readonly dataDir: string;
  private readonly ledger: IntelligenceLedger;
  private readonly budget: BudgetController;
  private readonly governance: GovernanceGuard;

  constructor(
    dataDir: string,
    deps?: {
      ledger?: IntelligenceLedger | undefined;
      budget?: BudgetController | undefined;
      governance?: GovernanceGuard | undefined;
    },
  ) {
    this.dataDir = dataDir;
    this.governance = deps?.governance ?? new GovernanceGuard(dataDir);
    this.ledger = deps?.ledger ?? new IntelligenceLedger(dataDir, this.governance);
    this.budget = deps?.budget ?? new BudgetController(dataDir, this.ledger);
  }

  private missionDir(missionId: string): string {
    assertSafeIdentifier(missionId, 'mission_id');
    return path.join(this.dataDir, 'missions', missionId);
  }

  private missionPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'mission.json');
  }

  private tasksPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'tasks.json');
  }

  private requestsPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'delegation_requests.json');
  }

  public async createMission(actor: ActorContext, input: CreateMissionInput): Promise<MissionRecord> {
    const normalizedAgent = assertValidActorContext(actor);
    if (actor.role !== 'owner' && actor.role !== 'orchestrator') {
      throw new UnauthorizedActionError(
        `Role "${actor.role}" cannot create a mission; owner or orchestrator required`,
      );
    }
    if (!input || typeof input !== 'object' || typeof input.title !== 'string' || !input.title.trim()) {
      throw new ValidationError('Mission title must be non-empty');
    }

    const budgetPolicy: MissionBudgetPolicy = {
      max_mission_usd:
        input.budget_policy?.max_mission_usd ?? AGENT_CENTER_DEFAULTS.MAX_MISSION_USD,
      reserve_reporting_usd:
        input.budget_policy?.reserve_reporting_usd ?? AGENT_CENTER_DEFAULTS.RESERVE_REPORTING_USD,
      alert_pct: input.budget_policy?.alert_pct ?? AGENT_CENTER_DEFAULTS.ALERT_PCT,
      throttle_pct: input.budget_policy?.throttle_pct ?? AGENT_CENTER_DEFAULTS.THROTTLE_PCT,
      hard_stop_pct: input.budget_policy?.hard_stop_pct ?? AGENT_CENTER_DEFAULTS.HARD_STOP_PCT,
    };

    for (const [field, val] of [
      ['budget_policy.max_mission_usd', budgetPolicy.max_mission_usd],
      ['budget_policy.reserve_reporting_usd', budgetPolicy.reserve_reporting_usd],
      ['budget_policy.alert_pct', budgetPolicy.alert_pct],
      ['budget_policy.throttle_pct', budgetPolicy.throttle_pct],
      ['budget_policy.hard_stop_pct', budgetPolicy.hard_stop_pct],
    ] as const) {
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        throw new ValidationError(`${field} must be a finite number`);
      }
    }
    if (budgetPolicy.max_mission_usd <= 0) {
      throw new ValidationError('max_mission_usd must be positive');
    }
    if (
      budgetPolicy.reserve_reporting_usd < 0 ||
      budgetPolicy.reserve_reporting_usd >= budgetPolicy.max_mission_usd
    ) {
      throw new ValidationError(
        'reserve_reporting_usd must be >= 0 and strictly less than max_mission_usd',
      );
    }
    if (
      budgetPolicy.alert_pct <= 0 ||
      budgetPolicy.alert_pct > budgetPolicy.throttle_pct ||
      budgetPolicy.throttle_pct > budgetPolicy.hard_stop_pct
    ) {
      throw new ValidationError(
        'Budget percentages must satisfy 0 < alert_pct <= throttle_pct <= hard_stop_pct',
      );
    }

    const limits: MissionLimits = {
      max_concurrent_agents:
        input.limits?.max_concurrent_agents ?? AGENT_CENTER_DEFAULTS.MAX_CONCURRENT_AGENTS,
      max_delegation_depth:
        input.limits?.max_delegation_depth ?? AGENT_CENTER_DEFAULTS.MAX_DELEGATION_DEPTH,
      max_retries: input.limits?.max_retries ?? AGENT_CENTER_DEFAULTS.MAX_RETRIES,
      retry_base_delay_ms:
        input.limits?.retry_base_delay_ms ?? AGENT_CENTER_DEFAULTS.RETRY_BASE_DELAY_MS,
      retry_backoff_factor:
        input.limits?.retry_backoff_factor ?? AGENT_CENTER_DEFAULTS.RETRY_BACKOFF_FACTOR,
    };

    for (const [field, val] of [
      ['limits.max_concurrent_agents', limits.max_concurrent_agents],
      ['limits.max_delegation_depth', limits.max_delegation_depth],
      ['limits.max_retries', limits.max_retries],
    ] as const) {
      if (typeof val !== 'number' || !Number.isFinite(val) || !Number.isInteger(val)) {
        throw new ValidationError(`${field} must be a finite integer`);
      }
    }
    for (const [field, val] of [
      ['limits.retry_base_delay_ms', limits.retry_base_delay_ms],
      ['limits.retry_backoff_factor', limits.retry_backoff_factor],
    ] as const) {
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        throw new ValidationError(`${field} must be a finite number`);
      }
    }
    if (limits.max_concurrent_agents < 1) {
      throw new ValidationError('limits.max_concurrent_agents must be >= 1');
    }
    if (limits.max_delegation_depth < 0) {
      throw new ValidationError('limits.max_delegation_depth must be >= 0');
    }
    if (limits.max_retries < 0) {
      throw new ValidationError('limits.max_retries must be >= 0');
    }
    if (limits.retry_base_delay_ms < 0) {
      throw new ValidationError('limits.retry_base_delay_ms must be >= 0');
    }
    if (limits.retry_backoff_factor < 1) {
      throw new ValidationError('limits.retry_backoff_factor must be >= 1');
    }

    if (actor.role !== 'owner') {
      if (
        budgetPolicy.max_mission_usd > AGENT_CENTER_DEFAULTS.MAX_MISSION_USD ||
        budgetPolicy.reserve_reporting_usd < AGENT_CENTER_DEFAULTS.RESERVE_REPORTING_USD ||
        budgetPolicy.alert_pct > AGENT_CENTER_DEFAULTS.ALERT_PCT ||
        budgetPolicy.throttle_pct > AGENT_CENTER_DEFAULTS.THROTTLE_PCT ||
        budgetPolicy.hard_stop_pct > AGENT_CENTER_DEFAULTS.HARD_STOP_PCT ||
        limits.max_concurrent_agents > AGENT_CENTER_DEFAULTS.MAX_CONCURRENT_AGENTS ||
        limits.max_delegation_depth > AGENT_CENTER_DEFAULTS.MAX_DELEGATION_DEPTH ||
        limits.max_retries > AGENT_CENTER_DEFAULTS.MAX_RETRIES ||
        limits.retry_base_delay_ms < AGENT_CENTER_DEFAULTS.RETRY_BASE_DELAY_MS ||
        limits.retry_backoff_factor < AGENT_CENTER_DEFAULTS.RETRY_BACKOFF_FACTOR
      ) {
        throw new UnauthorizedActionError(
          `Only role "owner" may weaken budget policy, raise concurrency/delegation/retry caps, or lower retry backoff below defaults`,
        );
      }
    }

    if (budgetPolicy.hard_stop_pct > 1.0) {
      throw new ValidationError('hard_stop_pct must be <= 1.0');
    }

    const missionId =
      input.mission_id !== undefined
        ? assertSafeIdentifier(input.mission_id, 'mission_id')
        : generateId('MSN');
    const now = new Date().toISOString();

    return withStoreLock(this.dataDir, `mission_${missionId}`, async () => {
      const existing = await readJsonSafe<MissionRecord | null>(
        this.missionPath(missionId),
        null,
      );
      if (existing) {
        throw new ValidationError(`Mission "${missionId}" already exists`);
      }
      const record: MissionRecord = {
        mission_id: missionId,
        title: input.title.trim(),
        status: 'active',
        budget_policy: budgetPolicy,
        limits,
        created_by: normalizedAgent,
        created_at: now,
        updated_at: now,
      };
      await atomicWriteJson(this.missionPath(missionId), record);
      return record;
    });
  }

  public async getMission(missionId: string): Promise<MissionRecord> {
    const mission = await readJsonSafe<MissionRecord | null>(
      this.missionPath(missionId),
      null,
    );
    if (!mission) {
      throw new ValidationError(`Mission "${missionId}" does not exist`);
    }
    return mission;
  }

  public async getTask(missionId: string, taskId: string): Promise<TaskRecord | null> {
    assertSafeIdentifier(taskId, 'task_id');
    const tasks = await readJsonSafe<Record<string, TaskRecord>>(
      this.tasksPath(missionId),
      {},
    );
    return Object.hasOwn(tasks, taskId) ? tasks[taskId]! : null;
  }

  public async listTasks(missionId: string): Promise<TaskRecord[]> {
    const tasks = await readJsonSafe<Record<string, TaskRecord>>(
      this.tasksPath(missionId),
      {},
    );
    return Object.values(tasks).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  public async listSubtaskRequests(missionId: string): Promise<SpecialistSubtaskRequest[]> {
    const reqs = await readJsonSafe<Record<string, SpecialistSubtaskRequest>>(
      this.requestsPath(missionId),
      {},
    );
    return Object.values(reqs).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  public async createRootTask(
    actor: ActorContext,
    input: CreateRootTaskInput,
  ): Promise<TaskRecord> {
    assertValidActorContext(actor);
    if (actor.role !== 'orchestrator' && actor.role !== 'owner') {
      throw new UnauthorizedActionError(
        `Role "${actor.role}" cannot create root tasks; orchestrator or owner required`,
      );
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ValidationError('createRootTask input must be an object');
    }
    if (typeof input.active_task_key !== 'string' || input.active_task_key.trim().length === 0) {
      throw new ValidationError('Task active_task_key must be a non-empty string');
    }
    const mission = await this.getMission(input.mission_id);
    if (typeof input.owner_agent !== 'string' || input.owner_agent.trim().length === 0) {
      throw new ValidationError('Task owner_agent must be a non-empty string');
    }
    if (!(AGENT_ROLES as readonly string[]).includes(input.role)) {
      throw new ValidationError(`Invalid task role "${String(input.role)}"`);
    }
    if (!(PROVIDER_IDS as readonly string[]).includes(input.provider)) {
      throw new ValidationError(`Invalid task provider "${String(input.provider)}"`);
    }
    if (typeof input.model !== 'string' || input.model.trim().length === 0) {
      throw new ValidationError('Task model must be a non-empty string');
    }
    const stage: StageId = input.stage ?? 'STAGE_1_DISCOVERY';
    if (!(STAGES as readonly string[]).includes(stage)) {
      throw new ValidationError(`Invalid ledger stage "${String(stage)}"`);
    }
    if (typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new ValidationError('Task title must be non-empty');
    }
    if (
      !Array.isArray(input.acceptance_criteria) ||
      input.acceptance_criteria.length === 0 ||
      input.acceptance_criteria.some((c) => typeof c !== 'string' || c.trim().length === 0)
    ) {
      throw new ValidationError('Task requires at least one non-empty acceptance criterion');
    }
    if (
      typeof input.budget_allocation_usd !== 'number' ||
      !Number.isFinite(input.budget_allocation_usd) ||
      input.budget_allocation_usd < 0
    ) {
      throw new ValidationError('budget_allocation_usd must be a finite non-negative number');
    }

    const autoDispatch = input.auto_dispatch ?? false;
    if (autoDispatch) {
      await this.budget.assertCanDispatch(input.mission_id, {
        projectedCostUsd: input.budget_allocation_usd,
        purpose: input.is_optional_analysis ? 'optional_analysis' : 'operational',
      });
    }

    const now = new Date().toISOString();
    const task = await withStoreLock(this.dataDir, `tasks_${input.mission_id}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(input.mission_id),
        {},
      );
      assertNoDuplicateActiveKey(tasks, input.mission_id, input.active_task_key);

      const requests = await readJsonSafe<Record<string, SpecialistSubtaskRequest>>(
        this.requestsPath(input.mission_id),
        {},
      );
      const normalizedKey = normalizeTaskKey(input.active_task_key);
      for (const req of Object.values(requests)) {
        if (
          req.status === 'pending_approval' &&
          normalizeTaskKey(req.active_task_key) === normalizedKey
        ) {
          throw new DuplicateTaskKeyError(input.active_task_key, input.mission_id);
        }
      }

      if (autoDispatch) {
        assertConcurrencyWithinCap(tasks, mission.limits.max_concurrent_agents);
      }

      const taskId = generateId('TSK');
      const record: TaskRecord = {
        task_id: taskId,
        mission_id: input.mission_id,
        parent_task_id: null,
        delegation_depth: 0,
        active_task_key: input.active_task_key.trim(),
        owner_agent: input.owner_agent.trim(),
        role: input.role,
        provider: input.provider,
        model: input.model.trim(),
        stage,
        status: autoDispatch ? 'in_progress' : 'pending',
        title: input.title.trim(),
        acceptance_criteria: input.acceptance_criteria.map((c) => c.trim()),
        budget_allocation_usd: input.budget_allocation_usd,
        spend_usd: 0,
        tokens: {
          input_tokens: 0,
          output_tokens: 0,
          cached_tokens: 0,
          billing_type: input.provider === 'local_script' ? 'subscription_quota' : 'metered_api',
          cost_basis: 'estimated',
        },
        checkpoint_history: [],
        retry_count: 0,
        next_retry_at: null,
        is_optional_analysis: input.is_optional_analysis,
        approval_id: null,
        last_error: null,
        created_at: now,
        updated_at: now,
      };

      tasks[taskId] = record;
      await atomicWriteJson(this.tasksPath(input.mission_id), tasks);
      return record;
    });

    await this.ledger.append(actor, {
      mission_id: input.mission_id,
      task_id: task.task_id,
      stage: task.stage,
      category: 'agent_assignments',
      epistemic_tag: 'observation',
      evidence_links: [],
      payload: {
        task_id: task.task_id,
        parent_task_id: null,
        role: task.role,
        provider: task.provider,
        model: task.model,
        action: autoDispatch ? 'dispatched' : 'assigned',
      },
    });

    return task;
  }

  public async requestSpecialistSubtask(
    actor: ActorContext,
    input: RequestSpecialistSubtaskInput,
  ): Promise<SpecialistSubtaskRequest> {
    const normalizedAgent = assertValidActorContext(actor);
    if (typeof actor.role !== 'string' || !(AGENT_ROLES as readonly string[]).includes(actor.role)) {
      throw new ValidationError(`Invalid actor.role "${String(actor.role)}"`);
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ValidationError('requestSpecialistSubtask input must be an object');
    }
    if (typeof input.active_task_key !== 'string' || input.active_task_key.trim().length === 0) {
      throw new ValidationError('Specialist subtask active_task_key must be a non-empty string');
    }
    const mission = await this.getMission(input.mission_id);
    assertSafeIdentifier(input.parent_task_id, 'parent_task_id');
    if (!(AGENT_ROLES as readonly string[]).includes(input.requested_role)) {
      throw new ValidationError(`Invalid requested_role "${String(input.requested_role)}"`);
    }
    if (!(PROVIDER_IDS as readonly string[]).includes(input.requested_provider)) {
      throw new ValidationError(`Invalid requested_provider "${String(input.requested_provider)}"`);
    }
    if (typeof input.requested_model !== 'string' || input.requested_model.trim().length === 0) {
      throw new ValidationError('Specialist subtask requested_model must be a non-empty string');
    }
    if (input.stage !== undefined && !(STAGES as readonly string[]).includes(input.stage)) {
      throw new ValidationError(`Invalid subtask stage "${String(input.stage)}"`);
    }
    if (typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new ValidationError('Specialist subtask title must be non-empty');
    }
    if (
      !Array.isArray(input.acceptance_criteria) ||
      input.acceptance_criteria.length === 0 ||
      input.acceptance_criteria.some((c) => typeof c !== 'string' || c.trim().length === 0)
    ) {
      throw new ValidationError('Specialist subtask requires at least one non-empty acceptance criterion');
    }
    if (typeof input.rationale !== 'string' || input.rationale.trim().length === 0) {
      throw new ValidationError('Specialist subtask rationale must be non-empty');
    }
    if (
      typeof input.estimated_cost_usd !== 'number' ||
      !Number.isFinite(input.estimated_cost_usd) ||
      input.estimated_cost_usd < 0
    ) {
      throw new ValidationError('estimated_cost_usd must be a finite non-negative number');
    }

    return withStoreLock(this.dataDir, `tasks_${input.mission_id}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(input.mission_id),
        {},
      );
      const parentTask = Object.hasOwn(tasks, input.parent_task_id)
        ? tasks[input.parent_task_id]
        : undefined;
      if (!parentTask) {
        throw new ValidationError(`Parent task "${input.parent_task_id}" not found`);
      }
      if (
        parentTask.status === 'completed' ||
        parentTask.status === 'cancelled' ||
        parentTask.status === 'failed'
      ) {
        throw new ValidationError(
          `Cannot request specialist subtask under terminal parent task "${input.parent_task_id}" in status "${parentTask.status}"`,
        );
      }

      assertNoCycle(tasks, input.parent_task_id);
      assertDelegationDepth(parentTask, mission.limits.max_delegation_depth);
      assertNoDuplicateActiveKey(tasks, input.mission_id, input.active_task_key);

      if (
        parentTask.role === input.requested_role &&
        parentTask.title.trim().toLowerCase() === input.title.trim().toLowerCase()
      ) {
        throw new ValidationError(
          `Recursive subtask spawn rejected: role "${input.requested_role}" cannot spawn identical subtask "${input.title}"`,
        );
      }

      const requests = await readJsonSafe<Record<string, SpecialistSubtaskRequest>>(
        this.requestsPath(input.mission_id),
        {},
      );
      const normalizedKey = normalizeTaskKey(input.active_task_key);
      for (const req of Object.values(requests)) {
        if (
          req.status === 'pending_approval' &&
          normalizeTaskKey(req.active_task_key) === normalizedKey
        ) {
          throw new ValidationError(
            `Pending specialist request with active_task_key "${input.active_task_key}" already exists`,
          );
        }
      }

      const now = new Date().toISOString();
      const request: SpecialistSubtaskRequest = {
        request_id: generateId('REQ'),
        mission_id: input.mission_id,
        parent_task_id: input.parent_task_id,
        requested_by_agent: normalizedAgent,
        requested_by_role: actor.role,
        requested_role: input.requested_role,
        requested_provider: input.requested_provider,
        requested_model: input.requested_model.trim(),
        stage: input.stage ?? parentTask.stage,
        title: input.title.trim(),
        acceptance_criteria: input.acceptance_criteria.map((c) => c.trim()),
        active_task_key: input.active_task_key.trim(),
        estimated_cost_usd: input.estimated_cost_usd,
        rationale: input.rationale.trim(),
        is_optional_analysis: input.is_optional_analysis ?? false,
        status: 'pending_approval',
        assigned_task_id: null,
        decided_by: null,
        decision_reason: null,
        created_at: now,
        updated_at: now,
      };

      requests[request.request_id] = request;
      await atomicWriteJson(this.requestsPath(input.mission_id), requests);
      return request;
    });
  }

  public async approveSubtaskRequest(
    actor: ActorContext,
    missionId: string,
    requestId: string,
    assignment: ApproveSubtaskAssignment,
  ): Promise<{ request: SpecialistSubtaskRequest; task: TaskRecord }> {
    const normalizedAgent = assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    assertSafeIdentifier(requestId, 'request_id');
    await this.governance.assertCanApproveSubtask(actor, missionId);
    const mission = await this.getMission(missionId);
    if (!assignment || typeof assignment !== 'object' || Array.isArray(assignment)) {
      throw new ValidationError('Subtask assignment must be an object');
    }
    if (typeof assignment.owner_agent !== 'string' || assignment.owner_agent.trim().length === 0) {
      throw new ValidationError('Subtask assignment owner_agent must be a non-empty string');
    }
    if (
      assignment.role !== undefined &&
      !(AGENT_ROLES as readonly string[]).includes(assignment.role)
    ) {
      throw new ValidationError(`Invalid assignment role "${String(assignment.role)}"`);
    }
    if (
      assignment.provider !== undefined &&
      !(PROVIDER_IDS as readonly string[]).includes(assignment.provider)
    ) {
      throw new ValidationError(`Invalid assignment provider "${String(assignment.provider)}"`);
    }
    if (
      assignment.model !== undefined &&
      (typeof assignment.model !== 'string' || assignment.model.trim().length === 0)
    ) {
      throw new ValidationError('Subtask assignment model must be a non-empty string');
    }

    const pendingRequests = await readJsonSafe<Record<string, SpecialistSubtaskRequest>>(
      this.requestsPath(missionId),
      {},
    );
    const request = Object.hasOwn(pendingRequests, requestId)
      ? pendingRequests[requestId]
      : undefined;
    if (!request) {
      throw new ValidationError(`Subtask request "${requestId}" not found`);
    }
    if (request.status !== 'pending_approval') {
      throw new ValidationError(
        `Subtask request "${requestId}" is already "${request.status}"`,
      );
    }

    if (
      assignment.budget_allocation_usd !== undefined &&
      (typeof assignment.budget_allocation_usd !== 'number' ||
        !Number.isFinite(assignment.budget_allocation_usd) ||
        assignment.budget_allocation_usd < 0)
    ) {
      throw new ValidationError('budget_allocation_usd must be a finite non-negative number');
    }
    const projectedCost = assignment.budget_allocation_usd ?? request.estimated_cost_usd;
    if (typeof projectedCost !== 'number' || !Number.isFinite(projectedCost) || projectedCost < 0) {
      throw new ValidationError('budget_allocation_usd must be a finite non-negative number');
    }
    const purpose = request.is_optional_analysis ? 'optional_delegation' : 'operational';
    await this.budget.assertCanDispatch(missionId, {
      projectedCostUsd: projectedCost,
      purpose,
    });

    const autoDispatch = assignment.auto_dispatch ?? true;
    const now = new Date().toISOString();

    const result = await withStoreLock(this.dataDir, `tasks_${missionId}`, async () => {
      const requests = await readJsonSafe<Record<string, SpecialistSubtaskRequest>>(
        this.requestsPath(missionId),
        {},
      );
      const freshReq = Object.hasOwn(requests, requestId) ? requests[requestId] : undefined;
      if (!freshReq || freshReq.status !== 'pending_approval') {
        throw new ValidationError(`Subtask request "${requestId}" is no longer pending`);
      }

      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(missionId),
        {},
      );
      const parentTask = Object.hasOwn(tasks, freshReq.parent_task_id)
        ? tasks[freshReq.parent_task_id]
        : undefined;
      if (!parentTask) {
        throw new ValidationError(`Parent task "${freshReq.parent_task_id}" not found`);
      }
      if (
        parentTask.status === 'completed' ||
        parentTask.status === 'cancelled' ||
        parentTask.status === 'failed'
      ) {
        throw new ValidationError(
          `Cannot approve specialist subtask under terminal parent task "${freshReq.parent_task_id}" in status "${parentTask.status}"`,
        );
      }

      const taskId = generateId('TSK');
      assertNoCycle(tasks, freshReq.parent_task_id, taskId);
      const depth = assertDelegationDepth(parentTask, mission.limits.max_delegation_depth);
      assertNoDuplicateActiveKey(tasks, missionId, freshReq.active_task_key);
      if (autoDispatch) {
        assertConcurrencyWithinCap(tasks, mission.limits.max_concurrent_agents);
      }

      const role = assignment.role ?? freshReq.requested_role;
      const provider = assignment.provider ?? freshReq.requested_provider;
      const model = (assignment.model ?? freshReq.requested_model).trim();

      const childTask: TaskRecord = {
        task_id: taskId,
        mission_id: missionId,
        parent_task_id: freshReq.parent_task_id,
        delegation_depth: depth,
        active_task_key: freshReq.active_task_key,
        owner_agent: assignment.owner_agent.trim(),
        role,
        provider,
        model,
        stage: freshReq.stage,
        status: autoDispatch ? 'in_progress' : 'pending',
        title: freshReq.title,
        acceptance_criteria: [...freshReq.acceptance_criteria],
        budget_allocation_usd: projectedCost,
        spend_usd: 0,
        tokens: {
          input_tokens: 0,
          output_tokens: 0,
          cached_tokens: 0,
          billing_type: provider === 'local_script' ? 'subscription_quota' : 'metered_api',
          cost_basis: 'estimated',
        },
        checkpoint_history: [],
        retry_count: 0,
        next_retry_at: null,
        is_optional_analysis: freshReq.is_optional_analysis,
        approval_id: requestId,
        last_error: null,
        created_at: now,
        updated_at: now,
      };

      const updatedReq: SpecialistSubtaskRequest = {
        ...freshReq,
        status: 'approved',
        assigned_task_id: taskId,
        decided_by: normalizedAgent,
        decision_reason: 'approved',
        updated_at: now,
      };

      tasks[taskId] = childTask;
      requests[requestId] = updatedReq;

      await atomicWriteJson(this.tasksPath(missionId), tasks);
      await atomicWriteJson(this.requestsPath(missionId), requests);
      return { request: updatedReq, task: childTask };
    });

    await this.governance.recordAudit(
      missionId,
      actor,
      'approve_subtask',
      'allowed',
      `Approved subtask request ${requestId} -> task ${result.task.task_id}`,
      result.task.task_id,
    );

    await this.ledger.append(actor, {
      mission_id: missionId,
      task_id: result.task.task_id,
      stage: result.task.stage,
      category: 'agent_assignments',
      epistemic_tag: 'observation',
      evidence_links: [],
      payload: {
        task_id: result.task.task_id,
        parent_task_id: result.task.parent_task_id,
        role: result.task.role,
        provider: result.task.provider,
        model: result.task.model,
        action: 'approved',
      },
    });

    return result;
  }

  public async rejectSubtaskRequest(
    actor: ActorContext,
    missionId: string,
    requestId: string,
    reason: string,
  ): Promise<SpecialistSubtaskRequest> {
    const normalizedAgent = assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    assertSafeIdentifier(requestId, 'request_id');
    await this.governance.assertCanApproveSubtask(actor, missionId);
    const now = new Date().toISOString();

    const updated = await withStoreLock(this.dataDir, `tasks_${missionId}`, async () => {
      const requests = await readJsonSafe<Record<string, SpecialistSubtaskRequest>>(
        this.requestsPath(missionId),
        {},
      );
      const req = Object.hasOwn(requests, requestId) ? requests[requestId] : undefined;
      if (!req) {
        throw new ValidationError(`Subtask request "${requestId}" not found`);
      }
      if (req.status !== 'pending_approval') {
        throw new ValidationError(`Subtask request "${requestId}" is already "${req.status}"`);
      }
      const next: SpecialistSubtaskRequest = {
        ...req,
        status: 'rejected',
        decided_by: normalizedAgent,
        decision_reason: reason,
        updated_at: now,
      };
      requests[requestId] = next;
      await atomicWriteJson(this.requestsPath(missionId), requests);
      return next;
    });

    await this.governance.recordAudit(
      missionId,
      actor,
      'reject_subtask',
      'allowed',
      `Rejected subtask request ${requestId}: ${reason}`,
      requestId,
    );
    return updated;
  }

  public async linkParentTask(
    actor: ActorContext,
    missionId: string,
    taskId: string,
    newParentTaskId: string,
  ): Promise<TaskRecord> {
    assertValidActorContext(actor);
    if (actor.role !== 'orchestrator' && actor.role !== 'owner') {
      throw new UnauthorizedActionError(
        `Role "${actor.role}" cannot alter task hierarchy`,
      );
    }
    assertSafeIdentifier(missionId, 'mission_id');
    assertSafeIdentifier(taskId, 'task_id');
    assertSafeIdentifier(newParentTaskId, 'newParentTaskId');
    const mission = await this.getMission(missionId);
    return withStoreLock(this.dataDir, `tasks_${missionId}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(missionId),
        {},
      );
      const task = Object.hasOwn(tasks, taskId) ? tasks[taskId] : undefined;
      const parent = Object.hasOwn(tasks, newParentTaskId) ? tasks[newParentTaskId] : undefined;
      if (!task || !parent) {
        throw new ValidationError('Both taskId and newParentTaskId must exist');
      }
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') {
        throw new ValidationError(
          `Cannot reparent terminal task "${taskId}" in status "${task.status}"`,
        );
      }
      if (
        parent.status === 'completed' ||
        parent.status === 'cancelled' ||
        parent.status === 'failed'
      ) {
        throw new ValidationError(
          `Cannot link task "${taskId}" under terminal parent task "${newParentTaskId}" in status "${parent.status}"`,
        );
      }
      assertNoCycle(tasks, newParentTaskId, taskId);

      // Build child adjacency to traverse all descendants of taskId
      const childrenByParent = new Map<string, TaskRecord[]>();
      for (const candidate of Object.values(tasks)) {
        if (candidate.parent_task_id) {
          const children = childrenByParent.get(candidate.parent_task_id) ?? [];
          children.push(candidate);
          childrenByParent.set(candidate.parent_task_id, children);
        }
      }

      const subtreeOffsets = new Map<string, number>();
      const queue: Array<{ id: string; offset: number }> = [{ id: taskId, offset: 0 }];
      let maxSubtreeOffset = 0;

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (subtreeOffsets.has(current.id)) {
          throw new CircularDelegationError(
            `Existing circular delegation chain detected involving task "${current.id}"`,
          );
        }
        subtreeOffsets.set(current.id, current.offset);
        if (current.offset > maxSubtreeOffset) {
          maxSubtreeOffset = current.offset;
        }
        const children = childrenByParent.get(current.id) ?? [];
        for (const child of children) {
          queue.push({ id: child.task_id, offset: current.offset + 1 });
        }
      }

      const nextDepth = parent.delegation_depth + 1;
      const maxResultingDepth = nextDepth + maxSubtreeOffset;
      if (maxResultingDepth > mission.limits.max_delegation_depth) {
        throw new DelegationDepthError(maxResultingDepth, mission.limits.max_delegation_depth);
      }

      const nowIso = new Date().toISOString();
      for (const [descId, offset] of subtreeOffsets.entries()) {
        const desc = Object.hasOwn(tasks, descId) ? tasks[descId] : undefined;
        if (!desc) {
          continue;
        }
        tasks[descId] = {
          ...desc,
          parent_task_id: descId === taskId ? newParentTaskId : desc.parent_task_id,
          delegation_depth: nextDepth + offset,
          updated_at: nowIso,
        };
      }
      await atomicWriteJson(this.tasksPath(missionId), tasks);
      return tasks[taskId]!;
    });
  }

  public async dispatchTask(
    actor: ActorContext,
    missionId: string,
    taskId: string,
    options?: { allow_early_retry?: boolean | undefined; now_utc?: string | undefined },
  ): Promise<TaskRecord> {
    assertValidActorContext(actor);
    if (actor.role !== 'orchestrator' && actor.role !== 'owner') {
      throw new UnauthorizedActionError(
        `Role "${actor.role}" cannot dispatch tasks; orchestrator or owner required`,
      );
    }
    assertSafeIdentifier(missionId, 'mission_id');
    assertSafeIdentifier(taskId, 'task_id');
    const nowMs =
      options?.now_utc !== undefined
        ? parseStrictIsoDateMs(options.now_utc, 'options.now_utc')
        : Date.now();

    const mission = await this.getMission(missionId);
    const existing = await this.getTask(missionId, taskId);
    if (!existing) {
      throw new ValidationError(`Task "${taskId}" not found`);
    }

    await this.budget.assertCanDispatch(missionId, {
      projectedCostUsd: Math.max(0, existing.budget_allocation_usd - existing.spend_usd),
      purpose: existing.is_optional_analysis ? 'optional_analysis' : 'operational',
    });

    const updated = await withStoreLock(this.dataDir, `tasks_${missionId}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(missionId),
        {},
      );
      const task = Object.hasOwn(tasks, taskId) ? tasks[taskId] : undefined;
      if (!task) {
        throw new ValidationError(`Task "${taskId}" not found`);
      }
      if (task.status !== 'pending' && task.status !== 'paused' && task.status !== 'blocked') {
        throw new ValidationError(`Task "${taskId}" in status "${task.status}" cannot be dispatched`);
      }
      if (
        task.status === 'paused' &&
        task.next_retry_at !== null &&
        !options?.allow_early_retry
      ) {
        const retryAtMs = Date.parse(task.next_retry_at);
        if (!Number.isNaN(retryAtMs) && nowMs < retryAtMs) {
          throw new ValidationError(
            `Task "${taskId}" retry backoff cooldown active until ${task.next_retry_at}`,
          );
        }
      }
      assertConcurrencyWithinCap(tasks, mission.limits.max_concurrent_agents);
      const next: TaskRecord = {
        ...task,
        status: 'in_progress',
        next_retry_at: null,
        updated_at: new Date(nowMs).toISOString(),
      };
      tasks[taskId] = next;
      await atomicWriteJson(this.tasksPath(missionId), tasks);
      return next;
    });

    await this.ledger.append(actor, {
      mission_id: missionId,
      task_id: taskId,
      stage: updated.stage,
      category: 'agent_assignments',
      epistemic_tag: 'observation',
      evidence_links: [],
      payload: {
        task_id: taskId,
        parent_task_id: updated.parent_task_id,
        role: updated.role,
        provider: updated.provider,
        model: updated.model,
        action: 'dispatched',
      },
    });

    return updated;
  }

  public async completeTask(
    actor: ActorContext,
    missionId: string,
    taskId: string,
    detail?: string,
  ): Promise<TaskRecord> {
    assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    assertSafeIdentifier(taskId, 'task_id');
    const updated = await withStoreLock(this.dataDir, `tasks_${missionId}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(missionId),
        {},
      );
      const task = Object.hasOwn(tasks, taskId) ? tasks[taskId] : undefined;
      if (!task) {
        throw new ValidationError(`Task "${taskId}" not found`);
      }
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') {
        throw new ValidationError(
          `Cannot complete terminal task "${taskId}" in status "${task.status}"`,
        );
      }
      const next: TaskRecord = {
        ...task,
        status: 'completed',
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      };
      tasks[taskId] = next;
      await atomicWriteJson(this.tasksPath(missionId), tasks);
      return next;
    });

    const ledgerActor: ActorContext =
      actor.role === 'orchestrator' || actor.role === 'owner'
        ? actor
        : { agent: 'task-manager', role: 'orchestrator' };

    await this.ledger.append(ledgerActor, {
      mission_id: missionId,
      task_id: taskId,
      stage: updated.stage,
      category: 'agent_assignments',
      epistemic_tag: 'observation',
      evidence_links: [],
      payload: {
        task_id: taskId,
        parent_task_id: updated.parent_task_id,
        role: updated.role,
        provider: updated.provider,
        model: updated.model,
        action: 'completed',
        detail,
      },
    });
    return updated;
  }

  public async cancelTask(
    actor: ActorContext,
    missionId: string,
    taskId: string,
    reason?: string,
  ): Promise<TaskRecord> {
    assertValidActorContext(actor);
    if (actor.role !== 'orchestrator' && actor.role !== 'owner') {
      throw new UnauthorizedActionError('Only orchestrator or owner may cancel tasks');
    }
    assertSafeIdentifier(missionId, 'mission_id');
    assertSafeIdentifier(taskId, 'task_id');
    return withStoreLock(this.dataDir, `tasks_${missionId}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(missionId),
        {},
      );
      const task = Object.hasOwn(tasks, taskId) ? tasks[taskId] : undefined;
      if (!task) {
        throw new ValidationError(`Task "${taskId}" not found`);
      }
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') {
        throw new ValidationError(
          `Cannot cancel terminal task "${taskId}" in status "${task.status}"`,
        );
      }
      const next: TaskRecord = {
        ...task,
        status: 'cancelled',
        next_retry_at: null,
        last_error: reason ?? task.last_error,
        updated_at: new Date().toISOString(),
      };
      tasks[taskId] = next;
      await atomicWriteJson(this.tasksPath(missionId), tasks);
      return next;
    });
  }

  public async recordTaskFailureAndScheduleRetry(
    actor: ActorContext,
    missionId: string,
    taskId: string,
    errorMessage: string,
    nowUtc?: string,
  ): Promise<RetryResult> {
    assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    assertSafeIdentifier(taskId, 'task_id');
    const mission = await this.getMission(missionId);
    const nowMs = nowUtc !== undefined ? parseStrictIsoDateMs(nowUtc, 'nowUtc') : Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const result = await withStoreLock(this.dataDir, `tasks_${missionId}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(missionId),
        {},
      );
      const task = Object.hasOwn(tasks, taskId) ? tasks[taskId] : undefined;
      if (!task) {
        throw new ValidationError(`Task "${taskId}" not found`);
      }
      if (task.status === 'failed' && task.retry_count >= mission.limits.max_retries) {
        throw new RetryLimitExceededError(taskId, mission.limits.max_retries);
      }
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') {
        throw new ValidationError(
          `Cannot record failure for terminal task "${taskId}" in status "${task.status}"`,
        );
      }

      const nextRetryCount = task.retry_count + 1;
      if (nextRetryCount > mission.limits.max_retries) {
        const failedTask: TaskRecord = {
          ...task,
          status: 'failed',
          next_retry_at: null,
          last_error: errorMessage,
          updated_at: nowIso,
        };
        tasks[taskId] = failedTask;
        await atomicWriteJson(this.tasksPath(missionId), tasks);
        return {
          retryable: false,
          delay_ms: null,
          next_retry_at: null,
          task: failedTask,
        };
      }

      const delayMs = computeRetryDelayMs(
        nextRetryCount,
        mission.limits.retry_base_delay_ms,
        mission.limits.retry_backoff_factor,
      );
      const nextRetryAt = new Date(nowMs + delayMs).toISOString();
      const pausedTask: TaskRecord = {
        ...task,
        status: 'paused',
        retry_count: nextRetryCount,
        next_retry_at: nextRetryAt,
        last_error: errorMessage,
        updated_at: nowIso,
      };
      tasks[taskId] = pausedTask;
      await atomicWriteJson(this.tasksPath(missionId), tasks);
      return {
        retryable: true,
        delay_ms: delayMs,
        next_retry_at: nextRetryAt,
        task: pausedTask,
      };
    });

    const ledgerActor: ActorContext =
      actor.role === 'orchestrator' || actor.role === 'owner'
        ? actor
        : { agent: 'task-manager', role: 'orchestrator' };

    await this.ledger.append(ledgerActor, {
      mission_id: missionId,
      task_id: taskId,
      stage: result.task.stage,
      category: 'checkpoints_recovery',
      epistemic_tag: 'observation',
      evidence_links: [],
      payload: {
        task_id: taskId,
        stage: result.task.stage,
        event: result.retryable ? 'retry_scheduled' : 'escalated',
        recovery_instructions: result.retryable
          ? `Retry #${result.task.retry_count} scheduled at ${result.next_retry_at} after: ${errorMessage}`
          : `Max retries (${mission.limits.max_retries}) exhausted; escalate or switch fallback model. Last error: ${errorMessage}`,
      },
    });

    return result;
  }
}
