import * as path from 'node:path';
import {
  AGENT_CENTER_DEFAULTS,
  type ActorContext,
  BILLING_TYPES,
  COST_BASES,
  type CheckpointEnvironment,
  type CheckpointObservation,
  type CheckpointRecord,
  type CheckpointSpendingSnapshot,
  PROVIDER_IDS,
  type ProviderId,
  STAGES,
  type StageId,
  type TaskRecord,
  UnauthorizedActionError,
  ValidationError,
} from '../types.js';
import {
  appendJsonl,
  assertSafeIdentifier,
  assertValidActorContext,
  assertValidIsoDate,
  atomicWriteJson,
  generateId,
  parseStrictIsoDateMs,
  readJsonSafe,
  readJsonlSafe,
} from '../storage/atomic-fs.js';
import { withStoreLock } from '../storage/lock.js';
import { GovernanceGuard } from '../governance/permissions.js';
import { IntelligenceLedger } from '../ledger/intelligence-ledger.js';

export const MAX_CONTEXT_HANDOFF_SUMMARY_CHARS = 14_000;

export interface SaveCheckpointInput {
  checkpoint_id?: string | undefined;
  mission_id: string;
  task_id: string;
  stage: StageId;
  agent: string;
  model: string;
  provider: ProviderId;
  environment: CheckpointEnvironment;
  completed_work: string[];
  completed_steps?: string[] | undefined;
  next_step?: string | undefined;
  context_handoff_summary?: string | undefined;
  worker_pid?: number | undefined;
  attempt_number?: number | undefined;
  observations: CheckpointObservation[];
  evidence_links: string[];
  unresolved_problems: string[];
  current_spending: CheckpointSpendingSnapshot;
  recovery_instructions: string;
  heartbeat_utc?: string | undefined;
}

export interface StalledTaskReport {
  task_id: string;
  mission_id: string;
  owner_agent: string;
  stage: StageId;
  last_heartbeat_utc: string;
  elapsed_ms: number;
  latest_checkpoint_id: string | null;
  recovery_instructions: string | null;
}

function assertNonEmptyString(val: unknown, field: string): void {
  if (typeof val !== 'string' || val.trim().length === 0) {
    throw new ValidationError(`Checkpoint field "${field}" must be a non-empty string`);
  }
}

