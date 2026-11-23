export const AGENT_CENTER_DEFAULTS = {
  DATA_DIR_ENV: 'AGENT_CENTER_DATA_DIR',
  DEFAULT_DATA_DIR: '.agent-center-data',
  MAX_CONCURRENT_AGENTS: 3,
  MAX_DELEGATION_DEPTH: 2,
  MAX_RETRIES: 2,
  RETRY_BASE_DELAY_MS: 10_000,
  RETRY_BACKOFF_FACTOR: 3,
  MAX_MISSION_USD: 20.0,
  RESERVE_REPORTING_USD: 2.0,
  ALERT_PCT: 0.6,
  THROTTLE_PCT: 0.8,
  HARD_STOP_PCT: 1.0,
  MICRODOLLARS_PER_USD: 1_000_000,
  DEFAULT_STALL_THRESHOLD_MS: 300_000,
  DEFAULT_LOCK_TIMEOUT_MS: 10_000,
  DEFAULT_STALE_LOCK_MS: 30_000,
} as const;

export const STAGES = [
  'STAGE_1_DISCOVERY',
  'STAGE_2_PREPARATION',
  'STAGE_3_EXECUTION',
  'STAGE_4_EVALUATION',
  'STAGE_5_INDEPENDENT_REVIEW',
  'STAGE_6_REPORTING',
  'STAGE_7_FIX_AND_RETEST',
] as const;

export type StageId = (typeof STAGES)[number];

export const LEDGER_CATEGORIES = [
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
] as const;

export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

export const AGENT_ROLES = [
  'owner',
  'orchestrator',
  'muse_visual_tester',
  'gemini_ux_auditor',
  'claude_tech_auditor',
  'codex_engineer',
  'chatgpt_supervisor',
] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

