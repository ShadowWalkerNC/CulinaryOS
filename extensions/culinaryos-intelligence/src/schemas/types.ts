/**
 * Shared core types for culinaryos-intelligence.
 * Zero dependencies. All modules import from here (or connectors/contracts).
 */

/** Risk tier for an intent or skill execution. */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Minimal context domains. The router returns only the domains a request
 * needs so callers load minimum context and reduce token use.
 */
export type ContextDomain =
  | 'sales'
  | 'menu'
  | 'recipes'
  | 'inventory'
  | 'prep'
  | 'purchasing'
  | 'waste'
  | 'schedule'
  | 'labor'
  | 'temps'
  | 'compliance'
  | 'events';

/** Stable contract names a connector must implement. Never direct DB. */
export type ContractName =
  | 'inventory.get'
  | 'sales.summary'
  | 'recipes.search'
  | 'prep.create'
  | 'waste.record'
  | 'schedule.read'
  | 'purchase_order.draft'
  | 'temps.read'
  | 'haccp.log'
  | 'menu.cost'
  | 'events.read';

/** Write categories that gate approval decisions. */
export type ApprovalCategory =
  | 'readonly'
  | 'money'
  | 'purchase'
  | 'schedule'
  | 'employee'
  | 'destructive'
  | 'inventory-sensitive'
  | 'operational-write';

/** Fast System-1 router output. */
export interface IntentRoute {
  intent: string;
  agent: string;
  risk: RiskLevel;
  context: ContextDomain[];
  /** 0..1 heuristic confidence; low values mean "ask or load more". */
  confidence: number;
}

/** Single input field descriptor for a skill schema. */
export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'object';
  required: boolean;
  enum?: string[];
  description?: string;
}

/** Machine-checkable input/output contract for a skill. */
export interface SkillSchema {
  input: FieldSchema[];
  output: string[];
}

/** Static skill definition (metadata + governance). */
export interface SkillDefinition {
  id: string;
  title: string;
  description: string;
  /** Owning role agent id. */
  agent: string;
  inputs: string[];
  outputs: string[];
  permissions: ApprovalCategory[];
  requiredTools: ContractName[];
  instructions: string;
  schema: SkillSchema;
  risk: RiskLevel;
}

/** Role agent: a persona grouping reusable skills. */
export interface AgentDefinition {
  id: string;
  title: string;
  description: string;
  skillIds: string[];
  systemPrompt: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

/** A human-approval request for a risky write. */
export interface ApprovalRequest {
  id: string;
  skillId: string;
  action: string;
  category: ApprovalCategory;
  risk: RiskLevel;
  /** Redacted-safe summary shown to the approver. */
  summary: string;
  payload: Record<string, unknown>;
  requestedAt: string;
  status: ApprovalStatus;
  decidedAt?: string;
  decidedBy?: string;
}

/** Result envelope returned by every skill execution. */
export interface SkillResult<T = Record<string, unknown>> {
  ok: boolean;
  skillId: string;
  data?: T;
  summary?: string;
  error?: string;
  /** Set when execution paused for human approval. */
  approvalRequired?: boolean;
  approvalId?: string;
}

/** Single audit trail entry. Secrets must be redacted before writing. */
export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  skillId?: string;
  approvalId?: string;
  ok: boolean;
  detail?: Record<string, unknown>;
}