export function validateCheckpointInput(
  input: SaveCheckpointInput,
  heartbeatUtc: string,
): void {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Checkpoint input must be an object');
  }
  assertSafeIdentifier(input.mission_id, 'mission_id');
  assertSafeIdentifier(input.task_id, 'task_id');
  if (!(STAGES as readonly string[]).includes(input.stage)) {
    throw new ValidationError(`Invalid checkpoint stage "${String(input.stage)}"`);
  }
  assertNonEmptyString(input.agent, 'agent');
  assertNonEmptyString(input.model, 'model');
  assertNonEmptyString(input.provider, 'provider');
  if (!(PROVIDER_IDS as readonly string[]).includes(input.provider)) {
    throw new ValidationError(`Invalid checkpoint provider "${String(input.provider)}"`);
  }

  if (!input.environment || typeof input.environment !== 'object') {
    throw new ValidationError('Checkpoint field "environment" is required');
  }
  assertNonEmptyString(input.environment.target_mode, 'environment.target_mode');
  if (!Array.isArray(input.environment.urls)) {
    throw new ValidationError('Checkpoint field "environment.urls" must be an array');
  }

  if (!Array.isArray(input.completed_work)) {
    throw new ValidationError('Checkpoint field "completed_work" must be an array');
  }
  if (input.completed_steps !== undefined && !Array.isArray(input.completed_steps)) {
    throw new ValidationError('Checkpoint field "completed_steps" must be an array when provided');
  }
  if (input.next_step !== undefined && typeof input.next_step !== 'string') {
    throw new ValidationError('Checkpoint field "next_step" must be a string when provided');
  }
  if (input.context_handoff_summary !== undefined) {
    if (typeof input.context_handoff_summary !== 'string') {
      throw new ValidationError(
        'Checkpoint field "context_handoff_summary" must be a string when provided',
      );
    }
    if (input.context_handoff_summary.length > MAX_CONTEXT_HANDOFF_SUMMARY_CHARS) {
      throw new ValidationError(
        `Checkpoint field "context_handoff_summary" exceeds ${MAX_CONTEXT_HANDOFF_SUMMARY_CHARS} chars (<4k token cap)`,
      );
    }
  }
  if (
    input.worker_pid !== undefined &&
    (typeof input.worker_pid !== 'number' || !Number.isInteger(input.worker_pid) || input.worker_pid <= 0)
  ) {
    throw new ValidationError('Checkpoint field "worker_pid" must be a positive integer');
  }
  if (
    input.attempt_number !== undefined &&
    (typeof input.attempt_number !== 'number' ||
      !Number.isInteger(input.attempt_number) ||
      input.attempt_number < 1)
  ) {
    throw new ValidationError('Checkpoint field "attempt_number" must be a positive integer');
  }
  if (!Array.isArray(input.observations)) {
    throw new ValidationError('Checkpoint field "observations" must be an array');
  }
  if (!Array.isArray(input.evidence_links)) {
    throw new ValidationError('Checkpoint field "evidence_links" must be an array');
  }
  if (!Array.isArray(input.unresolved_problems)) {
    throw new ValidationError('Checkpoint field "unresolved_problems" must be an array');
  }
  if (!input.current_spending || typeof input.current_spending !== 'object') {
    throw new ValidationError('Checkpoint field "current_spending" is required');
  }
  const spendingFields: Array<[keyof CheckpointSpendingSnapshot, unknown]> = [
    ['mission_spent_usd', input.current_spending.mission_spent_usd],
    ['task_spent_usd', input.current_spending.task_spent_usd],
    ['remaining_operational_usd', input.current_spending.remaining_operational_usd],
    ['remaining_total_usd', input.current_spending.remaining_total_usd],
  ];
  for (const [field, val] of spendingFields) {
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
      throw new ValidationError(
        `Checkpoint current_spending.${field} must be a finite non-negative number`,
      );
    }
  }
  if (!(COST_BASES as readonly string[]).includes(input.current_spending.cost_basis)) {
    throw new ValidationError(
      `Checkpoint current_spending.cost_basis must be one of ${COST_BASES.join(', ')}`,
    );
  }
  if (!(BILLING_TYPES as readonly string[]).includes(input.current_spending.billing_type)) {
    throw new ValidationError(
      `Checkpoint current_spending.billing_type must be one of ${BILLING_TYPES.join(', ')}`,
    );
  }

  assertNonEmptyString(input.recovery_instructions, 'recovery_instructions');
  assertValidIsoDate(heartbeatUtc, 'heartbeat_utc');
}

export class CheckpointStore {
  private readonly dataDir: string;
  private readonly ledger: IntelligenceLedger;
  private readonly governance: GovernanceGuard;

  constructor(
    dataDir: string,
    ledger?: IntelligenceLedger,
    governance?: GovernanceGuard,
  ) {
    this.dataDir = dataDir;
    this.governance = governance ?? new GovernanceGuard(dataDir);
    this.ledger = ledger ?? new IntelligenceLedger(dataDir, this.governance);
  }

  private missionDir(missionId: string): string {
    assertSafeIdentifier(missionId, 'mission_id');
    return path.join(this.dataDir, 'missions', missionId);
  }

  private checkpointPath(missionId: string, taskId: string): string {
    assertSafeIdentifier(taskId, 'task_id');
    return path.join(this.missionDir(missionId), 'checkpoints', `${taskId}.json`);
  }

  private checkpointHistoryPath(missionId: string, taskId: string): string {
    assertSafeIdentifier(taskId, 'task_id');
    return path.join(this.missionDir(missionId), 'checkpoints', `${taskId}.history.jsonl`);
  }

