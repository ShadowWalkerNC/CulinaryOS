import * as path from 'node:path';
import {
  type ActorContext,
  IndependentReviewRequiredError,
  InvalidStageTransitionError,
  MissingStageCheckpointError,
  STAGES,
  type StageId,
  type TaskRecord,
  UnauthorizedActionError,
  ValidationError,
} from '../types.js';
import {
  assertSafeIdentifier,
  assertValidActorContext,
  atomicWriteJson,
  readJsonSafe,
} from '../storage/atomic-fs.js';
import { withStoreLock } from '../storage/lock.js';
import { CheckpointStore } from '../checkpoints/checkpoint-store.js';
import { GovernanceGuard } from '../governance/permissions.js';
import { type LedgerEntry } from '../ledger/categories.js';
import { IntelligenceLedger } from '../ledger/intelligence-ledger.js';

export interface AdvanceStageInput {
  mission_id: string;
  task_id: string;
  from_stage: StageId;
  to_stage: StageId;
  checkpoint_id: string;
  approval_id?: string | undefined;
  independent_reviewer_agent?: string | undefined;
}

export class StageMachine {
  private readonly dataDir: string;
  private readonly checkpoints: CheckpointStore;
  private readonly governance: GovernanceGuard;
  private readonly ledger: IntelligenceLedger;

  constructor(
    dataDir: string,
    deps?: {
      checkpoints?: CheckpointStore | undefined;
      governance?: GovernanceGuard | undefined;
      ledger?: IntelligenceLedger | undefined;
    },
  ) {
    this.dataDir = dataDir;
    this.governance = deps?.governance ?? new GovernanceGuard(dataDir);
    this.ledger = deps?.ledger ?? new IntelligenceLedger(dataDir, this.governance);
    this.checkpoints = deps?.checkpoints ?? new CheckpointStore(dataDir, this.ledger, this.governance);
  }

  private tasksPath(missionId: string): string {
    assertSafeIdentifier(missionId, 'mission_id');
    return path.join(this.dataDir, 'missions', missionId, 'tasks.json');
  }

  public async advanceStage(actor: ActorContext, input: AdvanceStageInput): Promise<TaskRecord> {
    assertValidActorContext(actor);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ValidationError('advanceStage input must be an object');
    }
    assertSafeIdentifier(input.mission_id, 'mission_id');
    assertSafeIdentifier(input.task_id, 'task_id');
    if (typeof input.checkpoint_id !== 'string' || input.checkpoint_id.trim().length === 0) {
      throw new ValidationError('checkpoint_id must be a non-empty string');
    }
    if (
      input.independent_reviewer_agent !== undefined &&
      typeof input.independent_reviewer_agent !== 'string'
    ) {
      throw new ValidationError('independent_reviewer_agent must be a string when provided');
    }
    if (actor.role !== 'orchestrator' && actor.role !== 'owner') {
      await this.governance.recordAudit(
        input.mission_id,
        actor,
        'advance_stage',
        'denied',
        `Role "${actor.role}" is not permitted to advance stages; orchestrator or owner required`,
        input.task_id,
      );
      throw new UnauthorizedActionError(
        `Role "${actor.role}" cannot advance task stages; orchestrator or owner required`,
      );
    }

    const fromIdx = STAGES.indexOf(input.from_stage);
    const toIdx = STAGES.indexOf(input.to_stage);
    if (fromIdx < 0 || toIdx < 0) {
      throw new InvalidStageTransitionError(input.from_stage, input.to_stage, 'Unknown stage');
    }
    if (toIdx !== fromIdx + 1) {
      throw new InvalidStageTransitionError(
        input.from_stage,
        input.to_stage,
        'Stages must advance strictly one stage at a time without skipping or rewinding',
      );
    }

