import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {
  type ActorContext,
  CircularDelegationError,
  ConcurrencyLimitError,
  DelegationDepthError,
  DuplicateTaskKeyError,
  RetryLimitExceededError,
  UnauthorizedActionError,
  ValidationError,
  assertNoCycle,
  createAgentCenter,
  mkTempDataDir,
} from '../src/index.js';

const OWNER: ActorContext = { agent: 'nathaniel', role: 'owner' };
const ORCH: ActorContext = { agent: 'orch-1', role: 'orchestrator' };
const MUSE: ActorContext = { agent: 'muse-1', role: 'muse_visual_tester', provider: 'meta', model: 'muse-spark-1.3' };

describe('Task System & Delegation Guards', () => {
  it('enforces max_concurrent_agents=3, duplicate active_task_key, and key reuse after completion', async () => {
    const dir = await mkTempDataDir('ac-tasks-conc-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, { title: 'Concurrency Test' });

      const t1 = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'worker-1',
        owner_agent: 'agent-1',
        role: 'muse_visual_tester',
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Task 1',
        acceptance_criteria: ['Done 1'],
        budget_allocation_usd: 1.0,
        auto_dispatch: true,
      });
      await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'worker-2',
        owner_agent: 'agent-2',
        role: 'gemini_ux_auditor',
        provider: 'google',
        model: 'gemini-4-argon-high',
        title: 'Task 2',
        acceptance_criteria: ['Done 2'],
        budget_allocation_usd: 1.0,
        auto_dispatch: true,
      });
      await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'worker-3',
        owner_agent: 'agent-3',
        role: 'claude_tech_auditor',
        provider: 'anthropic',
        model: 'claude-opus-5-5-high',
        title: 'Task 3',
        acceptance_criteria: ['Done 3'],
        budget_allocation_usd: 1.0,
        auto_dispatch: true,
      });

      // Duplicate active key rejected
      await assert.rejects(
        () =>
          ac.tasks.createRootTask(ORCH, {
            mission_id: mission.mission_id,
            active_task_key: 'WORKER-1',
            owner_agent: 'agent-4',
            role: 'codex_engineer',
            provider: 'openai',
            model: 'gpt-6.1-sol',
            title: 'Duplicate key',
            acceptance_criteria: ['Done'],
            budget_allocation_usd: 1.0,
          }),
        DuplicateTaskKeyError,
      );

      // 4th concurrent active task rejected
      await assert.rejects(
        () =>
          ac.tasks.createRootTask(ORCH, {
            mission_id: mission.mission_id,
            active_task_key: 'worker-4',
            owner_agent: 'agent-4',
            role: 'codex_engineer',
            provider: 'openai',
            model: 'gpt-6.1-sol',
            title: 'Task 4',
            acceptance_criteria: ['Done 4'],
            budget_allocation_usd: 1.0,
            auto_dispatch: true,
          }),
        ConcurrencyLimitError,
      );

      // Complete Task 1 -> slot frees up AND active_task_key 'worker-1' can be reused
      await ac.tasks.completeTask(ORCH, mission.mission_id, t1.task_id);
      const reused = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'worker-1',
        owner_agent: 'agent-4',
        role: 'codex_engineer',
        provider: 'openai',
        model: 'gpt-6.1-sol',
        title: 'Reused key task',
        acceptance_criteria: ['Done reused'],
        budget_allocation_usd: 1.0,
        auto_dispatch: true,
      });
      assert.equal(reused.status, 'in_progress');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('enforces max_delegation_depth=2, specialist approval, and rejects cycles & recursive spawns', async () => {
    const dir = await mkTempDataDir('ac-tasks-depth-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, { title: 'Delegation Test' });

      const root = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'root',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Root discovery',
        acceptance_criteria: ['Discover flows'],
        budget_allocation_usd: 2.0,
        auto_dispatch: true,
      });
      assert.equal(root.delegation_depth, 0);

      // Depth 1 specialist request
      const req1 = await ac.tasks.requestSpecialistSubtask(MUSE, {
        mission_id: mission.mission_id,
        parent_task_id: root.task_id,
        requested_role: 'gemini_ux_auditor',
        requested_provider: 'google',
        requested_model: 'gemini-4-argon-high',
        title: 'UX audit depth 1',
        acceptance_criteria: ['UX evaluated'],
        active_task_key: 'sub-depth-1',
        estimated_cost_usd: 1.0,
        rationale: 'Need UX audit',
      });

      // Worker cannot approve its own request
      await assert.rejects(
        () =>
          ac.tasks.approveSubtaskRequest(MUSE, mission.mission_id, req1.request_id, {
            owner_agent: 'gemini-1',
          }),
        UnauthorizedActionError,
      );

      const { task: child1 } = await ac.tasks.approveSubtaskRequest(
        ORCH,
        mission.mission_id,
        req1.request_id,
        { owner_agent: 'gemini-1', auto_dispatch: false },
      );
      assert.equal(child1.delegation_depth, 1);

      // Depth 2 specialist request
      const req2 = await ac.tasks.requestSpecialistSubtask(
        { agent: 'gemini-1', role: 'gemini_ux_auditor' },
        {
          mission_id: mission.mission_id,
          parent_task_id: child1.task_id,
          requested_role: 'claude_tech_auditor',
          requested_provider: 'anthropic',
          requested_model: 'claude-sonnet-5-5-medium',
          title: 'Security check depth 2',
          acceptance_criteria: ['Auth checked'],
          active_task_key: 'sub-depth-2',
          estimated_cost_usd: 1.0,
          rationale: 'Need security check',
        },
      );
      const { task: child2 } = await ac.tasks.approveSubtaskRequest(
        ORCH,
        mission.mission_id,
        req2.request_id,
        { owner_agent: 'claude-1', auto_dispatch: false },
      );
      assert.equal(child2.delegation_depth, 2);

      // Depth 3 rejected
      await assert.rejects(
        () =>
          ac.tasks.requestSpecialistSubtask(
            { agent: 'claude-1', role: 'claude_tech_auditor' },
            {
              mission_id: mission.mission_id,
              parent_task_id: child2.task_id,
              requested_role: 'codex_engineer',
              requested_provider: 'openai',
              requested_model: 'gpt-6.1-sol',
              title: 'Too deep depth 3',
              acceptance_criteria: ['Never runs'],
              active_task_key: 'sub-depth-3',
              estimated_cost_usd: 1.0,
              rationale: 'Exceeds max depth',
            },
          ),
        DelegationDepthError,
      );

      // Direct self-parent cycle & indirect A -> B -> C -> A cycle rejected
      await assert.rejects(
        () => ac.tasks.linkParentTask(ORCH, mission.mission_id, root.task_id, root.task_id),
        CircularDelegationError,
      );
      await assert.rejects(
        () => ac.tasks.linkParentTask(ORCH, mission.mission_id, root.task_id, child2.task_id),
        CircularDelegationError,
      );
      assert.throws(
        () =>
          assertNoCycle(
            {
              A: { ...root, task_id: 'A', parent_task_id: 'C' },
              B: { ...child1, task_id: 'B', parent_task_id: 'A' },
              C: { ...child2, task_id: 'C', parent_task_id: 'B' },
            },
            'C',
            'A',
          ),
        CircularDelegationError,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('enforces max_retries=2 with exponential backoff and marks terminal failure on 3rd failure', async () => {
    const dir = await mkTempDataDir('ac-tasks-retry-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, { title: 'Retry Backoff Test' });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'flaky-browser',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Flaky workflow',
        acceptance_criteria: ['Completes within 2 retries'],
        budget_allocation_usd: 2.0,
        auto_dispatch: true,
      });

      const baseTime = '2026-11-22T12:00:00.000Z';
      const r1 = await ac.tasks.recordTaskFailureAndScheduleRetry(
        ORCH,
        mission.mission_id,
        task.task_id,
        '429 rate limit #1',
        baseTime,
      );
      assert.equal(r1.retryable, true);
      assert.equal(r1.delay_ms, 10_000);
      assert.equal(r1.next_retry_at, '2026-11-22T12:00:10.000Z');
      assert.equal(r1.task.status, 'paused');

      const r2 = await ac.tasks.recordTaskFailureAndScheduleRetry(
        ORCH,
        mission.mission_id,
        task.task_id,
        '429 rate limit #2',
        '2026-11-22T12:00:15.000Z',
      );
      assert.equal(r2.retryable, true);
      assert.equal(r2.delay_ms, 30_000);
      assert.equal(r2.next_retry_at, '2026-11-22T12:00:45.000Z');
      assert.equal(r2.task.retry_count, 2);

      // 3rd failure exceeds max_retries=2 -> terminal failed
      const r3 = await ac.tasks.recordTaskFailureAndScheduleRetry(
        ORCH,
        mission.mission_id,
        task.task_id,
        'Browser crashed #3',
        '2026-11-22T12:00:50.000Z',
      );
      assert.equal(r3.retryable, false);
      assert.equal(r3.task.status, 'failed');

      await assert.rejects(
        () =>
          ac.tasks.recordTaskFailureAndScheduleRetry(
            ORCH,
            mission.mission_id,
            task.task_id,
            '4th attempt',
          ),
        RetryLimitExceededError,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('enforces linkParentTask subtree depth, non-owner budget/limit caps, finite budgets, pending key reservation, cooldowns, and terminal guards', async () => {
    const dir = await mkTempDataDir('ac-tasks-remed-');
    try {
      const ac = createAgentCenter({ dataDir: dir });

      // Non-owner orchestrator cannot raise/weaken budget_policy or limits above defaults
      await assert.rejects(
        () =>
          ac.tasks.createMission(ORCH, {
            title: 'Unauth Cap Raise',
            budget_policy: { max_mission_usd: 500 },
          }),
        UnauthorizedActionError,
      );
      await assert.rejects(
        () =>
          ac.tasks.createMission(ORCH, {
            title: 'Unauth Reserve Weaken',
            budget_policy: { reserve_reporting_usd: 1.0 },
          }),
        UnauthorizedActionError,
      );
      await assert.rejects(
        () =>
          ac.tasks.createMission(ORCH, {
            title: 'Unauth Concurrency Raise',
            limits: { max_concurrent_agents: 5 },
          }),
        UnauthorizedActionError,
      );
      await assert.rejects(
        () =>
          ac.tasks.createMission(ORCH, {
            title: 'Unauth Depth Raise',
            limits: { max_delegation_depth: 4 },
          }),
        UnauthorizedActionError,
      );

      // NaN / Infinity / invalid bounds in createMission rejected with ValidationError
      for (const badPolicy of [
        { max_mission_usd: Number.NaN },
        { max_mission_usd: Number.POSITIVE_INFINITY },
        { reserve_reporting_usd: 20.0 },
        { alert_pct: 0.9, throttle_pct: 0.8 },
        { hard_stop_pct: 1.5 },
      ]) {
        await assert.rejects(
          () => ac.tasks.createMission(OWNER, { title: 'Bad Mission', budget_policy: badPolicy }),
          ValidationError,
        );
      }

      // Owner CAN create mission with higher cap within 0 < alert <= throttle <= hard_stop <= 1.0
      const ownerBigMission = await ac.tasks.createMission(OWNER, {
        title: 'Owner Approved Cap',
        budget_policy: { max_mission_usd: 30.0 },
      });
      assert.equal(ownerBigMission.budget_policy.max_mission_usd, 30.0);

      // Default mission created by orchestrator works
      const mission = await ac.tasks.createMission(ORCH, { title: 'Remediation Task Mission' });

      // Invalid budget_allocation_usd rejected
      await assert.rejects(
        () =>
          ac.tasks.createRootTask(ORCH, {
            mission_id: mission.mission_id,
            active_task_key: 'bad-budget',
            owner_agent: MUSE.agent,
            role: MUSE.role,
            provider: 'meta',
            model: 'muse-spark-1.3',
            title: 'Bad Budget',
            acceptance_criteria: ['Never created'],
            budget_allocation_usd: -5,
          }),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.tasks.createRootTask(ORCH, {
            mission_id: mission.mission_id,
            active_task_key: 'nan-budget',
            owner_agent: MUSE.agent,
            role: MUSE.role,
            provider: 'meta',
            model: 'muse-spark-1.3',
            title: 'NaN Budget',
            acceptance_criteria: ['Never created'],
            budget_allocation_usd: Number.NaN,
          }),
        ValidationError,
      );

      // Subtree delegation depth in linkParentTask:
      // Chain 1: D(0) -> E(1)
      // Chain 2: A(0) -> B(1) -> C(2)
      const taskD = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'task-D',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'D',
        acceptance_criteria: ['D'],
        budget_allocation_usd: 1.0,
      });
      const reqE = await ac.tasks.requestSpecialistSubtask(MUSE, {
        mission_id: mission.mission_id,
        parent_task_id: taskD.task_id,
        requested_role: 'gemini_ux_auditor',
        requested_provider: 'google',
        requested_model: 'gemini-4-argon-high',
        title: 'E',
        acceptance_criteria: ['E'],
        active_task_key: 'task-E',
        estimated_cost_usd: 1.0,
        rationale: 'E under D',
      });
      const { task: taskE } = await ac.tasks.approveSubtaskRequest(ORCH, mission.mission_id, reqE.request_id, {
        owner_agent: 'gemini-1',
        auto_dispatch: false,
      });

      const taskA = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'Checkout Flow',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'A',
        acceptance_criteria: ['A'],
        budget_allocation_usd: 1.0,
      });

      // Internal whitespace key normalization blocks "Checkout   Flow"
      await assert.rejects(
        () =>
          ac.tasks.createRootTask(ORCH, {
            mission_id: mission.mission_id,
            active_task_key: 'Checkout   Flow',
            owner_agent: MUSE.agent,
            role: MUSE.role,
            provider: 'meta',
            model: 'muse-spark-1.3',
            title: 'Dup whitespace',
            acceptance_criteria: ['Dup'],
            budget_allocation_usd: 1.0,
          }),
        DuplicateTaskKeyError,
      );

      const reqB = await ac.tasks.requestSpecialistSubtask(MUSE, {
        mission_id: mission.mission_id,
        parent_task_id: taskA.task_id,
        requested_role: 'gemini_ux_auditor',
        requested_provider: 'google',
        requested_model: 'gemini-4-argon-high',
        title: 'B',
        acceptance_criteria: ['B'],
        active_task_key: 'task-B',
        estimated_cost_usd: 1.0,
        rationale: 'B under A',
      });
      const { task: taskB } = await ac.tasks.approveSubtaskRequest(ORCH, mission.mission_id, reqB.request_id, {
        owner_agent: 'gemini-1',
        auto_dispatch: false,
      });

      // Pending request active_task_key cannot be stolen by createRootTask
      const pendingReq = await ac.tasks.requestSpecialistSubtask(
        { agent: 'gemini-1', role: 'gemini_ux_auditor' },
        {
          mission_id: mission.mission_id,
          parent_task_id: taskB.task_id,
          requested_role: 'claude_tech_auditor',
          requested_provider: 'anthropic',
          requested_model: 'claude-opus-5-5-high',
          title: 'C',
          acceptance_criteria: ['C'],
          active_task_key: 'pending-sub-key',
          estimated_cost_usd: 1.0,
          rationale: 'C under B',
        },
      );
      await assert.rejects(
        () =>
          ac.tasks.createRootTask(ORCH, {
            mission_id: mission.mission_id,
            active_task_key: '  PENDING-SUB-KEY  ',
            owner_agent: MUSE.agent,
            role: MUSE.role,
            provider: 'meta',
            model: 'muse-spark-1.3',
            title: 'Key Thief',
            acceptance_criteria: ['Blocked'],
            budget_allocation_usd: 1.0,
          }),
        DuplicateTaskKeyError,
      );
      const { task: taskC } = await ac.tasks.approveSubtaskRequest(
        ORCH,
        mission.mission_id,
        pendingReq.request_id,
        { owner_agent: 'claude-1', auto_dispatch: false },
      );

      // Linking A(0)->B(1)->C(2) under E(1) would place C at depth 4 > 2 -> rejected!
      await assert.rejects(
        () => ac.tasks.linkParentTask(ORCH, mission.mission_id, taskA.task_id, taskE.task_id),
        DelegationDepthError,
      );
      assert.equal((await ac.tasks.getTask(mission.mission_id, taskA.task_id))?.delegation_depth, 0);
      assert.equal((await ac.tasks.getTask(mission.mission_id, taskC.task_id))?.delegation_depth, 2);

      // Valid subtree reparenting: create R(0) and X(0)->Y(1), link X under R -> X=1, Y=2 atomically
      const taskR = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'task-R',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'R',
        acceptance_criteria: ['R'],
        budget_allocation_usd: 1.0,
      });
      const taskX = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'task-X',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'X',
        acceptance_criteria: ['X'],
        budget_allocation_usd: 1.0,
      });
      const reqY = await ac.tasks.requestSpecialistSubtask(MUSE, {
        mission_id: mission.mission_id,
        parent_task_id: taskX.task_id,
        requested_role: 'claude_tech_auditor',
        requested_provider: 'anthropic',
        requested_model: 'claude-opus-5-5-high',
        title: 'Y',
        acceptance_criteria: ['Y'],
        active_task_key: 'task-Y',
        estimated_cost_usd: 1.0,
        rationale: 'Y under X',
      });
      const { task: taskY } = await ac.tasks.approveSubtaskRequest(ORCH, mission.mission_id, reqY.request_id, {
        owner_agent: 'claude-1',
        auto_dispatch: false,
      });
      const linkedX = await ac.tasks.linkParentTask(ORCH, mission.mission_id, taskX.task_id, taskR.task_id);
      assert.equal(linkedX.delegation_depth, 1);
      assert.equal((await ac.tasks.getTask(mission.mission_id, taskY.task_id))?.delegation_depth, 2);

      // Retry cooldown enforcement & terminal task guards
      await ac.tasks.dispatchTask(ORCH, mission.mission_id, taskR.task_id);
      const retryBase = '2026-11-22T14:00:00.000Z';
      const retry1 = await ac.tasks.recordTaskFailureAndScheduleRetry(
        ORCH,
        mission.mission_id,
        taskR.task_id,
        'Transient 429',
        retryBase,
      );
      assert.equal(retry1.next_retry_at, '2026-11-22T14:00:10.000Z');

      // Early dispatch before next_retry_at rejected unless allow_early_retry: true
      await assert.rejects(
        () =>
          ac.tasks.dispatchTask(ORCH, mission.mission_id, taskR.task_id, {
            now_utc: '2026-11-22T14:00:05.000Z',
          }),
        ValidationError,
      );
      // After cooldown expires -> succeeds
      const redispatched = await ac.tasks.dispatchTask(ORCH, mission.mission_id, taskR.task_id, {
        now_utc: '2026-11-22T14:00:10.000Z',
      });
      assert.equal(redispatched.status, 'in_progress');

      // Complete taskR -> terminal guards prevent retry or second completion
      await ac.tasks.completeTask(ORCH, mission.mission_id, taskR.task_id);
      await assert.rejects(
        () => ac.tasks.completeTask(ORCH, mission.mission_id, taskR.task_id),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.tasks.recordTaskFailureAndScheduleRetry(
            ORCH,
            mission.mission_id,
            taskR.task_id,
            'Late error after completion',
          ),
        ValidationError,
      );

      // allow_early_retry override works for orchestrator/owner
      await ac.tasks.dispatchTask(ORCH, mission.mission_id, taskD.task_id);
      await ac.tasks.recordTaskFailureAndScheduleRetry(
        ORCH,
        mission.mission_id,
        taskD.task_id,
        'Rate limit',
        retryBase,
      );
      const forcedRetry = await ac.tasks.dispatchTask(ORCH, mission.mission_id, taskD.task_id, {
        now_utc: '2026-11-22T14:00:01.000Z',
        allow_early_retry: true,
      });
      assert.equal(forcedRetry.status, 'in_progress');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('guards Object.prototype task/request keys, validates createRootTask/requestSpecialistSubtask before persistence, enforces terminal guards & retry-backoff caps', async () => {
    const dir = await mkTempDataDir('ac-tasks-iter3-');
    try {
      const ac = createAgentCenter({ dataDir: dir });

      // Non-owner cannot lower retry_base_delay_ms or retry_backoff_factor below defaults
      await assert.rejects(
        () =>
          ac.tasks.createMission(ORCH, {
            title: 'Unauth Fast Retry Delay',
            limits: { retry_base_delay_ms: 100 },
          }),
        UnauthorizedActionError,
      );
      await assert.rejects(
        () =>
          ac.tasks.createMission(ORCH, {
            title: 'Unauth Low Backoff Factor',
            limits: { retry_backoff_factor: 1 },
          }),
        UnauthorizedActionError,
      );

      const mission = await ac.tasks.createMission(ORCH, { title: 'Iter3 Task Guards' });

      // Object.prototype keys must never match or corrupt tasks.json / delegation_requests.json
      for (const protoKey of ['toString', 'constructor', 'valueOf', 'hasOwnProperty']) {
        assert.equal(await ac.tasks.getTask(mission.mission_id, protoKey), null);
        await assert.rejects(
          () => ac.tasks.completeTask(ORCH, mission.mission_id, protoKey),
          ValidationError,
        );
        await assert.rejects(
          () => ac.tasks.cancelTask(ORCH, mission.mission_id, protoKey),
          ValidationError,
        );
        await assert.rejects(
          () => ac.tasks.dispatchTask(ORCH, mission.mission_id, protoKey),
          ValidationError,
        );
        await assert.rejects(
          () => ac.tasks.approveSubtaskRequest(ORCH, mission.mission_id, protoKey, { owner_agent: 'x' }),
          ValidationError,
        );
      }
      assert.equal((await ac.tasks.listTasks(mission.mission_id)).length, 0);

      // createRootTask pre-persistence validation leaves 0 tasks on disk on invalid input
      for (const badInput of [
        { stage: 'STAGE_99_FAKE' as 'STAGE_1_DISCOVERY' },
        { role: 'bogus_role' as 'muse_visual_tester' },
        { provider: 'bogus_provider' as 'meta' },
        { owner_agent: '   ' },
        { model: '   ' },
        { title: '   ' },
        { acceptance_criteria: ['   '] },
      ]) {
        await assert.rejects(
          () =>
            ac.tasks.createRootTask(ORCH, {
              mission_id: mission.mission_id,
              active_task_key: 'bad-prepersist',
              owner_agent: MUSE.agent,
              role: MUSE.role,
              provider: 'meta',
              model: 'muse-spark-1.3',
              title: 'Valid title',
              acceptance_criteria: ['Valid criteria'],
              budget_allocation_usd: 1.0,
              ...badInput,
            }),
          ValidationError,
        );
      }
      assert.equal((await ac.tasks.listTasks(mission.mission_id)).length, 0);

      // Create valid root task + test cancelTask identifier & terminal guards
      const root = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'valid-root',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Valid root task',
        acceptance_criteria: ['Runs cleanly'],
        budget_allocation_usd: 2.0,
      });

      // Invalid requestSpecialistSubtask leaves 0 delegation requests
      await assert.rejects(
        () =>
          ac.tasks.requestSpecialistSubtask(MUSE, {
            mission_id: mission.mission_id,
            parent_task_id: root.task_id,
            requested_role: 'invalid_role' as 'gemini_ux_auditor',
            requested_provider: 'google',
            requested_model: 'gemini-4-argon-high',
            title: 'Bad sub',
            acceptance_criteria: ['Check'],
            active_task_key: 'bad-sub',
            estimated_cost_usd: 0.5,
            rationale: 'Need check',
          }),
        ValidationError,
      );
      assert.equal((await ac.tasks.listSubtaskRequests(mission.mission_id)).length, 0);

      // Create valid pending subtask request, then cancel parent -> approveSubtaskRequest must reject
      const pendingReq = await ac.tasks.requestSpecialistSubtask(MUSE, {
        mission_id: mission.mission_id,
        parent_task_id: root.task_id,
        requested_role: 'gemini_ux_auditor',
        requested_provider: 'google',
        requested_model: 'gemini-4-argon-high',
        title: 'Pending sub before cancel',
        acceptance_criteria: ['Check UX'],
        active_task_key: 'pending-before-cancel',
        estimated_cost_usd: 0.5,
        rationale: 'Need UX review',
      });

      // cancelTask rejects unsafe taskId
      await assert.rejects(
        () => ac.tasks.cancelTask(ORCH, mission.mission_id, '../escape'),
        ValidationError,
      );

      // Cancel root task, then verify terminal guards on cancelTask, requestSpecialistSubtask, approveSubtaskRequest
      const cancelled = await ac.tasks.cancelTask(ORCH, mission.mission_id, root.task_id, 'No longer needed');
      assert.equal(cancelled.status, 'cancelled');

      await assert.rejects(
        () => ac.tasks.cancelTask(ORCH, mission.mission_id, root.task_id),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.tasks.requestSpecialistSubtask(MUSE, {
            mission_id: mission.mission_id,
            parent_task_id: root.task_id,
            requested_role: 'claude_tech_auditor',
            requested_provider: 'anthropic',
            requested_model: 'claude-opus-5-5-high',
            title: 'Under cancelled parent',
            acceptance_criteria: ['Never created'],
            active_task_key: 'under-cancelled',
            estimated_cost_usd: 0.5,
            rationale: 'Should fail',
          }),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.tasks.approveSubtaskRequest(ORCH, mission.mission_id, pendingReq.request_id, {
            owner_agent: 'gemini-1',
          }),
        ValidationError,
      );

      // Completed task cannot be cancelled either
      const toComplete = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'to-complete',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Complete me',
        acceptance_criteria: ['Done'],
        budget_allocation_usd: 1.0,
      });
      await ac.tasks.completeTask(ORCH, mission.mission_id, toComplete.task_id);
      await assert.rejects(
        () => ac.tasks.cancelTask(ORCH, mission.mission_id, toComplete.task_id),
        ValidationError,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('validates actor.agent upfront with zero disk mutations across TaskManager methods and rejects terminal linkParentTask & non-ISO dates', async () => {
    const dir = await mkTempDataDir('ac-tasks-iter4-');
    try {
      const ac = createAgentCenter({ dataDir: dir });

      // createMission rejects blank/non-string actor.agent
      await assert.rejects(
        () => ac.tasks.createMission({ agent: '   ', role: 'owner' }, { mission_id: 'MSN-NOPE', title: 'Nope' }),
        ValidationError,
      );
      await assert.rejects(
        () => ac.tasks.getMission('MSN-NOPE'),
        ValidationError,
      );

      const mission = await ac.tasks.createMission(OWNER, { title: 'Iter4 Atomic Actor Validation' });
      const badActors: ActorContext[] = [
        { agent: '   ', role: 'orchestrator' },
        { agent: undefined as unknown as string, role: 'orchestrator' },
        null as unknown as ActorContext,
      ];

      // createRootTask leaves 0 tasks & 0 ledger entries on invalid actor.agent
      for (const badActor of badActors) {
        await assert.rejects(
          () =>
            ac.tasks.createRootTask(badActor, {
              mission_id: mission.mission_id,
              active_task_key: 'root-key',
              owner_agent: MUSE.agent,
              role: MUSE.role,
              provider: 'meta',
              model: 'muse-spark-1.3',
              title: 'Should not persist',
              acceptance_criteria: ['Zero partial write'],
              budget_allocation_usd: 1.0,
            }),
          ValidationError,
        );
      }
      assert.equal((await ac.tasks.listTasks(mission.mission_id)).length, 0);
      assert.equal((await ac.ledger.query({ mission_id: mission.mission_id })).total, 0);

      // Retrying with valid actor and same active_task_key succeeds cleanly
      const root = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'root-key',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Root task',
        acceptance_criteria: ['Works'],
        budget_allocation_usd: 2.0,
      });
      assert.equal((await ac.tasks.listTasks(mission.mission_id)).length, 1);

      // requestSpecialistSubtask leaves 0 requests on invalid actor.agent
      for (const badActor of badActors) {
        await assert.rejects(
          () =>
            ac.tasks.requestSpecialistSubtask(badActor, {
              mission_id: mission.mission_id,
              parent_task_id: root.task_id,
              requested_role: 'gemini_ux_auditor',
              requested_provider: 'google',
              requested_model: 'gemini-4-argon-high',
              title: 'Sub',
              acceptance_criteria: ['Check'],
              active_task_key: 'sub-key',
              estimated_cost_usd: 0.5,
              rationale: 'UX check',
            }),
          ValidationError,
        );
      }
      assert.equal((await ac.tasks.listSubtaskRequests(mission.mission_id)).length, 0);

      const req = await ac.tasks.requestSpecialistSubtask(MUSE, {
        mission_id: mission.mission_id,
        parent_task_id: root.task_id,
        requested_role: 'gemini_ux_auditor',
        requested_provider: 'google',
        requested_model: 'gemini-4-argon-high',
        title: 'Sub',
        acceptance_criteria: ['Check'],
        active_task_key: 'sub-key',
        estimated_cost_usd: 0.5,
        rationale: 'UX check',
      });

      // approveSubtaskRequest & rejectSubtaskRequest leave request pending_approval and tasks count unchanged
      for (const badActor of badActors) {
        await assert.rejects(
          () =>
            ac.tasks.approveSubtaskRequest(badActor, mission.mission_id, req.request_id, {
              owner_agent: 'gemini-1',
            }),
          ValidationError,
        );
        await assert.rejects(
          () => ac.tasks.rejectSubtaskRequest(badActor, mission.mission_id, req.request_id, 'no'),
          ValidationError,
        );
      }
      assert.equal((await ac.tasks.listTasks(mission.mission_id)).length, 1);
      assert.equal((await ac.tasks.listSubtaskRequests(mission.mission_id))[0]?.status, 'pending_approval');

      // dispatchTask leaves task status 'pending' on invalid actor.agent or invalid now_utc
      for (const badActor of badActors) {
        await assert.rejects(
          () => ac.tasks.dispatchTask(badActor, mission.mission_id, root.task_id),
          ValidationError,
        );
      }
      await assert.rejects(
        () =>
          ac.tasks.dispatchTask(ORCH, mission.mission_id, root.task_id, {
            now_utc: '2026-02-31T00:00:00Z',
          }),
        ValidationError,
      );
      assert.equal((await ac.tasks.getTask(mission.mission_id, root.task_id))?.status, 'pending');

      await ac.tasks.dispatchTask(ORCH, mission.mission_id, root.task_id);

      // recordTaskFailureAndScheduleRetry leaves status 'in_progress' and retry_count 0 on invalid actor.agent or invalid nowUtc
      for (const badActor of badActors) {
        await assert.rejects(
          () =>
            ac.tasks.recordTaskFailureAndScheduleRetry(
              badActor,
              mission.mission_id,
              root.task_id,
              'err',
            ),
          ValidationError,
        );
      }
      await assert.rejects(
        () =>
          ac.tasks.recordTaskFailureAndScheduleRetry(
            ORCH,
            mission.mission_id,
            root.task_id,
            'err',
            'May 1, 2026',
          ),
        ValidationError,
      );
      const afterFailErr = await ac.tasks.getTask(mission.mission_id, root.task_id);
      assert.equal(afterFailErr?.status, 'in_progress');
      assert.equal(afterFailErr?.retry_count, 0);

      // completeTask & cancelTask & linkParentTask leave status 'in_progress' on invalid actor.agent
      for (const badActor of badActors) {
        await assert.rejects(
          () => ac.tasks.completeTask(badActor, mission.mission_id, root.task_id),
          ValidationError,
        );
        await assert.rejects(
          () => ac.tasks.cancelTask(badActor, mission.mission_id, root.task_id),
          ValidationError,
        );
      }
      assert.equal((await ac.tasks.getTask(mission.mission_id, root.task_id))?.status, 'in_progress');

      // Valid approve & complete & terminal linkParentTask guard
      const { task: child } = await ac.tasks.approveSubtaskRequest(ORCH, mission.mission_id, req.request_id, {
        owner_agent: 'gemini-1',
        auto_dispatch: false,
      });
      const root2 = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'root-2',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Root 2',
        acceptance_criteria: ['Done'],
        budget_allocation_usd: 1.0,
      });
      await ac.tasks.completeTask(ORCH, mission.mission_id, root.task_id);
      await assert.rejects(
        () => ac.tasks.linkParentTask(ORCH, mission.mission_id, root.task_id, root2.task_id),
        ValidationError,
      );
      await assert.rejects(
        () => ac.tasks.linkParentTask(ORCH, mission.mission_id, child.task_id, root.task_id),
        ValidationError,
      );

      // Invalid active_task_key (null, non-string, whitespace) and invalid requestSpecialistSubtask actor.role throw ValidationError
      for (const badKey of ['   ', null, 123, undefined]) {
        await assert.rejects(
          () =>
            ac.tasks.createRootTask(ORCH, {
              mission_id: mission.mission_id,
              active_task_key: badKey as unknown as string,
              owner_agent: MUSE.agent,
              role: MUSE.role,
              provider: 'meta',
              model: 'muse-spark-1.3',
              title: 'Bad key',
              acceptance_criteria: ['Never created'],
              budget_allocation_usd: 1.0,
            }),
          ValidationError,
        );
      }
      await assert.rejects(
        () => ac.tasks.createRootTask(ORCH, null as unknown as Parameters<typeof ac.tasks.createRootTask>[1]),
        ValidationError,
      );

      const reqCountBefore = (await ac.tasks.listSubtaskRequests(mission.mission_id)).length;
      await assert.rejects(
        () =>
          ac.tasks.requestSpecialistSubtask(
            { agent: 'muse-1', role: 'not_a_real_role' as ActorContext['role'] },
            {
              mission_id: mission.mission_id,
              parent_task_id: root2.task_id,
              requested_role: 'gemini_ux_auditor',
              requested_provider: 'google',
              requested_model: 'gemini-4-argon-high',
              title: 'Bad actor role',
              acceptance_criteria: ['Never persisted'],
              active_task_key: 'bad-actor-role',
              estimated_cost_usd: 0.5,
              rationale: 'Should reject',
            },
          ),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.tasks.requestSpecialistSubtask(
            MUSE,
            null as unknown as Parameters<typeof ac.tasks.requestSpecialistSubtask>[1],
          ),
        ValidationError,
      );
      assert.equal((await ac.tasks.listSubtaskRequests(mission.mission_id)).length, reqCountBefore);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
