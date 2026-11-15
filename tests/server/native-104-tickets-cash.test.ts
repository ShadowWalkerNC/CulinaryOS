import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { escapeIdentifier, Pool } from 'pg';
import { applyMigrations } from '../../packages/db/src/migrate.ts';
import { opaqueToken, tokenHash } from '../../apps/server/src/postgres/domain.ts';
import { pinLookupHash } from '../../apps/server/src/postgres/identity.ts';
import { createAuthRunner, createTenantRunner } from '../../apps/server/src/postgres/transactions.ts';
import { createNativePostgresApp } from '../../apps/server/src/postgres/app.ts';
import { hashPin } from '../../apps/server/src/lib/pin.ts';

// CULINARYOS-104: native KDS ticket actions + cash close/refund/comp proof.
// Runs ONLY when TEST_104_DATABASE_URL points at the disposable loopback
// cluster marked cluster_name=culinaryos-104-test. Otherwise the suite skips
// (never a fake pass) and the file exits 0. This file never prints the URL.

const PIN_SECRET = 'native-104-test-pin-lookup-secret-40ch!';
const MANAGER_PIN = '2468';
const SERVER_PIN = '1357';
const CLUSTER_MARK = 'culinaryos-104-test';

const testUrl = process.env.TEST_104_DATABASE_URL;

