import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { applyMigrations } from '../../packages/db/src/migrate.ts';
import { opaqueToken, tokenHash } from '../../apps/server/src/postgres/domain.ts';
import { createAuthRunner, createTenantRunner } from '../../apps/server/src/postgres/transactions.ts';
import { pinLookupHash, resolveNativeIdentity, verifyPinAndMintSession } from '../../apps/server/src/postgres/identity.ts';
import { createNativePostgresApp } from '../../apps/server/src/postgres/app.ts';
import { reconcileSucceededIntent, saveWebhookEvent } from '../../apps/server/src/postgres/payments.ts';
import { hashPin } from '../../apps/server/src/lib/pin.ts';

// Real PostgreSQL proof for the native server slice. Runs ONLY when
// TEST_DATABASE_URL is explicitly set to an ephemeral database. When unset,
// every test reports NOT RUN and the file exits 0 — never a fake pass.
// This file never prints the URL or any credential.
//
// Contract target: migrations 001–007 (token-derived RLS). The native runner
// pins app.token_hash from the verified credential; the legacy tenant
// settings it also pins are ignored by 007 policies. PIN mint passes the
// lookup HMAC as the 007 PIN proof. See the shared ledger and
// docs/audits/postgres-server-integration.md for peer coordination.

const TEST_URL = process.env.TEST_DATABASE_URL ?? '';
const RUN_REAL = Boolean(TEST_URL) && !TEST_URL.includes('placeholder');
const PIN_SECRET = 'native-pg-test-pin-lookup-secret-40-chars!';
const MANAGER_PIN = '2468';
const NATIVE_CONTRACT_VERSION = '008';

interface Fixtures {
  tenantA: string;
  tenantB: string;
  managerUser: string;
  serverUser: string;
  managerToken: string;
  serverToken: string;
  deviceToken: string;
  itemGrill: string;
  itemCold: string;
  itemDead: string;
  modifierExtra: string;
  orderB: string;
}

let pool: Pool | null = null;
let fixtures: Fixtures | null = null;
let savedPinSecret: string | undefined;

function requireFixtures(): Fixtures {
  assert.ok(fixtures, 'real-PG fixtures missing (setup failed or TEST_DATABASE_URL unset)');
  return fixtures;
}

async function ownerQuery<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  assert.ok(pool, 'pool missing');
  const client = await pool.connect();
  try {
    const result = await client.query(text, params as never[]);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/** Copy the 001–008 chain to a temp dir so future peer files never surprise this suite. */
function contractMigrationsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = join(here, '..', '..', 'packages', 'db', 'migrations');
  const dir = mkdtempSync(join(tmpdir(), 'culinaryos-native-mig-'));
  const wanted: Record<string, string> = {
    '001': '001_foundation.sql',
    '002': '002_identity.sql',
    '003': '003_menus_orders.sql',
    '004': '004_kitchen_events.sql',
    '005': '005_payments_closeout.sql',
    '006': '006_identity_hardening.sql',
    '007': '007_token_derived_rls.sql',
    '008': '008_membership_serialization.sql',
  };
  for (const [version, filename] of Object.entries(wanted)) {
    try {
      writeFileSync(join(dir, filename), readFileSync(join(source, filename)));
    } catch {
      assert.fail(`migration ${version} (${filename}) missing from peer chain`);
    }
  }
  return dir;
}

if (!RUN_REAL) {
  console.log('NOT RUN: postgres-native-pg requires explicit ephemeral TEST_DATABASE_URL (URL redacted by design).');
}

