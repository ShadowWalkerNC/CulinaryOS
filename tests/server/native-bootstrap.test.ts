import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { escapeIdentifier, Pool } from 'pg';
import { applyMigrations } from '../../packages/db/src/migrate.ts';
import { assertRuntimeDatabaseRole } from '../../packages/db/src/runtime-role.ts';
import { createNativePostgresApp } from '../../apps/server/src/postgres/app.ts';
import { bootstrapNativeInstallation } from '../../apps/server/src/postgres/bootstrap.ts';
import { createAuthRunner, createTenantRunner } from '../../apps/server/src/postgres/transactions.ts';

const ENTRY = 'apps/server/src/postgres/bootstrap-cli.ts';

async function withProductionApi(databaseUrl: URL, pinSecret: string, run: (base: string) => Promise<void>) {
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address();
  assert.ok(address && typeof address === 'object');
  await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));

  const base = `http://127.0.0.1:${address.port}`;
  const child = spawn(process.execPath, ['--import', 'tsx', 'apps/server/src/index.ts'], {
    env: {
      SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
      NODE_ENV: 'production', CULINARYOS_NATIVE_PG: 'true',
      DATABASE_URL: databaseUrl.toString(), CULINARYOS_PIN_LOOKUP_SECRET: pinSecret,
      HOST: '127.0.0.1', PORT: String(address.port),
    },
    stdio: 'ignore',
    windowsHide: true,
  });
  const exited = once(child, 'exit');
  try {
    let ready: Response | undefined;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) assert.fail(`Production API exited before readiness (${child.exitCode})`);
      ready = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) }).catch(() => undefined);
      if (ready?.ok) break;
      await delay(150);
    }
    assert.equal(ready?.status, 200, 'Production API did not become ready');
    const state = await ready!.json();
    assert.equal(state.database, 'postgres');
    assert.equal(state.role, databaseUrl.username);
    await run(base);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited;
  }
}

test('bootstrap CLI defaults to a non-mutating plan and redacts malformed input', () => {
  const env = { ...process.env, DATABASE_MIGRATION_URL: 'do-not-log-this-private-migration-url' };
  const plan = spawnSync(process.execPath, ['--import', 'tsx', ENTRY], { env, encoding: 'utf8', timeout: 30_000 });
  assert.ifError(plan.error);
  assert.equal(plan.status, 0);
  assert.match(plan.stdout, /no changes without --apply/);
  const invalid = spawnSync(process.execPath, ['--import', 'tsx', ENTRY, '--apply'], {
    env, encoding: 'utf8', input: '{"private":"do-not-log-this-private-input"', timeout: 30_000,
  });
  assert.ifError(invalid.error);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /valid JSON/);
  assert.doesNotMatch(invalid.stdout + invalid.stderr, /do-not-log-this/);
});

test('invalid secrets and oversized slugs are rejected before a database connection', async () => {
  const input = fixture('validation');
  const pool = { connect: async () => assert.fail('unexpected database connection') };
  await assert.rejects(bootstrapNativeInstallation(pool, { ...input, ownerPin: '12345678' }), /randomly generated/);
  await assert.rejects(bootstrapNativeInstallation(pool, { ...input, pinLookupSecret: input.runtimePassword }), /independent/);
  await assert.rejects(bootstrapNativeInstallation(pool, { ...input, slug: 'a'.repeat(64) }), /slug/);
});

function fixture(suffix: string) {
  return {
    database: `culinaryos_bootstrap_${suffix}`,
    slug: `restaurant-${suffix}`,
    restaurantName: `Synthetic Restaurant ${suffix}`,
    ownerEmail: `owner-${suffix}@example.test`,
    ownerDisplayName: 'Synthetic Owner',
    ownerPin: '74298163',
    runtimeRole: `culinaryos_runtime_${suffix}`,
    runtimePassword: randomBytes(32).toString('base64url'),
    pinLookupSecret: randomBytes(32).toString('base64url'),
  };
}

