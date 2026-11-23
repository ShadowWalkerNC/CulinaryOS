import * as path from 'node:path';
import {
  AGENT_CENTER_DEFAULTS,
  type ActorContext,
  BILLING_TYPES,
  BillingHonestyError,
  type BillingType,
  BudgetHardStopError,
  BudgetReserveProtectedError,
  BudgetThrottleError,
  COST_BASES,
  type CostBasis,
  type MissionBudgetPolicy,
  type MissionRecord,
  PROVIDER_IDS,
  type ProviderId,
  STAGES,
  type StageId,
  type TaskRecord,
  ValidationError,
} from '../types.js';
import {
  appendJsonl,
  assertSafeIdentifier,
  assertValidActorContext,
  assertValidIsoDate,
  atomicWriteJson,
  generateId,
  readJsonSafe,
  readJsonlSafe,
} from '../storage/atomic-fs.js';
import { withStoreLock } from '../storage/lock.js';
import { IntelligenceLedger } from '../ledger/intelligence-ledger.js';
import { estimateTokenCostMicros, microsToUsd, usdToMicros } from './pricing.js';

export type BudgetAlertLevel =
  | 'ALERT_60'
  | 'THROTTLE_80'
  | 'OPERATIONAL_CAP_RESERVE_PROTECTED'
  | 'HARD_STOP_100';

export type BudgetStateLabel =
  | 'OK'
  | 'ALERT_60'
  | 'THROTTLE_80'
  | 'OPERATIONAL_CAP_90'
  | 'HARD_STOP_100';

export type DispatchPurpose =
  | 'operational'
  | 'optional_analysis'
  | 'optional_delegation'
  | 'checkpoint'
  | 'final_report';

export interface RecordUsageInput {
  mission_id: string;
  task_id: string;
  stage: StageId;
  provider: ProviderId;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  retries: number;
  delegated_agent_cost_usd?: number | undefined;
  billing_type: BillingType;
  cost_basis: CostBasis;
  raw_cost_usd?: number | undefined;
  timestamp_utc?: string | undefined;
}

export interface BudgetUsageEvent {
  usage_id: string;
  mission_id: string;
  task_id: string;
  stage: StageId;
  provider: ProviderId;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  retries: number;
  delegated_agent_cost_micros: number;
  cost_micros: number;
  cost_usd: number;
  billing_type: BillingType;
  cost_basis: CostBasis;
  timestamp_utc: string;
}

export interface ProviderBudgetTotals {
  provider: ProviderId;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  retries: number;
  delegated_agent_cost_usd: number;
  cost_usd: number;
  billing_type: BillingType;
  cost_basis: CostBasis;
}

export interface BudgetStatus {
  mission_id: string;
  max_mission_usd: number;
  reserve_reporting_usd: number;
  operational_cap_usd: number;
  spent_usd: number;
  spent_micros: number;
  metered_actual_usd: number;
  metered_estimated_usd: number;
  subscription_estimated_usd: number;
  total_retries: number;
  total_delegated_agent_cost_usd: number;
  remaining_operational_usd: number;
  remaining_total_usd: number;
  pct_of_cap: number;
  state: BudgetStateLabel;
  optional_analysis_allowed: boolean;
  optional_delegation_allowed: boolean;
  alerts_emitted: BudgetAlertLevel[];
  totals_by_provider: Record<string, ProviderBudgetTotals>;
}

interface PersistedProviderBucket {
  provider: ProviderId;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  retries: number;
  delegated_agent_cost_micros: number;
  cost_micros: number;
  billing_type: BillingType;
  cost_basis: CostBasis;
}

interface PersistedBudgetSummary {
  mission_id: string;
  spent_micros: number;
  metered_actual_micros: number;
  metered_estimated_micros: number;
  subscription_estimated_micros: number;
  total_retries?: number | undefined;
  total_delegated_agent_cost_micros?: number | undefined;
  alerts_emitted: BudgetAlertLevel[];
  totals_by_provider?: Record<string, PersistedProviderBucket> | undefined;
  updated_at: string;
}

const VALID_DISPATCH_PURPOSES: ReadonlySet<DispatchPurpose> = new Set([
  'operational',
  'optional_analysis',
  'optional_delegation',
  'checkpoint',
  'final_report',
]);

