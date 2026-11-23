import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  type ActorContext,
  IndependentReviewRequiredError,
  InvalidStageTransitionError,
  MissingApprovalGateError,
  MissingStageCheckpointError,
  type StageId,
  UnauthorizedActionError,
  ValidationError,
  createAgentCenter,
  mkTempDataDir,
  readJsonlSafe,
} from '../src/index.js';

const OWNER: ActorContext = { agent: 'nathaniel', role: 'owner' };
const ORCH: ActorContext = { agent: 'orch-1', role: 'orchestrator' };
const MUSE: ActorContext = { agent: 'muse-1', role: 'muse_visual_tester', provider: 'meta', model: 'muse-spark-1.3' };
const CLAUDE: ActorContext = { agent: 'claude-1', role: 'claude_tech_auditor', provider: 'anthropic', model: 'claude-opus-5-5-high' };

describe('Mandatory 7-Stage Machine & External Durable Checkpoints', () => {
  it('enforces sequential stage transitions, external checkpoints, independent review, Stage 7 owner approval, and heartbeat stall detection', async () => {
    const dir = await mkTempDataDir('ac-stages-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, { title: '7-Stage Gate Test' });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'stage-flow',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Full 7-stage mission',
        acceptance_criteria: ['All 7 stages gated'],
        budget_allocation_usd: 5.0,
        auto_dispatch: true,
      });

      const makeCheckpoint = async (
        actor: ActorContext,
        stage: StageId,
        heartbeatUtc = '2026-11-22T12:00:00.000Z',
      ) =>
        ac.checkpoints.saveCheckpoint(actor, {
          mission_id: mission.mission_id,
          task_id: task.task_id,
          stage,
          agent: actor.agent,
          model: actor.model ?? 'muse-spark-1.3',
          provider: actor.provider ?? 'meta',
          environment: {
            target_mode: 'rust_standalone',
            urls: ['http://127.0.0.1:38301'],
            port: 38301,
          },
          completed_work: [`Completed ${stage}`],
          observations: [
            {
              step: `${stage}-step-1`,
              status: 'ok',
              detail: 'Verified step',
              duration_ms: 150,
              clicks: 2,
              timestamp_utc: heartbeatUtc,
            },
          ],
          evidence_links: [`evidence/${stage}.png`],
          unresolved_problems: [],
          current_spending: {
            mission_spent_usd: 1.5,
            task_spent_usd: 1.5,
            remaining_operational_usd: 16.5,
            remaining_total_usd: 18.5,
            cost_basis: 'actual',
            billing_type: 'metered_api',
          },
          recovery_instructions: `Resume from ${stage} on :38301`,
          heartbeat_utc: heartbeatUtc,
        });

      // Missing mandatory recovery_instructions rejected
      await assert.rejects(
        () =>
          ac.checkpoints.saveCheckpoint(MUSE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_1_DISCOVERY',
            agent: MUSE.agent,
            model: 'muse-spark-1.3',
            provider: 'meta',
            environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
            completed_work: [],
            observations: [],
            evidence_links: [],
            unresolved_problems: [],
            current_spending: {
              mission_spent_usd: 0,
              task_spent_usd: 0,
              remaining_operational_usd: 18,
              remaining_total_usd: 20,
              cost_basis: 'actual',
              billing_type: 'metered_api',
            },
            recovery_instructions: '   ',
            heartbeat_utc: '2026-11-22T12:00:00.000Z',
          }),
        ValidationError,
      );

      // Cannot skip Stage 1 -> Stage 3
      const chk1 = await makeCheckpoint(MUSE, 'STAGE_1_DISCOVERY');
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_1_DISCOVERY',
            to_stage: 'STAGE_3_EXECUTION',
            checkpoint_id: chk1.checkpoint_id,
          }),
        InvalidStageTransitionError,
      );

      // Cannot advance without a real checkpoint on disk
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_1_DISCOVERY',
            to_stage: 'STAGE_2_PREPARATION',
            checkpoint_id: 'CHK-NONEXISTENT',
          }),
        MissingStageCheckpointError,
      );

      // Advance 1 -> 2 -> 3 -> 4 -> 5 sequentially
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_1_DISCOVERY',
        to_stage: 'STAGE_2_PREPARATION',
        checkpoint_id: chk1.checkpoint_id,
      });
      const chk2 = await makeCheckpoint(MUSE, 'STAGE_2_PREPARATION');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_2_PREPARATION',
        to_stage: 'STAGE_3_EXECUTION',
        checkpoint_id: chk2.checkpoint_id,
      });
      const chk3 = await makeCheckpoint(MUSE, 'STAGE_3_EXECUTION');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_3_EXECUTION',
        to_stage: 'STAGE_4_EVALUATION',
        checkpoint_id: chk3.checkpoint_id,
      });
      const chk4 = await makeCheckpoint(MUSE, 'STAGE_4_EVALUATION');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_4_EVALUATION',
        to_stage: 'STAGE_5_INDEPENDENT_REVIEW',
        checkpoint_id: chk4.checkpoint_id,
      });

      // Stage 5 -> Stage 6 rejected if reviewer is same as Stage 3 execution agent
      const chk5SameAgent = await makeCheckpoint(MUSE, 'STAGE_5_INDEPENDENT_REVIEW');
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
            to_stage: 'STAGE_6_REPORTING',
            checkpoint_id: chk5SameAgent.checkpoint_id,
          }),
        IndependentReviewRequiredError,
      );

      // Independent reviewer (CLAUDE) checkpoint allows Stage 5 -> Stage 6
      const chk5Independent = await makeCheckpoint(CLAUDE, 'STAGE_5_INDEPENDENT_REVIEW');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
        to_stage: 'STAGE_6_REPORTING',
        checkpoint_id: chk5Independent.checkpoint_id,
      });

      // Stage 6 -> Stage 7 blocked without owner approval_id
      const chk6 = await makeCheckpoint(CLAUDE, 'STAGE_6_REPORTING', '2026-11-22T12:00:00.000Z');
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_6_REPORTING',
            to_stage: 'STAGE_7_FIX_AND_RETEST',
            checkpoint_id: chk6.checkpoint_id,
          }),
        MissingApprovalGateError,
      );

      // Owner issues approval -> Stage 6 -> Stage 7 succeeds
      const approval = await ac.governance.issueProductionFixApproval(OWNER, {
        mission_id: mission.mission_id,
        scope: 'Approve authorized Stage 7 fix',
        target_defect_ids: ['DEF-101'],
        worktree_branch: 'fix/def-101',
      });
      const stage7Task = await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_6_REPORTING',
        to_stage: 'STAGE_7_FIX_AND_RETEST',
        checkpoint_id: chk6.checkpoint_id,
        approval_id: approval.approval_id,
      });
      assert.equal(stage7Task.stage, 'STAGE_7_FIX_AND_RETEST');

      // Checkpoint history persisted externally
      const history = await ac.checkpoints.getCheckpointHistory(mission.mission_id, task.task_id);
      assert.equal(history.length, 7);

      // Stall detection & touchHeartbeat
      const stalled = await ac.checkpoints.findStalledTasks(
        mission.mission_id,
        60_000,
        '2026-11-22T12:05:00.000Z',
      );
      assert.equal(stalled.length, 1);
      assert.equal(stalled[0]?.task_id, task.task_id);

      await ac.checkpoints.touchHeartbeat(
        CLAUDE,
        mission.mission_id,
        task.task_id,
        '2026-11-22T12:04:45.000Z',
      );
      const notStalled = await ac.checkpoints.findStalledTasks(
        mission.mission_id,
        60_000,
        '2026-11-22T12:05:00.000Z',
      );
      assert.equal(notStalled.length, 0);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('blocks Stage 5->6 reviewer spoofing, enforces advanceStage role gate, and rejects NaN/null checkpoint fields', async () => {
    const dir = await mkTempDataDir('ac-stages-remed-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, { title: 'Stage Spoof & Checkpoint Validation' });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'spoof-test',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Stage spoof check',
        acceptance_criteria: ['No spoof allowed'],
        budget_allocation_usd: 3.0,
        auto_dispatch: true,
      });

      const validSpending = {
        mission_spent_usd: 0.5,
        task_spent_usd: 0.5,
        remaining_operational_usd: 17.5,
        remaining_total_usd: 19.5,
        cost_basis: 'actual' as const,
        billing_type: 'metered_api' as const,
      };

      // Reject NaN/Infinity/negative spending, invalid enums, and explicit null heartbeat_utc
      await assert.rejects(
        () =>
          ac.checkpoints.saveCheckpoint(MUSE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_1_DISCOVERY',
            agent: MUSE.agent,
            model: 'muse-spark-1.3',
            provider: 'meta',
            environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
            completed_work: [],
            observations: [],
            evidence_links: [],
            unresolved_problems: [],
            current_spending: { ...validSpending, mission_spent_usd: Number.NaN },
            recovery_instructions: 'Recover',
          }),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.checkpoints.saveCheckpoint(MUSE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_1_DISCOVERY',
            agent: MUSE.agent,
            model: 'muse-spark-1.3',
            provider: 'meta',
            environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
            completed_work: [],
            observations: [],
            evidence_links: [],
            unresolved_problems: [],
            current_spending: { ...validSpending, cost_basis: undefined as unknown as 'actual' },
            recovery_instructions: 'Recover',
          }),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.checkpoints.saveCheckpoint(MUSE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_1_DISCOVERY',
            agent: MUSE.agent,
            model: 'muse-spark-1.3',
            provider: 'meta',
            environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
            completed_work: [],
            observations: [],
            evidence_links: [],
            unresolved_problems: [],
            current_spending: validSpending,
            recovery_instructions: 'Recover',
            heartbeat_utc: null as unknown as string,
          }),
        ValidationError,
      );

      const save = (actor: ActorContext, stage: StageId) =>
        ac.checkpoints.saveCheckpoint(actor, {
          mission_id: mission.mission_id,
          task_id: task.task_id,
          stage,
          agent: actor.agent,
          model: actor.model ?? 'muse-spark-1.3',
          provider: actor.provider ?? 'meta',
          environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
          completed_work: [stage],
          observations: [],
          evidence_links: [],
          unresolved_problems: [],
          current_spending: validSpending,
          recovery_instructions: `Recover ${stage}`,
        });

      const c1 = await save(MUSE, 'STAGE_1_DISCOVERY');

      // Non-orchestrator/non-owner cannot invoke advanceStage (and logs governance audit)
      await assert.rejects(
        () =>
          ac.stages.advanceStage(MUSE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_1_DISCOVERY',
            to_stage: 'STAGE_2_PREPARATION',
            checkpoint_id: c1.checkpoint_id,
          }),
        UnauthorizedActionError,
      );
      const audits = await readJsonlSafe<{ action: string; outcome: string; actor_agent: string }>(
        path.join(dir, 'missions', mission.mission_id, 'governance_audit.jsonl'),
      );
      assert.ok(
        audits.some(
          (a) => a.action === 'advance_stage' && a.outcome === 'denied' && a.actor_agent === MUSE.agent,
        ),
      );

      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_1_DISCOVERY',
        to_stage: 'STAGE_2_PREPARATION',
        checkpoint_id: c1.checkpoint_id,
      });
      const c2 = await save(MUSE, 'STAGE_2_PREPARATION');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_2_PREPARATION',
        to_stage: 'STAGE_3_EXECUTION',
        checkpoint_id: c2.checkpoint_id,
      });
      const c3 = await save(MUSE, 'STAGE_3_EXECUTION');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_3_EXECUTION',
        to_stage: 'STAGE_4_EVALUATION',
        checkpoint_id: c3.checkpoint_id,
      });
      const c4 = await save(MUSE, 'STAGE_4_EVALUATION');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_4_EVALUATION',
        to_stage: 'STAGE_5_INDEPENDENT_REVIEW',
        checkpoint_id: c4.checkpoint_id,
      });

      // Stage 5 self-checkpoint CANNOT be bypassed via independent_reviewer_agent spoof param
      const c5Self = await save(MUSE, 'STAGE_5_INDEPENDENT_REVIEW');
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
            to_stage: 'STAGE_6_REPORTING',
            checkpoint_id: c5Self.checkpoint_id,
            independent_reviewer_agent: CLAUDE.agent,
          }),
        IndependentReviewRequiredError,
      );

      // Mismatched independent_reviewer_agent against valid independent checkpoint also rejected
      const c5Real = await save(CLAUDE, 'STAGE_5_INDEPENDENT_REVIEW');
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
            to_stage: 'STAGE_6_REPORTING',
            checkpoint_id: c5Real.checkpoint_id,
            independent_reviewer_agent: 'gemini-1',
          }),
        IndependentReviewRequiredError,
      );

      // Matching independent_reviewer_agent succeeds
      const s6 = await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
        to_stage: 'STAGE_6_REPORTING',
        checkpoint_id: c5Real.checkpoint_id,
        independent_reviewer_agent: CLAUDE.agent,
      });
      assert.equal(s6.stage, 'STAGE_6_REPORTING');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('blocks Stage 5->6 via whitespace or multi-checkpoint Stage 3 agents, rejects advanceStage on terminal tasks, and validates findStalledTasks inputs', async () => {
    const dir = await mkTempDataDir('ac-stages-iter3-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, { title: 'Stage Multi-Checkpoint & Terminal Test' });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'multi-stage3',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Multi-checkpoint Stage 3 guard',
        acceptance_criteria: ['All Stage 3 actors excluded from Stage 5 review'],
        budget_allocation_usd: 3.0,
        auto_dispatch: true,
      });

      const validSpending = {
        mission_spent_usd: 0.2,
        task_spent_usd: 0.2,
        remaining_operational_usd: 17.8,
        remaining_total_usd: 19.8,
        cost_basis: 'actual' as const,
        billing_type: 'metered_api' as const,
      };
      const saveWithAgent = (agent: string, stage: StageId) =>
        ac.checkpoints.saveCheckpoint(
          { agent, role: 'muse_visual_tester', provider: 'meta', model: 'muse-spark-1.3' },
          {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage,
            agent,
            model: 'muse-spark-1.3',
            provider: 'meta',
            environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
            completed_work: [stage],
            observations: [],
            evidence_links: [],
            unresolved_problems: [],
            current_spending: validSpending,
            recovery_instructions: `Recover ${stage}`,
          },
        );

      const c1 = await saveWithAgent('muse-1', 'STAGE_1_DISCOVERY');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_1_DISCOVERY',
        to_stage: 'STAGE_2_PREPARATION',
        checkpoint_id: c1.checkpoint_id,
      });
      const c2 = await saveWithAgent('muse-1', 'STAGE_2_PREPARATION');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_2_PREPARATION',
        to_stage: 'STAGE_3_EXECUTION',
        checkpoint_id: c2.checkpoint_id,
      });

      // Multiple Stage 3 checkpoints: helper-1 and padded "muse-1 "
      await saveWithAgent('helper-1', 'STAGE_3_EXECUTION');
      const c3Padded = await saveWithAgent('muse-1 ', 'STAGE_3_EXECUTION');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_3_EXECUTION',
        to_stage: 'STAGE_4_EVALUATION',
        checkpoint_id: c3Padded.checkpoint_id,
      });
      const c4 = await saveWithAgent('muse-1', 'STAGE_4_EVALUATION');
      await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_4_EVALUATION',
        to_stage: 'STAGE_5_INDEPENDENT_REVIEW',
        checkpoint_id: c4.checkpoint_id,
      });

      // Both "muse-1" (padded in Stage 3 + owner) and "helper-1" (earlier Stage 3 checkpoint) must be blocked
      const c5Muse = await saveWithAgent('muse-1', 'STAGE_5_INDEPENDENT_REVIEW');
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
            to_stage: 'STAGE_6_REPORTING',
            checkpoint_id: c5Muse.checkpoint_id,
          }),
        IndependentReviewRequiredError,
      );

      const c5Helper = await saveWithAgent('helper-1 ', 'STAGE_5_INDEPENDENT_REVIEW');
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
            to_stage: 'STAGE_6_REPORTING',
            checkpoint_id: c5Helper.checkpoint_id,
          }),
        IndependentReviewRequiredError,
      );

      // Independent third-party reviewer succeeds
      const c5Independent = await saveWithAgent(CLAUDE.agent, 'STAGE_5_INDEPENDENT_REVIEW');
      const s6 = await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
        to_stage: 'STAGE_6_REPORTING',
        checkpoint_id: c5Independent.checkpoint_id,
        independent_reviewer_agent: CLAUDE.agent,
      });
      assert.equal(s6.stage, 'STAGE_6_REPORTING');

      // findStalledTasks rejects invalid nowUtc and invalid staleThresholdMs
      await assert.rejects(
        () => ac.checkpoints.findStalledTasks(mission.mission_id, 60_000, 'not-an-iso-date'),
        ValidationError,
      );
      await assert.rejects(
        () => ac.checkpoints.findStalledTasks(mission.mission_id, 60_000, '   '),
        ValidationError,
      );
      await assert.rejects(
        () => ac.checkpoints.findStalledTasks(mission.mission_id, -1),
        ValidationError,
      );
      await assert.rejects(
        () => ac.checkpoints.findStalledTasks(mission.mission_id, Number.NaN),
        ValidationError,
      );

      // Terminal task cannot advanceStage
      const cancelledTask = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'cancel-advance',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Cancelled task',
        acceptance_criteria: ['Cannot advance'],
        budget_allocation_usd: 1.0,
      });
      const chkCancelled = await ac.checkpoints.saveCheckpoint(MUSE, {
        mission_id: mission.mission_id,
        task_id: cancelledTask.task_id,
        stage: 'STAGE_1_DISCOVERY',
        agent: MUSE.agent,
        model: 'muse-spark-1.3',
        provider: 'meta',
        environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
        completed_work: [],
        observations: [],
        evidence_links: [],
        unresolved_problems: [],
        current_spending: validSpending,
        recovery_instructions: 'None',
      });
      await ac.tasks.cancelTask(ORCH, mission.mission_id, cancelledTask.task_id, 'Aborted');
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: cancelledTask.task_id,
            from_stage: 'STAGE_1_DISCOVERY',
            to_stage: 'STAGE_2_PREPARATION',
            checkpoint_id: chkCancelled.checkpoint_id,
          }),
        ValidationError,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects blank/non-string actor.agent with zero disk writes across CheckpointStore/StageMachine and enforces strict ISO-8601 dates without rollover', async () => {
    const dir = await mkTempDataDir('ac-stages-iter4-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, { title: 'Iter4 Checkpoint Actor & Strict ISO' });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'strict-iso',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Strict ISO & Actor Guard',
        acceptance_criteria: ['Zero partial writes'],
        budget_allocation_usd: 2.0,
        auto_dispatch: true,
      });

      const validSpending = {
        mission_spent_usd: 0.1,
        task_spent_usd: 0.1,
        remaining_operational_usd: 17.9,
        remaining_total_usd: 19.9,
        cost_basis: 'actual' as const,
        billing_type: 'metered_api' as const,
      };

      // Blank and undefined actor.agent on saveCheckpoint leaves zero checkpoint files & empty task.checkpoint_history
      const badActors: ActorContext[] = [
        { agent: '   ', role: 'muse_visual_tester' },
        { agent: undefined as unknown as string, role: 'muse_visual_tester' },
        null as unknown as ActorContext,
      ];
      for (const badActor of badActors) {
        await assert.rejects(
          () =>
            ac.checkpoints.saveCheckpoint(badActor, {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_1_DISCOVERY',
              agent: MUSE.agent,
              model: 'muse-spark-1.3',
              provider: 'meta',
              environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
              completed_work: ['Step'],
              observations: [],
              evidence_links: [],
              unresolved_problems: [],
              current_spending: validSpending,
              recovery_instructions: 'Resume',
            }),
          ValidationError,
        );
      }
      assert.equal(await ac.checkpoints.getLatestCheckpoint(mission.mission_id, task.task_id), null);
      assert.equal((await ac.checkpoints.getCheckpointHistory(mission.mission_id, task.task_id)).length, 0);
      assert.equal((await ac.tasks.getTask(mission.mission_id, task.task_id))?.checkpoint_history.length, 0);

      // Strict ISO-8601 date validation rejects non-ISO and calendar rollover timestamps
      for (const badDate of [
        '0',
        'May 1, 2026',
        '2026-02-31T00:00:00Z',
        '2025-02-29T12:00:00Z',
        '2026-11-22T12:00:00',
        '2026-11-22',
      ]) {
        await assert.rejects(
          () => ac.checkpoints.findStalledTasks(mission.mission_id, 60_000, badDate),
          ValidationError,
        );
        await assert.rejects(
          () =>
            ac.checkpoints.saveCheckpoint(MUSE, {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_1_DISCOVERY',
              agent: MUSE.agent,
              model: 'muse-spark-1.3',
              provider: 'meta',
              environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
              completed_work: ['Step'],
              observations: [],
              evidence_links: [],
              unresolved_problems: [],
              current_spending: validSpending,
              recovery_instructions: 'Resume',
              heartbeat_utc: badDate,
            }),
          ValidationError,
        );
        await assert.rejects(
          () => ac.checkpoints.touchHeartbeat(MUSE, mission.mission_id, task.task_id, badDate),
          ValidationError,
        );
      }

      // Valid leap-day and timezone offset ISO-8601 timestamps accepted
      const chk = await ac.checkpoints.saveCheckpoint(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_1_DISCOVERY',
        agent: MUSE.agent,
        model: 'muse-spark-1.3',
        provider: 'meta',
        environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
        completed_work: ['Step'],
        observations: [],
        evidence_links: [],
        unresolved_problems: [],
        current_spending: validSpending,
        recovery_instructions: 'Resume',
        heartbeat_utc: '2024-02-29T12:00:00Z',
      });
      assert.equal(chk.heartbeat_utc, '2024-02-29T12:00:00Z');

      await assert.rejects(
        () => ac.checkpoints.touchHeartbeat({ agent: '   ', role: 'muse_visual_tester' }, mission.mission_id, task.task_id),
        ValidationError,
      );
      const touched = await ac.checkpoints.touchHeartbeat(
        MUSE,
        mission.mission_id,
        task.task_id,
        '2026-11-22T12:00:00-05:00',
      );
      assert.equal(touched?.heartbeat_utc, '2026-11-22T12:00:00-05:00');

      // advanceStage rejects blank/non-string actor.agent before touching task stage
      await assert.rejects(
        () =>
          ac.stages.advanceStage(
            { agent: '   ', role: 'orchestrator' },
            {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              from_stage: 'STAGE_1_DISCOVERY',
              to_stage: 'STAGE_2_PREPARATION',
              checkpoint_id: chk.checkpoint_id,
            },
          ),
        ValidationError,
      );
      assert.equal((await ac.tasks.getTask(mission.mission_id, task.task_id))?.stage, 'STAGE_1_DISCOVERY');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('prevents Stage 5->6 spoofing (4A), rejects unauthorized saveCheckpoint role with zero disk writes (4B), and keeps touchHeartbeat no-op when missing', async () => {
    const dir = await mkTempDataDir('ac-stages-iter5-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, { title: 'Iter5 4A/4B Remediation' });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'iter5-4a-4b',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Stage 5->6 spoof & role gate',
        acceptance_criteria: ['4A and 4B enforced'],
        budget_allocation_usd: 3.0,
        auto_dispatch: true,
      });

      const validSpending = {
        mission_spent_usd: 0.25,
        task_spent_usd: 0.25,
        remaining_operational_usd: 17.75,
        remaining_total_usd: 19.75,
        cost_basis: 'actual' as const,
        billing_type: 'metered_api' as const,
      };
      const baseCheckpointInput = (stage: StageId, agent: string) => ({
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage,
        agent,
        model: 'muse-spark-1.3',
        provider: 'meta' as const,
        environment: { target_mode: 'rust_standalone' as const, urls: ['http://127.0.0.1:38301'] },
        completed_work: [stage],
        observations: [],
        evidence_links: [],
        unresolved_problems: [],
        current_spending: validSpending,
        recovery_instructions: `Resume ${stage}`,
      });

      // Null/malformed inputs throw ValidationError without TypeError
      await assert.rejects(
        () => ac.checkpoints.saveCheckpoint(MUSE, null as unknown as Parameters<typeof ac.checkpoints.saveCheckpoint>[1]),
        ValidationError,
      );
      await assert.rejects(
        () => ac.stages.advanceStage(ORCH, null as unknown as Parameters<typeof ac.stages.advanceStage>[1]),
        ValidationError,
      );

      // touchHeartbeat with no existing checkpoint returns null and does NOT mutate task.updated_at
      const beforeTouchTask = await ac.tasks.getTask(mission.mission_id, task.task_id);
      const touchedMissing = await ac.checkpoints.touchHeartbeat(
        MUSE,
        mission.mission_id,
        task.task_id,
        '2026-11-22T12:00:00Z',
      );
      assert.equal(touchedMissing, null);
      const afterTouchTask = await ac.tasks.getTask(mission.mission_id, task.task_id);
      assert.equal(afterTouchTask?.updated_at, beforeTouchTask?.updated_at);

      // 4B: Unauthorized/bogus actor.role throws UnauthorizedActionError BEFORE creating checkpoint files or mutating tasks.json
      await assert.rejects(
        () =>
          ac.checkpoints.saveCheckpoint(
            { agent: 'rogue', role: 'bogus_role' as ActorContext['role'] },
            baseCheckpointInput('STAGE_1_DISCOVERY', 'rogue'),
          ),
        UnauthorizedActionError,
      );
      assert.equal(await ac.checkpoints.getLatestCheckpoint(mission.mission_id, task.task_id), null);
      assert.equal((await ac.checkpoints.getCheckpointHistory(mission.mission_id, task.task_id)).length, 0);
      assert.equal((await ac.tasks.getTask(mission.mission_id, task.task_id))?.checkpoint_history.length, 0);
      const chkFile = path.join(dir, 'missions', mission.mission_id, 'checkpoints', `${task.task_id}.json`);
      const histFile = path.join(dir, 'missions', mission.mission_id, 'checkpoints', `${task.task_id}.history.jsonl`);
      await assert.rejects(() => fs.stat(chkFile));
      await assert.rejects(() => fs.stat(histFile));

      // Advance cleanly through Stage 1 -> Stage 5
      for (const [fromStage, toStage] of [
        ['STAGE_1_DISCOVERY', 'STAGE_2_PREPARATION'],
        ['STAGE_2_PREPARATION', 'STAGE_3_EXECUTION'],
        ['STAGE_3_EXECUTION', 'STAGE_4_EVALUATION'],
        ['STAGE_4_EVALUATION', 'STAGE_5_INDEPENDENT_REVIEW'],
      ] as Array<[StageId, StageId]>) {
        const cp = await ac.checkpoints.saveCheckpoint(MUSE, baseCheckpointInput(fromStage, MUSE.agent));
        await ac.stages.advanceStage(ORCH, {
          mission_id: mission.mission_id,
          task_id: task.task_id,
          from_stage: fromStage,
          to_stage: toStage,
          checkpoint_id: cp.checkpoint_id,
        });
      }

      // 4A: Execution agent (MUSE) cannot spoof input.agent: 'claude-fake' in saveCheckpoint
      await assert.rejects(
        () =>
          ac.checkpoints.saveCheckpoint(
            MUSE,
            baseCheckpointInput('STAGE_5_INDEPENDENT_REVIEW', 'claude-fake'),
          ),
        UnauthorizedActionError,
      );

      // 4A defense-in-depth: an unlogged orphan Stage 5 checkpoint on disk cannot advance Stage 5->6
      const orphanId = 'CHK-ORPHAN-FORGED';
      const forgedCheckpoint = {
        checkpoint_id: orphanId,
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_5_INDEPENDENT_REVIEW',
        agent: 'claude-fake',
        saved_by_actor: MUSE.agent,
        model: 'claude-opus-5-5-high',
        provider: 'anthropic',
        environment: { target_mode: 'rust_standalone', urls: ['http://127.0.0.1:38301'] },
        completed_work: ['forged'],
        observations: [],
        evidence_links: [],
        unresolved_problems: [],
        current_spending: validSpending,
        recovery_instructions: 'forged',
        heartbeat_utc: '2026-11-22T12:00:00Z',
        created_at: '2026-11-22T12:00:00Z',
      };
      await fs.writeFile(chkFile, JSON.stringify(forgedCheckpoint, null, 2), 'utf8');
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
            to_stage: 'STAGE_6_REPORTING',
            checkpoint_id: orphanId,
          }),
        MissingStageCheckpointError,
      );

      // Legitimate orchestrator-saved Stage 5 checkpoint on behalf of independent reviewer CLAUDE succeeds
      const orchSavedS5 = await ac.checkpoints.saveCheckpoint(ORCH, {
        ...baseCheckpointInput('STAGE_5_INDEPENDENT_REVIEW', CLAUDE.agent),
        model: 'claude-opus-5-5-high',
        provider: 'anthropic',
      });
      assert.equal(orchSavedS5.saved_by_actor, ORCH.agent);

      // Non-string independent_reviewer_agent throws ValidationError instead of TypeError
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
            to_stage: 'STAGE_6_REPORTING',
            checkpoint_id: orchSavedS5.checkpoint_id,
            independent_reviewer_agent: 123 as unknown as string,
          }),
        ValidationError,
      );

      const advanced = await ac.stages.advanceStage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
        to_stage: 'STAGE_6_REPORTING',
        checkpoint_id: orchSavedS5.checkpoint_id,
        independent_reviewer_agent: CLAUDE.agent,
      });
      assert.equal(advanced.stage, 'STAGE_6_REPORTING');

      // Task where orchestrator itself was owner_agent cannot self-certify Stage 5 even via orchestrator role
      const selfOwnedTask = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'orch-owned',
        owner_agent: ORCH.agent,
        role: 'orchestrator',
        provider: 'openai',
        model: 'gpt-6.1-sol',
        title: 'Orch-owned task',
        acceptance_criteria: ['Orch cannot self-certify Stage 5'],
        budget_allocation_usd: 1.0,
      });
      for (const [fromStage, toStage] of [
        ['STAGE_1_DISCOVERY', 'STAGE_2_PREPARATION'],
        ['STAGE_2_PREPARATION', 'STAGE_3_EXECUTION'],
        ['STAGE_3_EXECUTION', 'STAGE_4_EVALUATION'],
        ['STAGE_4_EVALUATION', 'STAGE_5_INDEPENDENT_REVIEW'],
      ] as Array<[StageId, StageId]>) {
        const cp = await ac.checkpoints.saveCheckpoint(ORCH, {
          ...baseCheckpointInput(fromStage, ORCH.agent),
          task_id: selfOwnedTask.task_id,
        });
        await ac.stages.advanceStage(ORCH, {
          mission_id: mission.mission_id,
          task_id: selfOwnedTask.task_id,
          from_stage: fromStage,
          to_stage: toStage,
          checkpoint_id: cp.checkpoint_id,
        });
      }
      const orchSpoofS5 = await ac.checkpoints.saveCheckpoint(ORCH, {
        ...baseCheckpointInput('STAGE_5_INDEPENDENT_REVIEW', 'claude-proxy'),
        task_id: selfOwnedTask.task_id,
      });
      await assert.rejects(
        () =>
          ac.stages.advanceStage(ORCH, {
            mission_id: mission.mission_id,
            task_id: selfOwnedTask.task_id,
            from_stage: 'STAGE_5_INDEPENDENT_REVIEW',
            to_stage: 'STAGE_6_REPORTING',
            checkpoint_id: orchSpoofS5.checkpoint_id,
          }),
        IndependentReviewRequiredError,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