  private tasksPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'tasks.json');
  }

  public async saveCheckpoint(
    actor: ActorContext,
    input: SaveCheckpointInput,
  ): Promise<CheckpointRecord> {
    const normalizedActorAgent = assertValidActorContext(actor);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ValidationError('Checkpoint input must be an object');
    }
    if (
      input.checkpoint_id !== undefined &&
      (typeof input.checkpoint_id !== 'string' || input.checkpoint_id.trim().length === 0)
    ) {
      throw new ValidationError('Checkpoint field "checkpoint_id" must be a non-empty string');
    }
    const nowIso = new Date().toISOString();
    const heartbeatUtc = input.heartbeat_utc === undefined ? nowIso : input.heartbeat_utc;
    validateCheckpointInput(input, heartbeatUtc);

    const normalizedInputAgent = input.agent.trim();
    const checkpointId = input.checkpoint_id?.trim() || generateId('CHK');
    const recoveryInstructions = input.recovery_instructions.trim();

    await this.governance.assertLedgerWriteAllowed(
      actor,
      input.mission_id,
      'checkpoints_recovery',
      {
        checkpoint_id: checkpointId,
        task_id: input.task_id,
        stage: input.stage,
        event: 'checkpoint_saved',
        recovery_instructions: recoveryInstructions,
      },
    );

    if (
      actor.role !== 'orchestrator' &&
      actor.role !== 'owner' &&
      normalizedInputAgent !== normalizedActorAgent
    ) {
      await this.governance.recordAudit(
        input.mission_id,
        actor,
        'ledger_write',
        'denied',
        `Agent "${normalizedActorAgent}" (role "${actor.role}") cannot save checkpoint claiming agent "${normalizedInputAgent}"`,
        input.task_id,
      );
      throw new UnauthorizedActionError(
        `Agent "${normalizedActorAgent}" (role "${actor.role}") cannot save a checkpoint claiming agent "${normalizedInputAgent}"`,
      );
    }

    const record: CheckpointRecord = {
      checkpoint_id: checkpointId,
      mission_id: input.mission_id,
      task_id: input.task_id,
      stage: input.stage,
      agent: normalizedInputAgent,
      saved_by_actor: normalizedActorAgent,
      model: input.model.trim(),
      provider: input.provider,
      environment: {
        ...input.environment,
        urls: [...input.environment.urls],
      },
      completed_work: [...input.completed_work],
      ...(input.completed_steps !== undefined
        ? { completed_steps: [...input.completed_steps] }
        : {}),
      ...(input.next_step !== undefined ? { next_step: input.next_step.trim() } : {}),
      ...(input.context_handoff_summary !== undefined
        ? { context_handoff_summary: input.context_handoff_summary }
        : {}),
      ...(input.worker_pid !== undefined ? { worker_pid: input.worker_pid } : {}),
      ...(input.attempt_number !== undefined ? { attempt_number: input.attempt_number } : {}),
      observations: input.observations.map((o) => ({ ...o })),
      evidence_links: [...input.evidence_links],
      unresolved_problems: [...input.unresolved_problems],
      current_spending: { ...input.current_spending },
      recovery_instructions: recoveryInstructions,
      heartbeat_utc: heartbeatUtc,
      created_at: nowIso,
    };

    await withStoreLock(
      this.dataDir,
      `checkpoint_${input.mission_id}_${input.task_id}`,
      async () => {
        await atomicWriteJson(
          this.checkpointPath(input.mission_id, input.task_id),
          record,
        );
        await appendJsonl(
          this.checkpointHistoryPath(input.mission_id, input.task_id),
          record,
        );
      },
    );

    await withStoreLock(this.dataDir, `tasks_${input.mission_id}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(input.mission_id),
        {},
      );
      const task = Object.hasOwn(tasks, input.task_id) ? tasks[input.task_id] : undefined;
      if (task) {
        const nextHistory = task.checkpoint_history.includes(record.checkpoint_id)
          ? task.checkpoint_history
          : [...task.checkpoint_history, record.checkpoint_id];
        tasks[input.task_id] = {
          ...task,
          checkpoint_history: nextHistory,
          updated_at: nowIso,
        };
        await atomicWriteJson(this.tasksPath(input.mission_id), tasks);
      }
    });

    await this.ledger.append(actor, {
      mission_id: input.mission_id,
      task_id: input.task_id,
      stage: input.stage,
      category: 'checkpoints_recovery',
      epistemic_tag: 'observation',
      evidence_links: [...input.evidence_links],
      payload: {
        checkpoint_id: record.checkpoint_id,
        task_id: input.task_id,
        stage: input.stage,
        event: 'checkpoint_saved',
        recovery_instructions: recoveryInstructions,
      },
    });

    return record;
  }

  public async getLatestCheckpoint(
    missionId: string,
    taskId: string,
  ): Promise<CheckpointRecord | null> {
    return readJsonSafe<CheckpointRecord | null>(
      this.checkpointPath(missionId, taskId),
      null,
    );
  }

  public async getCheckpointHistory(
    missionId: string,
    taskId: string,
  ): Promise<CheckpointRecord[]> {
    return readJsonlSafe<CheckpointRecord>(
      this.checkpointHistoryPath(missionId, taskId),
    );
  }

  public async touchHeartbeat(
    actor: ActorContext,
    missionId: string,
    taskId: string,
    nowUtc?: string,
  ): Promise<CheckpointRecord | null> {
    assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    assertSafeIdentifier(taskId, 'task_id');
    const heartbeatIso =
      nowUtc === undefined ? new Date().toISOString() : assertValidIsoDate(nowUtc, 'heartbeat_utc');

    const updatedCheckpoint = await withStoreLock(
      this.dataDir,
      `checkpoint_${missionId}_${taskId}`,
      async () => {
        const latest = await readJsonSafe<CheckpointRecord | null>(
          this.checkpointPath(missionId, taskId),
          null,
        );
        if (!latest) {
          return null;
        }
        const updated: CheckpointRecord = {
          ...latest,
          heartbeat_utc: heartbeatIso,
        };
        await atomicWriteJson(this.checkpointPath(missionId, taskId), updated);
        return updated;
      },
    );

    if (!updatedCheckpoint) {
      return null;
    }

    await withStoreLock(this.dataDir, `tasks_${missionId}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(missionId),
        {},
      );
      const task = Object.hasOwn(tasks, taskId) ? tasks[taskId] : undefined;
      if (task) {
        tasks[taskId] = {
          ...task,
          updated_at: heartbeatIso,
        };
        await atomicWriteJson(this.tasksPath(missionId), tasks);
      }
    });

    return updatedCheckpoint;
  }

  public async findStalledTasks(
    missionId: string,
    staleThresholdMs: number = AGENT_CENTER_DEFAULTS.DEFAULT_STALL_THRESHOLD_MS,
    nowUtc?: string,
  ): Promise<StalledTaskReport[]> {
    assertSafeIdentifier(missionId, 'mission_id');
    if (typeof staleThresholdMs !== 'number' || !Number.isFinite(staleThresholdMs) || staleThresholdMs < 0) {
      throw new ValidationError('staleThresholdMs must be a finite non-negative number');
    }
    const nowMs = nowUtc !== undefined ? parseStrictIsoDateMs(nowUtc, 'now_utc') : Date.now();
    const tasks = await readJsonSafe<Record<string, TaskRecord>>(
      this.tasksPath(missionId),
      {},
    );

    const stalled: StalledTaskReport[] = [];
    for (const task of Object.values(tasks)) {
      if (task.status !== 'in_progress') {
        continue;
      }
      const latest = await this.getLatestCheckpoint(missionId, task.task_id);
      const lastHeartbeatUtc = latest?.heartbeat_utc ?? task.updated_at;
      const lastMs = Date.parse(lastHeartbeatUtc);
      const elapsedMs = nowMs - lastMs;
      if (elapsedMs > staleThresholdMs) {
        stalled.push({
          task_id: task.task_id,
          mission_id: missionId,
          owner_agent: task.owner_agent,
          stage: task.stage,
          last_heartbeat_utc: lastHeartbeatUtc,
          elapsed_ms: elapsedMs,
          latest_checkpoint_id: latest?.checkpoint_id ?? null,
          recovery_instructions: latest?.recovery_instructions ?? null,
        });
      }
    }
    return stalled;
  }
}
