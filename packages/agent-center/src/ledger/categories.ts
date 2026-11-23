import {
  AGENT_ROLES,
  BILLING_TYPES,
  COST_BASES,
  LEDGER_CATEGORIES,
  PROVIDER_IDS,
  STAGES,
  type AgentRole,
  type BillingType,
  type CostBasis,
  type EpistemicTag,
  type LedgerCategory,
  type LedgerEntryBase,
  type ProviderId,
  type StageId,
  ValidationError,
} from '../types.js';

export type DefectSeverity = 'blocker' | 'high' | 'medium' | 'low';

export interface FeatureInventoryPayload {
  feature_id: string;
  app_surface: string;
  tested_perspectives: string[];
  coverage_status: 'untested' | 'partial' | 'verified' | 'stubbed';
  notes?: string | undefined;
}

export interface PositiveFindingPayload {
  workflow: string;
  perspective: string;
  summary: string;
  measured_metrics?: {
    duration_ms?: number | undefined;
    clicks?: number | undefined;
    steps?: number | undefined;
  } | undefined;
}

export interface DefectPayload {
  defect_id?: string | undefined;
  title: string;
  severity: DefectSeverity;
  repro_steps: string[];
  expected: string;
  actual: string;
  immutable_evidence: true;
  validation_status: 'unverified' | 'confirmed' | 'disputed' | 'fixed_pending_retest' | 'verified_fixed';
}

export interface UsabilityDifficultyPayload {
  workflow: string;
  perspective: string;
  friction_type: 'terminology' | 'navigation' | 'touch_target' | 'missing_docs' | 'complexity';
  detail: string;
  usability_scores: {
    usability: number;
    clarity: number;
    efficiency: number;
    reliability: number;
    business_value: number;
  };
}

export interface MissingCapabilityPayload {
  capability: string;
  operational_problem: string;
  claimed_vs_actual: 'promised' | 'stubbed' | 'absent';
  detail?: string | undefined;
}

export interface CompetitorComparisonPayload {
  competitor: 'Toast' | 'Square' | 'Clover' | 'SpotOn' | '7shifts' | 'MarginEdge' | string;
  workflow: string;
  verdict: 'competitor_better' | 'equivalent' | 'culinaryos_advantage';
  summary: string;
  sources: string[];
}

export interface DifferentiationOpportunityPayload {
  opportunity: string;
  target_persona: string;
  defensibility_rationale: string;
  impact_score: number;
}

export interface RecommendationPayload {
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  action: 'simplify' | 'remove' | 'fix' | 'build';
  title: string;
  rationale: string;
  linked_finding_ids: string[];
  requires_owner_approval: boolean;
}

export interface AgentAssignmentPayload {
  task_id: string;
  parent_task_id: string | null;
  role: AgentRole;
  provider: ProviderId;
  model: string;
  action: 'assigned' | 'approved' | 'rejected' | 'dispatched' | 'completed' | 'failed' | 'fallback';
  duration_ms?: number | undefined;
  detail?: string | undefined;
}

export interface CheckpointsRecoveryPayload {
  checkpoint_id?: string | undefined;
  task_id: string;
  stage: StageId;
  event: 'checkpoint_saved' | 'stall_detected' | 'retry_scheduled' | 'resumed' | 'fallback_switched' | 'escalated';
  recovery_instructions: string;
}

