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
import { pinRateLimit } from '../middleware/rateLimit.js';
import { isAuthRelaxed, isDemoAuthAllowed, isLiveSupabaseConfigured, isPlaceholderSecret } from '../lib/secrets.js';
import { DEMO_STAFF, hashPin, verifyPin } from '../lib/pin.js';
import { verifyManagerPinDirectly, getAuditLogs } from '../lib/audit.js';

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

authRoutes.post('/pin-login', pinRateLimit, async (c) => {
  const body = await c.req.json<{ pin?: string; tenant_id?: string }>().catch(() => ({} as any));
  const pin = String(body.pin ?? '').trim();
  const tenantId = String(body.tenant_id ?? process.env.VITE_TENANT_ID ?? DEMO_TENANT).trim();

  if (!/^\d{4,8}$/.test(pin)) {
    return err(c, 'VALIDATION_ERROR', 'PIN must be 4–8 digits', 422);
  }

  // Demo / local fallback when using standard test pins — explicit relaxed mode only
  const demoStaff = DEMO_STAFF.find((s) => s.pin === pin);
  const fallbackToken = process.env.DEVICE_API_KEY ?? process.env.INTERNAL_API_KEY ?? 'demo';
  if (isAuthRelaxed() && demoStaff) {
    return ok(c, {
      mode: 'demo',
      tenantId,
      userId: `demo-${demoStaff.role}`,
      displayName: demoStaff.displayName,
      role: demoStaff.role,
      accessToken: fallbackToken,
      token: fallbackToken,
    });
  }

  // ---- Live path: staff_pins + Supabase Auth password (= PIN) ----
  // Demo PINs are NEVER accepted in live mode — only real staff_pins rows.
  if (isLiveSupabaseConfigured()) {
    const admin = adminSupabase();
    if (!admin) {
      if (demoStaff && isDemoAuthAllowed()) {
        return ok(c, {
          mode: 'demo',
          tenantId,
          userId: `demo-${demoStaff.role}`,
          displayName: demoStaff.displayName,
          role: demoStaff.role,
          accessToken: fallbackToken,
          token: fallbackToken,
        });
      }
      return err(c, 'SERVICE_UNAVAILABLE', 'Auth backend unavailable', 503);
    }

    try {
      const queryPromise = admin
        .from('staff_pins')
        .select('user_id, pin_hash, display_name, active')
        .eq('tenant_id', tenantId)
        .eq('active', true);

      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 1500)
      );

      const { data: rows, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) return err(c, 'DB_ERROR', error.message, 500);

    const match = (rows ?? []).find((r: any) => verifyPin(pin, r.pin_hash));
    if (!match) {
      // Demo PINs are only honored in demo/relaxed mode — never against a live backend.
      const demo = DEMO_STAFF.find((s) => s.pin === pin);
      if (demo && isDemoAuthAllowed()) {
        return ok(c, {
          mode: 'device_key',
          tenantId,
          userId: `demo-${demo.role}`,
          displayName: demo.displayName,
          role: demo.role,
          token: process.env.DEVICE_API_KEY ?? 'dev-device-key-local',
        });
      }
      c.set('pinAuthFailed', true);
      return err(c, 'UNAUTHORIZED', 'Invalid PIN', 401);
    }

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(match.user_id);
    if (userErr || !userData?.user?.email) {
      const demo = DEMO_STAFF.find((s) => s.pin === pin);
      if (demo && isDemoAuthAllowed()) {
        return ok(c, {
          mode: 'device_key',
          tenantId,
          userId: match.user_id,
          displayName: match.display_name,
          role: 'server',
          token: process.env.DEVICE_API_KEY ?? 'dev-device-key-local',
        });
      }
      c.set('pinAuthFailed', true);
      return err(c, 'UNAUTHORIZED', 'Staff Auth user missing', 401);
    }

    const anon = anonAuthClient();
    if (!anon) return err(c, 'SERVICE_UNAVAILABLE', 'Anon key required for session exchange', 503);

    const { data: sessionData, error: signErr } = await anon.auth.signInWithPassword({
      email: userData.user.email,
      password: pin,
    });

    if (signErr || !sessionData.session) {
      const demo = DEMO_STAFF.find((s) => s.pin === pin);
      if (demo && isDemoAuthAllowed()) {
        return ok(c, {
          mode: 'device_key',
          tenantId,
          userId: match.user_id,
          displayName: match.display_name,
          role: 'server',
          token: process.env.DEVICE_API_KEY ?? 'dev-device-key-local',
        });
      }
      c.set('pinAuthFailed', true);
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
    } catch {
      // Fallback if live Supabase is degraded — demo PINs only in demo/relaxed mode
      if (demoStaff && isDemoAuthAllowed()) {
        return ok(c, {
          mode: 'device_key',
          tenantId,
          userId: `demo-${demoStaff.role}`,
          displayName: demoStaff.displayName,
          role: demoStaff.role,
          token: process.env.DEVICE_API_KEY ?? 'dev-device-key-local',
        });
      }
      return err(c, 'SERVICE_UNAVAILABLE', 'Auth backend unavailable', 503);
    }
  }

  // Missing credentials do not authorize demo PINs in a deployed process.
  if (!isDemoAuthAllowed()) {
    return err(c, 'SERVICE_UNAVAILABLE', 'Auth backend unavailable', 503);
  }

  // ---- Explicit local demo / isolated test path ----
  const demo = DEMO_STAFF.find((s) => s.pin === pin);
  if (!demo) {
    // Don't advertise which demo PINs exist.
    c.set('pinAuthFailed', true);
    return err(c, 'UNAUTHORIZED', 'Invalid PIN', 401);
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

/** Verify manager authorization PIN */
export async function verifyManagerPinHelper(
  pin: string,
  tenantId: string
): Promise<{ authorized: boolean; managerId?: string; managerName?: string; role: string }> {
  const res = await verifyManagerPinDirectly(tenantId, pin);
  if (res.authorized) {
    const result: { authorized: boolean; managerId?: string; managerName?: string; role: string } = {
      authorized: true,
      role: res.role || 'manager',
    };
    if (res.managerId) result.managerId = res.managerId;
    if (res.managerName) result.managerName = res.managerName;
    return result;
  }
  return { authorized: false, role: 'none' };
}


authRoutes.post('/verify-manager-pin', pinRateLimit, async (c) => {
  const body = await c.req.json<{ pin?: string; tenant_id?: string }>().catch(() => ({} as any));
  const pin = String(body.pin ?? '').trim();
  const tenantId = String(body.tenant_id ?? c.get('tenantId') ?? process.env.VITE_TENANT_ID ?? DEMO_TENANT).trim();

  if (!pin) {
    return err(c, 'VALIDATION_ERROR', 'pin is required', 422);
  }

  const result = await verifyManagerPinDirectly(tenantId, pin);
  if (!result.authorized) {
    c.set('pinAuthFailed', true);
    return ok(c, { authorized: false, role: 'none', error: result.error ?? 'Unauthorized' });
  }

  return ok(c, {
    authorized: true,
    managerId: result.managerId,
    managerName: result.managerName,
    role: result.role,
  });
});

// GET /v1/auth/audit-logs
authRoutes.get('/audit-logs', requireTenant, async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId') || DEMO_TENANT;
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const logs = await getAuditLogs(supabase, tenantId, limit);
  return ok(c, logs);
});

/** Dev helper: hash a PIN the same way seed/staff_pins expects. */
authRoutes.post('/hash-pin', async (c) => {
  // Dev-only: hashing arbitrary PINs must never be exposed in production,
  // relaxed mode or not.
  if (process.env.NODE_ENV === 'production' || !isDemoAuthAllowed()) {
    return err(c, 'FORBIDDEN', 'Not available', 403);
  }
  const body = await c.req.json<{ pin?: string }>().catch(() => ({} as any));
  if (!body.pin) return err(c, 'VALIDATION_ERROR', 'pin required', 422);
  return ok(c, { pin_hash: hashPin(String(body.pin)) });
});


export const RBAC_ROLES_MATRIX = [
  {
    role: 'owner',
    title: 'Restaurant Owner',
    hasHiringFiringAuthority: true,
    flsaTipPoolEligible: false,
    flsaCitation: '29 U.S.C. 203(m)(2)(B) — Excluded (Owner/Employer)',
    capabilities: ['*'],
  },
  {
    role: 'manager',
    title: 'General Manager',
    hasHiringFiringAuthority: true,
    flsaTipPoolEligible: false,
    flsaCitation: '29 U.S.C. 203(m)(2)(B) — Excluded (Manager/Supervisor)',
    capabilities: ['pos:*', 'kds:*', 'admin:*', 'ops:*', 'reports:*', 'void:approve', 'drawer:kick'],
  },
  {
    role: 'executive_chef',
    title: 'Executive / Head Chef',
    hasHiringFiringAuthority: true,
    flsaTipPoolEligible: false,
    flsaCitation: '29 U.S.C. 203(m)(2)(B) — Excluded (BOH Management)',
    capabilities: ['kds:*', 'kitchenkit:*', 'pantry:*', 'purchasing:*', 'menu:86', 'intelligence:*'],
  },
  {
    role: 'server',
    title: 'Front-of-House Server',
    hasHiringFiringAuthority: false,
    flsaTipPoolEligible: true,
    flsaCitation: 'Eligible — FOH Tipped Employee',
    capabilities: ['pos:orders', 'pos:tables', 'pos:tabs', 'pos:checkout'],
  },
  {
    role: 'bartender',
    title: 'Bartender',
    hasHiringFiringAuthority: false,
    flsaTipPoolEligible: true,
    flsaCitation: 'Eligible — FOH Tipped Employee',
    capabilities: ['pos:orders', 'pos:tabs', 'pos:checkout', 'drawer:open', 'kds:bar'],
  },
  {
    role: 'line_cook',
    title: 'Line Cook / Station Chef',
    hasHiringFiringAuthority: false,
    flsaTipPoolEligible: true,
    flsaCitation: 'Eligible only when employer pays full statutory minimum wage (no tip credit)',
    capabilities: ['kds:station', 'kds:bump', 'kitchenkit:prep', 'ops:waste'],
  },
  {
    role: 'host',
    title: 'Host / Cashier',
    hasHiringFiringAuthority: false,
    flsaTipPoolEligible: true,
    flsaCitation: 'Eligible — FOH Support Pool',
    capabilities: ['pos:tables', 'reservations:*', 'display:pickup'],
  },
];

authRoutes.get('/roles', (c) => {
  return ok(c, RBAC_ROLES_MATRIX);
});

authRoutes.get('/session', requireTenant, (c) => {
  const role = c.get('authRole') ?? 'server';
  const roleSpec = RBAC_ROLES_MATRIX.find((r) => r.role === role) ?? RBAC_ROLES_MATRIX[3]!;
  return ok(c, {
    tenantId: c.get('tenantId'),
    userId: c.get('userId') ?? 'demo-session',
    role,
    title: roleSpec.title,
    authMode: c.get('authMode') ?? 'relaxed',
    flsaTipPoolEligible: roleSpec.flsaTipPoolEligible,
    hasHiringFiringAuthority: roleSpec.hasHiringFiringAuthority,
    capabilities: roleSpec.capabilities,
  });
});

authRoutes.post('/device-token', requireTenant, async (c) => {
  const tenantId = c.get('tenantId') || DEMO_TENANT;
  const body = await c.req
    .json<{ label?: string; deviceRole?: 'pos' | 'kds' | 'display' | 'handheld'; station?: string; managerPin?: string }>()
    .catch(() => ({} as any));

  const managerPin = String(body.managerPin ?? '').trim();
  const mgr = await verifyManagerPinDirectly(tenantId, managerPin);
  if (!mgr.authorized) {
    return err(c, 'FORBIDDEN', 'Valid Manager or Owner PIN is required to mint device tokens', 403);
  }

  const label = String(body.label || 'POS Terminal #1').trim();
  const deviceRole = body.deviceRole || 'pos';
  const station = body.station || null;
  const rawToken = `cos_dev_${deviceRole}_${Buffer.from(`${tenantId}:${label}:${Date.now()}`).toString('base64url')}`;

  return ok(
    c,
    {
      deviceId: `dev-${Date.now().toString(36)}`,
      tenantId,
      label,
      deviceRole,
      station,
      issuedByManagerId: mgr.managerId ?? 'manager',
      token: rawToken,
      capabilities:
        deviceRole === 'kds'
          ? [`kds:${station || 'hot'}`, 'kds:bump']
          : deviceRole === 'display'
          ? ['display:read', 'display:bump']
          : ['pos:orders', 'pos:checkout', 'kds:read'],
      expiresAt: new Date(Date.now() + 365 * 86400 * 1000).toISOString(),
    },
    201,
  );
});