const testUrl = process.env.TEST_BOOTSTRAP_DATABASE_URL;
test('two disposable installations: atomic setup, SCRAM owner login, refusal and restart', {
  skip: testUrl ? false : 'requires TEST_BOOTSTRAP_DATABASE_URL on the dedicated test cluster',
}, async () => {
  assert.ok(testUrl);
  const base = new URL(testUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname));
  assert.equal(base.pathname, '/postgres');
  const admin = new Pool({ connectionString: base.toString(), connectionTimeoutMillis: 5000 });
  const pools: Pool[] = [];
  const databases: string[] = [];
  const roles: string[] = [];
  const originalSecret = process.env.CULINARYOS_PIN_LOOKUP_SECRET;
  const a = fixture(randomBytes(6).toString('hex'));
  const b = fixture(randomBytes(6).toString('hex'));

  function poolFor(input: typeof a, runtime = false, password = input.runtimePassword) {
    const url = new URL(base);
    url.pathname = `/${input.database}`;
    if (runtime) { url.username = input.runtimeRole; url.password = password; }
    const pool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
    pools.push(pool);
    return pool;
  }
  function app(pool: Pool) {
    return createNativePostgresApp({ enabled: true, pool, runAuth: createAuthRunner(pool), runTenant: createTenantRunner(pool) });
  }
  function login(server: ReturnType<typeof app>, tenantId: string, pin: string) {
    return server.request('/v1/auth/pin-login', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId, pin }),
    });
  }

  try {
    const cluster = await admin.query('SHOW cluster_name');
    assert.equal(cluster.rows[0]?.cluster_name, 'culinaryos-bootstrap-test', 'refusing to write to an unmarked cluster');
    const migrated = [];
    for (const input of [a, b]) {
      await admin.query(`CREATE DATABASE ${escapeIdentifier(input.database)}`);
      databases.push(input.database);
      const db = poolFor(input);
      assert.ok((await applyMigrations(db)).length >= 8);
      migrated.push(db);
    }
    const [dbA, dbB] = migrated;
    assert.ok(dbA && dbB);
    await assert.rejects(bootstrapNativeInstallation(dbA, b), /does not match/);

    const competing = await Promise.allSettled([bootstrapNativeInstallation(dbA, a), bootstrapNativeInstallation(dbA, a)]);
    const winners = competing.filter(result => result.status === 'fulfilled');
    if (winners.length > 0) roles.push(a.runtimeRole);
    assert.equal(winners.length, 1);
    const first = winners[0].value;
    const loser = competing.find(result => result.status === 'rejected');
    assert.match(String(loser?.reason), /already contains/);
    await assert.rejects(bootstrapNativeInstallation(dbB, { ...b, runtimeRole: a.runtimeRole }), /role already exists/);

    const original = await dbB.query("SELECT checksum FROM public.schema_migrations WHERE version = '001'");
    await dbB.query("UPDATE public.schema_migrations SET checksum = 'synthetic-drift' WHERE version = '001'");
    await assert.rejects(bootstrapNativeInstallation(dbB, b), /Migration ledger does not match/);
    await dbB.query("UPDATE public.schema_migrations SET checksum = $1 WHERE version = '001'", [original.rows[0].checksum]);

    await dbB.query("CREATE FUNCTION public.test_bootstrap_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private diagnostic'; END $$");
    await dbB.query('CREATE TRIGGER test_bootstrap_failure BEFORE INSERT ON public.staff_pins FOR EACH ROW EXECUTE FUNCTION public.test_bootstrap_failure()');
    await assert.rejects(bootstrapNativeInstallation(dbB, b), error => {
      assert.match(String(error), /Native bootstrap failed/);
      assert.doesNotMatch(String(error), /private diagnostic/);
      return true;
    });
    const rollback = await dbB.query('SELECT (SELECT count(*)::int FROM public.tenants) AS tenants, (SELECT count(*)::int FROM public.app_users) AS users, EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS role_exists', [b.runtimeRole]);
    assert.deepEqual(rollback.rows[0], { tenants: 0, users: 0, role_exists: false });
    await dbB.query('DROP TRIGGER test_bootstrap_failure ON public.staff_pins');
    const setupUrl = new URL(base);
    setupUrl.pathname = `/${b.database}`;
    const cli = spawnSync(process.execPath, ['--import', 'tsx', ENTRY, '--apply'], {
      env: { ...process.env, DATABASE_MIGRATION_URL: setupUrl.toString() }, encoding: 'utf8', input: JSON.stringify(b), timeout: 30_000,
    });
    assert.ifError(cli.error);
    assert.equal(cli.status, 0, cli.stderr);
    roles.push(b.runtimeRole);
    for (const secret of [b.ownerPin, b.runtimePassword, b.pinLookupSecret, setupUrl.toString()]) {
      assert.ok(!(cli.stdout + cli.stderr).includes(secret), 'bootstrap CLI must not print secrets');
    }
    const second = JSON.parse(cli.stdout) as { ok: boolean; tenantId: string; ownerId: string; runtimeRole: string };
    assert.equal(second.ok, true);
    assert.equal(second.runtimeRole, b.runtimeRole);
    assert.notEqual(first.tenantId, second.tenantId);

    const wrongPassword = poolFor(a, true, randomBytes(32).toString('base64url'));
    await assert.rejects(wrongPassword.query('SELECT 1'), { code: '28P01' });
    const runtimeA = poolFor(a, true);
    const runtimeB = poolFor(b, true);
    assert.equal((await assertRuntimeDatabaseRole(runtimeA)).login, a.runtimeRole);
    assert.equal((await assertRuntimeDatabaseRole(runtimeB)).login, b.runtimeRole);
    await assert.rejects(runtimeA.query('SET ROLE culinaryos_identity'), { code: '42501' });
    await assert.rejects(runtimeA.query('SELECT id FROM public.tenants'), { code: '42501' });
    await assert.rejects(bootstrapNativeInstallation(runtimeA, a), /requires the migration ledger owner/);
    process.env.CULINARYOS_PIN_LOOKUP_SECRET = a.pinLookupSecret;
    assert.equal((await login(app(runtimeA), first.tenantId, '11111111')).status, 401);
    const loggedIn = await login(app(runtimeA), first.tenantId, a.ownerPin);
    assert.equal(loggedIn.status, 200);
    const { data } = await loggedIn.json() as { data: { token: string; role: string; userId: string } };
    assert.equal(data.role, 'owner');
    assert.equal(data.userId, first.ownerId);
    const headers = { Authorization: `Bearer ${data.token}` };
    // New process-equivalent app and pool, same persistent database.
    assert.equal((await app(poolFor(a, true)).request('/v1/auth/me', { headers })).status, 200);
    assert.equal((await app(runtimeB).request('/v1/auth/me', { headers })).status, 401);
    process.env.CULINARYOS_PIN_LOOKUP_SECRET = b.pinLookupSecret;
    assert.equal((await login(app(runtimeB), second.tenantId, b.ownerPin)).status, 200);

    const runtimeUrl = new URL(setupUrl);
    runtimeUrl.username = b.runtimeRole;
    runtimeUrl.password = b.runtimePassword;
    const menu = await dbB.query("INSERT INTO public.menus (tenant_id, name, status) VALUES ($1, 'Test menu', 'active') RETURNING id", [second.tenantId]);
    const section = await dbB.query("INSERT INTO public.menu_sections (tenant_id, menu_id, name) VALUES ($1, $2, 'Mains') RETURNING id", [second.tenantId, menu.rows[0].id]);
    const item = await dbB.query("INSERT INTO public.menu_items (tenant_id, section_id, name, price, status, station) VALUES ($1, $2, 'Test burger', 1200, 'available', 'grill') RETURNING id", [second.tenantId, section.rows[0].id]);
    const menuItemId = item.rows[0].id;
    let authorization = '';
    let orderId = '';
    const signIn = (base: string) => fetch(`${base}/v1/auth/pin-login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: second.tenantId, pin: b.ownerPin }),
    });
    await withProductionApi(runtimeUrl, b.pinLookupSecret, async base => {
      const session = await signIn(base);
      assert.equal(session.status, 200);
      const { data } = await session.json();
      assert.equal(data.userId, second.ownerId);
      authorization = `Bearer ${data.token}`;
      const created = await fetch(`${base}/v1/orders`, {
        method: 'POST', headers: { authorization, 'content-type': 'application/json' },
        body: JSON.stringify({ tableNumber: '101' }),
      });
      assert.equal(created.status, 201);
      orderId = (await created.json()).data.id;
      assert.ok(orderId);
    });
    await withProductionApi(runtimeUrl, b.pinLookupSecret, async base => {
      const owner = await fetch(`${base}/v1/auth/me`, { headers: { authorization } });
      assert.equal(owner.status, 200);
      const order = await fetch(`${base}/v1/orders/${orderId}`, { headers: { authorization } });
      assert.equal(order.status, 200);
      assert.equal((await order.json()).data.order.id, orderId);
      assert.equal((await signIn(base)).status, 200);

      const request = async (path: string, status: number, method = 'GET', body?: unknown) => {
        const response = await fetch(`${base}/v1${path}`, {
          method, headers: { authorization, 'content-type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        assert.equal(response.status, status, `${method} ${path}`);
        return (await response.json()).data;
      };
      const items = await request('/menu/items', 200);
      assert.ok(items.some((entry: { id: string }) => entry.id === menuItemId));
      await request(`/orders/${orderId}/items`, 201, 'POST', { menuItemId, quantity: 2, unitPrice: 1200, station: 'grill' });
      const send = { operationId: randomUUID() };
      const sent = await request(`/orders/${orderId}/send`, 200, 'PATCH', send);
      assert.equal(sent.event.eventType, 'pos:order:created');
      assert.equal(sent.tickets.length, 1);
      assert.equal((await request(`/orders/${orderId}/send`, 200, 'PATCH', send)).replayed, true);

      assert.equal((await fetch(`${base}/v1/kds/tickets`)).status, 401);
      assert.equal((await fetch(`${base}/v1/kds/tickets`, {
        headers: { authorization, 'x-tenant-id': first.tenantId },
      })).status, 403);
      const tickets = await request('/kds/tickets?station=1&status=fired', 200);
      assert.equal(tickets.length, 1);
      assert.equal(tickets[0].id, sent.tickets[0].id);
      assert.equal(tickets[0].ticket_items[0].name, 'Test burger');
      assert.equal(tickets[0].ticket_items[0].quantity, 2);
      assert.deepEqual(await request('/kds/tickets?station=cold', 200), []);

      const pending = await request('/kds/pending-push', 200);
      assert.equal(pending.length, 1);
      assert.equal(pending[0].payload.orderId, orderId);
      assert.equal(pending[0].payload.ticketId, sent.tickets[0].id);
      await request('/kds/pending-push/ack', 200, 'POST', { ids: [pending[0].id] });
      assert.deepEqual(await request('/kds/pending-push', 200), []);

      const detail = await request(`/orders/${orderId}`, 200);
      assert.equal(detail.order.total, 2400);
      const delta = {
        id: randomUUID(), tenant_id: second.tenantId, order_id: orderId, action: 'finalize_payment',
        payload: { method: 'cash', amount: 2400, total: 2400, tip_cents: 0, tip_amount: 0 },
      };
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await request('/pos/sync-deltas', 200, 'POST', { deltas: [delta] });
        assert.deepEqual(result.confirmedIds, [delta.id]);
        assert.deepEqual(result.failures, []);
      }
      assert.equal((await request(`/orders/${orderId}`, 200)).order.status, 'paid');
      const payments = await dbB.query('SELECT amount, method, status FROM public.payments WHERE order_id = $1', [orderId]);
      assert.deepEqual(payments.rows, [{ amount: 2400, method: 'cash', status: 'completed' }]);
    });
  } finally {
    if (originalSecret === undefined) delete process.env.CULINARYOS_PIN_LOOKUP_SECRET;
    else process.env.CULINARYOS_PIN_LOOKUP_SECRET = originalSecret;
    await Promise.all(pools.map(pool => pool.end()));
    try {
      for (const db of databases) await admin.query(`DROP DATABASE ${escapeIdentifier(db)}`);
      for (const role of roles) await admin.query(`DROP ROLE ${escapeIdentifier(role)}`);
    } finally { await admin.end(); }
  }
});
