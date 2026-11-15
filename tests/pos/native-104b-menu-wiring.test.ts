import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { escapeIdentifier, Pool } from 'pg';
import { applyMigrations } from '../../packages/db/src/migrate.ts';
import { pinLookupHash } from '../../apps/server/src/postgres/identity.ts';
import { createAuthRunner, createTenantRunner } from '../../apps/server/src/postgres/transactions.ts';
import { createNativePostgresApp } from '../../apps/server/src/postgres/app.ts';
import { hashPin } from '../../apps/server/src/lib/pin.ts';
import { adaptNativeMenuItems } from '../../apps/pos/src/lib/native-menu.ts';

// CULINARYOS-104b: POS native menu + order/send UI wiring proof.
// The adapter half runs anywhere; the contract half runs ONLY against the
// disposable loopback cluster marked cluster_name=culinaryos-104-test and
// refuses anything else. This file never prints a connection URL.

const CLUSTER_MARK = 'culinaryos-104-test';
const PIN_SECRET = 'native-104b-test-pin-lookup-secret-39ch!!';
const SERVER_PIN = '4321';
const testUrl = process.env.TEST_104_DATABASE_URL;

test('104b adapter maps native menu rows onto the POS menu shape', () => {
  const menu = adaptNativeMenuItems([
    { id: 'a', tenant_id: 't', name: 'Burger', price: 1200, status: 'available', station: 'grill', recipe_id: null },
    { id: 'b', tenant_id: 't', name: 'Salad', price: 800, status: 'available', station: 'cold', recipe_id: null },
  ]);
  assert.equal(menu.sections.length, 1);
  const items = menu.sections[0]?.items ?? [];
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    id: 'a', name: 'Burger', description: '', price: 1200, status: 'available',
    station: 'grill', allergens: [], sort_order: 1, modifier_groups: [],
  });
  assert.equal(items[1]?.sort_order, 2);
  const empty = adaptNativeMenuItems([]);
  assert.equal(empty.sections[0]?.items.length, 0);
  const garbage = adaptNativeMenuItems(undefined as unknown as []);
  assert.equal(garbage.sections[0]?.items.length, 0);
});

