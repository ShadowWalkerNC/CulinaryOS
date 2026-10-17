/**
 * Permission layer: least privilege per skill + approval gating.
 *
 * Approval is required for risky writes involving money, purchases,
 * schedules, employees, destructive actions, or sensitive inventory
 * changes. Pure reads and routine operational writes (prep lists,
 * compliance logs) run without approval.
 */
import type { ApprovalCategory, ContractName, RiskLevel } from '../schemas/types.ts';

/** Categories that always require human approval when writing. */
export const APPROVAL_CATEGORIES: ReadonlySet<ApprovalCategory> = new Set([
  'money',
  'purchase',
  'schedule',
  'employee',
  'destructive',
  'inventory-sensitive',
]);

/** Contracts classified as writes (everything else is a read). */
export const WRITE_CONTRACTS: ReadonlySet<ContractName> = new Set([
  'prep.create',
  'waste.record',
  'purchase_order.draft',
  'haccp.log',
]);

export interface PermissionSpec {
  /** Contracts the skill may call; nothing else. */
  contracts: ContractName[];
  /** Categories the skill operates in. */
  categories: ApprovalCategory[];
}

export function isWrite(contract: ContractName): boolean {
  return WRITE_CONTRACTS.has(contract);
}

/**
 * Decide whether a skill execution needs human approval before its
 * write step runs. Reads never need approval.
 */
export function requiresApproval(
  spec: PermissionSpec,
  risk: RiskLevel,
  contractsUsed: ContractName[],
): boolean {
  const touchesWrite = contractsUsed.some((c) => isWrite(c));
  if (!touchesWrite) return false;
  if (risk === 'high') return true;
  return spec.categories.some((c) => APPROVAL_CATEGORIES.has(c));
}

/** Enforce least privilege: skill may only use its declared contracts. */
export function assertAllowed(spec: PermissionSpec, contract: ContractName): void {
  if (!spec.contracts.includes(contract)) {
    throw new Error(`permission denied: contract '${contract}' not granted to this skill`);
  }
}
