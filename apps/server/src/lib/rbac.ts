/** Role checks shared by admin / ops mutating routes. */

const MANAGER_ROLES = new Set(['owner', 'manager']);

export function isManagerRole(role: string | undefined | null): boolean {
  return Boolean(role && MANAGER_ROLES.has(role));
}

/**
 * Gate for manager-only mutations.
 * - api_key: forbidden (device/service keys never confer human manager
 *   privileges, even with a caller-supplied role)
 * - relaxed: allowed (local demo only)
 * - jwt: only owner/manager
 * - anything else: forbidden
 */
export function managerGate(
  authMode: string | undefined | null,
  authRole: string | undefined | null
): 'ok' | 'forbidden' {
  if (authMode === 'relaxed') return 'ok';
  if (authMode === 'jwt' && isManagerRole(authRole)) return 'ok';
  return 'forbidden';
}