function providerBucketKey(provider: ProviderId, model: string, billingType: BillingType): string {
  return `${provider}:${model}:${billingType}`;
}

function accumulateProviderBucket(
  buckets: Record<string, PersistedProviderBucket>,
  ev: {
    provider: ProviderId;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cached_tokens: number;
    retries: number;
    delegated_agent_cost_micros: number;
    cost_micros: number;
    billing_type: BillingType;
    cost_basis: CostBasis;
  },
): void {
  const key = providerBucketKey(ev.provider, ev.model, ev.billing_type);
  const prev = Object.hasOwn(buckets, key) ? buckets[key] : undefined;
  if (!prev) {
    buckets[key] = {
      provider: ev.provider,
      model: ev.model,
      input_tokens: ev.input_tokens,
      output_tokens: ev.output_tokens,
      cached_tokens: ev.cached_tokens,
      retries: ev.retries,
      delegated_agent_cost_micros: ev.delegated_agent_cost_micros,
      cost_micros: ev.cost_micros,
      billing_type: ev.billing_type,
      cost_basis: ev.cost_basis,
    };
  } else {
    buckets[key] = {
      provider: ev.provider,
      model: ev.model,
      input_tokens: prev.input_tokens + ev.input_tokens,
      output_tokens: prev.output_tokens + ev.output_tokens,
      cached_tokens: prev.cached_tokens + ev.cached_tokens,
      retries: prev.retries + ev.retries,
      delegated_agent_cost_micros: prev.delegated_agent_cost_micros + ev.delegated_agent_cost_micros,
      cost_micros: prev.cost_micros + ev.cost_micros,
      billing_type: ev.billing_type,
      cost_basis:
        prev.cost_basis === 'estimated' || ev.cost_basis === 'estimated' ? 'estimated' : 'actual',
    };
  }
}

export class BudgetController {
  private readonly dataDir: string;
  private readonly ledger: IntelligenceLedger;

  constructor(dataDir: string, ledger?: IntelligenceLedger) {
    this.dataDir = dataDir;
    this.ledger = ledger ?? new IntelligenceLedger(dataDir);
  }

  private missionDir(missionId: string): string {
    assertSafeIdentifier(missionId, 'mission_id');
    return path.join(this.dataDir, 'missions', missionId);
  }