export interface TokenCostPayload {
  task_id: string;
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

export interface EvidencePayload {
  evidence_id: string;
  kind: 'screenshot' | 'video' | 'trace' | 'dom_snapshot' | 'log';
  relative_path: string;
  sha256: string;
  captured_at_utc: string;
  immutable_evidence: true;
  description?: string | undefined;
}

export interface FixRegressionPayload {
  defect_id: string;
  approval_id: string;
  worktree_branch: string;
  commit_sha?: string | undefined;
  fixed_by: string;
  original_evidence_links: string[];
  retest_status: 'pending_retest' | 'passed' | 'failed';
  retested_by?: string | undefined;
  notes?: string | undefined;
}

export interface LedgerPayloadMap {
  feature_inventory: FeatureInventoryPayload;
  positive_findings: PositiveFindingPayload;
  defects: DefectPayload;
  usability_difficulties: UsabilityDifficultyPayload;
  missing_capabilities: MissingCapabilityPayload;
  competitor_comparisons: CompetitorComparisonPayload;
  differentiation_opportunities: DifferentiationOpportunityPayload;
  recommendations: RecommendationPayload;
  agent_assignments: AgentAssignmentPayload;
  checkpoints_recovery: CheckpointsRecoveryPayload;
  token_cost: TokenCostPayload;
  evidence: EvidencePayload;
  fix_regression: FixRegressionPayload;
}

export type LedgerEntry<C extends LedgerCategory = LedgerCategory> = LedgerEntryBase<
  C,
  LedgerPayloadMap[C]
>;

export type AnyLedgerEntry = {
  [C in LedgerCategory]: LedgerEntry<C>;
}[LedgerCategory];

export interface NewLedgerEntryInput<C extends LedgerCategory = LedgerCategory> {
  mission_id: string;
  task_id: string;
  stage: StageId;
  category: C;
  epistemic_tag: EpistemicTag;
  evidence_links: string[];
  payload: LedgerPayloadMap[C];
  supersedes_entry_id?: string | null | undefined;
  target_entry_id?: string | null | undefined;
}

function assertNonEmptyString(val: unknown, field: string): void {
  if (typeof val !== 'string' || val.trim().length === 0) {
    throw new ValidationError(`Ledger payload field "${field}" must be a non-empty string`);
  }
}

function assertScoreRange(val: unknown, field: string): void {
  if (typeof val !== 'number' || !Number.isFinite(val) || val < 1 || val > 10) {
    throw new ValidationError(`Ledger payload field "${field}" must be a finite number between 1 and 10`);
  }
}

function assertEnumValue(val: unknown, allowed: readonly string[], field: string): void {
  if (typeof val !== 'string' || !allowed.includes(val)) {
    throw new ValidationError(
      `Ledger payload field "${field}" must be one of [${allowed.join(', ')}] (got "${String(val)}")`,
    );
  }
}

const COVERAGE_STATUSES = ['untested', 'partial', 'verified', 'stubbed'] as const;
const DEFECT_SEVERITIES = ['blocker', 'high', 'medium', 'low'] as const;
const DEFECT_VALIDATION_STATUSES = [
  'unverified',
  'confirmed',
  'disputed',
  'fixed_pending_retest',
  'verified_fixed',
] as const;
const FRICTION_TYPES = [
  'terminology',
  'navigation',
  'touch_target',
  'missing_docs',
  'complexity',
] as const;
const CLAIMED_VS_ACTUAL_VALUES = ['promised', 'stubbed', 'absent'] as const;
const COMPETITOR_VERDICTS = ['competitor_better', 'equivalent', 'culinaryos_advantage'] as const;
const RECOMMENDATION_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
const RECOMMENDATION_ACTIONS = ['simplify', 'remove', 'fix', 'build'] as const;
const ASSIGNMENT_ACTIONS = [
  'assigned',
  'approved',
  'rejected',
  'dispatched',
  'completed',
  'failed',
  'fallback',
] as const;
const CHECKPOINT_EVENTS = [
  'checkpoint_saved',
  'stall_detected',
  'retry_scheduled',
  'resumed',
  'fallback_switched',
  'escalated',
] as const;
const EVIDENCE_KINDS = ['screenshot', 'video', 'trace', 'dom_snapshot', 'log'] as const;
const RETEST_STATUSES = ['pending_retest', 'passed', 'failed'] as const;

export function isLedgerCategory(val: string): val is LedgerCategory {
  return (LEDGER_CATEGORIES as readonly string[]).includes(val);
}

export function validateLedgerPayload<C extends LedgerCategory>(
  category: C,
  payload: LedgerPayloadMap[C],
): void {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError(`Payload for category "${category}" must be an object`);
  }

