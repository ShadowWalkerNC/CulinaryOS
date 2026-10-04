import { Hono } from 'hono';
import { DomainError, opaqueToken, tokenHash, uuid } from './domain.js';
import { isNativePostgresEnabled } from './config.js';
import type { AuthRunner, NativeExecutor, NativeVerifiedIdentity, TenantRunner } from './executor.js';
import { managerGateNative, resolveNativeIdentity, satisfiesCapability, verifyPinAndMintSession, type PoolLike } from './identity.js';
import { addLineItem, createOrder, getOrder, listActiveMenuItems, listLineItems, voidLineItem } from './orders.js';
import { ackPendingPush, fireCourse, listPendingPush, sendOrderToKitchen } from './kitchen.js';
import { recordCashCompPayment, recordRefund } from './payments.js';
import { closeDrawer, getDrawer, openDrawer, recordDrawerMovement } from './drawers.js';
import { allocateCheck } from './splits.js';

export interface NativeEnv {
  Variables: {
    nativeAuth: NativeVerifiedIdentity;
    tokenHash: string;
    tenantId: string;
    requestId: string;
  };
}

export interface NativeAppOptions {
  enabled?: boolean;
  pool: PoolLike;
  /** Token-bound tenant runner (see `./transactions.ts`). Injected to keep this slice decoupled. */
  runTenant: TenantRunner;
  /** Auth-plane runner for PIN login. */
  runAuth: AuthRunner;
}

function sendError(c: { json(data: unknown, status?: number): Response }, error: unknown): Response {
  if (error instanceof DomainError) {
    return c.json({ ok: false, error: { code: error.code, message: error.message } }, error.status as 400);
  }
  const message = error instanceof Error ? error.message : 'Internal error';
  return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message } }, 500);
}