    const tasksSnapshot = await readJsonSafe<Record<string, TaskRecord>>(
      this.tasksPath(input.mission_id),
      {},
    );
    const taskSnapshot = Object.hasOwn(tasksSnapshot, input.task_id)
      ? tasksSnapshot[input.task_id]
      : undefined;
    if (!taskSnapshot) {
      throw new ValidationError(
        `Task "${input.task_id}" not found in mission "${input.mission_id}"`,
      );
    }
    if (
      taskSnapshot.status === 'completed' ||
      taskSnapshot.status === 'cancelled' ||
      taskSnapshot.status === 'failed' ||
      taskSnapshot.status === 'escalated'
    ) {
      throw new ValidationError(
        `Cannot advance stage for terminal task "${input.task_id}" in status "${taskSnapshot.status}"`,
      );
    }
    if (taskSnapshot.stage !== input.from_stage) {
      throw new InvalidStageTransitionError(
        taskSnapshot.stage,
        input.to_stage,
        `Task is currently at ${taskSnapshot.stage}, not ${input.from_stage}`,
      );
    }

    // Verify external checkpoint exists on disk for (mission_id, task_id, from_stage, checkpoint_id)
    const latest = await this.checkpoints.getLatestCheckpoint(input.mission_id, input.task_id);
    const history = await this.checkpoints.getCheckpointHistory(input.mission_id, input.task_id);
    const matchedCheckpoint =
      (latest &&
      latest.checkpoint_id === input.checkpoint_id &&
      latest.stage === input.from_stage
        ? latest
        : undefined) ??
      history.find(
        (c) => c.checkpoint_id === input.checkpoint_id && c.stage === input.from_stage,
      );

    if (!matchedCheckpoint) {
      throw new MissingStageCheckpointError(
        input.task_id,
        input.from_stage,
        input.checkpoint_id,
      );
    }

    const ledgerCheckpoints = (
      await this.ledger.query({
        mission_id: input.mission_id,
        categories: ['checkpoints_recovery'],
        task_id: input.task_id,
      })
    ).entries as LedgerEntry<'checkpoints_recovery'>[];
    const matchingLedgerEntries = ledgerCheckpoints.filter(
      (e) =>
        e.stage === input.from_stage &&
        e.payload.event === 'checkpoint_saved' &&
        e.payload.checkpoint_id === matchedCheckpoint.checkpoint_id,
    );
    if (matchingLedgerEntries.length === 0) {
      throw new MissingStageCheckpointError(
        input.task_id,
        input.from_stage,
        input.checkpoint_id,
      );
    }