describe('native identity against real PostgreSQL', () => {
  beforeAll(async () => {
    if (!RUN_REAL) return;
    savedPinSecret = process.env.CULINARYOS_PIN_LOOKUP_SECRET;
    process.env.CULINARYOS_PIN_LOOKUP_SECRET = PIN_SECRET;
    pool = new Pool({ connectionString: TEST_URL, max: 5 });
    await applyMigrations(pool, { dir: contractMigrationsDir() });
    const versions = await ownerQuery<{ version: string }>('SELECT version FROM public.schema_migrations ORDER BY version');
    const max = versions.map((row) => row.version).sort().pop();
    assert.equal(max, NATIVE_CONTRACT_VERSION, `native slice targets 001-${NATIVE_CONTRACT_VERSION}; cluster is at ${max} (see audit doc)`);
    const rand = randomUUID().slice(0, 8);
    const slugA = `nat-a-${rand}`;
    const slugB = `nat-b-${rand}`;

    const tenants = await ownerQuery<{ id: string }>(
      `INSERT INTO public.tenants (slug, name) VALUES ($1, 'Native A'), ($2, 'Native B') RETURNING id`,
      [slugA, slugB],
    );
    const tenantA = tenants[0]?.id as string;
    const tenantB = tenants[1]?.id as string;

    const users = await ownerQuery<{ id: string }>(
      `INSERT INTO public.app_users (display_name) VALUES ('Mgr'), ('Srv'), ('ViewerB') RETURNING id`,
      [],
    );
    const managerUser = users[0]?.id as string;
    const serverUser = users[1]?.id as string;
    const viewerBUser = users[2]?.id as string;

    await ownerQuery(
      `INSERT INTO public.tenant_users (tenant_id, user_id, role) VALUES
       ($1, $2, 'manager'), ($1, $3, 'server'), ($4, $5, 'viewer')`,
      [tenantA, managerUser, serverUser, tenantB, viewerBUser],
    );

    // Session row role is deliberately wrong ('viewer'); membership ('manager') is authoritative.
    const managerToken = opaqueToken('session');
    const serverToken = opaqueToken('session');
    const expiredToken = opaqueToken('session');
    const revokedToken = opaqueToken('session');
    const boundRevokedToken = opaqueToken('session');
    const future = new Date(Date.now() + 3600_000).toISOString();
    const past = new Date(Date.now() - 3600_000).toISOString();
    await ownerQuery(
      `INSERT INTO public.auth_sessions (token_hash, user_id, tenant_id, role, expires_at, revoked_at) VALUES
       ($1, $2, $3, 'viewer', $4, NULL),
       ($5, $6, $3, 'server', $4, NULL),
       ($7, $2, $3, 'manager', $8, NULL),
       ($9, $2, $3, 'manager', $4, now())`,
      [tokenHash(managerToken), managerUser, tenantA, future, tokenHash(serverToken), serverUser, tokenHash(expiredToken), past, tokenHash(revokedToken)],
    );

    const deviceToken = opaqueToken('device');
    const revokedDeviceToken = opaqueToken('device');
    const devices = await ownerQuery<{ id: string }>(
      `INSERT INTO public.device_keys (key_hash, tenant_id, label, capabilities) VALUES
       ($1, $2, 'pos-1', '["orders:write","sync:replay"]'),
       ($3, $2, 'dead', '["orders:write"]') RETURNING id`,
      [tokenHash(deviceToken), tenantA, tokenHash(revokedDeviceToken)],
    );
    const revokedDeviceId = devices[1]?.id as string;
    await ownerQuery(`UPDATE public.device_keys SET revoked_at = now() WHERE id = $1`, [revokedDeviceId]);
    await ownerQuery(
      `INSERT INTO public.auth_sessions (token_hash, user_id, tenant_id, role, device_id, expires_at)
       VALUES ($1, $2, $3, 'manager', $4, $5)`,
      [tokenHash(boundRevokedToken), managerUser, tenantA, revokedDeviceId, future],
    );

    await ownerQuery(
      `INSERT INTO public.staff_pins (tenant_id, user_id, pin_hash, pin_lookup_hash, display_name)
       VALUES ($1, $2, $3, $4, 'Mgr')`,
      [tenantA, managerUser, hashPin(MANAGER_PIN), pinLookupHash(tenantA, MANAGER_PIN, PIN_SECRET)],
    );

    const menus = await ownerQuery<{ id: string }>(
      `INSERT INTO public.menus (tenant_id, name, status) VALUES ($1, 'Main', 'active') RETURNING id`,
      [tenantA],
    );
    const menuId = menus[0]?.id as string;
    const sections = await ownerQuery<{ id: string }>(
      `INSERT INTO public.menu_sections (tenant_id, menu_id, name) VALUES ($1, $2, 'Mains') RETURNING id`,
      [tenantA, menuId],
    );
    const sectionId = sections[0]?.id as string;
    const items = await ownerQuery<{ id: string }>(
      `INSERT INTO public.menu_items (tenant_id, section_id, name, price, status, station) VALUES
       ($1, $2, 'Burger', 1200, 'available', 'grill'),
       ($1, $2, 'Salad', 800, 'available', 'cold'),
       ($1, $2, 'Gone', 500, '86d', 'hot') RETURNING id`,
      [tenantA, sectionId],
    );
    const groups = await ownerQuery<{ id: string }>(
      `INSERT INTO public.modifier_groups (tenant_id, menu_item_id, name) VALUES ($1, $2, 'Extras') RETURNING id`,
      [tenantA, items[0]?.id as string],
    );
    const mods = await ownerQuery<{ id: string }>(
      `INSERT INTO public.modifiers (tenant_id, modifier_group_id, name, price_adjustment) VALUES ($1, $2, 'Cheese', 150) RETURNING id`,
      [tenantA, groups[0]?.id as string],
    );
    const ordersB = await ownerQuery<{ id: string }>(
      `INSERT INTO public.pos_orders (tenant_id, table_number, status) VALUES ($1, 'B1', 'open') RETURNING id`,
      [tenantB],
    );

    fixtures = {
      tenantA, tenantB, managerUser, serverUser,
      managerToken, serverToken, deviceToken,
      itemGrill: items[0]?.id as string,
      itemCold: items[1]?.id as string,
      itemDead: items[2]?.id as string,
      modifierExtra: mods[0]?.id as string,
      orderB: ordersB[0]?.id as string,
    };
    (fixtures as Record<string, string>).expiredToken = expiredToken;
    (fixtures as Record<string, string>).revokedToken = revokedToken;
    (fixtures as Record<string, string>).boundRevokedToken = boundRevokedToken;
    (fixtures as Record<string, string>).revokedDeviceToken = revokedDeviceToken;
  });

  afterAll(async () => {
    if (savedPinSecret === undefined) delete process.env.CULINARYOS_PIN_LOOKUP_SECRET;
    else process.env.CULINARYOS_PIN_LOOKUP_SECRET = savedPinSecret;
    if (pool && fixtures) {
      try {
        await ownerQuery(`DELETE FROM public.tenants WHERE id = $1 OR id = $2`, [fixtures.tenantA, fixtures.tenantB]);
      } catch {
        // Cleanup best-effort; unique slugs prevent cross-run collision.
      }
    }
    if (pool) {
      await pool.end();
      pool = null;
    }
  });

  it('resolves live sessions with membership-authoritative roles', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    assert.ok(pool);
    const manager = await resolveNativeIdentity(pool, fx.managerToken);
    assert.ok(manager);
    assert.equal(manager.kind, 'session');
    assert.equal(manager.tenantId, fx.tenantA);
    assert.equal(manager.role, 'manager');
    const server = await resolveNativeIdentity(pool, fx.serverToken);
    assert.ok(server);
    assert.equal(server.role, 'server');
  });

  it('rejects revoked, expired, device-bound-dead, unknown, and malformed tokens', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures() as Fixtures & Record<string, string>;
    assert.ok(pool);
    assert.equal(await resolveNativeIdentity(pool, fx.expiredToken), null);
    assert.equal(await resolveNativeIdentity(pool, fx.revokedToken), null);
    assert.equal(await resolveNativeIdentity(pool, fx.boundRevokedToken), null);
    assert.equal(await resolveNativeIdentity(pool, fx.revokedDeviceToken), null);
    assert.equal(await resolveNativeIdentity(pool, opaqueToken('session')), null);
    assert.equal(await resolveNativeIdentity(pool, 'not-a-token'), null);
    assert.equal(await resolveNativeIdentity(pool, ''), null);
  });

  it('resolves live device keys with capabilities and rejects revoked ones', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    assert.ok(pool);
    const device = await resolveNativeIdentity(pool, fx.deviceToken);
    assert.ok(device);
    assert.equal(device.kind, 'device');
    assert.equal(device.tenantId, fx.tenantA);
    assert.deepEqual(device.capabilities, ['orders:write', 'sync:replay']);
  });

  it('mints a verifiable session on correct PIN and rejects wrong PINs identically', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    assert.ok(pool);
    const runAuth = createAuthRunner(pool);
    const minted = await runAuth((tx) => verifyPinAndMintSession(tx, { tenantId: fx.tenantA, pin: MANAGER_PIN }));
    assert.equal(minted.role, 'manager');
    const resolved = await resolveNativeIdentity(pool, minted.token);
    assert.ok(resolved);
    assert.equal(resolved.userId, fx.managerUser);
    await assert.rejects(() => runAuth((tx) => verifyPinAndMintSession(tx, { tenantId: fx.tenantA, pin: '0000' })), /Invalid PIN/);
    await assert.rejects(
      () => runAuth((tx) => verifyPinAndMintSession(tx, { tenantId: '99999999-9999-9999-9999-999999999999', pin: MANAGER_PIN })),
      /Invalid PIN/,
    );
  });

  it('binds tenant scope to the verified token, never to caller settings', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    assert.ok(pool);
    const runTenant = createTenantRunner(pool);
    // Unknown credential fails before the callback runs.
    await assert.rejects(() => runTenant(tokenHash(opaqueToken('session')), async () => 'unreached'), /Invalid credential/);
    // Revoked credential fails before the callback runs.
    const revoked = (requireFixtures() as Fixtures & Record<string, string>).revokedToken;
    await assert.rejects(() => runTenant(tokenHash(revoked), async () => 'unreached'), /Invalid credential/);
    // Verified token scopes exactly to its own tenant.
    const probe = await ownerQuery<{ id: string }>(
      `INSERT INTO public.pos_orders (tenant_id, table_number, status) VALUES ($1, 'SCOPE1', 'open') RETURNING id`,
      [fx.tenantA],
    );
    const seen = await runTenant(tokenHash(fx.serverToken), async (tx, identity) => {
      assert.equal(identity.tenantId, fx.tenantA);
      assert.equal(identity.role, 'server');
      const own = await tx.query<{ id: string }>('SELECT id FROM public.pos_orders WHERE tenant_id = $1', [fx.tenantA]);
      const foreign = await tx.query<{ id: string }>('SELECT id FROM public.pos_orders WHERE id = $1', [fx.orderB]);
      return { own: own.rows.length, foreign: foreign.rows.length };
    });
    assert.ok(seen.own >= 1);
    assert.equal(seen.foreign, 0);
    await ownerQuery(`DELETE FROM public.pos_orders WHERE id = $1`, [probe[0]?.id as string]);
  });

  it('enforces token-derived RLS: only the credential scopes rows', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures() as Fixtures & Record<string, string>;
    assert.ok(pool);
    const probe = await ownerQuery<{ id: string }>(
      `INSERT INTO public.pos_orders (tenant_id, table_number, status) VALUES ($1, 'RLS1', 'open') RETURNING id`,
      [fx.tenantA],
    );
    const orderId = probe[0]?.id as string;

    async function selectAs(tokenHashValue: string | null, forgedTenant: string | null): Promise<number> {
      assert.ok(pool);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL ROLE culinaryos_app');
        await client.query("SELECT set_config('app.token_hash', $1, true)", [tokenHashValue ?? '']);
        // Legacy mutable setting: must be meaningless under 007 policies.
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [forgedTenant ?? '']);
        const result = await client.query('SELECT id FROM public.pos_orders WHERE id = $1', [orderId]);
        await client.query('ROLLBACK');
        return result.rows.length;
      } finally {
        client.release();
      }
    }

    const hashA = tokenHash(fx.serverToken);
    // B-tenant credential: owner-inserted viewer session (bootstrap-style fixture).
    const bToken = opaqueToken('session');
    const viewer = await ownerQuery<{ user_id: string }>(
      `SELECT user_id FROM public.tenant_users WHERE tenant_id = $1 AND role = 'viewer' LIMIT 1`,
      [fx.tenantB],
    );
    assert.ok(viewer[0]?.user_id, 'tenant B viewer fixture missing');
    await ownerQuery(
      `INSERT INTO public.auth_sessions (token_hash, user_id, tenant_id, role, expires_at)
       VALUES ($1, $2, $3, 'viewer', now() + interval '1 hour')`,
      [tokenHash(bToken), viewer[0]?.user_id as string, fx.tenantB],
    );
    const hashB = tokenHash(bToken);

    assert.equal(await selectAs(hashA, null), 1);
    assert.equal(await selectAs(hashB, null), 0);
    assert.equal(await selectAs(null, null), 0);
    assert.equal(await selectAs('z'.repeat(64), null), 0);
    assert.equal(await selectAs(tokenHash(fx.revokedToken), null), 0);
    // Forged legacy setting cannot widen a foreign credential or conjure access.
    assert.equal(await selectAs(hashB, fx.tenantA), 0);
    assert.equal(await selectAs(null, fx.tenantA), 0);

    // Cross-tenant write under a foreign credential fails the WITH CHECK policy.
    assert.ok(pool);
    const writer = await pool.connect();
    try {
      await writer.query('BEGIN');
      await writer.query('SET LOCAL ROLE culinaryos_app');
      await writer.query("SELECT set_config('app.token_hash', $1, true)", [hashB]);
      await writer.query("SELECT set_config('app.tenant_id', $1, true)", [fx.tenantA]);
      await assert.rejects(
        writer.query(`INSERT INTO public.pos_orders (tenant_id, table_number, status) VALUES ($1, 'X', 'open')`, [fx.tenantA]),
        /policy|permission|denied|violates/i,
      );
      await writer.query('ROLLBACK');
    } finally {
      writer.release();
    }
    await ownerQuery(`DELETE FROM public.pos_orders WHERE id = $1`, [orderId]);
  });
});

