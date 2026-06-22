import 'dotenv/config';

const BASE = process.env.KDS_API_URL    ?? 'http://localhost:3002';
const KEY  = process.env.INTERNAL_API_KEY ?? '';
const TENANT = process.env.TENANT_ID    ?? 'demo';

export async function kdsGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'X-Tenant-Id': TENANT,
      'X-Caller-Service': 'kds',
    },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function kdsPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'X-Tenant-Id': TENANT,
      'X-Caller-Service': 'kds',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function kdsPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'X-Tenant-Id': TENANT,
      'X-Caller-Service': 'kds',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
