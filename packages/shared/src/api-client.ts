// Shared browser API helpers for POS / Admin / KDS terminals

function readEnv(key: string): string | undefined {
  try {
    // Vite / browser
    const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
    if (meta.env && key in meta.env) return meta.env[key];
  } catch {
    // ignore
  }
  try {
    return typeof process !== 'undefined' ? process.env[key] : undefined;
  } catch {
    return undefined;
  }
}

const API = readEnv('VITE_API_URL') ?? 'http://localhost:3000';
const SESSION_KEY = 'culinaryos_session';

export function getApiBase(): string {
  return API;
}

export function getTenantId(fallback?: string): string {
  return (
    readEnv('VITE_TENANT_ID') ??
    fallback ??
    '00000000-0000-0000-0000-000000000001'
  );
}

export function getDeviceApiKey(): string {
  return readEnv('VITE_DEVICE_API_KEY') ?? readEnv('VITE_INTERNAL_API_KEY') ?? '';
}

/** Prefer user session accessToken from PIN login; fall back to device key. */
export function getAccessToken(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw) as { accessToken?: string; tenantId?: string };
        if (session.accessToken) return session.accessToken;
      }
    }
  } catch {
    // ignore
  }
  return getDeviceApiKey();
}

/** Always send tenant; send Authorization when a user/device token is available. */
export function apiHeaders(
  tenantId?: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  let sessionTenant: string | undefined;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) sessionTenant = (JSON.parse(raw) as { tenantId?: string }).tenantId;
    }
  } catch {
    // ignore
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': tenantId || sessionTenant || getTenantId(),
    ...extra,
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiFetch(
  path: string,
  init: RequestInit & { tenantId?: string } = {}
): Promise<Response> {
  const { tenantId, headers: initHeaders, ...rest } = init;
  const headers = {
    ...apiHeaders(tenantId),
    ...(initHeaders as Record<string, string> | undefined),
  };
  return fetch(`${API}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    headers,
  });
}
