// Shared browser API helpers for POS / Admin / KDS terminals

import { isPlaceholderSecret } from './secrets';

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

const SESSION_KEY = 'culinaryos_session';

export function getApiBase(): string {
  const envUrl = readEnv('VITE_API_URL');
  // If explicitly configured with a non-localhost remote URL, honor it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  // In browser environments on LAN / WiFi (e.g. tablet opening 192.168.1.50:5172),
  // route API calls to the same host on port 3000
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    const protocol = window.location.protocol || 'http:';
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `${protocol}//${host}:3000`;
    }
  }
  return envUrl ?? 'http://localhost:3000';
}

export function getTenantId(fallback?: string): string {
  return (
    readEnv('VITE_TENANT_ID') ??
    fallback ??
    '00000000-0000-0000-0000-000000000001'
  );
}

export function getDeviceApiKey(): string {
  const key = readEnv('VITE_DEVICE_API_KEY') ?? readEnv('VITE_INTERNAL_API_KEY') ?? '';
  return isPlaceholderSecret(key) ? '' : key;
}

/** Prefer user session accessToken from PIN login; fall back to device key. */
export function getAccessToken(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw) as { accessToken?: string; tenantId?: string };
        if (session.accessToken && !isPlaceholderSecret(session.accessToken)) {
          return session.accessToken;
        }
      }
    }
  } catch {
    // ignore
  }
  return getDeviceApiKey();
}

/** Always send tenant; send Authorization when a real user/device token is available. */
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
  // Skip placeholders so AUTH_RELAXED demo doesn't force the JWT path with junk tokens
  if (token && !isPlaceholderSecret(token)) {
    headers.Authorization = `Bearer ${token}`;
  }
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
  const base = getApiBase();
  return fetch(`${base}${path.startsWith('/') ? path : `/${path}`}`, {
    ...rest,
    headers,
  });
}
