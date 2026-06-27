// @culinaryos/auth
// Auth context, session helpers, PIN login.
// TODO(phase-1): implement Supabase session management
// TODO(phase-6): implement staff PIN login

export type AuthRole = 'owner' | 'manager' | 'staff';

export interface Session {
  userId: string;
  tenantId: string;
  role: AuthRole;
  employeeId?: string;
}

// Placeholder — implemented in Phase 1
export function getSession(): Session | null {
  return null;
}