function op(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

test('104 ticket actions: auth, transitions, replay, POS-visible completion', {
  skip: testUrl ? false : 'requires TEST_104_DATABASE_URL on the dedicated disposable cluster',
}, async () => {
  assert.ok(testUrl);
  const base = new URL(testUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname));
  assert.equal(base.pathname, '/postgres');
  const admin = new Pool({ connectionString: base.toString(), connectionTimeoutMillis: 5000 });
  const dbName = `culinaryos_104_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
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

    // Tenant, users, memberships, PINs, device keys, menu.
    const rand = randomUUID().slice(0, 8);
    const tenants = await owner<{ id: string }>(
      `INSERT INTO public.tenants (slug, name) VALUES ($1, 'T104 A'), ($2, 'T104 B') RETURNING id`,
      [`t104-a-${rand}`, `t104-b-${rand}`],
    );
    const tenantA = tenants[0]?.id as string;
    const tenantB = tenants[1]?.id as string;
    const users = await owner<{ id: string }>(
      `INSERT INTO public.app_users (display_name) VALUES ('Mgr'), ('Srv') RETURNING id`, [],
    );
    const managerUser = users[0]?.id as string;
    const serverUser = users[1]?.id as string;
    await owner(
      `INSERT INTO public.tenant_users (tenant_id, user_id, role) VALUES ($1, $2, 'manager'), ($1, $3, 'server')`,
      [tenantA, managerUser, serverUser],
    );
    await owner(
      `INSERT INTO public.staff_pins (tenant_id, user_id, pin_hash, pin_lookup_hash, display_name) VALUES
       ($1, $2, $3, $4, 'Mgr'), ($1, $5, $6, $7, 'Srv')`,
      [tenantA, managerUser, hashPin(MANAGER_PIN), pinLookupHash(tenantA, MANAGER_PIN, PIN_SECRET),
        serverUser, hashPin(SERVER_PIN), pinLookupHash(tenantA, SERVER_PIN, PIN_SECRET)],
    );
    const deviceFull = opaqueToken('device');
    const deviceNarrow = opaqueToken('device');
    await owner(
      `INSERT INTO public.device_keys (key_hash, tenant_id, label, capabilities) VALUES
       ($1, $2, 'kds-1', '["kds:read","tickets:write"]'),
       ($3, $2, 'pos-1', '["orders:write"]')`,
      [tokenHash(deviceFull), tenantA, tokenHash(deviceNarrow)],
    );
    const menus = await owner<{ id: string }>(
      `INSERT INTO public.menus (tenant_id, name, status) VALUES ($1, 'Main', 'active') RETURNING id`, [tenantA],
    );
    const sections = await owner<{ id: string }>(
      `INSERT INTO public.menu_sections (tenant_id, menu_id, name) VALUES ($1, $2, 'Mains') RETURNING id`,
      [tenantA, menus[0]?.id as string],
    );
    const items = await owner<{ id: string }>(
      `INSERT INTO public.menu_items (tenant_id, section_id, name, price, status, station) VALUES
       ($1, $2, 'Burger', 1200, 'available', 'grill'),
       ($1, $2, 'Salad', 800, 'available', 'cold') RETURNING id`,
      [tenantA, sections[0]?.id as string],
    );
    const itemGrill = items[0]?.id as string;
    const itemCold = items[1]?.id as string;

    assert.ok(pool);
    const app = createNativePostgresApp({
      enabled: true, pool, runAuth: createAuthRunner(pool), runTenant: createTenantRunner(pool),
    });
    const login = async (tenantId: string, pin: string): Promise<string> => {
      const res = await app.request('/v1/auth/pin-login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId, pin }),
      });
      assert.equal(res.status, 200);
      return ((await res.json()) as { data: { token: string } }).data.token;
    };
    const managerToken = await login(tenantA, MANAGER_PIN);
    const serverToken = await login(tenantA, SERVER_PIN);
    const H = (token: string, tenant = tenantA): Record<string, string> => ({
      'content-type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenant,
    });
    const managerH = H(managerToken);
    const serverH = H(serverToken);

    const createOrder = async (table: string): Promise<string> => {
      const res = await app.request('/v1/orders', {
        method: 'POST', headers: serverH, body: JSON.stringify({ tableNumber: table }),
      });
      assert.equal(res.status, 201);
      return ((await res.json()) as { data: { id: string } }).data.id;
    };
    const addItem = async (orderId: string, menuItemId: string, courseNumber: number): Promise<void> => {
      const res = await app.request(`/v1/orders/${orderId}/items`, {
        method: 'POST', headers: serverH,
        body: JSON.stringify({ menuItemId, quantity: 1, courseNumber }),
      });
      assert.equal(res.status, 201);
    };
    const send = async (orderId: string, operationId: string) => {
      const res = await app.request(`/v1/orders/${orderId}/send`, {
        method: 'PATCH', headers: serverH, body: JSON.stringify({ operationId }),
      });
      assert.equal(res.status, 200);
      return (await res.json()) as { data: { tickets: Array<{ id: string; station: string }> } };
    };

    const orderId = await createOrder('K1');
    await addItem(orderId, itemGrill, 1);
    await addItem(orderId, itemCold, 2);
    const sent = await send(orderId, op('send'));
    assert.equal(sent.data.tickets.length, 2);
    const grillTicket = sent.data.tickets.find((t) => t.station === 'grill')?.id as string;
    const coldTicket = sent.data.tickets.find((t) => t.station === 'cold')?.id as string;

    // Authorization: 401 without credential, 403 on tenant forgery and narrow device.
    assert.equal((await app.request(`/v1/kds/tickets/${grillTicket}/bump`, { method: 'PATCH' })).status, 401);
    assert.equal((await app.request(`/v1/kds/tickets/${grillTicket}/bump`, {
      method: 'PATCH', headers: H(serverToken, tenantB), body: JSON.stringify({}),
    })).status, 403);
    assert.equal((await app.request(`/v1/kds/tickets/${grillTicket}/bump`, {
      method: 'PATCH', headers: H(deviceNarrow), body: JSON.stringify({}),
    })).status, 403);

    // Invalid action and unknown/cross-tenant tickets.
    let res = await app.request(`/v1/kds/tickets/${grillTicket}/vaporize`, {
      method: 'PATCH', headers: serverH, body: JSON.stringify({}),
    });
    assert.equal(res.status, 422);
    res = await app.request(`/v1/kds/tickets/99999999-9999-9999-9999-999999999999/bump`, {
      method: 'PATCH', headers: serverH, body: JSON.stringify({}),
    });
    assert.equal(res.status, 404);
    const orderB = (await owner<{ id: string }>(
      `INSERT INTO public.pos_orders (tenant_id, table_number, status) VALUES ($1, 'KB', 'open') RETURNING id`, [tenantB],
    ))[0]?.id as string;
    const ticketB = (await owner<{ id: string }>(
      `INSERT INTO public.kitchen_tickets (tenant_id, order_id, order_number, station, status, course_hold_status)
       VALUES ($1, $2, 7, 'grill', 'fired', 'fired') RETURNING id`, [tenantB, orderB],
    ))[0]?.id as string;
    res = await app.request(`/v1/kds/tickets/${ticketB}/bump`, {
      method: 'PATCH', headers: serverH, body: JSON.stringify({}),
    });
    assert.equal(res.status, 404);

    // Hold -> fire -> bump lifecycle on the grill (course 1, fired) ticket.
    const act = async (ticketId: string, action: string, body: unknown, headers: Record<string, string>) => {
      const r = await app.request(`/v1/kds/tickets/${ticketId}/${action}`, {
        method: 'PATCH', headers, body: JSON.stringify(body),
      });
      return r;
    };
    res = await act(grillTicket, 'hold', {}, serverH);
    assert.equal(res.status, 200);
    let payload = (await res.json()) as { data: { ticket: { course_hold_status: string }; replayed: boolean } };
    assert.equal(payload.data.ticket.course_hold_status, 'held');
    assert.equal(payload.data.replayed, false);
    res = await act(grillTicket, 'hold', {}, serverH);
    assert.equal((await res.json() as { data: { replayed: boolean } }).data.replayed, true);

    const fireOp = op('fire');
    res = await act(grillTicket, 'fire', { operationId: fireOp }, serverH);
    assert.equal(res.status, 200);
    payload = (await res.json()) as { data: { ticket: { course_hold_status: string; status: string }; replayed: boolean } };
    assert.equal(payload.data.ticket.course_hold_status, 'fired');
    assert.equal(payload.data.replayed, false);
    const pushes = await owner(`SELECT id FROM public.pending_push WHERE tenant_id = $1 AND event_type = 'kds:ticket:fired'`, [tenantA]);
    res = await act(grillTicket, 'fire', { operationId: fireOp }, serverH);
    assert.equal((await res.json() as { data: { replayed: boolean } }).data.replayed, true);
    assert.equal(
      (await owner(`SELECT id FROM public.pending_push WHERE tenant_id = $1 AND event_type = 'kds:ticket:fired'`, [tenantA])).length,
      pushes.length,
    );

    // Device key carrying tickets:write may bump; bumped ticket leaves the KDS list.
    res = await act(grillTicket, 'bump', {}, H(deviceFull));
    assert.equal(res.status, 200);
    const bumped = (await res.json()) as { data: { ticket: { status: string }; replayed: boolean; orderServed: boolean } };
    assert.equal(bumped.data.ticket.status, 'bumped');
    assert.equal(bumped.data.replayed, false);
    assert.equal(bumped.data.orderServed, false);
    res = await app.request('/v1/kds/tickets', { headers: serverH });
    assert.equal(res.status, 200);
    const listed = (await res.json()) as { data: Array<{ id: string }> };
    assert.ok(!listed.data.some((t) => t.id === grillTicket));

    // Bumping the last active ticket serves the order: POS-visible completion.
    res = await act(coldTicket, 'fire', {}, serverH);
    assert.equal(res.status, 200);
    res = await act(coldTicket, 'bump', { operationId: op('bump') }, serverH);
    assert.equal(res.status, 200);
    assert.equal((await res.json() as { data: { orderServed: boolean } }).data.orderServed, true);
    res = await app.request(`/v1/orders/${orderId}`, { headers: serverH });
    assert.equal(res.status, 200);
    assert.equal((await res.json() as { data: { order: { status: string } } }).data.order.status, 'served');

    // Terminal tickets refuse further transitions; a paid order never regresses to served.
    res = await act(grillTicket, 'fire', {}, serverH);
    assert.equal(res.status, 409);
    const paidOrder = await createOrder('K2');
    await addItem(paidOrder, itemGrill, 1);
    const paidSend = await send(paidOrder, op('send'));
    const paidTicket = paidSend.data.tickets[0]?.id as string;
    const total = (await (await app.request(`/v1/orders/${paidOrder}`, { headers: serverH })).json()) as { data: { order: { total: number } } };
    res = await app.request('/v1/payments/cash-comp', {
      method: 'POST', headers: serverH,
      body: JSON.stringify({ orderId: paidOrder, method: 'cash', amount: total.data.order.total, operationId: op('pay') }),
    });
    assert.equal(res.status, 201);
    res = await act(paidTicket, 'bump', {}, serverH);
    assert.equal(res.status, 200);
    assert.equal((await res.json() as { data: { orderServed: boolean } }).data.orderServed, false);
    res = await app.request(`/v1/orders/${paidOrder}`, { headers: serverH });
    assert.equal((await res.json() as { data: { order: { status: string } } }).data.order.status, 'paid');
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

test('104 cash: close/refund/comp cent conservation and drawer replay', {
  skip: testUrl ? false : 'requires TEST_104_DATABASE_URL on the dedicated disposable cluster',
}, async () => {
  assert.ok(testUrl);
  const base = new URL(testUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname));
  assert.equal(base.pathname, '/postgres');
  const admin = new Pool({ connectionString: base.toString(), connectionTimeoutMillis: 5000 });
  const dbName = `culinaryos_104_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
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
      `INSERT INTO public.tenants (slug, name) VALUES ($1, 'T104 Cash') RETURNING id`, [`t104-c-${rand}`],
    );
    const tenant = tenants[0]?.id as string;
    const users = await owner<{ id: string }>(
      `INSERT INTO public.app_users (display_name) VALUES ('Mgr'), ('Srv') RETURNING id`, [],
    );
    await owner(
      `INSERT INTO public.tenant_users (tenant_id, user_id, role) VALUES ($1, $2, 'manager'), ($1, $3, 'server')`,
      [tenant, users[0]?.id as string, users[1]?.id as string],
    );
    await owner(
      `INSERT INTO public.staff_pins (tenant_id, user_id, pin_hash, pin_lookup_hash, display_name) VALUES
       ($1, $2, $3, $4, 'Mgr'), ($1, $5, $6, $7, 'Srv')`,
      [tenant, users[0]?.id as string, hashPin(MANAGER_PIN), pinLookupHash(tenant, MANAGER_PIN, PIN_SECRET),
        users[1]?.id as string, hashPin(SERVER_PIN), pinLookupHash(tenant, SERVER_PIN, PIN_SECRET)],
    );
    const menus = await owner<{ id: string }>(
      `INSERT INTO public.menus (tenant_id, name, status) VALUES ($1, 'Main', 'active') RETURNING id`, [tenant],
    );
    const sections = await owner<{ id: string }>(
      `INSERT INTO public.menu_sections (tenant_id, menu_id, name) VALUES ($1, $2, 'Mains') RETURNING id`,
      [tenant, menus[0]?.id as string],
    );
    const items = await owner<{ id: string }>(
      `INSERT INTO public.menu_items (tenant_id, section_id, name, price, status, station) VALUES
       ($1, $2, 'Burger', 1200, 'available', 'grill') RETURNING id`,
      [tenant, sections[0]?.id as string],
    );
    const itemId = items[0]?.id as string;

    assert.ok(pool);
    const app = createNativePostgresApp({
      enabled: true, pool, runAuth: createAuthRunner(pool), runTenant: createTenantRunner(pool),
    });
    const login = async (pin: string): Promise<string> => {
      const res = await app.request('/v1/auth/pin-login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant, pin }),
      });
      assert.equal(res.status, 200);
      return ((await res.json()) as { data: { token: string } }).data.token;
    };
    const H = (token: string): Record<string, string> => ({
      'content-type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenant,
    });
    const managerH = H(await login(MANAGER_PIN));
    const serverH = H(await login(SERVER_PIN));

    // Drawer open: manager only, one open session per name.
    let res = await app.request('/v1/drawers/open', {
      method: 'POST', headers: serverH, body: JSON.stringify({ openingFloatCents: 5000 }),
    });
    assert.equal(res.status, 403);
    res = await app.request('/v1/drawers/open', {
      method: 'POST', headers: managerH, body: JSON.stringify({ openingFloatCents: 5000 }),
    });
    assert.equal(res.status, 201);
    res = await app.request('/v1/drawers/open', {
      method: 'POST', headers: managerH, body: JSON.stringify({ openingFloatCents: 1 }),
    });
    assert.equal(res.status, 409);

    // Movements conserve cents and replay on the same operation ID.
    const move = async (kind: string, amountCents: number, operationId?: string) => {
      const r = await app.request('/v1/drawers/movement', {
        method: 'POST', headers: managerH,
        body: JSON.stringify({ kind, amountCents, ...(operationId ? { operationId } : {}) }),
      });
      return r;
    };
    const saleOp = op('move');
    res = await move('cash_sale', 2400, saleOp);
    assert.equal(res.status, 200);
    assert.equal((await res.json() as { data: { replayed: boolean } }).data.replayed, false);
    res = await move('cash_sale', 2400, saleOp);
    assert.equal(res.status, 200);
    assert.equal((await res.json() as { data: { replayed: boolean } }).data.replayed, true);
    res = await move('cash_sale', 1, saleOp);
    assert.equal(res.status, 409);
    res = await move('paid_in', 500);
    assert.equal(res.status, 200);
    res = await move('paid_out', 300);
    assert.equal(res.status, 200);
    res = await move('void', 100);
    assert.equal(res.status, 422);
    const session = (await owner<{ cash_sales_cents: number; paid_in_cents: number; paid_out_cents: number }>(
      `SELECT cash_sales_cents, paid_in_cents, paid_out_cents FROM public.drawer_sessions WHERE tenant_id = $1 AND status = 'open'`,
      [tenant],
    ))[0];
    assert.deepEqual(session, { cash_sales_cents: 2400, paid_in_cents: 500, paid_out_cents: 300 });

    // Cash payment, manager-only comp, capped replay-safe refunds.
    const mkOrder = async (table: string): Promise<{ id: string; total: number }> => {
      const created = await app.request('/v1/orders', {
        method: 'POST', headers: serverH, body: JSON.stringify({ tableNumber: table }),
      });
      assert.equal(created.status, 201);
      const id = ((await created.json()) as { data: { id: string } }).data.id;
      const added = await app.request(`/v1/orders/${id}/items`, {
        method: 'POST', headers: serverH, body: JSON.stringify({ menuItemId: itemId, quantity: 2 }),
      });
      assert.equal(added.status, 201);
      const detail = (await (await app.request(`/v1/orders/${id}`, { headers: serverH })).json()) as { data: { order: { total: number } } };
      return { id, total: detail.data.order.total };
    };
    const cashOrder = await mkOrder('C1');
    res = await app.request('/v1/payments/cash-comp', {
      method: 'POST', headers: serverH,
      body: JSON.stringify({ orderId: cashOrder.id, method: 'cash', amount: cashOrder.total, operationId: op('pay') }),
    });
    assert.equal(res.status, 201);
    const payment = ((await res.json()) as { data: { payment: { id: string } } }).data.payment;

    const compOrder = await mkOrder('C2');
    res = await app.request('/v1/payments/cash-comp', {
      method: 'POST', headers: serverH,
      body: JSON.stringify({ orderId: compOrder.id, method: 'comp', amount: compOrder.total, operationId: op('comp') }),
    });
    assert.equal(res.status, 403);
    res = await app.request('/v1/payments/cash-comp', {
      method: 'POST', headers: managerH,
      body: JSON.stringify({ orderId: compOrder.id, method: 'comp', amount: compOrder.total, operationId: op('comp') }),
    });
    assert.equal(res.status, 201);

    res = await app.request('/v1/payments/refund', {
      method: 'POST', headers: serverH,
      body: JSON.stringify({ paymentId: payment.id, amountCents: 100, reason: 'nope', operationId: op('ref') }),
    });
    assert.equal(res.status, 403);
    const refundOp = op('ref');
    res = await app.request('/v1/payments/refund', {
      method: 'POST', headers: managerH,
      body: JSON.stringify({ paymentId: payment.id, amountCents: 100, reason: 'goodwill', operationId: refundOp }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json() as { data: { replayed: boolean } }).data.replayed, false);
    res = await app.request('/v1/payments/refund', {
      method: 'POST', headers: managerH,
      body: JSON.stringify({ paymentId: payment.id, amountCents: 100, reason: 'goodwill', operationId: refundOp }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json() as { data: { replayed: boolean } }).data.replayed, true);
    res = await app.request('/v1/payments/refund', {
      method: 'POST', headers: managerH,
      body: JSON.stringify({ paymentId: payment.id, amountCents: cashOrder.total, reason: 'excess', operationId: op('ref') }),
    });
    assert.equal(res.status, 422);
    const refunded = (await owner<{ refunded_cents: number }>(
      `SELECT refunded_cents FROM public.payments WHERE id = $1`, [payment.id],
    ))[0]?.refunded_cents;
    assert.equal(refunded, 100);

    // Close reconciles the conservation equation; second close finds no open session.
    res = await app.request('/v1/drawers/close', {
      method: 'POST', headers: serverH, body: JSON.stringify({ countedCents: 7600 }),
    });
    assert.equal(res.status, 403);
    res = await app.request('/v1/drawers/close', {
      method: 'POST', headers: managerH, body: JSON.stringify({ countedCents: 7600 }),
    });
    assert.equal(res.status, 200);
    const closed = ((await res.json()) as { data: { expectedCents: number; varianceCents: number } }).data;
    assert.equal(closed.expectedCents, 5000 + 2400 + 500 - 300);
    assert.equal(closed.varianceCents, 7600 - (5000 + 2400 + 500 - 300));
    res = await app.request('/v1/drawers/close', {
      method: 'POST', headers: managerH, body: JSON.stringify({ countedCents: 7600 }),
    });
    assert.equal(res.status, 404);
    res = await app.request('/v1/drawers/main', { headers: managerH });
    assert.equal(res.status, 200);
    assert.equal((await res.json() as { data: { status: string; counted_cents: number } }).data.status, 'closed');
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

test('104 unavailable native features stay explicit', {
  skip: testUrl ? false : 'requires TEST_104_DATABASE_URL on the dedicated disposable cluster',
}, async () => {
  assert.ok(testUrl);
  const base = new URL(testUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname));
  assert.equal(base.pathname, '/postgres');
  const admin = new Pool({ connectionString: base.toString(), connectionTimeoutMillis: 5000 });
  const dbName = `culinaryos_104_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
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
      `INSERT INTO public.tenants (slug, name) VALUES ($1, 'T104 U') RETURNING id`, [`t104-u-${rand}`],
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
    assert.ok(pool);
    const app = createNativePostgresApp({
      enabled: true, pool, runAuth: createAuthRunner(pool), runTenant: createTenantRunner(pool),
    });
    const loggedIn = await app.request('/v1/auth/pin-login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: tenant, pin: SERVER_PIN }),
    });
    assert.equal(loggedIn.status, 200);
    const token = ((await loggedIn.json()) as { data: { token: string } }).data.token;
    const headers = { 'content-type': 'application/json', Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenant };

    for (const [path, method] of [['/v1/kds/pacing', 'GET'], ['/v1/kds/86', 'POST'], ['/v1/native/webhooks/stripe', 'POST']] as const) {
      const res = await app.request(path, { method, headers, body: method === 'POST' ? JSON.stringify({}) : undefined });
      assert.equal(res.status, 503, path);
      assert.equal((await res.json() as { error: { code: string } }).error.code, 'NATIVE_FEATURE_UNAVAILABLE', path);
    }
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
