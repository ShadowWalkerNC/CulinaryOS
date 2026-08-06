// @culinaryos/auth
// Auth context, session helpers, PIN login.

export type AuthRole = 'owner' | 'manager' | 'staff' | 'chef' | 'server' | 'viewer';

export interface Session {
  userId: string;
  tenantId: string;
  role: AuthRole;
  employeeId?: string;
  accessToken?: string;
}

const SESSION_KEY = 'culinaryos_session';

export function getSession(): Session | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!session) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

/** Headers for authenticated API calls (JWT or device key + tenant). */
export function authHeaders(
  tenantId: string,
  opts?: { accessToken?: string; deviceKey?: string }
): Record<string, string> {
  const session = getSession();
  const token = opts?.accessToken ?? opts?.deviceKey ?? session?.accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': tenantId || session?.tenantId || '',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
