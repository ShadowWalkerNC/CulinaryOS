import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { request } from 'node:https';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { escapeIdentifier, Pool } from 'pg';
import { applyMigrations } from '../../packages/db/src/migrate.ts';
import { bootstrapNativeInstallation } from '../../apps/server/src/postgres/bootstrap.ts';

const { TEST_BOOTSTRAP_DATABASE_URL: fixture, TEST_RUST_SITE_EXE: executable,
  TEST_RUST_TLS_CERT: certificate, TEST_RUST_TLS_KEY: key } = process.env;

test('Rust HTTPS site enrolls once, scopes KDS access and persists revocation', {
  skip: !fixture || !executable || !certificate || !key,
}, async () => {
  assert.ok(fixture && executable && certificate && key);
  const base = new URL(fixture);
  assert.equal(base.pathname, '/postgres');
  assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname));
  const admin = new Pool({ connectionString: base.toString(), connectionTimeoutMillis: 5000 });
  const suffix = randomBytes(8).toString('hex');
  const database = `culinaryos_bootstrap_${suffix}`;
  const role = `culinaryos_runtime_${suffix}`;
  const password = randomBytes(32).toString('base64url');
  const pinSecret = randomBytes(32).toString('base64url');
  const ownerPin = '74298163';
  const url = new URL(base);
  url.pathname = `/${database}`;
  const db = new Pool({ connectionString: url.toString() });
  let created = false;
  let registered = false;
  try {
    assert.equal((await admin.query('SHOW cluster_name')).rows[0].cluster_name, 'culinaryos-bootstrap-test');
    await admin.query(`CREATE DATABASE ${escapeIdentifier(database)}`);
    created = true;
    await applyMigrations(db);
    const { tenantId } = await bootstrapNativeInstallation(db, {
      database, slug: `rust-${suffix}`, restaurantName: 'Synthetic Rust Site', ownerEmail: 'rust@example.test',
      ownerDisplayName: 'Synthetic Owner', ownerPin, runtimeRole: role, runtimePassword: password,
      pinLookupSecret: pinSecret,
    });
    registered = true;
    const other = await db.query("INSERT INTO public.tenants (slug, name) VALUES ($1, 'Other site') RETURNING id", [`other-${suffix}`]);
    const inserted = await db.query(
      `WITH orders AS (
        INSERT INTO public.pos_orders (tenant_id, status)
        VALUES ($1, 'sent'), ($2, 'sent') RETURNING id, tenant_id, order_number
      )
      INSERT INTO public.kitchen_tickets (tenant_id, order_id, order_number, station, status)
      SELECT o.tenant_id, o.id, o.order_number, s.station, 'fired'
      FROM orders o CROSS JOIN (VALUES ('grill'), ('cold')) AS s(station)
      RETURNING id, tenant_id, station`,
      [tenantId, other.rows[0].id],
    );
    const grillTicket = inserted.rows.find(row => row.tenant_id === tenantId && row.station === 'grill')?.id;
    assert.ok(grillTicket);
    const runtimeUrl = new URL(url);
    runtimeUrl.username = role;
    runtimeUrl.password = password;
    const runtime = new Pool({ connectionString: runtimeUrl.toString() });
    try {
      const client = await runtime.connect();
      try {
        await client.query('SET ROLE culinaryos_app');
        await assert.rejects(client.query('SELECT code_hash FROM public.native_device_pairings'), { code: '42501' });
      } finally { client.release(); }
    } finally { await runtime.end(); }

    const probe = createServer().listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const address = probe.address();
    assert.ok(address && typeof address === 'object');
    await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
    const origin = `https://127.0.0.1:${address.port}`;
    const ca = readFileSync(certificate);
    const call = (path: string, method = 'GET', body?: unknown, token?: string): Promise<{ status: number; body: any }> =>
      new Promise((resolve, reject) => {
        const req = request(origin + path, {
          method, ca, timeout: 30000,
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        }, res => {
          const chunks: Buffer[] = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('error', reject);
          res.on('end', () => {
            try { resolve({ status: res.statusCode!, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
            catch (error) { reject(error); }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error(method + ' ' + path + ' timed out')));
        req.end(body === undefined ? undefined : JSON.stringify(body));
      });

    const withSite = async (work: () => Promise<void>) => {
      const child = spawn(executable, [], {
        env: { SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
          DATABASE_URL: runtimeUrl.toString(), CULINARYOS_SITE_ID: tenantId,
          CULINARYOS_SITE_BIND: `127.0.0.1:${address.port}`, CULINARYOS_SITE_ORIGIN: origin,
          CULINARYOS_SITE_TLS_CERT: certificate, CULINARYOS_SITE_TLS_KEY: key, CULINARYOS_PIN_LOOKUP_SECRET: pinSecret },
        windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
      });
      let startup = '';
      child.stderr.on('data', chunk => { startup += chunk.toString(); });
      const exited = once(child, 'exit');
      try {
        let ready = false;
        for (let i = 0; i < 60; i++) {
          assert.equal(child.exitCode, null, startup);
          if ((await call('/ready').catch(() => undefined))?.status === 200) { ready = true; break; }
          await delay(100);
        }
        assert.ok(ready, 'Rust service did not become ready');
        await work();
      } finally {
        if (child.exitCode === null && child.signalCode === null) child.kill();
        await exited;
      }
    };

    let deviceToken = '';
    let deviceId = '';
    let ownerToken = '';
    const pairingPath = `/v1/sites/${tenantId}/pairings`;
    await withSite(async () => {
      const login = await call('/v1/auth/pin-login', 'POST', { tenantId, pin: ownerPin });
      assert.equal(login.status, 200);
      ownerToken = login.body.data.token;
      assert.equal(login.body.data.role, 'owner');
      const payload = { role: 'kds', station: 'grill', label: 'Grill test' };
      assert.equal((await call(pairingPath, 'POST', payload)).status, 401);
      assert.equal((await call('/v1/sites/00000000-0000-0000-0000-000000000001/pairings', 'POST', payload, ownerToken)).status, 403);
      const expired = await call(pairingPath, 'POST', payload, ownerToken);
      assert.equal(expired.status, 201);
      await db.query("UPDATE public.native_device_pairings SET expires_at = now() - interval '1 second'");
      assert.equal((await call(pairingPath + '/redeem', 'POST', { code: expired.body.data.code })).status, 401);

      const grant = await call(pairingPath, 'POST', payload, ownerToken);
      assert.equal(grant.status, 201);
      assert.equal(grant.body.data.origin, origin);
      assert.match(grant.body.data.tlsFingerprint, /^[a-f0-9]{64}$/);
      const redeem = () => call(pairingPath + '/redeem', 'POST', { code: grant.body.data.code });
      const outcomes = await Promise.all([redeem(), redeem()]);
      assert.deepEqual(outcomes.map(result => result.status).sort(), [201, 401]);
      const device = outcomes.find(result => result.status === 201)!.body.data;
      deviceToken = device.token;
      deviceId = device.deviceId;
      assert.equal((await call(pairingPath, 'POST', payload, deviceToken)).status, 401);
      assert.equal((await call('/v1/kds/tickets')).status, 401);
      assert.equal((await call('/v1/kds/tickets?station=cold', 'GET', undefined, deviceToken)).status, 403);
      const visible = await call('/v1/kds/tickets', 'GET', undefined, deviceToken);
      assert.equal(visible.status, 200);
      assert.deepEqual(visible.body.data.map((ticket: { id: string }) => ticket.id), [grillTicket]);
      const posGrant = await call(pairingPath, 'POST', { role: 'pos', label: 'POS role probe' }, ownerToken);
      assert.equal(posGrant.status, 201);
      const posRedeemed = await call(pairingPath + '/redeem', 'POST', { code: posGrant.body.data.code });
      assert.equal(posRedeemed.status, 201);
      assert.equal((await call('/v1/kds/tickets', 'GET', undefined, posRedeemed.body.data.token)).status, 403);
      const mgrGrant = await call(pairingPath, 'POST', { role: 'manager', label: 'Manager role probe' }, ownerToken);
      assert.equal(mgrGrant.status, 201);
      const mgrRedeemed = await call(pairingPath + '/redeem', 'POST', { code: mgrGrant.body.data.code });
      assert.equal(mgrRedeemed.status, 201);
      assert.equal((await call('/v1/kds/tickets', 'GET', undefined, mgrRedeemed.body.data.token)).status, 403);
      assert.equal((await call(`/v1/sites/${tenantId}/devices/${deviceId}`, 'DELETE', undefined, deviceToken)).status, 401);
    });
    await withSite(async () => {
      assert.equal((await call('/v1/kds/tickets', 'GET', undefined, deviceToken)).status, 200);
      const revoked = await call(`/v1/sites/${tenantId}/devices/${deviceId}`, 'DELETE', undefined, ownerToken);
      assert.equal(revoked.status, 200);
      assert.equal(revoked.body.data.revoked, true);
    });
    await withSite(async () => {
      assert.equal((await call('/v1/kds/tickets', 'GET', undefined, deviceToken)).status, 401);
    });

    // Simulate an older backup that still has a live device and pairing.
    await db.query('UPDATE public.device_keys SET revoked_at = NULL WHERE id = $1', [deviceId]);
    let staleCode = '';
    await withSite(async () => {
      assert.equal((await call('/v1/kds/tickets', 'GET', undefined, deviceToken)).status, 200);
      const stale = await call(pairingPath, 'POST', { role: 'pos', label: 'Stale grant' }, ownerToken);
      assert.equal(stale.status, 201);
      staleCode = stale.body.data.code;
    });
    const fence = readFileSync('packages/native/sql/fence-restored-site.sql', 'utf8');
    await db.query(fence, [tenantId]);
    await withSite(async () => {
      assert.equal((await call('/v1/kds/tickets', 'GET', undefined, deviceToken)).status, 401);
      assert.equal((await call(pairingPath + '/redeem', 'POST', { code: staleCode })).status, 401);
      assert.equal((await call(pairingPath, 'POST', { role: 'pos', label: 'Old session' }, ownerToken)).status, 403);
    });
  } finally {
    await db.end();
    try {
      if (created) await admin.query(`DROP DATABASE ${escapeIdentifier(database)}`);
      if (registered) await admin.query(`DROP ROLE ${escapeIdentifier(role)}`);
    } finally { await admin.end(); }
  }
});
