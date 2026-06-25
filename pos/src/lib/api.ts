import 'dotenv/config';
const BASE   = process.env.POS_API_URL      ?? 'http://localhost:3003';
const KEY    = process.env.INTERNAL_API_KEY ?? '';
const TENANT = process.env.TENANT_ID        ?? 'demo';

const headers = () => ({ 'Authorization': `Bearer ${KEY}`, 'X-Tenant-Id': TENANT, 'X-Caller-Service': 'pos', 'Content-Type': 'application/json' });

export const posGet    = async <T>(p: string)              => { const r = await fetch(`${BASE}${p}`, { headers: headers() }); if (!r.ok) throw new Error(`GET ${p} → ${r.status}`); return r.json() as Promise<T>; };
export const posPost   = async <T>(p: string, b: unknown)  => { const r = await fetch(`${BASE}${p}`, { method:'POST',   headers: headers(), body: JSON.stringify(b) }); if (!r.ok) throw new Error(`POST ${p} → ${r.status}`);  return r.json() as Promise<T>; };
export const posPatch  = async <T>(p: string, b: unknown)  => { const r = await fetch(`${BASE}${p}`, { method:'PATCH',  headers: headers(), body: JSON.stringify(b) }); if (!r.ok) throw new Error(`PATCH ${p} → ${r.status}`); return r.json() as Promise<T>; };
