// ============================================================
// CulinaryOS — Auth routes
// POST /v1/auth/pin-login  — terminal PIN → Supabase session (+ demo fallback)
// GET  /v1/auth/me         — current membership for Bearer JWT / device key
// ============================================================

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../types.js';
import { adminSupabase } from '../middleware/supabase.js';
import { ok, err, requireTenant } from '../middleware/auth.js';
import { isLiveSupabaseConfigured, isPlaceholderSecret } from '../lib/secrets.js';
import { DEMO_STAFF, hashPin, verifyPin } from '../lib/pin.js';

export const authRoutes = new Hono<Env>();

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

function anonAuthClient() {
  const url = process.env.SUPABASE_URL ?? '';
  const anon = process.env.SUPABASE_ANON_KEY ?? '';
  if (isPlaceholderSecret(url) || isPlaceholderSecret(anon)) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

authRoutes.post('/pin-login', async (c) => {
  const body = await c.req.json<{ pin?: string; tenant_id?: string }>().catch(() => ({} as any));
  const pin = String(body.pin ?? '').trim();
  const tenantId = String(body.tenant_id ?? process.env.VITE_TENANT_ID ?? DEMO_TENANT).trim();

  if (!/^\d{4,8}$/.test(pin)) {
    return err(c, 'VALIDATION_ERROR', 'PIN must be 4–8 digits', 422);
  }

  // ---- Live path: staff_pins + Supabase Auth password (= PIN) ----
  if (isLiveSupabaseConfigured()) {
    const admin = adminSupabase();
    if (!admin) return err(c, 'SERVICE_UNAVAILABLE', 'Auth backend unavailable', 503);

    const { data: rows, error } = await admin
      .from('staff_pins')
      .select('user_id, pin_hash, display_name, active')
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (error) return err(c, 'DB_ERROR', error.message, 500);

    const match = (rows ?? []).find((r) => verifyPin(pin, r.pin_hash));
    if (!match) return err(c, 'UNAUTHORIZED', 'Invalid PIN', 401);

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(match.user_id);
    if (userErr || !userData?.user?.email) {
      return err(c, 'UNAUTHORIZED', 'Staff Auth user missing', 401);
    }

    const anon = anonAuthClient();
    if (!anon) return err(c, 'SERVICE_UNAVAILABLE', 'Anon key required for session exchange', 503);

    const { data: sessionData, error: signErr } = await anon.auth.signInWithPassword({
      email: userData.user.email,
      password: pin,
    });

    if (signErr || !sessionData.session) {
      return err(c, 'UNAUTHORIZED', signErr?.message ?? 'PIN login failed', 401);
    }

    const { data: membership } = await admin
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', match.user_id)
      .maybeSingle();

    return ok(c, {
      mode: 'supabase',
      tenantId,
      userId: match.user_id,
      displayName: match.display_name,
      role: membership?.role ?? 'server',
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
      expiresAt: sessionData.session.expires_at,
    });
  }

  // ---- Demo / offline path (no live service role) ----
  const demo = DEMO_STAFF.find((s) => s.pin === pin);
  if (!demo) {
    return err(c, 'UNAUTHORIZED', 'Invalid PIN. Demo PINs: 1234 (server), 5678 (manager)', 401);
  }

  const deviceKey =
    process.env.DEVICE_API_KEY && !isPlaceholderSecret(process.env.DEVICE_API_KEY)
      ? process.env.DEVICE_API_KEY
      : process.env.INTERNAL_API_KEY && !isPlaceholderSecret(process.env.INTERNAL_API_KEY)
        ? process.env.INTERNAL_API_KEY
        : 'demo';

  return ok(c, {
    mode: 'demo',
    tenantId,
    userId: `demo-${demo.role}`,
    displayName: demo.displayName,
    role: demo.role,
    accessToken: deviceKey,
    refreshToken: null,
    expiresAt: null,
    note: 'Demo session — set SUPABASE_SERVICE_ROLE_KEY and run pnpm seed for live Auth.',
  });
});

authRoutes.get('/me', requireTenant, async (c) => {
  return ok(c, {
    tenantId: c.get('tenantId'),
    userId: c.get('userId') ?? null,
    role: c.get('authRole') ?? null,
    authMode: c.get('authMode') ?? 'unknown',
  });
});

/** Dev helper: hash a PIN the same way seed/staff_pins expects. */
authRoutes.post('/hash-pin', async (c) => {
  if (process.env.NODE_ENV === 'production' && process.env.AUTH_RELAXED !== 'true') {
    return err(c, 'FORBIDDEN', 'Not available', 403);
  }
  const body = await c.req.json<{ pin?: string }>().catch(() => ({} as any));
  if (!body.pin) return err(c, 'VALIDATION_ERROR', 'pin required', 422);
  return ok(c, { pin_hash: hashPin(String(body.pin)) });
});