  private missionPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'mission.json');
  }

  private usageLogPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'budget_usage.jsonl');
  }

  private summaryPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'budget_summary.json');
  }

  private tasksPath(missionId: string): string {
    return path.join(this.missionDir(missionId), 'tasks.json');
  }

  private async getPolicy(missionId: string): Promise<MissionBudgetPolicy> {
    const mission = await readJsonSafe<MissionRecord | null>(this.missionPath(missionId), null);
    if (mission?.budget_policy) {
      return mission.budget_policy;
    }
    return {
      max_mission_usd: AGENT_CENTER_DEFAULTS.MAX_MISSION_USD,
      reserve_reporting_usd: AGENT_CENTER_DEFAULTS.RESERVE_REPORTING_USD,
      alert_pct: AGENT_CENTER_DEFAULTS.ALERT_PCT,
      throttle_pct: AGENT_CENTER_DEFAULTS.THROTTLE_PCT,
      hard_stop_pct: AGENT_CENTER_DEFAULTS.HARD_STOP_PCT,
    };
  }

  private computeState(
    spentMicros: number,
    policy: MissionBudgetPolicy,
  ): {
    state: BudgetStateLabel;
    pct: number;
    maxMicros: number;
    reserveMicros: number;
    operationalCapMicros: number;
    alerts: BudgetAlertLevel[];
  } {
    const maxMicros = usdToMicros(policy.max_mission_usd);
    const reserveMicros = usdToMicros(policy.reserve_reporting_usd);
    const operationalCapMicros = Math.max(0, maxMicros - reserveMicros);
    const alertMicros = Math.round(maxMicros * policy.alert_pct);
    const throttleMicros = Math.round(maxMicros * policy.throttle_pct);
    const hardStopMicros = Math.round(maxMicros * policy.hard_stop_pct);

    const pct = maxMicros > 0 ? spentMicros / maxMicros : 1;
    const alerts: BudgetAlertLevel[] = [];
    if (spentMicros >= alertMicros) alerts.push('ALERT_60');
    if (spentMicros >= throttleMicros) alerts.push('THROTTLE_80');
    if (spentMicros >= operationalCapMicros) alerts.push('OPERATIONAL_CAP_RESERVE_PROTECTED');
    if (spentMicros >= hardStopMicros) alerts.push('HARD_STOP_100');

    let state: BudgetStateLabel = 'OK';
    if (spentMicros >= hardStopMicros) {
      state = 'HARD_STOP_100';
    } else if (spentMicros >= operationalCapMicros) {
      state = 'OPERATIONAL_CAP_90';
    } else if (spentMicros >= throttleMicros) {
      state = 'THROTTLE_80';
    } else if (spentMicros >= alertMicros) {
      state = 'ALERT_60';
    }

    return { state, pct, maxMicros, reserveMicros, operationalCapMicros, alerts };
  }

  public async recordUsage(actor: ActorContext, input: RecordUsageInput): Promise<{
    event: BudgetUsageEvent;
    status: BudgetStatus;
  }> {
    assertValidActorContext(actor);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ValidationError('recordUsage input must be an object');
    }
    assertSafeIdentifier(input.mission_id, 'mission_id');
    assertSafeIdentifier(input.task_id, 'task_id');
    if (!(STAGES as readonly string[]).includes(input.stage)) {
      throw new ValidationError(`Invalid stage "${String(input.stage)}"`);
    }
    if (!(PROVIDER_IDS as readonly string[]).includes(input.provider)) {
      throw new ValidationError(`Invalid provider "${String(input.provider)}"`);
    }
    if (typeof input.model !== 'string' || input.model.trim().length === 0) {
      throw new ValidationError('model must be a non-empty string');
    }
    for (const [k, v] of [
      ['input_tokens', input.input_tokens],
      ['output_tokens', input.output_tokens],
      ['cached_tokens', input.cached_tokens],
      ['retries', input.retries],
    ] as const) {
      if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
        throw new ValidationError(`${k} must be a finite non-negative integer`);
      }
    }
    if (!(BILLING_TYPES as readonly string[]).includes(input.billing_type)) {
      throw new ValidationError(`Invalid billing_type "${String(input.billing_type)}"`);
    }
    if (!(COST_BASES as readonly string[]).includes(input.cost_basis)) {
      throw new ValidationError(`Invalid cost_basis "${String(input.cost_basis)}"`);
    }
    if (input.billing_type === 'subscription_quota' && input.cost_basis === 'actual') {
      throw new BillingHonestyError(
        'Usage with billing_type "subscription_quota" cannot be recorded with cost_basis "actual"; use "estimated"',
      );
    }
    if (
      input.raw_cost_usd !== undefined &&
      (typeof input.raw_cost_usd !== 'number' || !Number.isFinite(input.raw_cost_usd) || input.raw_cost_usd < 0)
    ) {
      throw new ValidationError('raw_cost_usd must be a finite non-negative number');
    }
    if (
      input.delegated_agent_cost_usd !== undefined &&
      (typeof input.delegated_agent_cost_usd !== 'number' ||
        !Number.isFinite(input.delegated_agent_cost_usd) ||
        input.delegated_agent_cost_usd < 0)
    ) {
      throw new ValidationError('delegated_agent_cost_usd must be a finite non-negative number');
    }

    const tokenCostMicros =
      input.raw_cost_usd !== undefined
        ? usdToMicros(input.raw_cost_usd)
        : estimateTokenCostMicros({
            provider: input.provider,
            model: input.model,
            input_tokens: input.input_tokens,
            output_tokens: input.output_tokens,
            cached_tokens: input.cached_tokens,
          });
    const delegatedCostMicros = usdToMicros(input.delegated_agent_cost_usd ?? 0);
    const totalEventMicros = tokenCostMicros + delegatedCostMicros;

    const timestampUtc =
      input.timestamp_utc !== undefined
        ? assertValidIsoDate(input.timestamp_utc, 'timestamp_utc')
        : new Date().toISOString();

    const { event, summary } = await withStoreLock(
      this.dataDir,
      `budget_${input.mission_id}`,
      async () => {
        const policy = await this.getPolicy(input.mission_id);
        const currentSummary = await readJsonSafe<PersistedBudgetSummary>(
          this.summaryPath(input.mission_id),
          {
            mission_id: input.mission_id,
            spent_micros: 0,
            metered_actual_micros: 0,
            metered_estimated_micros: 0,
            subscription_estimated_micros: 0,
            total_retries: 0,
            total_delegated_agent_cost_micros: 0,
            alerts_emitted: [],
            totals_by_provider: {},
            updated_at: timestampUtc,
          },
        );

        let nextTotalsByProvider: Record<string, PersistedProviderBucket> =
          currentSummary.totals_by_provider
            ? { ...currentSummary.totals_by_provider }
            : {};
        let nextTotalRetries = currentSummary.total_retries;
        let nextTotalDelegatedMicros = currentSummary.total_delegated_agent_cost_micros;

        // Legacy summary migration if upgrading from an older budget_summary.json without incremental buckets
        if (
          currentSummary.totals_by_provider === undefined ||
          nextTotalRetries === undefined ||
          nextTotalDelegatedMicros === undefined
        ) {
          nextTotalsByProvider = {};
          nextTotalRetries = 0;
          nextTotalDelegatedMicros = 0;
          const legacyEvents = await readJsonlSafe<BudgetUsageEvent>(
            this.usageLogPath(input.mission_id),
          );
          for (const ev of legacyEvents) {
            nextTotalRetries += ev.retries;
            nextTotalDelegatedMicros += ev.delegated_agent_cost_micros;
            accumulateProviderBucket(nextTotalsByProvider, ev);
          }
        }

        const usageEvent: BudgetUsageEvent = {
          usage_id: generateId('USG'),
          mission_id: input.mission_id,
          task_id: input.task_id,
          stage: input.stage,
          provider: input.provider,
          model: input.model,
          input_tokens: input.input_tokens,
          output_tokens: input.output_tokens,
          cached_tokens: input.cached_tokens,
          retries: input.retries,
          delegated_agent_cost_micros: delegatedCostMicros,
          cost_micros: totalEventMicros,
          cost_usd: microsToUsd(totalEventMicros),
          billing_type: input.billing_type,
          cost_basis: input.cost_basis,
          timestamp_utc: timestampUtc,
        };

        await appendJsonl(this.usageLogPath(input.mission_id), usageEvent);

        const nextSpentMicros = currentSummary.spent_micros + totalEventMicros;
        let nextMeteredActual = currentSummary.metered_actual_micros;
        let nextMeteredEstimated = currentSummary.metered_estimated_micros;
        let nextSubscriptionEstimated = currentSummary.subscription_estimated_micros;

        if (input.billing_type === 'subscription_quota') {
          nextSubscriptionEstimated += totalEventMicros;
        } else if (input.cost_basis === 'actual') {
          nextMeteredActual += totalEventMicros;
        } else {
          nextMeteredEstimated += totalEventMicros;
        }

        nextTotalRetries += input.retries;
        nextTotalDelegatedMicros += delegatedCostMicros;
        accumulateProviderBucket(nextTotalsByProvider, usageEvent);

        const computed = this.computeState(nextSpentMicros, policy);
        const nextAlerts = Array.from(
          new Set<BudgetAlertLevel>([...currentSummary.alerts_emitted, ...computed.alerts]),
        );

        const nextSummary: PersistedBudgetSummary = {
          mission_id: input.mission_id,
          spent_micros: nextSpentMicros,
          metered_actual_micros: nextMeteredActual,
          metered_estimated_micros: nextMeteredEstimated,
          subscription_estimated_micros: nextSubscriptionEstimated,
          total_retries: nextTotalRetries,
          total_delegated_agent_cost_micros: nextTotalDelegatedMicros,
          alerts_emitted: nextAlerts,
          totals_by_provider: nextTotalsByProvider,
          updated_at: timestampUtc,
        };

        await atomicWriteJson(this.summaryPath(input.mission_id), nextSummary);
        return { event: usageEvent, summary: nextSummary };
      },
    );

    // Sync task spend & token summary if task exists in tasks.json
    await withStoreLock(this.dataDir, `tasks_${input.mission_id}`, async () => {
      const tasks = await readJsonSafe<Record<string, TaskRecord>>(
        this.tasksPath(input.mission_id),
        {},
      );
      const task = Object.hasOwn(tasks, input.task_id) ? tasks[input.task_id] : undefined;
      if (task) {
        const currentSpendMicros = usdToMicros(task.spend_usd);
        const updatedTask: TaskRecord = {
          ...task,
          spend_usd: microsToUsd(currentSpendMicros + totalEventMicros),
          tokens: {
            input_tokens: task.tokens.input_tokens + input.input_tokens,
            output_tokens: task.tokens.output_tokens + input.output_tokens,
            cached_tokens: task.tokens.cached_tokens + input.cached_tokens,
            billing_type: input.billing_type,
            cost_basis: input.cost_basis,
          },
          updated_at: timestampUtc,
        };
        tasks[input.task_id] = updatedTask;
        await atomicWriteJson(this.tasksPath(input.mission_id), tasks);
      }
    });

    // Log token_cost to shared intelligence ledger (using orchestrator or caller actor if permitted)
    const ledgerActor: ActorContext =
      actor.role === 'owner' || actor.role === 'orchestrator'
        ? actor
        : {
            agent: 'budget-controller',
            role: 'orchestrator',
            provider: input.provider,
            model: input.model,
          };

    await this.ledger.append(ledgerActor, {
      mission_id: input.mission_id,
      task_id: input.task_id,
      stage: input.stage,
      category: 'token_cost',
      epistemic_tag: input.cost_basis === 'actual' ? 'measurement' : 'assumption',
      evidence_links: [],
      payload: {
        task_id: input.task_id,
        provider: input.provider,
        model: input.model,
        input_tokens: input.input_tokens,
        output_tokens: input.output_tokens,
        cached_tokens: input.cached_tokens,
        retries: input.retries,
        delegated_agent_cost_usd: microsToUsd(delegatedCostMicros),
        cost_usd: event.cost_usd,
        billing_type: input.billing_type,
        cost_basis: input.cost_basis,
      },
    });

    const status = await this.getBudgetStatus(input.mission_id, summary);
    return { event, status };
  }

  public async getBudgetStatus(
    missionId: string,
    overrideSummary?: PersistedBudgetSummary,
  ): Promise<BudgetStatus> {
    assertSafeIdentifier(missionId, 'mission_id');
    const policy = await this.getPolicy(missionId);
    const summary =
      overrideSummary ??
      (await readJsonSafe<PersistedBudgetSummary>(this.summaryPath(missionId), {
        mission_id: missionId,
        spent_micros: 0,
        metered_actual_micros: 0,
        metered_estimated_micros: 0,
        subscription_estimated_micros: 0,
        total_retries: 0,
        total_delegated_agent_cost_micros: 0,
        alerts_emitted: [],
        totals_by_provider: {},
        updated_at: new Date().toISOString(),
      }));

    let buckets = summary.totals_by_provider;
    let totalRetries = summary.total_retries;
    let totalDelegatedMicros = summary.total_delegated_agent_cost_micros;

    if (
      buckets === undefined ||
      totalRetries === undefined ||
      totalDelegatedMicros === undefined
    ) {
      buckets = {};
      totalRetries = 0;
      totalDelegatedMicros = 0;
      const events = await readJsonlSafe<BudgetUsageEvent>(this.usageLogPath(missionId));
      for (const ev of events) {
        totalRetries += ev.retries;
        totalDelegatedMicros += ev.delegated_agent_cost_micros;
        accumulateProviderBucket(buckets, ev);
      }
    }

    const totalsByProvider: BudgetStatus['totals_by_provider'] = {};
    for (const [key, bucket] of Object.entries(buckets)) {
      totalsByProvider[key] = {
        provider: bucket.provider,
        model: bucket.model,
        input_tokens: bucket.input_tokens,
        output_tokens: bucket.output_tokens,
        cached_tokens: bucket.cached_tokens,
        retries: bucket.retries,
        delegated_agent_cost_usd: microsToUsd(bucket.delegated_agent_cost_micros),
        cost_usd: microsToUsd(bucket.cost_micros),
        billing_type: bucket.billing_type,
        cost_basis: bucket.cost_basis,
      };
    }

    const computed = this.computeState(summary.spent_micros, policy);
    const remainingOperationalMicros = Math.max(
      0,
      computed.operationalCapMicros - summary.spent_micros,
    );
    const remainingTotalMicros = Math.max(0, computed.maxMicros - summary.spent_micros);

    return {
      mission_id: missionId,
      max_mission_usd: policy.max_mission_usd,
      reserve_reporting_usd: policy.reserve_reporting_usd,
      operational_cap_usd: microsToUsd(computed.operationalCapMicros),
      spent_usd: microsToUsd(summary.spent_micros),
      spent_micros: summary.spent_micros,
      metered_actual_usd: microsToUsd(summary.metered_actual_micros),
      metered_estimated_usd: microsToUsd(summary.metered_estimated_micros),
      subscription_estimated_usd: microsToUsd(summary.subscription_estimated_micros),
      total_retries: totalRetries,
      total_delegated_agent_cost_usd: microsToUsd(totalDelegatedMicros),
      remaining_operational_usd: microsToUsd(remainingOperationalMicros),
      remaining_total_usd: microsToUsd(remainingTotalMicros),
      pct_of_cap: computed.pct,
      state: computed.state,
      optional_analysis_allowed:
        summary.spent_micros < Math.round(computed.maxMicros * policy.throttle_pct),
      optional_delegation_allowed:
        summary.spent_micros < Math.round(computed.maxMicros * policy.throttle_pct),
      alerts_emitted: summary.alerts_emitted,
      totals_by_provider: totalsByProvider,
    };
  }

  public async assertCanDispatch(
    missionId: string,
    opts: {
      projectedCostUsd: number;
      purpose: DispatchPurpose;
      importance?: string | undefined;
    },
  ): Promise<BudgetStatus> {
    assertSafeIdentifier(missionId, 'mission_id');
    if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
      throw new ValidationError('assertCanDispatch opts must be an object');
    }
    if (
      typeof opts.projectedCostUsd !== 'number' ||
      !Number.isFinite(opts.projectedCostUsd) ||
      opts.projectedCostUsd < 0
    ) {
      throw new ValidationError('projectedCostUsd must be a finite non-negative number');
    }
    if (!VALID_DISPATCH_PURPOSES.has(opts.purpose)) {
      throw new ValidationError(`Invalid dispatch purpose "${String(opts.purpose)}"`);
    }

    const policy = await this.getPolicy(missionId);
    const status = await this.getBudgetStatus(missionId);

    const maxMicros = usdToMicros(policy.max_mission_usd);
    const reserveMicros = usdToMicros(policy.reserve_reporting_usd);
    const operationalCapMicros = Math.max(0, maxMicros - reserveMicros);
    const throttleMicros = Math.round(maxMicros * policy.throttle_pct);
    const hardStopMicros = Math.round(maxMicros * policy.hard_stop_pct);

    const spentMicros = status.spent_micros;
    const projectedMicros = usdToMicros(opts.projectedCostUsd);
    const afterMicros = spentMicros + projectedMicros;

    // Hard stop at 100%: unbypassable regardless of importance or purpose.
    if (spentMicros >= hardStopMicros || afterMicros > hardStopMicros) {
      throw new BudgetHardStopError(microsToUsd(spentMicros), policy.max_mission_usd);
    }

    // 80% throttle: disable optional analysis and optional delegation.
    if (
      (opts.purpose === 'optional_analysis' || opts.purpose === 'optional_delegation') &&
      spentMicros >= throttleMicros
    ) {
      throw new BudgetThrottleError(opts.purpose, status.pct_of_cap);
    }

    // Protect $2.00 reserve for checkpointing & final reporting.
    const isReservedPurpose = opts.purpose === 'checkpoint' || opts.purpose === 'final_report';
    if (!isReservedPurpose && (spentMicros >= operationalCapMicros || afterMicros > operationalCapMicros)) {
      throw new BudgetReserveProtectedError(
        microsToUsd(spentMicros),
        microsToUsd(operationalCapMicros),
        policy.reserve_reporting_usd,
      );
    }

    return status;
  }
}