describe('native app factory end-to-end against real PostgreSQL', () => {
  function nativeApp() {
    assert.ok(pool);
    const active = pool;
    return createNativePostgresApp({
      enabled: true,
      pool: active,
      runTenant: createTenantRunner(active),
      runAuth: createAuthRunner(active),
    });
  }

  function auth(token: string, tenant?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    if (tenant !== undefined) headers['X-Tenant-Id'] = tenant;
    return headers;
  }

  it('rejects missing/bad credentials and tenant-header forgery', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    let response = await app.request('/v1/native/auth/me', { headers: { 'Content-Type': 'application/json' } });
    assert.equal(response.status, 401);
    response = await app.request('/v1/native/auth/me', { headers: auth('cs_invalidtoken00000000000000000000000000000') });
    assert.equal(response.status, 401);
    response = await app.request('/v1/native/auth/me', { headers: auth(fx.managerToken, fx.tenantB) });
    assert.equal(response.status, 403);
    response = await app.request('/v1/native/auth/me', { headers: auth(fx.managerToken, fx.tenantA) });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { data: { role: string; tenantId: string } };
    assert.equal(body.data.role, 'manager');
    assert.equal(body.data.tenantId, fx.tenantA);
  });

  it('logs in with a PIN through the HTTP route', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    const headers = { 'Content-Type': 'application/json' };
    let response = await app.request('/v1/native/auth/pin-login', {
      method: 'POST', headers, body: JSON.stringify({ tenantId: fx.tenantA, pin: '0000' }),
    });
    assert.equal(response.status, 401);
    response = await app.request('/v1/native/auth/pin-login', {
      method: 'POST', headers, body: JSON.stringify({ tenantId: fx.tenantA, pin: MANAGER_PIN }),
    });
    assert.equal(response.status, 200);
    const session = ((await response.json()) as { data: { token: string; role: string } }).data;
    assert.equal(session.role, 'manager');
    response = await app.request('/v1/native/auth/me', { headers: auth(session.token, fx.tenantA) });
    assert.equal(response.status, 200);
  });

  it('prices line items server-side and rejects injection', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    const headers = auth(fx.serverToken, fx.tenantA);

    let response = await app.request('/v1/native/orders', { method: 'POST', headers, body: JSON.stringify({}) });
    assert.equal(response.status, 422);

    response = await app.request('/v1/native/orders', {
      method: 'POST', headers, body: JSON.stringify({ tableNumber: 'T7', serverName: 'Sam' }),
    });
    assert.equal(response.status, 201);
    const order = ((await response.json()) as { data: { id: string } }).data;
    (requireFixtures() as Record<string, string>).orderA = order.id;

    response = await app.request(`/v1/native/orders/${order.id}/items`, {
      method: 'POST', headers,
      body: JSON.stringify({ menuItemId: fx.itemGrill, quantity: 1, unitPrice: 1, modifiers: [fx.modifierExtra] }),
    });
    assert.equal(response.status, 422);

    response = await app.request(`/v1/native/orders/${order.id}/items`, {
      method: 'POST', headers,
      body: JSON.stringify({ menuItemId: fx.itemGrill, quantity: 1, modifiers: ['99999999-9999-9999-9999-999999999999'] }),
    });
    assert.equal(response.status, 422);

    response = await app.request(`/v1/native/orders/${order.id}/items`, {
      method: 'POST', headers, body: JSON.stringify({ menuItemId: fx.itemDead, quantity: 1 }),
    });
    assert.equal(response.status, 409);

    // Happy path: 1200 + 150 = 1350 x2 = 2700, tax 825bps = 223, total 2923.
    response = await app.request(`/v1/native/orders/${order.id}/items`, {
      method: 'POST', headers,
      body: JSON.stringify({ menuItemId: fx.itemGrill, quantity: 2, modifiers: [fx.modifierExtra], taxRateBps: 825 }),
    });
    assert.equal(response.status, 201);
    const added = ((await response.json()) as { data: { item: { unit_price: number; line_total: number }; order: { subtotal: number; tax: number; total: number } } }).data;
    assert.equal(added.item.unit_price, 1350);
    assert.equal(added.item.line_total, 2700);
    assert.equal(added.order.subtotal, 2700);
    assert.equal(added.order.tax, 223);
    assert.equal(added.order.total, 2923);
  });

  it('denies cross-tenant order reads without leaking existence', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    const response = await app.request(`/v1/native/orders/${fx.orderB}`, {
      headers: auth(fx.serverToken, fx.tenantA),
    });
    assert.equal(response.status, 404);
  });

  it('sends once with outbox rows and replays idempotent retries', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures() as Fixtures & Record<string, string>;
    const app = nativeApp();
    const headers = auth(fx.serverToken, fx.tenantA);
    const orderId = fx.orderA;
    assert.ok(orderId);

    let response = await app.request(`/v1/native/orders/${orderId}/items`, {
      method: 'POST', headers,
      body: JSON.stringify({ menuItemId: fx.itemCold, quantity: 1, courseNumber: 2, taxRateBps: 825 }),
    });
    assert.equal(response.status, 201);

    const opId = `send-${randomUUID().slice(0, 8)}`;
    response = await app.request(`/v1/native/orders/${orderId}/send`, {
      method: 'POST', headers, body: JSON.stringify({ operationId: opId }),
    });
    assert.equal(response.status, 200);
    const sent = ((await response.json()) as { data: { event: { eventType: string; payload: { items: unknown[] } }; tickets: Array<{ course_hold_status: string; station: string }>; replayed: boolean } }).data;
    assert.equal(sent.event.eventType, 'pos:order:created');
    assert.equal(sent.event.payload.items.length, 2);
    assert.equal(sent.tickets.length, 2);
    assert.equal(sent.replayed, false);
    assert.ok(sent.tickets.some((ticket) => ticket.course_hold_status === 'fired'));
    assert.ok(sent.tickets.some((ticket) => ticket.course_hold_status === 'held'));

    const ticketCount = await ownerQuery(`SELECT id FROM public.kitchen_tickets WHERE order_id = $1`, [orderId]);
    const pushCount = await ownerQuery(`SELECT id FROM public.pending_push WHERE tenant_id = $1`, [fx.tenantA]);
    const eventCount = await ownerQuery(`SELECT id FROM public.domain_events WHERE tenant_id = $1 AND event_type = 'pos:order:created'`, [fx.tenantA]);

    response = await app.request(`/v1/native/orders/${orderId}/send`, {
      method: 'POST', headers, body: JSON.stringify({ operationId: opId }),
    });
    assert.equal(response.status, 200);
    const replayed = ((await response.json()) as { data: { replayed: boolean } }).data;
    assert.equal(replayed.replayed, true);
    assert.equal((await ownerQuery(`SELECT id FROM public.kitchen_tickets WHERE order_id = $1`, [orderId])).length, ticketCount.length);
    assert.equal((await ownerQuery(`SELECT id FROM public.pending_push WHERE tenant_id = $1`, [fx.tenantA])).length, pushCount.length);
    assert.equal((await ownerQuery(`SELECT id FROM public.domain_events WHERE tenant_id = $1 AND event_type = 'pos:order:created'`, [fx.tenantA])).length, eventCount.length);

    response = await app.request('/v1/native/kds/pending-push', { headers });
    assert.equal(response.status, 200);
    const pending = ((await response.json()) as { data: Array<{ id: string }> }).data;
    assert.ok(pending.length >= 2);
    response = await app.request('/v1/native/kds/pending-push/ack', {
      method: 'POST', headers, body: JSON.stringify({ ids: pending.map((row) => row.id) }),
    });
    assert.equal(response.status, 200);
    response = await app.request('/v1/native/kds/pending-push', { headers });
    assert.equal((((await response.json()) as { data: unknown[] }).data).length, 0);
  });

  it('conflicts when one operation ID carries two payloads', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures() as Fixtures & Record<string, string>;
    const app = nativeApp();
    const headers = auth(fx.serverToken, fx.tenantA);
    let response = await app.request('/v1/native/orders', {
      method: 'POST', headers, body: JSON.stringify({ tableNumber: 'T8' }),
    });
    const other = ((await response.json()) as { data: { id: string } }).data;
    await app.request(`/v1/native/orders/${other.id}/items`, {
      method: 'POST', headers, body: JSON.stringify({ menuItemId: fx.itemCold, quantity: 1 }),
    });
    const opId = `conflict-${randomUUID().slice(0, 8)}`;
    response = await app.request(`/v1/native/orders/${other.id}/send`, {
      method: 'POST', headers, body: JSON.stringify({ operationId: opId }),
    });
    assert.equal(response.status, 200);

    let second = await app.request('/v1/native/orders', {
      method: 'POST', headers, body: JSON.stringify({ tableNumber: 'T9' }),
    });
    const secondOrder = ((await second.json()) as { data: { id: string } }).data;
    await app.request(`/v1/native/orders/${secondOrder.id}/items`, {
      method: 'POST', headers, body: JSON.stringify({ menuItemId: fx.itemCold, quantity: 1 }),
    });
    second = await app.request(`/v1/native/orders/${secondOrder.id}/send`, {
      method: 'POST', headers, body: JSON.stringify({ operationId: opId }),
    });
    assert.equal(second.status, 409);
  });

  it('fires a held course exactly once across retries', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures() as Fixtures & Record<string, string>;
    const app = nativeApp();
    const headers = auth(fx.serverToken, fx.tenantA);
    const opId = `fire-${randomUUID().slice(0, 8)}`;
    let response = await app.request(`/v1/native/orders/${fx.orderA}/fire-course`, {
      method: 'POST', headers, body: JSON.stringify({ courseNumber: 2, operationId: opId }),
    });
    assert.equal(response.status, 200);
    const first = ((await response.json()) as { data: { tickets: Array<{ course_hold_status: string }>; replayed: boolean } }).data;
    assert.equal(first.replayed, false);
    assert.ok(first.tickets.every((ticket) => ticket.course_hold_status === 'fired'));
    response = await app.request(`/v1/native/orders/${fx.orderA}/fire-course`, {
      method: 'POST', headers, body: JSON.stringify({ courseNumber: 2, operationId: opId }),
    });
    assert.equal(response.status, 200);
    assert.equal((((await response.json()) as { data: { replayed: boolean } }).data).replayed, true);
  });

  it('records cash exactly, rejects cards, and caps refunds for managers only', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    const serverHeaders = auth(fx.serverToken, fx.tenantA);
    const managerHeaders = auth(fx.managerToken, fx.tenantA);

    let response = await app.request('/v1/native/orders', {
      method: 'POST', headers: serverHeaders, body: JSON.stringify({ tableNumber: 'T10' }),
    });
    const order = ((await response.json()) as { data: { id: string } }).data;
    await app.request(`/v1/native/orders/${order.id}/items`, {
      method: 'POST', headers: serverHeaders, body: JSON.stringify({ menuItemId: fx.itemCold, quantity: 1 }),
    });
    const detail = ((await (await app.request(`/v1/native/orders/${order.id}`, { headers: serverHeaders })).json()) as { data: { order: { total: number } } }).data;

    response = await app.request('/v1/native/payments/cash-comp', {
      method: 'POST', headers: serverHeaders,
      body: JSON.stringify({ orderId: order.id, method: 'card', amount: detail.order.total, operationId: `pay-${randomUUID().slice(0, 8)}` }),
    });
    assert.equal(response.status, 422);

    const payOp = `pay-${randomUUID().slice(0, 8)}`;
    response = await app.request('/v1/native/payments/cash-comp', {
      method: 'POST', headers: serverHeaders,
      body: JSON.stringify({ orderId: order.id, method: 'cash', amount: detail.order.total, operationId: payOp }),
    });
    assert.equal(response.status, 201);
    const payment = ((await response.json()) as { data: { payment: { id: string; amount: number } } }).data.payment;
    assert.equal(payment.amount, detail.order.total);

    response = await app.request('/v1/native/payments/refund', {
      method: 'POST', headers: serverHeaders,
      body: JSON.stringify({ paymentId: payment.id, amountCents: 100, reason: 'nope', operationId: `ref-${randomUUID().slice(0, 8)}` }),
    });
    assert.equal(response.status, 403);

    response = await app.request('/v1/native/payments/refund', {
      method: 'POST', headers: managerHeaders,
      body: JSON.stringify({ paymentId: payment.id, amountCents: 100, reason: 'goodwill', operationId: `ref-${randomUUID().slice(0, 8)}` }),
    });
    assert.equal(response.status, 200);
    response = await app.request('/v1/native/payments/refund', {
      method: 'POST', headers: managerHeaders,
      body: JSON.stringify({ paymentId: payment.id, amountCents: detail.order.total, reason: 'excess', operationId: `ref-${randomUUID().slice(0, 8)}` }),
    });
    assert.equal(response.status, 422);
  });

  it('requires a human manager for comp payments', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    const serverHeaders = auth(fx.serverToken, fx.tenantA);
    const managerHeaders = auth(fx.managerToken, fx.tenantA);
    const deviceHeaders = auth(fx.deviceToken, fx.tenantA);

    async function compOrder(table: string): Promise<{ id: string; total: number }> {
      const created = await app.request('/v1/native/orders', {
        method: 'POST', headers: serverHeaders, body: JSON.stringify({ tableNumber: table }),
      });
      const order = ((await created.json()) as { data: { id: string } }).data;
      await app.request(`/v1/native/orders/${order.id}/items`, {
        method: 'POST', headers: serverHeaders, body: JSON.stringify({ menuItemId: fx.itemCold, quantity: 1 }),
      });
      const detail = ((await (await app.request(`/v1/native/orders/${order.id}`, { headers: serverHeaders })).json()) as { data: { order: { total: number } } }).data;
      return { id: order.id, total: detail.order.total };
    }

    const first = await compOrder('C1');
    let response = await app.request('/v1/native/payments/cash-comp', {
      method: 'POST', headers: serverHeaders,
      body: JSON.stringify({ orderId: first.id, method: 'comp', amount: first.total, operationId: `comp-${randomUUID().slice(0, 8)}` }),
    });
    assert.equal(response.status, 403);
    response = await app.request('/v1/native/payments/cash-comp', {
      method: 'POST', headers: deviceHeaders,
      body: JSON.stringify({ orderId: first.id, method: 'comp', amount: first.total, operationId: `comp-${randomUUID().slice(0, 8)}` }),
    });
    assert.equal(response.status, 403);
    response = await app.request('/v1/native/payments/cash-comp', {
      method: 'POST', headers: managerHeaders,
      body: JSON.stringify({ orderId: first.id, method: 'comp', amount: first.total, operationId: `comp-${randomUUID().slice(0, 8)}` }),
    });
    assert.equal(response.status, 201);
  });

  it('gates device keys by verified capability', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    // Fixture device carries ['orders:write','sync:replay'] only.
    const deviceHeaders = auth(fx.deviceToken, fx.tenantA);
    let response = await app.request('/v1/native/orders', {
      method: 'POST', headers: deviceHeaders, body: JSON.stringify({ tableNumber: 'D1' }),
    });
    assert.equal(response.status, 201);
    response = await app.request('/v1/native/menu/items', { headers: deviceHeaders });
    assert.equal(response.status, 403);
    response = await app.request('/v1/native/kds/pending-push', { headers: deviceHeaders });
    assert.equal(response.status, 403);
    const order = ((await (await app.request('/v1/native/orders', {
      method: 'POST', headers: deviceHeaders, body: JSON.stringify({ tableNumber: 'D2' }),
    })).json()) as { data: { id: string } }).data;
    response = await app.request(`/v1/native/orders/${order.id}`, { headers: deviceHeaders });
    assert.equal(response.status, 403);
  });

  it('serializes concurrent duplicate sends to one kitchen effect', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    const headers = auth(fx.serverToken, fx.tenantA);
    const created = await app.request('/v1/native/orders', {
      method: 'POST', headers, body: JSON.stringify({ tableNumber: 'RACE' }),
    });
    const order = ((await created.json()) as { data: { id: string } }).data;
    await app.request(`/v1/native/orders/${order.id}/items`, {
      method: 'POST', headers, body: JSON.stringify({ menuItemId: fx.itemCold, quantity: 1 }),
    });
    const opId = `race-${randomUUID().slice(0, 8)}`;
    const send = () =>
      app.request(`/v1/native/orders/${order.id}/send`, {
        method: 'POST', headers, body: JSON.stringify({ operationId: opId }),
      });
    const [first, second] = await Promise.all([send(), send()]);
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    const tickets = await ownerQuery(`SELECT id FROM public.kitchen_tickets WHERE order_id = $1`, [order.id]);
    assert.equal(tickets.length, 1);
    const events = await ownerQuery(`SELECT id FROM public.domain_events WHERE tenant_id = $1 AND payload #>> '{payload,orderId}' = $2`, [fx.tenantA, order.id]);
    assert.equal(events.length, 1);
  });

  it('exposes no webhook HTTP route until signature verification exists', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    const response = await app.request('/v1/native/webhooks/stripe', {
      method: 'POST', headers: auth(fx.serverToken, fx.tenantA), body: JSON.stringify({ forged: true }),
    });
    assert.equal(response.status, 404);
  });

  it('dedupes webhook inbox rows and binds reconciliation to stored orders', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    assert.ok(pool);
    const runTenant = createTenantRunner(pool);
    const hash = tokenHash(fx.serverToken);
    const eventId = `evt_${randomUUID().replace(/-/g, '')}`;

    const first = await runTenant(hash, (tx, identity) =>
      saveWebhookEvent(tx, identity.tenantId, { stripeEventId: eventId, eventType: 'payment_intent.succeeded', payload: { id: eventId } }),
    );
    assert.equal(first.duplicate, false);
    const second = await runTenant(hash, (tx, identity) =>
      saveWebhookEvent(tx, identity.tenantId, { stripeEventId: eventId, eventType: 'payment_intent.succeeded', payload: { id: eventId } }),
    );
    assert.equal(second.duplicate, true);

    // Stored pending payment for order X with intent I.
    const orders = await ownerQuery<{ id: string }>(
      `INSERT INTO public.pos_orders (tenant_id, table_number, status, subtotal, tax, total) VALUES
       ($1, 'WH1', 'open', 1000, 0, 1000), ($1, 'WH2', 'open', 1000, 0, 1000) RETURNING id`,
      [fx.tenantA],
    );
    const orderX = orders[0]?.id as string;
    const orderY = orders[1]?.id as string;
    const intentId = `pi_${randomUUID().replace(/-/g, '')}`;
    await ownerQuery(
      `INSERT INTO public.payments (tenant_id, order_id, amount, method, status, stripe_payment_intent_id)
       VALUES ($1, $2, 1000, 'card', 'pending', $3)`,
      [fx.tenantA, orderX, intentId],
    );

    // Wrong order, wrong amount, and unknown intent all match nothing.
    const mismatchOrder = await runTenant(hash, (tx, identity) =>
      reconcileSucceededIntent(tx, identity.tenantId, { stripeIntentId: intentId, orderId: orderY, amountCents: 1000 }),
    );
    assert.equal(mismatchOrder.matched, false);
    const mismatchAmount = await runTenant(hash, (tx, identity) =>
      reconcileSucceededIntent(tx, identity.tenantId, { stripeIntentId: intentId, orderId: orderX, amountCents: 999 }),
    );
    assert.equal(mismatchAmount.matched, false);
    const unknown = await runTenant(hash, (tx, identity) =>
      reconcileSucceededIntent(tx, identity.tenantId, { stripeIntentId: 'pi_unknown', orderId: orderX, amountCents: 1000 }),
    );
    assert.equal(unknown.matched, false);
    // Neither order was paid by the mismatches.
    const statuses = await ownerQuery<{ status: string }>(`SELECT status FROM public.pos_orders WHERE id = $1 OR id = $2`, [orderX, orderY]);
    assert.ok(statuses.every((row) => row.status === 'open'));

    // Exact match completes the stored payment and its own order.
    const matched = await runTenant(hash, (tx, identity) =>
      reconcileSucceededIntent(tx, identity.tenantId, { stripeIntentId: intentId, orderId: orderX, amountCents: 1000 }),
    );
    assert.equal(matched.matched, true);
    const paid = await ownerQuery<{ id: string; status: string }>(`SELECT id, status FROM public.pos_orders WHERE id = $1 OR id = $2`, [orderX, orderY]);
    assert.equal(paid.find((row) => row.id === orderX)?.status, 'paid');
    assert.equal(paid.find((row) => row.id === orderY)?.status, 'open');
    // Replay of the same intent matches nothing (no longer pending).
    const replay = await runTenant(hash, (tx, identity) =>
      reconcileSucceededIntent(tx, identity.tenantId, { stripeIntentId: intentId, orderId: orderX, amountCents: 1000 }),
    );
    assert.equal(replay.matched, false);
  });

  it('keeps one open drawer per name and reconciles close variance', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    const managerHeaders = auth(fx.managerToken, fx.tenantA);
    const serverHeaders = auth(fx.serverToken, fx.tenantA);

    let response = await app.request('/v1/native/drawers/open', {
      method: 'POST', headers: serverHeaders, body: JSON.stringify({ openingFloatCents: 5000 }),
    });
    assert.equal(response.status, 403);

    response = await app.request('/v1/native/drawers/open', {
      method: 'POST', headers: managerHeaders, body: JSON.stringify({ openingFloatCents: 5000 }),
    });
    assert.equal(response.status, 201);
    response = await app.request('/v1/native/drawers/open', {
      method: 'POST', headers: managerHeaders, body: JSON.stringify({ openingFloatCents: 1 }),
    });
    assert.equal(response.status, 409);

    await app.request('/v1/native/drawers/movement', {
      method: 'POST', headers: managerHeaders, body: JSON.stringify({ kind: 'cash_sale', amountCents: 2923 }),
    });
    await app.request('/v1/native/drawers/movement', {
      method: 'POST', headers: managerHeaders, body: JSON.stringify({ kind: 'paid_out', amountCents: 423 }),
    });
    response = await app.request('/v1/native/drawers/close', {
      method: 'POST', headers: managerHeaders, body: JSON.stringify({ countedCents: 7500 }),
    });
    assert.equal(response.status, 200);
    const closed = ((await response.json()) as { data: { expectedCents: number; varianceCents: number } }).data;
    assert.equal(closed.expectedCents, 5000 + 2923 - 423);
    assert.equal(closed.varianceCents, 7500 - (5000 + 2923 - 423));
  });

  it('allocates checks with exact-cent conservation', async () => {
    if (!RUN_REAL || !pool) return;
    const fx = requireFixtures();
    const app = nativeApp();
    const response = await app.request('/v1/native/checks/allocate', {
      method: 'POST',
      headers: auth(fx.serverToken, fx.tenantA),
      body: JSON.stringify({ subtotalCents: 10000, taxRateBps: 825, discountCents: 500, serviceChargeCents: 300, tipCents: 1200, shares: 4 }),
    });
    assert.equal(response.status, 200);
    const shares = ((await response.json()) as { data: { shares: Array<{ subtotalCents: number }> } }).data.shares;
    assert.equal(shares.length, 4);
    assert.equal(shares.reduce((sum, share) => sum + share.subtotalCents, 0), 10000);
  });
});
