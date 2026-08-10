// @culinaryos/auth
// Auth context, session helpers, PIN login against apps/server.

export type AuthRole = 'owner' | 'manager' | 'staff' | 'chef' | 'server' | 'viewer';

export interface Session {
  userId: string;
  tenantId: string;
  role: AuthRole;
  employeeId?: string;
  accessToken?: string;
  displayName?: string;
  mode?: 'supabase' | 'demo';
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

export interface PinLoginResult {
  ok: boolean;
  session?: Session;
  error?: string;
}

/** Call POST /v1/auth/pin-login and persist the session on success. */
export async function pinLogin(opts: {
  pin: string;
  tenantId: string;
  apiBase?: string;
}): Promise<PinLoginResult> {
  const base = opts.apiBase ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: opts.pin, tenant_id: opts.tenantId }),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      data?: {
        userId: string;
        tenantId: string;
        role: string;
        displayName: string;
        accessToken: string;
        mode?: 'supabase' | 'demo';
      };
      error?: { message?: string };
    };
    if (!res.ok || !body.ok || !body.data) {
      return { ok: false, error: body.error?.message ?? 'Invalid PIN' };
    }
    const session: Session = {
      userId: body.data.userId,
      tenantId: body.data.tenantId,
      role: (body.data.role as AuthRole) || 'server',
      displayName: body.data.displayName,
      accessToken: body.data.accessToken,
      ...(body.data.mode ? { mode: body.data.mode } : {}),
    };
    setSession(session);
    return { ok: true, session };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Login failed' };
  }
}
