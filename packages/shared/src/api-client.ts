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

/** Always send tenant; send Authorization when a device/user token is available. */
export function apiHeaders(
  tenantId?: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': tenantId || getTenantId(),
    ...extra,
  };
  const key = getDeviceApiKey();
  if (key) headers.Authorization = `Bearer ${key}`;
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