export const PROVIDER_IDS = ['openai', 'anthropic', 'google', 'meta', 'local_script'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const BILLING_TYPES = ['metered_api', 'subscription_quota'] as const;
export type BillingType = (typeof BILLING_TYPES)[number];

export const COST_BASES = ['actual', 'estimated'] as const;
export type CostBasis = (typeof COST_BASES)[number];

export const TASK_STATUSES = [
  'pending_approval',
  'pending',
  'in_progress',
  'paused',
  'blocked',
  'escalated',
  'failed',
  'completed',
  'cancelled',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ADAPTER_CHANNELS = [
  'codex_cli',
  'agy_cli',
  'muse_cli',
  'gemini_cli',
  'hc_terminal',
  'local_script',
] as const;

export type AdapterChannel = (typeof ADAPTER_CHANNELS)[number];

export interface TaskWriteScope {
  read_only?: boolean | undefined;
  worktree_branch?: string | undefined;
  worktree_path?: string | undefined;
  write_ownership_paths?: string[] | undefined;
}

export interface FallbackHistoryEntry {
  from_provider: ProviderId;
  from_model: string;
  from_channel?: AdapterChannel | undefined;
  to_provider: ProviderId;
  to_model: string;
  to_channel: AdapterChannel;
  reason: string;
  timestamp_utc: string;
}

export interface StructuredTaskResult {
  task_id: string;
  mission_id: string;
  status: 'completed' | 'failed' | 'escalated';
  summary: string;
  completed_steps: string[];
  evidence_links: string[];
  ledger_entry_ids: string[];
  unresolved_problems: string[];
  output_data?: Record<string, unknown> | undefined;
  completed_at: string;
}

export interface ActorContext {
  agent: string;
  role: AgentRole;
  provider?: ProviderId | undefined;
  model?: string | undefined;
}

export interface TokenUsageSummary {
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  billing_type: BillingType;
  cost_basis: CostBasis;
}

export interface TaskRecord {
  task_id: string;
  mission_id: string;
  parent_task_id: string | null;
  delegation_depth: number;
  active_task_key: string;
  owner_agent: string;
  role: AgentRole;
  provider: ProviderId;
  model: string;
  channel?: AdapterChannel | undefined;
  stage: StageId;
  status: TaskStatus;
  title: string;
  acceptance_criteria: string[];
  budget_allocation_usd: number;
  spend_usd: number;
  tokens: TokenUsageSummary;
  checkpoint_history: string[];
  retry_count: number;
  next_retry_at: string | null;
  is_optional_analysis?: boolean | undefined;
  approval_id?: string | null | undefined;
  last_error?: string | null | undefined;
  write_scope?: TaskWriteScope | undefined;
  worker_pid?: number | null | undefined;
  worker_session_id?: string | null | undefined;
  awaiting_child_task_ids?: string[] | undefined;
  context_handoff_count?: number | undefined;
  fallback_history?: FallbackHistoryEntry[] | undefined;
  escalation_reason?: string | null | undefined;
  result_summary?: StructuredTaskResult | undefined;
  unsafe_to_resume?: boolean | undefined;
  created_at: string;
  updated_at: string;
}

export interface SpecialistSubtaskRequest {
  request_id: string;
  mission_id: string;
  parent_task_id: string;
  requested_by_agent: string;
  requested_by_role: AgentRole;
  requested_role: AgentRole;
  requested_provider: ProviderId;
  requested_model: string;
  requested_channel?: AdapterChannel | undefined;
  stage: StageId;
  title: string;
  acceptance_criteria: string[];
  active_task_key: string;
  estimated_cost_usd: number;
  rationale: string;
  is_optional_analysis: boolean;
  write_scope?: TaskWriteScope | undefined;
  command_preview?: string | undefined;
  target_urls?: string[] | undefined;
  status: 'pending_approval' | 'approved' | 'rejected';
  assigned_task_id?: string | null | undefined;
  decided_by?: string | null | undefined;
  decision_reason?: string | null | undefined;
  created_at: string;
  updated_at: string;
}

export interface CheckpointEnvironment {
  target_mode: 'rust_standalone' | 'apps_server_pg' | 'vite_spa' | 'mixed';
  urls: string[];
  port?: number | undefined;
  data_dir?: string | undefined;
  git_commit?: string | undefined;
  worktree_path?: string | undefined;
}

export interface CheckpointObservation {
  step: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
  duration_ms?: number | undefined;
  clicks?: number | undefined;
  timestamp_utc: string;
}

export interface CheckpointSpendingSnapshot {
  mission_spent_usd: number;
  task_spent_usd: number;
  remaining_operational_usd: number;
  remaining_total_usd: number;
  cost_basis: CostBasis;
  billing_type: BillingType;
}

export interface CheckpointRecord {
  checkpoint_id: string;
  mission_id: string;
  task_id: string;
  stage: StageId;
  agent: string;
  saved_by_actor?: string | undefined;
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
  heartbeat_utc: string;
  created_at: string;
}

export interface MissionBudgetPolicy {
  max_mission_usd: number;
  reserve_reporting_usd: number;
  alert_pct: number;
  throttle_pct: number;
  hard_stop_pct: number;
}

export interface MissionLimits {
  max_concurrent_agents: number;
  max_delegation_depth: number;
  max_retries: number;
  retry_base_delay_ms: number;
  retry_backoff_factor: number;
}

export interface MissionRecord {
  mission_id: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'halted';
  budget_policy: MissionBudgetPolicy;
  limits: MissionLimits;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionFixApproval {
  approval_id: string;
  mission_id: string;
  approved_by_agent: string;
  approved_by_role: 'owner';
  scope: string;
  target_defect_ids: string[];
  worktree_branch?: string | undefined;
  notes?: string | undefined;
  status: 'active' | 'revoked';
  created_at: string;
}

export const EPISTEMIC_TAGS = ['measurement', 'observation', 'assumption', 'opinion'] as const;
export type EpistemicTag = (typeof EPISTEMIC_TAGS)[number];

export interface LedgerEntryBase<C extends LedgerCategory = LedgerCategory, P = unknown> {
  entry_id: string;
  mission_id: string;
  task_id: string;
  stage: StageId;
  category: C;
  actor_agent: string;
  actor_role: AgentRole;
  epistemic_tag: EpistemicTag;
  evidence_links: string[];
  payload: P;
  created_at: string;
  supersedes_entry_id?: string | null | undefined;
  target_entry_id?: string | null | undefined;
}

export class AgentCenterError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class CorruptStoreError extends AgentCenterError {
  public readonly filePath: string;

  constructor(filePath: string, message: string) {
    super('CORRUPT_STORE', `${message} (${filePath})`);
    this.filePath = filePath;
  }
}

export class LockTimeoutError extends AgentCenterError {
  public readonly lockPath: string;

  constructor(lockPath: string, timeoutMs: number) {
    super('LOCK_TIMEOUT', `Timed out after ${timeoutMs}ms acquiring lock ${lockPath}`);
    this.lockPath = lockPath;
  }
}

export class ValidationError extends AgentCenterError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
  }
}

export class ConcurrencyLimitError extends AgentCenterError {
  constructor(current: number, max: number) {
    super('CONCURRENCY_LIMIT', `Active concurrent tasks (${current}) reached limit (${max})`);
  }
}

export class DelegationDepthError extends AgentCenterError {
  constructor(depth: number, maxDepth: number) {
    super('DELEGATION_DEPTH_EXCEEDED', `Delegation depth ${depth} exceeds max depth ${maxDepth}`);
  }
}

export class CircularDelegationError extends AgentCenterError {
  constructor(message: string) {
    super('CIRCULAR_DELEGATION', message);
  }
}

export class DuplicateTaskKeyError extends AgentCenterError {
  constructor(activeTaskKey: string, missionId: string) {
    super(
      'DUPLICATE_TASK_KEY',
      `Active task with key "${activeTaskKey}" already exists in mission "${missionId}"`,
    );
  }
}

export class RetryLimitExceededError extends AgentCenterError {
  constructor(taskId: string, maxRetries: number) {
    super('RETRY_LIMIT_EXCEEDED', `Task "${taskId}" exceeded max retries (${maxRetries})`);
  }
}

export class UnauthorizedActionError extends AgentCenterError {
  constructor(message: string) {
    super('UNAUTHORIZED_ACTION', message);
  }
}

export class InvalidStageTransitionError extends AgentCenterError {
  constructor(fromStage: StageId, toStage: StageId, reason?: string) {
    super(
      'INVALID_STAGE_TRANSITION',
      `Cannot transition from ${fromStage} to ${toStage}${reason ? `: ${reason}` : ''}`,
    );
  }
}

export class MissingStageCheckpointError extends AgentCenterError {
  constructor(taskId: string, stage: StageId, checkpointId: string) {
    super(
      'MISSING_STAGE_CHECKPOINT',
      `External checkpoint "${checkpointId}" not found for task "${taskId}" at ${stage}`,
    );
  }
}

export class IndependentReviewRequiredError extends AgentCenterError {
  constructor(message: string) {
    super('INDEPENDENT_REVIEW_REQUIRED', message);
  }
}

export class MissingApprovalGateError extends AgentCenterError {
  constructor(message: string) {
    super('MISSING_APPROVAL_GATE', message);
  }
}

export class BudgetHardStopError extends AgentCenterError {
  constructor(spentUsd: number, capUsd: number) {
    super(
      'BUDGET_HARD_STOP',
      `Mission budget hard stop reached ($${spentUsd.toFixed(4)} / $${capUsd.toFixed(2)})`,
    );
  }
}

export class BudgetThrottleError extends AgentCenterError {
  constructor(purpose: string, pct: number) {
    super(
      'BUDGET_THROTTLED',
      `Mission budget at ${(pct * 100).toFixed(1)}% (>= 80%): "${purpose}" is throttled`,
    );
  }
}

export class BudgetReserveProtectedError extends AgentCenterError {
  constructor(spentUsd: number, operationalCapUsd: number, reserveUsd: number) {
    super(
      'BUDGET_RESERVE_PROTECTED',
      `Dispatch blocked at $${spentUsd.toFixed(4)} to protect $${reserveUsd.toFixed(2)} checkpoint/reporting reserve (operational cap $${operationalCapUsd.toFixed(2)})`,
    );
  }
}

export class BillingHonestyError extends AgentCenterError {
  constructor(message: string) {
    super('BILLING_HONESTY_VIOLATION', message);
  }
}

export class ImmutableEvidenceError extends AgentCenterError {
  constructor(category: string, entryId: string) {
    super(
      'IMMUTABLE_EVIDENCE',
      `Category "${category}" entry "${entryId}" is immutable; append a linked challenge/superseding entry instead`,
    );
  }
}

export class SelfVerificationDeniedError extends AgentCenterError {
  constructor(agent: string) {
    super(
      'SELF_VERIFICATION_DENIED',
      `Agent "${agent}" cannot independently verify/pass its own fix`,
    );
  }
}

export class WriteConflictError extends AgentCenterError {
  constructor(message: string) {
    super('WRITE_CONFLICT', message);
  }
}

export class UnsafeStateEscalationError extends AgentCenterError {
  constructor(message: string) {
    super('UNSAFE_STATE_ESCALATED', message);
  }
}

export class NoCapableFallbackError extends AgentCenterError {
  constructor(message: string) {
    super('NO_CAPABLE_FALLBACK', message);
  }
}

export class AdapterExecutionError extends AgentCenterError {
  constructor(message: string) {
    super('ADAPTER_EXECUTION_ERROR', message);
  }
}