    // Gate: Entering STAGE_6_REPORTING requires Stage 5 independent review by a distinct agent
    if (input.to_stage === 'STAGE_6_REPORTING') {
      const executionStages = new Set<StageId>([
        'STAGE_1_DISCOVERY',
        'STAGE_2_PREPARATION',
        'STAGE_3_EXECUTION',
        'STAGE_4_EVALUATION',
      ]);
      const executionAgents = new Set<string>();
      const trimmedOwner = taskSnapshot.owner_agent.trim();
      if (trimmedOwner) {
        executionAgents.add(trimmedOwner);
      }

      const ledgerByCheckpointId = new Map<string, LedgerEntry<'checkpoints_recovery'>[]>();
      for (const entry of ledgerCheckpoints) {
        const cpId = entry.payload.checkpoint_id;
        if (cpId && entry.payload.event === 'checkpoint_saved') {
          const list = ledgerByCheckpointId.get(cpId) ?? [];
          list.push(entry);
          ledgerByCheckpointId.set(cpId, list);
        }
        if (
          executionStages.has(entry.stage) &&
          entry.payload.event === 'checkpoint_saved' &&
          entry.actor_role !== 'orchestrator' &&
          entry.actor_role !== 'owner'
        ) {
          const trimmedLedgerActor = entry.actor_agent.trim();
          if (trimmedLedgerActor) {
            executionAgents.add(trimmedLedgerActor);
          }
        }
      }

      const allExecutionCheckpoints = latest ? [...history, latest] : history;
      for (const cp of allExecutionCheckpoints) {
        if (executionStages.has(cp.stage)) {
          const trimmedAgent = cp.agent.trim();
          if (trimmedAgent) {
            executionAgents.add(trimmedAgent);
          }
          const savedBy = cp.saved_by_actor?.trim();
          if (savedBy) {
            const cpLedgerEntries = ledgerByCheckpointId.get(cp.checkpoint_id) ?? [];
            const savedOnlyByCoordinator =
              cpLedgerEntries.length > 0 &&
              cpLedgerEntries.every(
                (e) => e.actor_role === 'orchestrator' || e.actor_role === 'owner',
              );
            if (!savedOnlyByCoordinator) {
              executionAgents.add(savedBy);
            }
          }
        }
      }

      const checkpointReviewer = matchedCheckpoint.agent.trim();
      const checkpointSavedBy = matchedCheckpoint.saved_by_actor?.trim();
      const stage5LedgerEntry = matchingLedgerEntries[matchingLedgerEntries.length - 1]!;
      const ledgerReviewerActor = stage5LedgerEntry.actor_agent.trim();

      if (
        !checkpointReviewer ||
        executionAgents.has(checkpointReviewer) ||
        (checkpointSavedBy !== undefined &&
          (!checkpointSavedBy || executionAgents.has(checkpointSavedBy))) ||
        !ledgerReviewerActor ||
        executionAgents.has(ledgerReviewerActor) ||
        (checkpointSavedBy !== undefined && checkpointSavedBy !== ledgerReviewerActor) ||
        (stage5LedgerEntry.actor_role !== 'orchestrator' &&
          stage5LedgerEntry.actor_role !== 'owner' &&
          ledgerReviewerActor !== checkpointReviewer)
      ) {
        throw new IndependentReviewRequiredError(
          `Advancing to STAGE_6_REPORTING requires STAGE_5_INDEPENDENT_REVIEW by a distinct reviewer (execution agents: [${Array.from(executionAgents).join(', ')}], checkpoint agent: "${checkpointReviewer}", saved_by_actor: "${checkpointSavedBy ?? ''}", ledger actor: "${ledgerReviewerActor}")`,
        );
      }

      if (input.independent_reviewer_agent !== undefined) {
        const providedReviewer = input.independent_reviewer_agent.trim();
        if (!providedReviewer || providedReviewer !== checkpointReviewer) {
          throw new IndependentReviewRequiredError(
            `Provided independent_reviewer_agent "${input.independent_reviewer_agent}" does not match Stage 5 checkpoint agent "${checkpointReviewer}"`,
          );
        }
      }
    }

    // Gate: Entering STAGE_7_FIX_AND_RETEST requires valid owner ProductionFixApproval
    if (input.to_stage === 'STAGE_7_FIX_AND_RETEST') {
      await this.governance.assertValidProductionFixApproval(
        input.mission_id,
        input.approval_id ?? taskSnapshot.approval_id,
        actor,
      );
    }

    return withStoreLock(this.dataDir, `tasks_${input.mission_id}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(input.mission_id),
        {},
      );
      const task = Object.hasOwn(tasks, input.task_id) ? tasks[input.task_id] : undefined;
      if (!task) {
        throw new ValidationError(`Task "${input.task_id}" not found`);
      }
      if (
        task.status === 'completed' ||
        task.status === 'cancelled' ||
        task.status === 'failed' ||
        task.status === 'escalated'
      ) {
        throw new ValidationError(
          `Cannot advance stage for terminal task "${input.task_id}" in status "${task.status}"`,
        );
      }
      if (task.stage !== input.from_stage) {
        throw new InvalidStageTransitionError(task.stage, input.to_stage, 'Concurrent stage mismatch');
      }
      const next: TaskRecord = {
        ...task,
        stage: input.to_stage,
        approval_id: input.approval_id ?? task.approval_id,
        updated_at: new Date().toISOString(),
      };
      tasks[input.task_id] = next;
      await atomicWriteJson(this.tasksPath(input.mission_id), tasks);
      return next;
    });
  }
}
