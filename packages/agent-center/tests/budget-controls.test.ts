import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  type ActorContext,
  BillingHonestyError,
  BudgetHardStopError,
  BudgetReserveProtectedError,
  BudgetThrottleError,
  ValidationError,
  createAgentCenter,
  mkTempDataDir,
} from '../src/index.js';

const OWNER: ActorContext = { agent: 'nathaniel', role: 'owner' };
const ORCH: ActorContext = { agent: 'orch-1', role: 'orchestrator' };

describe('Token Management, Billing Honesty & Budget Controls', () => {
  it('enforces billing honesty, microdollar precision, 60% alert, 80% throttle, $2 reserve, and unbypassable 100% hard stop', async () => {
    const dir = await mkTempDataDir('ac-budget-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-BUDGET-01',
        title: 'Budget Gate Verification',
      });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'budget-task',
        owner_agent: 'codex-1',
        role: 'codex_engineer',
        provider: 'openai',
        model: 'gpt-6.1-sol',
        title: 'Budget tracked task',
        acceptance_criteria: ['Track exact spend'],
        budget_allocation_usd: 5.0,
      });

      // Billing honesty: subscription_quota CANNOT claim cost_basis: 'actual'
      await assert.rejects(
        () =>
          ac.budget.recordUsage(ORCH, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_3_EXECUTION',
            provider: 'meta',
            model: 'muse-spark-1.3',
            input_tokens: 5_000,
            output_tokens: 1_000,
            cached_tokens: 0,
            retries: 0,
            billing_type: 'subscription_quota',
            cost_basis: 'actual',
            raw_cost_usd: 0.5,
          }),
        BillingHonestyError,
      );

      // Accumulate tiny sub-cent charges + metered actual charges to reach exact $12.00 (60%)
      await ac.budget.recordUsage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_1_DISCOVERY',
        provider: 'meta',
        model: 'muse-spark-1.3',
        input_tokens: 1_000,
        output_tokens: 500,
        cached_tokens: 200,
        retries: 0,
        billing_type: 'subscription_quota',
        cost_basis: 'estimated',
        raw_cost_usd: 0.000123,
      });
      const at60 = await ac.budget.recordUsage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        provider: 'openai',
        model: 'gpt-6.1-sol',
        input_tokens: 100_000,
        output_tokens: 50_000,
        cached_tokens: 10_000,
        retries: 1,
        delegated_agent_cost_usd: 1.0,
        billing_type: 'metered_api',
        cost_basis: 'actual',
        raw_cost_usd: 10.999877,
      });

      assert.equal(at60.status.spent_usd, 12.0);
      assert.equal(at60.status.state, 'ALERT_60');
      assert.ok(at60.status.alerts_emitted.includes('ALERT_60'));
      assert.equal(at60.status.subscription_estimated_usd, 0.000123);
      assert.equal(at60.status.metered_actual_usd, 11.999877);
      assert.equal(at60.status.optional_analysis_allowed, true);

      // Reach $16.00 (80% throttle)
      const at80 = await ac.budget.recordUsage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_4_EVALUATION',
        provider: 'anthropic',
        model: 'claude-opus-5-5-high',
        input_tokens: 50_000,
        output_tokens: 25_000,
        cached_tokens: 0,
        retries: 0,
        billing_type: 'metered_api',
        cost_basis: 'actual',
        raw_cost_usd: 4.0,
      });

      assert.equal(at80.status.spent_usd, 16.0);
      assert.equal(at80.status.state, 'THROTTLE_80');
      assert.equal(at80.status.optional_analysis_allowed, false);
      assert.equal(at80.status.optional_delegation_allowed, false);

      await assert.rejects(
        () =>
          ac.budget.assertCanDispatch(mission.mission_id, {
            projectedCostUsd: 0.5,
            purpose: 'optional_analysis',
          }),
        BudgetThrottleError,
      );
      await assert.rejects(
        () =>
          ac.budget.assertCanDispatch(mission.mission_id, {
            projectedCostUsd: 0.5,
            purpose: 'optional_delegation',
          }),
        BudgetThrottleError,
      );

      // Operational work still permitted up to $18.00
      await ac.budget.assertCanDispatch(mission.mission_id, {
        projectedCostUsd: 2.0,
        purpose: 'operational',
      });

      // Reach $18.00 (operational cap protecting $2.00 reserve)
      const at18 = await ac.budget.recordUsage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_5_INDEPENDENT_REVIEW',
        provider: 'google',
        model: 'gemini-4-argon-high',
        input_tokens: 20_000,
        output_tokens: 10_000,
        cached_tokens: 0,
        retries: 0,
        billing_type: 'metered_api',
        cost_basis: 'actual',
        raw_cost_usd: 2.0,
      });

      assert.equal(at18.status.spent_usd, 18.0);
      assert.equal(at18.status.remaining_operational_usd, 0);
      assert.equal(at18.status.remaining_total_usd, 2.0);
      assert.equal(at18.status.state, 'OPERATIONAL_CAP_90');

      // Even $0.00 operational dispatch is blocked at exact $18.00 to protect $2.00 reserve
      await assert.rejects(
        () =>
          ac.budget.assertCanDispatch(mission.mission_id, {
            projectedCostUsd: 0,
            purpose: 'operational',
            importance: 'critical',
          }),
        BudgetReserveProtectedError,
      );
      await assert.rejects(
        () =>
          ac.budget.assertCanDispatch(mission.mission_id, {
            projectedCostUsd: 0.01,
            purpose: 'operational',
            importance: 'critical',
          }),
        BudgetReserveProtectedError,
      );

      // Checkpointing and final_report CAN use the $2.00 reserve!
      await ac.budget.assertCanDispatch(mission.mission_id, {
        projectedCostUsd: 1.0,
        purpose: 'checkpoint',
      });
      await ac.budget.assertCanDispatch(mission.mission_id, {
        projectedCostUsd: 1.0,
        purpose: 'final_report',
      });

      // Spend the remaining $2.00 reserve -> $20.00 (100% HARD STOP)
      const at20 = await ac.budget.recordUsage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_6_REPORTING',
        provider: 'openai',
        model: 'gpt-6.1-astra',
        input_tokens: 40_000,
        output_tokens: 20_000,
        cached_tokens: 0,
        retries: 0,
        billing_type: 'metered_api',
        cost_basis: 'actual',
        raw_cost_usd: 2.0,
      });

      assert.equal(at20.status.spent_usd, 20.0);
      assert.equal(at20.status.state, 'HARD_STOP_100');

      // At 100%, ALL dispatches are blocked regardless of purpose or importance
      for (const purpose of [
        'operational',
        'optional_analysis',
        'optional_delegation',
        'checkpoint',
        'final_report',
      ] as const) {
        await assert.rejects(
          () =>
            ac.budget.assertCanDispatch(mission.mission_id, {
              projectedCostUsd: 0.001,
              purpose,
              importance: 'critical',
            }),
          BudgetHardStopError,
        );
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects NaN/Infinity/invalid inputs with ValidationError, preserves mixed billing buckets, and tracks retries/delegated costs in O(1)', async () => {
    const dir = await mkTempDataDir('ac-budget-remed-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-BUDGET-REMED',
        title: 'Mixed Billing & Finite Validation',
      });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'mixed-billing',
        owner_agent: 'codex-1',
        role: 'codex_engineer',
        provider: 'openai',
        model: 'gpt-6.1-sol',
        title: 'Mixed billing test',
        acceptance_criteria: ['Separate buckets'],
        budget_allocation_usd: 5.0,
      });

      // NaN / Infinity / fractional / invalid enum rejections throw ValidationError
      for (const badUsage of [
        { input_tokens: Number.NaN, raw_cost_usd: 0.01 },
        { input_tokens: Number.POSITIVE_INFINITY },
        { output_tokens: 1.5, raw_cost_usd: 0.01 },
        { retries: Number.POSITIVE_INFINITY, raw_cost_usd: 0.01 },
        { raw_cost_usd: Number.NaN },
        { delegated_agent_cost_usd: Number.POSITIVE_INFINITY, raw_cost_usd: 0.01 },
        { billing_type: 'free_tier' as 'metered_api', raw_cost_usd: 0.01 },
        { cost_basis: 'guessed' as 'estimated', raw_cost_usd: 0.01 },
      ]) {
        await assert.rejects(
          () =>
            ac.budget.recordUsage(ORCH, {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_3_EXECUTION',
              provider: 'openai',
              model: 'gpt-6.1-sol',
              input_tokens: 100,
              output_tokens: 50,
              cached_tokens: 0,
              retries: 0,
              billing_type: 'metered_api',
              cost_basis: 'actual',
              ...badUsage,
            }),
          ValidationError,
        );
      }

      await assert.rejects(
        () =>
          ac.budget.assertCanDispatch(mission.mission_id, {
            projectedCostUsd: Number.NaN,
            purpose: 'operational',
          }),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.budget.assertCanDispatch(mission.mission_id, {
            projectedCostUsd: Number.POSITIVE_INFINITY,
            purpose: 'operational',
          }),
        ValidationError,
      );

      // Mixed billing under the same provider:model stays separated in totals_by_provider
      await ac.budget.recordUsage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        provider: 'openai',
        model: 'gpt-6.1-sol',
        input_tokens: 10_000,
        output_tokens: 2_000,
        cached_tokens: 0,
        retries: 1,
        delegated_agent_cost_usd: 0.25,
        billing_type: 'metered_api',
        cost_basis: 'actual',
        raw_cost_usd: 0.5,
      });
      const afterMixed = await ac.budget.recordUsage(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        provider: 'openai',
        model: 'gpt-6.1-sol',
        input_tokens: 5_000,
        output_tokens: 1_000,
        cached_tokens: 0,
        retries: 2,
        delegated_agent_cost_usd: 0.15,
        billing_type: 'subscription_quota',
        cost_basis: 'estimated',
        raw_cost_usd: 0.1,
      });

      assert.equal(afterMixed.status.total_retries, 3);
      assert.equal(afterMixed.status.total_delegated_agent_cost_usd, 0.4);
      assert.equal(afterMixed.status.metered_actual_usd, 0.75);
      assert.equal(afterMixed.status.subscription_estimated_usd, 0.25);

      const meteredBucket = afterMixed.status.totals_by_provider['openai:gpt-6.1-sol:metered_api'];
      const subBucket = afterMixed.status.totals_by_provider['openai:gpt-6.1-sol:subscription_quota'];
      assert.ok(meteredBucket);
      assert.ok(subBucket);
      assert.equal(meteredBucket.billing_type, 'metered_api');
      assert.equal(meteredBucket.cost_usd, 0.75);
      assert.equal(meteredBucket.retries, 1);
      assert.equal(subBucket.billing_type, 'subscription_quota');
      assert.equal(subBucket.cost_usd, 0.25);
      assert.equal(subBucket.retries, 2);

      // Verify O(1) summary reads from budget_summary.json without needing budget_usage.jsonl
      const usageLogPath = path.join(dir, 'missions', mission.mission_id, 'budget_usage.jsonl');
      await fs.rm(usageLogPath);
      const cachedStatus = await ac.budget.getBudgetStatus(mission.mission_id);
      assert.equal(cachedStatus.total_retries, 3);
      assert.equal(cachedStatus.total_delegated_agent_cost_usd, 0.4);
      assert.equal(cachedStatus.totals_by_provider['openai:gpt-6.1-sol:metered_api']?.cost_usd, 0.75);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects blank actor.agent and non-ISO or rollover timestamp_utc in recordUsage with zero budget mutation', async () => {
    const dir = await mkTempDataDir('ac-budget-iter4-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-BUDGET-ITER4',
        title: 'Strict Timestamp & Actor Validation',
      });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'budget-iso',
        owner_agent: 'codex-1',
        role: 'codex_engineer',
        provider: 'openai',
        model: 'gpt-6.1-sol',
        title: 'Timestamp validation',
        acceptance_criteria: ['Reject non-ISO dates'],
        budget_allocation_usd: 2.0,
      });

      await assert.rejects(
        () =>
          ac.budget.recordUsage(
            { agent: '   ', role: 'orchestrator' },
            {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_3_EXECUTION',
              provider: 'openai',
              model: 'gpt-6.1-sol',
              input_tokens: 100,
              output_tokens: 50,
              cached_tokens: 0,
              retries: 0,
              billing_type: 'metered_api',
              cost_basis: 'actual',
              raw_cost_usd: 0.25,
            },
          ),
        ValidationError,
      );

      for (const badTimestamp of ['not-a-timestamp', '0', 'May 1, 2026', '2026-02-31T00:00:00Z']) {
        await assert.rejects(
          () =>
            ac.budget.recordUsage(ORCH, {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_3_EXECUTION',
              provider: 'openai',
              model: 'gpt-6.1-sol',
              input_tokens: 100,
              output_tokens: 50,
              cached_tokens: 0,
              retries: 0,
              billing_type: 'metered_api',
              cost_basis: 'actual',
              raw_cost_usd: 0.25,
              timestamp_utc: badTimestamp,
            }),
          ValidationError,
        );
      }

      const status = await ac.budget.getBudgetStatus(mission.mission_id);
      assert.equal(status.spent_usd, 0);

      // Null/undefined input & opts throw ValidationError (no TypeError)
      for (const badObj of [null, undefined, 'bad', []]) {
        await assert.rejects(
          () => ac.budget.recordUsage(ORCH, badObj as unknown as Parameters<typeof ac.budget.recordUsage>[1]),
          ValidationError,
        );
        await assert.rejects(
          () =>
            ac.budget.assertCanDispatch(
              mission.mission_id,
              badObj as unknown as Parameters<typeof ac.budget.assertCanDispatch>[1],
            ),
          ValidationError,
        );
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