function bearerToken(header: string | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

async function readBody<T>(c: { req: { json(): Promise<unknown> } }): Promise<T> {
  const parsed = await c.req.json().catch(() => ({}));
  return (parsed && typeof parsed === 'object' ? parsed : {}) as T;
}

/**
 * Feature-gated native factory. Throws unless CULINARYOS_NATIVE_PG=true
 * (or options.enabled). Mounting into the live server entrypoint is a
 * separate Codex-reviewed step; this factory is integration-ready but
 * intentionally not wired to production traffic here.
 *
 * Identity is verified twice: once in middleware (fail-fast 401 plus
 * tenant-header forgery 403) and again inside every tenant transaction by
 * the token-bound runner, which re-resolves the credential from database
 * state. Services always scope by the in-transaction identity.
 */
export function createNativePostgresApp(options: NativeAppOptions): Hono<NativeEnv> {
  if (!isNativePostgresEnabled(options)) {
    throw new Error('Native PostgreSQL app is disabled (set CULINARYOS_NATIVE_PG=true)');
  }
  const pool = options.pool;
  const runTenant = options.runTenant;
  const runAuth = options.runAuth;
  const app = new Hono<NativeEnv>();

  app.use('*', async (c, next) => {
    c.set('requestId', crypto.randomUUID());
    await next();
  });

  async function withTenant<T>(hash: string, callback: (tx: NativeExecutor, identity: NativeVerifiedIdentity) => Promise<T>): Promise<T> {
    return runTenant(hash, callback);
  }

  async function requireNative(c: { req: { header(name: string): string | undefined }; set(key: string, value: unknown): void; json(data: unknown, status?: number): Response }, next: () => Promise<void>): Promise<Response | void> {
    const token = bearerToken(c.req.header('Authorization'));
    if (!token) return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authorization Bearer [REDACTED] required' } }, 401);
    const auth = await resolveNativeIdentity(pool, token);
    if (!auth) return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired credential' } }, 401);
    const headerTenant = c.req.header('X-Tenant-Id');
    if (headerTenant && headerTenant.toLowerCase() !== auth.tenantId.toLowerCase()) {
      return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Tenant header does not match verified identity' } }, 403);
    }
    c.set('nativeAuth', auth);
    c.set('tokenHash', tokenHash(token));
    c.set('tenantId', auth.tenantId);
    await next();
  }

  const registerRoute = (
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    subpath: string,
    handler: (c: any) => Promise<Response> | Response,
  ) => {
    app[method](`/v1/native${subpath}`, handler as any);
    app[method](`/v1${subpath}`, handler as any);
  };

  // Unauthenticated PIN login. Tenant comes from the verified PIN scope.
  registerRoute('post', '/auth/pin-login', async (c) => {
    try {
      const body = await readBody<{ tenantId?: string; pin?: string; deviceId?: string }>(c);
      if (!body.tenantId || !body.pin) {
        return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId and pin are required' } }, 422);
      }
      const tenantId = uuid(body.tenantId, 'tenant');
      const session = await runAuth((tx) =>
        verifyPinAndMintSession(tx, { tenantId, pin: body.pin as string, deviceId: body.deviceId ?? null }),
      );
      return c.json({ ok: true, data: session }, 200);
    } catch (error) {
      return sendError(c, error);
    }
  });

  app.use('/v1/native/*', requireNative as never);
  app.use('/v1/auth/me', requireNative as never);
  app.use('/v1/auth/rotate', requireNative as never);
  app.use('/v1/auth/revoke', requireNative as never);
  app.use('/v1/devices', requireNative as never);
  app.use('/v1/devices/*', requireNative as never);
  app.use('/v1/menu/*', requireNative as never);
  app.use('/v1/orders', requireNative as never);
  app.use('/v1/orders/*', requireNative as never);
  app.use('/v1/kds/*', requireNative as never);
  app.use('/v1/payments/*', requireNative as never);
  app.use('/v1/drawers', requireNative as never);
  app.use('/v1/drawers/*', requireNative as never);
  app.use('/v1/checks/*', requireNative as never);

  registerRoute('get', '/auth/me', (c) => {
    const auth = c.get('nativeAuth');
    return c.json({ ok: true, data: auth });
  });

  registerRoute('post', '/auth/rotate', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      if (auth.kind !== 'session') {
        return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Session rotation is available for human sessions only' } }, 403);
      }
      const priorHash = c.get('tokenHash');
      const newToken = opaqueToken('session');
      const newHash = tokenHash(newToken);
      const ttlHours = 12;
      const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();
      const minted = await runAuth((tx) =>
        tx.query<{ mint_session: string }>(
          'SELECT public.mint_session($1, $2, $3, $4, $5, NULL, $6) AS mint_session',
          [newHash, auth.userId, auth.tenantId, auth.deviceId, expiresAt, priorHash],
        ),
      );
      const role = minted.rows[0]?.mint_session;
      if (!role) throw new DomainError('INTERNAL_ERROR', 'Session rotation failed', 500);
      await runAuth((tx) =>
        tx.query('SELECT public.revoke_session($1, $2)', [newHash, priorHash]),
      );
      return c.json({
        ok: true,
        data: {
          token: newToken,
          userId: auth.userId,
          tenantId: auth.tenantId,
          role,
          expiresAt,
        },
      });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/auth/revoke', async (c) => {
    try {
      const callerHash = c.get('tokenHash');
      const body = await readBody<{ targetToken?: string; targetTokenHash?: string }>(c);
      let targetHash = callerHash;
      if (body.targetToken) {
        targetHash = tokenHash(body.targetToken);
      } else if (body.targetTokenHash) {
        targetHash = body.targetTokenHash.toLowerCase();
      }
      const res = await withTenant(callerHash, (tx) =>
        tx.query<{ revoke_session: boolean }>(
          'SELECT public.revoke_session($1, $2) AS revoke_session',
          [callerHash, targetHash],
        ),
      );
      const revoked = Boolean(res.rows[0]?.revoke_session);
      return c.json({ ok: true, data: { revoked } });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/devices', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      if (managerGateNative(auth) !== 'ok') {
        return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Manager session required to register device' } }, 403);
      }
      const body = await readBody<{ label?: string; capabilities?: string[]; ttlDays?: number }>(c);
      if (!body.label || !Array.isArray(body.capabilities) || body.capabilities.length === 0) {
        return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'label and non-empty capabilities array required' } }, 422);
      }
      const callerHash = c.get('tokenHash');
      const token = opaqueToken('device');
      const keyHash = tokenHash(token);
      const ttlDays = body.ttlDays ?? 365;
      const expiresAt = new Date(Date.now() + ttlDays * 86400_000).toISOString();
      const res = await withTenant(callerHash, (tx) =>
        tx.query<{ register_device_key: string }>(
          'SELECT public.register_device_key($1, $2, $3, $4, $5::jsonb, $6) AS register_device_key',
          [callerHash, keyHash, auth.tenantId, body.label, JSON.stringify(body.capabilities), expiresAt],
        ),
      );
      const deviceId = res.rows[0]?.register_device_key;
      return c.json(
        {
          ok: true,
          data: {
            deviceId,
            token,
            label: body.label,
            capabilities: body.capabilities,
            expiresAt,
          },
        },
        201,
      );
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('delete', '/devices/:id', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      if (managerGateNative(auth) !== 'ok') {
        return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Manager session required to revoke device' } }, 403);
      }
      const deviceId = uuid(c.req.param('id'), 'device');
      const callerHash = c.get('tokenHash');
      const res = await withTenant(callerHash, (tx) =>
        tx.query<{ revoke_device_key: boolean }>(
          'SELECT public.revoke_device_key($1, $2) AS revoke_device_key',
          [callerHash, deviceId],
        ),
      );
      const revoked = Boolean(res.rows[0]?.revoke_device_key);
      return c.json({ ok: true, data: { revoked } });
    } catch (error) {
      return sendError(c, error);
    }
  });

  function capabilityDenied(c: { json(data: unknown, status?: number): Response }, auth: NativeVerifiedIdentity, capability: string): Response | null {
    if (satisfiesCapability(auth, capability)) return null;
    return c.json({ ok: false, error: { code: 'FORBIDDEN', message: `Device lacks the ${capability} capability` } }, 403);
  }

  registerRoute('get', '/menu/items', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'menu:read');
      if (denied) return denied;
      const hash = c.get('tokenHash');
      const items = await withTenant(hash, (tx, identity) => listActiveMenuItems(tx, identity.tenantId));
      return c.json({ ok: true, data: items });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/orders', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'orders:write');
      if (denied) return denied;
      const hash = c.get('tokenHash');
      const body = await readBody<{ tableNumber?: string | null; takeaway?: boolean; coverCount?: number; serverName?: string | null; notes?: string | null }>(c);
      const order = await withTenant(hash, (tx, identity) => createOrder(tx, identity.tenantId, body));
      return c.json({ ok: true, data: order }, 201);
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('get', '/orders/:id', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'orders:read');
      if (denied) return denied;
      const hash = c.get('tokenHash');
      const id = c.req.param('id');
      const data = await withTenant(hash, async (tx, identity) => ({
        order: await getOrder(tx, identity.tenantId, id),
        items: await listLineItems(tx, identity.tenantId, id),
      }));
      return c.json({ ok: true, data: data });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/orders/:id/items', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'orders:write');
      if (denied) return denied;
      const hash = c.get('tokenHash');
      const id = c.req.param('id');
      const body = await readBody<{ menuItemId: string; quantity?: number; unitPrice?: number; modifiers?: string[]; station?: string; courseNumber?: number; notes?: string | null; taxRateBps?: number }>(c);
      const data = await withTenant(hash, (tx, identity) => addLineItem(tx, identity.tenantId, id, body));
      return c.json({ ok: true, data: data }, 201);
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/orders/:id/items/:itemId/void', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      if (managerGateNative(auth) !== 'ok') {
        return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Voids require a human manager session' } }, 403);
      }
      const hash = c.get('tokenHash');
      const id = c.req.param('id');
      const itemId = c.req.param('itemId');
      const body = await readBody<{ reason?: string }>(c);
      if (!body.reason) return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required' } }, 422);
      const data = await withTenant(hash, (tx, identity) => voidLineItem(tx, identity.tenantId, id, itemId, { reason: body.reason as string }));
      return c.json({ ok: true, data: data });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/orders/:id/send', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'orders:write');
      if (denied) return denied;
      const hash = c.get('tokenHash');
      const id = c.req.param('id');
      const body = await readBody<{ operationId?: string; eventId?: string }>(c);
      if (!body.operationId) {
        return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'operationId is required for retry-safe send' } }, 422);
      }
      const args: { eventId?: string } = {};
      if (body.eventId !== undefined) args.eventId = body.eventId;
      const data = await withTenant(hash, (tx, identity) => sendOrderToKitchen(tx, identity.tenantId, id, body.operationId as string, args));
      return c.json({ ok: true, data: data });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/orders/:id/fire-course', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'tickets:write');
      if (denied) return denied;
      const hash = c.get('tokenHash');
      const id = c.req.param('id');
      const body = await readBody<{ courseNumber?: number; operationId?: string }>(c);
      if (body.courseNumber === undefined || !body.operationId) {
        return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'courseNumber and operationId are required' } }, 422);
      }
      const data = await withTenant(hash, (tx, identity) => fireCourse(tx, identity.tenantId, id, body.courseNumber as number, body.operationId as string));
      return c.json({ ok: true, data: data });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('get', '/kds/pending-push', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'kds:read');
      if (denied) return denied;
      const hash = c.get('tokenHash');
      const params: { stationId?: string; since?: string; limit?: number } = {};
      const stationId = c.req.query('stationId');
      const since = c.req.query('since');
      const limitRaw = c.req.query('limit');
      if (stationId !== undefined) params.stationId = stationId;
      if (since !== undefined) params.since = since;
      if (limitRaw !== undefined) params.limit = Number(limitRaw);
      const data = await withTenant(hash, (tx, identity) => listPendingPush(tx, identity.tenantId, params));
      return c.json({ ok: true, data: data });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/kds/pending-push/ack', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'kds:read');
      if (denied) return denied;
      const hash = c.get('tokenHash');
      const body = await readBody<{ ids?: string[] }>(c);
      const count = await withTenant(hash, (tx, identity) => ackPendingPush(tx, identity.tenantId, body.ids ?? []));
      return c.json({ ok: true, data: { acknowledged: count } });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/payments/cash-comp', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'orders:write');
      if (denied) return denied;
      const hash = c.get('tokenHash');
      const body = await readBody<{ orderId: string; method: string; amount: number; tipCents?: number; operationId: string }>(c);
      const data = await withTenant(hash, (tx, identity) => recordCashCompPayment(tx, auth, identity.tenantId, body));
      return c.json({ ok: true, data: data }, 201);
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/payments/refund', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const hash = c.get('tokenHash');
      const body = await readBody<{ paymentId: string; amountCents: number; reason: string; operationId: string }>(c);
      const data = await withTenant(hash, (tx, identity) => recordRefund(tx, auth, identity.tenantId, body));
      return c.json({ ok: true, data: data });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/drawers/open', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const hash = c.get('tokenHash');
      const body = await readBody<{ drawerName?: string; openingFloatCents?: number; notes?: string | null }>(c);
      const data = await withTenant(hash, (tx, identity) => openDrawer(tx, auth, identity.tenantId, body));
      return c.json({ ok: true, data: data }, 201);
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/drawers/movement', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const hash = c.get('tokenHash');
      const body = await readBody<{ drawerName?: string; kind: 'paid_in' | 'paid_out' | 'cash_sale'; amountCents: number }>(c);
      const data = await withTenant(hash, (tx, identity) => recordDrawerMovement(tx, auth, identity.tenantId, body));
      return c.json({ ok: true, data: data });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/drawers/close', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const hash = c.get('tokenHash');
      const body = await readBody<{ drawerName?: string; countedCents: number }>(c);
      const data = await withTenant(hash, (tx, identity) => closeDrawer(tx, auth, identity.tenantId, body));
      return c.json({ ok: true, data: data });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('get', '/drawers/:name', async (c) => {
    try {
      const hash = c.get('tokenHash');
      const data = await withTenant(hash, (tx, identity) => getDrawer(tx, identity.tenantId, c.req.param('name')));
      return c.json({ ok: true, data: data });
    } catch (error) {
      return sendError(c, error);
    }
  });

  registerRoute('post', '/checks/allocate', async (c) => {
    try {
      const auth = c.get('nativeAuth');
      const denied = capabilityDenied(c, auth, 'orders:read');
      if (denied) return denied;
      const body = await readBody<{ subtotalCents: number; taxRateBps: number; discountCents?: number; serviceChargeCents?: number; tipCents?: number; shares: number }>(c);
      const shares = allocateCheck(body);
      return c.json({ ok: true, data: { shares } });
    } catch (error) {
      return sendError(c, error);
    }
  });

  return app;
}

/**
 * Implementable integration entrypoint (NOT wired here pending Codex review):
 * in `apps/server/src/index.ts`, after existing routes,
 * `if (isNativePostgresEnabled()) app.route('/', createNativePostgresApp({ pool, runTenant, runAuth })))`
 * with `runTenant = createTenantRunner(pool)` and `runAuth = createAuthRunner(pool)`
 * from `./transactions.ts`. Pool construction stays in Codex-owned integration scope.
 */
export const NATIVE_INTEGRATION_NOTE = 'Codex-reviewed mount only; do not auto-mount in this slice.';