test('104b native menu/order/send UI contract over HTTP', {
  skip: testUrl ? false : 'requires TEST_104_DATABASE_URL on the dedicated disposable cluster',
}, async () => {
  assert.ok(testUrl);
  const base = new URL(testUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname));
  assert.equal(base.pathname, '/postgres');
  const admin = new Pool({ connectionString: base.toString(), connectionTimeoutMillis: 5000 });
  const dbName = `culinaryos_104b_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  let pool: Pool | null = null;
  const originalSecret = process.env.CULINARYOS_PIN_LOOKUP_SECRET;
  try {
    const cluster = await admin.query('SHOW cluster_name');
    assert.equal(cluster.rows[0]?.cluster_name, CLUSTER_MARK, 'refusing to write to an unmarked cluster');
    await admin.query(`CREATE DATABASE ${escapeIdentifier(dbName)}`);
    const dbUrl = new URL(base);
    dbUrl.pathname = `/${dbName}`;
    pool = new Pool({ connectionString: dbUrl.toString(), connectionTimeoutMillis: 5000 });
    assert.ok((await applyMigrations(pool)).length >= 8);
    process.env.CULINARYOS_PIN_LOOKUP_SECRET = PIN_SECRET;

    const owner = async <T>(text: string, params: unknown[] = []): Promise<T[]> => {
      assert.ok(pool);
      const client = await pool.connect();
      try {
        return (await client.query(text, params as never[])).rows as T[];
      } finally {
        client.release();
      }
    };

    const rand = randomUUID().slice(0, 8);
    const tenants = await owner<{ id: string }>(
      `INSERT INTO public.tenants (slug, name) VALUES ($1, 'T104b') RETURNING id`, [`t104b-${rand}`],
    );
    const tenant = tenants[0]?.id as string;
    const users = await owner<{ id: string }>(
      `INSERT INTO public.app_users (display_name) VALUES ('Srv') RETURNING id`, [],
    );
    await owner(`INSERT INTO public.tenant_users (tenant_id, user_id, role) VALUES ($1, $2, 'server')`, [tenant, users[0]?.id as string]);
    await owner(
      `INSERT INTO public.staff_pins (tenant_id, user_id, pin_hash, pin_lookup_hash, display_name) VALUES ($1, $2, $3, $4, 'Srv')`,
      [tenant, users[0]?.id as string, hashPin(SERVER_PIN), pinLookupHash(tenant, SERVER_PIN, PIN_SECRET)],
    );
    const menus = await owner<{ id: string }>(
      `INSERT INTO public.menus (tenant_id, name, status) VALUES ($1, 'Main', 'active') RETURNING id`, [tenant],
    );
    const sections = await owner<{ id: string }>(
      `INSERT INTO public.menu_sections (tenant_id, menu_id, name) VALUES ($1, $2, 'Mains') RETURNING id`,
      [tenant, menus[0]?.id as string],
    );
    const items = await owner<{ id: string; price: number }>(
      `INSERT INTO public.menu_items (tenant_id, section_id, name, price, status, station) VALUES
       ($1, $2, 'Burger', 1200, 'available', 'grill'),
       ($1, $2, 'Retired Pie', 900, 'unavailable', 'pastry') RETURNING id, price`,
      [tenant, sections[0]?.id as string],
    );
    const burger = items.find((i) => i.price === 1200)?.id as string;

    assert.ok(pool);
    const app = createNativePostgresApp({
      enabled: true, pool, runAuth: createAuthRunner(pool), runTenant: createTenantRunner(pool),
    });

    // Menu endpoint auth: 401 without credential, 403 on tenant forgery.
    assert.equal((await app.request('/v1/menu/items')).status, 401);
    const loggedIn = await app.request('/v1/auth/pin-login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: tenant, pin: SERVER_PIN }),
    });
    assert.equal(loggedIn.status, 200);
    const token = ((await loggedIn.json()) as { data: { token: string } }).data.token;
    const H = { 'content-type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenant };
    const forged = await app.request('/v1/menu/items', {
      headers: { ...H, 'X-Tenant-Id': '00000000-0000-0000-0000-000000000001' },
    });
    assert.equal(forged.status, 403);

    // The UI's menu call: only available items, adapter-compatible rows.
    const menuRes = await app.request('/v1/menu/items', { headers: H });
    assert.equal(menuRes.status, 200);
    const rows = ((await menuRes.json()) as { data: Array<{ id: string; name: string; price: number; status: string; station: string }> }).data;
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, 'Burger');
    const adapted = adaptNativeMenuItems(rows as unknown as Parameters<typeof adaptNativeMenuItems>[0]);
    assert.equal(adapted.sections[0]?.items[0]?.id, burger);

    // The UI's create call shape (extra id + Idempotency-Key tolerated).
    const created = await app.request('/v1/orders', {
      method: 'POST',
      headers: { ...H, 'Idempotency-Key': `ui-${randomUUID()}` },
      body: JSON.stringify({ id: randomUUID(), tableNumber: 'B1', coverCount: 2, serverName: 'Srv' }),
    });
    assert.equal(created.status, 201);
    const orderId = ((await created.json()) as { data: { id: string } }).data.id;

    // The UI's add-item call shape, exactly as useAddLineItem sends it.
    const added = await app.request(`/v1/orders/${orderId}/items`, {
      method: 'POST', headers: H,
      body: JSON.stringify({
        menuItemId: burger, name: 'Burger', unitPrice: 1200, quantity: 2,
        station: 'grill', courseNumber: 2, notes: null, modifiers: [],
      }),
    });
    assert.equal(added.status, 201);
    const detail = (await (await app.request(`/v1/orders/${orderId}`, { headers: H })).json()) as {
      data: { order: { total: number }; items: Array<{ quantity: number; course_number: number }> };
    };
    assert.equal(detail.data.items.length, 1);
    assert.equal(detail.data.items[0]?.course_number, 2);

    // The UI's native send shape: operationId only, no synthetic body.
    const sent = await app.request(`/v1/orders/${orderId}/send`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ operationId: `ui-send-${randomUUID()}` }),
    });
    assert.equal(sent.status, 200);
    assert.equal((((await sent.json()) as { data: { tickets: unknown[] } }).data.tickets).length, 1);
    const after = (await (await app.request(`/v1/orders/${orderId}`, { headers: H })).json()) as { data: { order: { status: string } } };
    assert.equal(after.data.order.status, 'sent');
  } finally {
    if (originalSecret === undefined) delete process.env.CULINARYOS_PIN_LOOKUP_SECRET;
    else process.env.CULINARYOS_PIN_LOOKUP_SECRET = originalSecret;
    if (pool) await pool.end();
    try {
      await admin.query(`DROP DATABASE ${escapeIdentifier(dbName)}`);
    } finally {
      await admin.end();
    }
  }
});