  switch (category) {
    case 'feature_inventory': {
      const p = payload as FeatureInventoryPayload;
      assertNonEmptyString(p.feature_id, 'feature_id');
      assertNonEmptyString(p.app_surface, 'app_surface');
      if (!Array.isArray(p.tested_perspectives)) {
        throw new ValidationError('feature_inventory.tested_perspectives must be an array');
      }
      assertEnumValue(p.coverage_status, COVERAGE_STATUSES, 'feature_inventory.coverage_status');
      break;
    }
    case 'positive_findings': {
      const p = payload as PositiveFindingPayload;
      assertNonEmptyString(p.workflow, 'workflow');
      assertNonEmptyString(p.perspective, 'perspective');
      assertNonEmptyString(p.summary, 'summary');
      break;
    }
    case 'defects': {
      const p = payload as DefectPayload;
      assertNonEmptyString(p.title, 'title');
      assertEnumValue(p.severity, DEFECT_SEVERITIES, 'defects.severity');
      assertNonEmptyString(p.expected, 'expected');
      assertNonEmptyString(p.actual, 'actual');
      if (!Array.isArray(p.repro_steps) || p.repro_steps.length === 0) {
        throw new ValidationError('defects.repro_steps must be a non-empty array');
      }
      if (p.immutable_evidence !== true) {
        throw new ValidationError('defects.immutable_evidence must be true');
      }
      assertEnumValue(p.validation_status, DEFECT_VALIDATION_STATUSES, 'defects.validation_status');
      break;
    }
    case 'usability_difficulties': {
      const p = payload as UsabilityDifficultyPayload;
      assertNonEmptyString(p.workflow, 'workflow');
      assertNonEmptyString(p.perspective, 'perspective');
      assertEnumValue(p.friction_type, FRICTION_TYPES, 'usability_difficulties.friction_type');
      assertNonEmptyString(p.detail, 'detail');
      assertScoreRange(p.usability_scores?.usability, 'usability_scores.usability');
      assertScoreRange(p.usability_scores?.clarity, 'usability_scores.clarity');
      assertScoreRange(p.usability_scores?.efficiency, 'usability_scores.efficiency');
      assertScoreRange(p.usability_scores?.reliability, 'usability_scores.reliability');
      assertScoreRange(p.usability_scores?.business_value, 'usability_scores.business_value');
      break;
    }
    case 'missing_capabilities': {
      const p = payload as MissingCapabilityPayload;
      assertNonEmptyString(p.capability, 'capability');
      assertNonEmptyString(p.operational_problem, 'operational_problem');
      assertEnumValue(
        p.claimed_vs_actual,
        CLAIMED_VS_ACTUAL_VALUES,
        'missing_capabilities.claimed_vs_actual',
      );
      break;
    }
    case 'competitor_comparisons': {
      const p = payload as CompetitorComparisonPayload;
      assertNonEmptyString(p.competitor, 'competitor');
      assertNonEmptyString(p.workflow, 'workflow');
      assertEnumValue(p.verdict, COMPETITOR_VERDICTS, 'competitor_comparisons.verdict');
      assertNonEmptyString(p.summary, 'summary');
      if (!Array.isArray(p.sources)) {
        throw new ValidationError('competitor_comparisons.sources must be an array');
      }
      break;
    }
    case 'differentiation_opportunities': {
      const p = payload as DifferentiationOpportunityPayload;
      assertNonEmptyString(p.opportunity, 'opportunity');
      assertNonEmptyString(p.target_persona, 'target_persona');
      assertNonEmptyString(p.defensibility_rationale, 'defensibility_rationale');
      assertScoreRange(p.impact_score, 'impact_score');
      break;
    }
    case 'recommendations': {
      const p = payload as RecommendationPayload;
      assertEnumValue(p.priority, RECOMMENDATION_PRIORITIES, 'recommendations.priority');
      assertEnumValue(p.action, RECOMMENDATION_ACTIONS, 'recommendations.action');
      assertNonEmptyString(p.title, 'title');
      assertNonEmptyString(p.rationale, 'rationale');
      if (!Array.isArray(p.linked_finding_ids)) {
        throw new ValidationError('recommendations.linked_finding_ids must be an array');
      }
      if (typeof p.requires_owner_approval !== 'boolean') {
        throw new ValidationError('recommendations.requires_owner_approval must be a boolean');
      }
      break;
    }
    case 'agent_assignments': {
      const p = payload as AgentAssignmentPayload;
      assertNonEmptyString(p.task_id, 'task_id');
      assertEnumValue(p.role, AGENT_ROLES, 'agent_assignments.role');
      assertEnumValue(p.provider, PROVIDER_IDS, 'agent_assignments.provider');
      assertNonEmptyString(p.model, 'model');
      assertEnumValue(p.action, ASSIGNMENT_ACTIONS, 'agent_assignments.action');
      break;
    }
    case 'checkpoints_recovery': {
      const p = payload as CheckpointsRecoveryPayload;
      assertNonEmptyString(p.task_id, 'task_id');
      assertEnumValue(p.stage, STAGES, 'checkpoints_recovery.stage');
      assertEnumValue(p.event, CHECKPOINT_EVENTS, 'checkpoints_recovery.event');
      assertNonEmptyString(p.recovery_instructions, 'recovery_instructions');
      break;
    }
    case 'token_cost': {
      const p = payload as TokenCostPayload;
      assertNonEmptyString(p.task_id, 'task_id');
      assertEnumValue(p.provider, PROVIDER_IDS, 'token_cost.provider');
      assertNonEmptyString(p.model, 'model');
      for (const [field, val] of [
        ['input_tokens', p.input_tokens],
        ['output_tokens', p.output_tokens],
        ['cached_tokens', p.cached_tokens],
        ['retries', p.retries],
      ] as const) {
        if (typeof val !== 'number' || !Number.isFinite(val) || !Number.isInteger(val) || val < 0) {
          throw new ValidationError(`token_cost.${field} must be a finite non-negative integer`);
        }
      }
      if (
        typeof p.delegated_agent_cost_usd !== 'number' ||
        !Number.isFinite(p.delegated_agent_cost_usd) ||
        p.delegated_agent_cost_usd < 0
      ) {
        throw new ValidationError(
          'token_cost.delegated_agent_cost_usd must be a finite non-negative number',
        );
      }
      if (typeof p.cost_usd !== 'number' || !Number.isFinite(p.cost_usd) || p.cost_usd < 0) {
        throw new ValidationError('token_cost.cost_usd must be a finite non-negative number');
      }
      assertEnumValue(p.billing_type, BILLING_TYPES, 'token_cost.billing_type');
      assertEnumValue(p.cost_basis, COST_BASES, 'token_cost.cost_basis');
      break;
    }
    case 'evidence': {
      const p = payload as EvidencePayload;
      assertNonEmptyString(p.evidence_id, 'evidence_id');
      assertEnumValue(p.kind, EVIDENCE_KINDS, 'evidence.kind');
      assertNonEmptyString(p.relative_path, 'relative_path');
      assertNonEmptyString(p.sha256, 'sha256');
      assertNonEmptyString(p.captured_at_utc, 'captured_at_utc');
      if (p.immutable_evidence !== true) {
        throw new ValidationError('evidence.immutable_evidence must be true');
      }
      break;
    }
    case 'fix_regression': {
      const p = payload as FixRegressionPayload;
      assertNonEmptyString(p.defect_id, 'defect_id');
      assertNonEmptyString(p.approval_id, 'approval_id');
      assertNonEmptyString(p.worktree_branch, 'worktree_branch');
      assertNonEmptyString(p.fixed_by, 'fixed_by');
      if (p.retested_by !== undefined) {
        assertNonEmptyString(p.retested_by, 'retested_by');
      }
      if (!Array.isArray(p.original_evidence_links)) {
        throw new ValidationError('fix_regression.original_evidence_links must be an array');
      }
      assertEnumValue(p.retest_status, RETEST_STATUSES, 'fix_regression.retest_status');
      break;
    }
  }
}
