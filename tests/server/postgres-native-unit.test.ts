import assert from 'node:assert/strict';
import { describe, it } from 'bun:test';
import { defaultTaxRateBps, getNativeDatabaseUrl, isNativePostgresEnabled } from '../../apps/server/src/postgres/config.ts';
import {
  hasCapability,
  managerGateNative,
  pinLookupHash,
  satisfiesCapability,
  verifyPinHash,
  type NativeAuthContext,
} from '../../apps/server/src/postgres/identity.ts';
import { createNativePostgresApp } from '../../apps/server/src/postgres/app.ts';
import { createAuthRunner, createTenantRunner } from '../../apps/server/src/postgres/transactions.ts';
import { buildOrderCreatedEvent } from '../../apps/server/src/postgres/kitchen.ts';
import { recordCashCompPayment } from '../../apps/server/src/postgres/payments.ts';
import { createOrder } from '../../apps/server/src/postgres/orders.ts';
import { assertAllocationConserves, allocateCheck } from '../../apps/server/src/postgres/splits.ts';
import {
  assertReceiptCompatible,
  claimReceipt,
  finalizeReceipt,
  operationKey,
  requestFingerprint,
} from '../../apps/server/src/postgres/receipts.ts';
import { DomainError } from '../../apps/server/src/postgres/domain.ts';
import { hashPin } from '../../apps/server/src/lib/pin.ts';

// These are pure validation/contract checks with fake executors. They prove
// input guards and math only — they NEVER certify RLS, isolation, delivery,
// or payment behavior. Real-behavior proof lives in postgres-native-pg.test.ts
// and runs only against an explicit ephemeral TEST_DATABASE_URL.

function session(role: string): NativeAuthContext {
  return {
    kind: 'session',
    tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    role,
    deviceId: null,
    capabilities: [],
  };
}

function device(capabilities: string[] = ['orders:write']): NativeAuthContext {
  return {
    kind: 'device',
    tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    userId: null,
    role: null,
    deviceId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    capabilities,
  };
}

const explodingExecutor = {
  async query(): Promise<never> {
    throw new Error('database must not be touched on this path');
  },
};

describe('native feature gate and manager boundary', () => {
  it('is disabled by default and refuses factory construction', () => {
    delete process.env.CULINARYOS_NATIVE_PG;
    assert.equal(isNativePostgresEnabled(), false);
    assert.throws(
      () => createNativePostgresApp({ pool: null as never, runTenant: null as never, runAuth: null as never }),
      /disabled/,
    );
  });

  it('enables only on explicit opt-in', () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    try {
      assert.equal(isNativePostgresEnabled(), true);
      assert.equal(isNativePostgresEnabled({ enabled: false }), false);
    } finally {
      delete process.env.CULINARYOS_NATIVE_PG;
    }
  });

  it('grants manager only to human owner/manager sessions', () => {
    assert.equal(managerGateNative(session('owner')), 'ok');
    assert.equal(managerGateNative(session('manager')), 'ok');
    for (const role of ['server', 'chef', 'viewer', null]) {
      assert.equal(managerGateNative(session(role as string)), 'forbidden');
    }
    assert.equal(managerGateNative(null), 'forbidden');
  });

  it('never grants manager to device keys, whatever their capabilities claim', () => {
    assert.equal(managerGateNative(device(['*'])), 'forbidden');
    assert.equal(managerGateNative(device(['manager', 'refunds:write'])), 'forbidden');
    assert.equal(hasCapability(device(['orders:write']), 'orders:write'), true);
    assert.equal(hasCapability(device(['orders:write']), 'refunds:write'), false);
    assert.equal(hasCapability(session('owner'), 'orders:write'), false);
  });

  it('checks route capabilities for devices and passes human sessions', () => {
    assert.equal(satisfiesCapability(device(['orders:write']), 'orders:write'), true);
    assert.equal(satisfiesCapability(device(['orders:write']), 'menu:read'), false);
    assert.equal(satisfiesCapability(device([]), 'orders:read'), false);
    assert.equal(satisfiesCapability(session('server'), 'orders:write'), true);
    assert.equal(satisfiesCapability(session('viewer'), 'kds:read'), true);
  });
});

describe('native operation fingerprints and receipts', () => {
  it('accepts well-formed idempotency keys and rejects smuggling shapes', () => {
    assert.equal(operationKey('send:order-1:op_2'), 'send:order-1:op_2');
    for (const bad of ['', 'has space', 'semi;colon', "quote'", 'x'.repeat(129)]) {
      assert.throws(() => operationKey(bad), DomainError);
    }
  });

  it('fingerprints key order consistently and detects altered payloads', () => {
    assert.equal(requestFingerprint({ b: 2, a: 1 }), requestFingerprint({ a: 1, b: 2 }));
    assert.notEqual(requestFingerprint({ total: 100 }), requestFingerprint({ total: 101 }));
  });

  it('replays same-id/same-payload and conflicts on same-id/altered-payload', () => {
    const receipt = { operationKey: 'op-1', requestHash: 'abc', status: 'applied' as const, result: { ok: true } };
    assert.equal(assertReceiptCompatible(receipt, 'abc'), receipt);
    assert.throws(() => assertReceiptCompatible(receipt, 'different'), (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.code, 'CONFLICT');
      assert.equal(error.status, 409);
      return true;
    });
  });

  it('claims atomically: first caller owns, rivals replay or conflict, never overwrite', async () => {
    // In-memory stand-in for the unique (tenant, key) index with
    // INSERT ... ON CONFLICT DO NOTHING semantics.
    const store = new Map<string, { request_hash: string; status: string; result: unknown }>();
    const tx = {
      async query<T>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
        if (text.startsWith('INSERT INTO public.operation_receipts')) {
          const [tenant, key, hash] = params as [string, string, string];
          const slot = `${tenant}:${key}`;
          if (store.has(slot)) return { rows: [], rowCount: 0 };
          const row = { operation_key: key, request_hash: hash, status: 'accepted', result: {} };
          store.set(slot, { request_hash: hash, status: 'accepted', result: {} });
          return { rows: [row] as T[], rowCount: 1 };
        }
        if (text.startsWith('SELECT operation_key')) {
          const [tenant, key] = params as [string, string];
          const found = store.get(`${tenant}:${key}`);
          if (!found) return { rows: [], rowCount: 0 };
          return { rows: [{ operation_key: key, ...found }] as T[], rowCount: 1 };
        }
        if (text.startsWith('UPDATE public.operation_receipts')) {
          const [tenant, key, resultJson] = params as [string, string, string];
          const found = store.get(`${tenant}:${key}`);
          if (!found) return { rows: [], rowCount: 0 };
          found.status = 'applied';
          found.result = JSON.parse(resultJson) as unknown;
          return { rows: [{ operation_key: key, ...found }] as T[], rowCount: 1 };
        }
        throw new Error(`unexpected query: ${text}`);
      },
    };
    const tenant = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const first = await claimReceipt(tx, tenant, 'op-1', 'hash-a');
    assert.equal(first.owned, true);
    await finalizeReceipt(tx, tenant, 'op-1', { ticket: 1 });
    const replay = await claimReceipt(tx, tenant, 'op-1', 'hash-a');
    assert.equal(replay.owned, false);
    assert.deepEqual(replay.receipt.result, { ticket: 1 });
    // A rival payload conflicts and the stored receipt is untouched.
    await assert.rejects(() => claimReceipt(tx, tenant, 'op-1', 'hash-b'), /different payload/);
    const after = await claimReceipt(tx, tenant, 'op-1', 'hash-a');
    assert.deepEqual(after.receipt.result, { ticket: 1 });
  });
});

describe('native payment and order guards (no database touched)', () => {
  const tenant = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const orderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  it('rejects every card-like method before any database access', async () => {
    for (const method of ['card', 'CARD', 'Card', 'gift_card', 'split', 'unknown']) {
      await assert.rejects(
        () =>
          recordCashCompPayment(explodingExecutor, session('server'), tenant, {
            orderId, method, amount: 100, operationId: 'op-card',
          }),
        /Only cash\/comp/,
      );
    }
    // Empty method is rejected even earlier by input validation — still no DB touch.
    await assert.rejects(
      () =>
        recordCashCompPayment(explodingExecutor, session('server'), tenant, {
          orderId, method: '', amount: 100, operationId: 'op-card',
        }),
      DomainError,
    );
  });

  it('requires a human manager for comp before any database access', async () => {
    for (const caller of [session('server'), session('chef'), device(['orders:write'])]) {
      await assert.rejects(
        () =>
          recordCashCompPayment(explodingExecutor, caller, tenant, {
            orderId, method: 'comp', amount: 100, operationId: 'op-comp',
          }),
        /human manager/,
      );
    }
    // A manager passes the gate and reaches the database (which explodes here).
    await assert.rejects(
      () =>
        recordCashCompPayment(explodingExecutor, session('manager'), tenant, {
          orderId, method: 'comp', amount: 100, operationId: 'op-comp',
        }),
      /must not be touched/,
    );
  });

  it('requires tableNumber or takeaway before any database access', async () => {
    await assert.rejects(() => createOrder(explodingExecutor, tenant, {}), /tableNumber or takeaway/);
  });
});

describe('native configuration boundaries', () => {
  it('honors the ephemeral test URL only in NODE_ENV=test', () => {
    const savedNode = process.env.NODE_ENV;
    const savedTest = process.env.TEST_DATABASE_URL;
    const savedDb = process.env.DATABASE_URL;
    try {
      process.env.NODE_ENV = 'test';
      process.env.TEST_DATABASE_URL = 'postgresql://test/test';
      process.env.DATABASE_URL = 'postgresql://prod/prod';
      assert.equal(getNativeDatabaseUrl(), 'postgresql://test/test');
      process.env.NODE_ENV = 'production';
      assert.equal(getNativeDatabaseUrl(), 'postgresql://prod/prod');
      delete process.env.DATABASE_URL;
      assert.equal(getNativeDatabaseUrl(), null);
    } finally {
      if (savedNode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = savedNode;
      if (savedTest === undefined) delete process.env.TEST_DATABASE_URL;
      else process.env.TEST_DATABASE_URL = savedTest;
      if (savedDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = savedDb;
    }
  });

  it('defaults unset tax to zero but fails loudly on malformed configuration', () => {
    const saved = process.env.CULINARYOS_TAX_RATE_BPS;
    try {
      delete process.env.CULINARYOS_TAX_RATE_BPS;
      assert.equal(defaultTaxRateBps(), 0);
      process.env.CULINARYOS_TAX_RATE_BPS = '825';
      assert.equal(defaultTaxRateBps(), 825);
      for (const bad of ['nope', '-1', '10001', '8.25', 'NaN']) {
        process.env.CULINARYOS_TAX_RATE_BPS = bad;
        assert.throws(() => defaultTaxRateBps(), /CULINARYOS_TAX_RATE_BPS/);
      }
    } finally {
      if (saved === undefined) delete process.env.CULINARYOS_TAX_RATE_BPS;
      else process.env.CULINARYOS_TAX_RATE_BPS = saved;
    }
  });
});

describe('native split allocation math', () => {
  it('conserves every cent across randomized checks', () => {
    let seed = 123456789;
    const next = (mod: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % mod;
    };
    for (let trial = 0; trial < 300; trial++) {
      const subtotal = next(20000);
      const discount = next(subtotal + 1);
      const input = {
        subtotalCents: subtotal,
        taxRateBps: [0, 500, 550, 825, 1000, 10000][next(6)] ?? 0,
        discountCents: discount,
        serviceChargeCents: next(3000),
        tipCents: next(5000),
        shares: 2 + next(6),
      };
      const shares = allocateCheck(input);
      assert.equal(shares.length, input.shares);
      assert.equal(shares.reduce((sum, share) => sum + share.subtotalCents, 0), input.subtotalCents);
      assert.equal(shares.reduce((sum, share) => sum + share.discountCents, 0), input.discountCents);
      for (const share of shares) {
        assert.equal(share.totalCents, share.taxableCents + share.taxCents + share.serviceChargeCents + share.tipCents);
      }
      assertAllocationConserves(input, shares);
    }
  });

  it('rejects discounts above the subtotal and single shares', () => {
    assert.throws(() => allocateCheck({ subtotalCents: 100, taxRateBps: 0, discountCents: 101, shares: 2 }), DomainError);
    assert.throws(() => allocateCheck({ subtotalCents: 100, taxRateBps: 0, shares: 1 }), DomainError);
  });
});

describe('native token-bound runners (scripted pool, no database)', () => {
  interface Call {
    text: string;
    params?: unknown[];
  }

  function scriptedPool(script: (text: string) => unknown[]) {
    const calls: Call[] = [];
    let releases = 0;
    const pool = {
      async connect() {
        return {
          async query(text: string, params?: unknown[]) {
            calls.push({ text, params });
            return { rows: script(text), rowCount: 0 };
          },
          release() {
            releases += 1;
          },
        };
      },
    };
    return { pool, calls, releases: () => releases };
  }

  const GOOD_HASH = 'a'.repeat(64);

  it('rejects malformed token hashes before connecting', async () => {
    const pool = {
      async connect(): Promise<never> {
        throw new Error('must not connect');
      },
    };
    const runTenant = createTenantRunner(pool);
    for (const bad of ['', 'xyz', 'A'.repeat(64), 'a'.repeat(63)]) {
      await assert.rejects(() => runTenant(bad, async () => 'unreached'), DomainError);
    }
  });

  it('fails closed on unknown credentials and always releases', async () => {
    const { pool, calls, releases } = scriptedPool(() => []);
    const runTenant = createTenantRunner(pool as never);
    await assert.rejects(() => runTenant(GOOD_HASH, async () => 'unreached'), /Invalid credential/);
    assert.equal(releases(), 1);
    assert.ok(calls.some((call) => call.text === 'ROLLBACK'));
    assert.ok(!calls.some((call) => call.text === 'COMMIT'));
  });

  it('pins only the token hash from the resolved row — no tenant setting exists to forge', async () => {
    const row = {
      kind: 'session',
      user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      tenant_id: 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',
      role: 'manager',
      device_id: null,
      capabilities: null,
    };
    const { pool, calls } = scriptedPool((text) => (text.includes('resolve_identity') ? [row] : []));
    const runTenant = createTenantRunner(pool as never);
    const identity = await runTenant(GOOD_HASH, async (_tx, resolved) => resolved);
    assert.equal(identity.tenantId, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    assert.equal(identity.role, 'manager');
    const settings = calls.filter((call) => call.text.includes('set_config'));
    assert.equal(settings.length, 1);
    assert.ok(settings[0]?.text.includes('app.token_hash'));
    assert.deepEqual(settings[0]?.params, [GOOD_HASH]);
    assert.ok(calls.every((call) => !call.text.includes('app.tenant_id')));
    assert.ok(calls.some((call) => call.text === 'COMMIT'));
  });

  it('commits auth work on success and rolls back on callback failure', async () => {
    const first = scriptedPool(() => []);
    await createAuthRunner(first.pool as never)(async () => 'ok');
    assert.ok(first.calls.some((call) => call.text === 'COMMIT'));
    assert.equal(first.releases(), 1);
    const second = scriptedPool(() => []);
    await assert.rejects(
      createAuthRunner(second.pool as never)(async () => {
        throw new Error('boom');
      }),
      /boom/,
    );
    assert.ok(second.calls.some((call) => call.text === 'ROLLBACK'));
    assert.equal(second.releases(), 1);
  });
});

describe('native PIN helpers and kitchen event contract', () => {
  it('computes stable lookup HMACs and verifies scrypt PIN hashes', async () => {
    const secret = 'test-lookup-secret-with-32-plus-chars!!';
    const tenant = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    assert.equal(pinLookupHash(tenant, '1234', secret), pinLookupHash(tenant.toUpperCase(), '1234', secret));
    assert.notEqual(pinLookupHash(tenant, '1234', secret), pinLookupHash(tenant, '1235', secret));
    const stored = hashPin('5678');
    assert.equal(await verifyPinHash('5678', stored), true);
    assert.equal(await verifyPinHash('0000', stored), false);
    assert.equal(await verifyPinHash('5678', 'not-a-hash'), false);
  });

  it('gates device routes by capability before any transaction', async () => {
    const tenant = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const deviceRow = {
      kind: 'device', user_id: null, tenant_id: tenant, role: null,
      device_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', capabilities: ['orders:write'],
    };
    const sessionRow = {
      kind: 'session', user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', tenant_id: tenant,
      role: 'server', device_id: null, capabilities: null,
    };
    let tenantCalls = 0;
    const poolFor = (row: Record<string, unknown>) => ({
      async connect() {
        return {
          async query(text: string) {
            if (text.includes('resolve_identity')) return { rows: [row], rowCount: 1 };
            return { rows: [], rowCount: 0 };
          },
          release() {},
        };
      },
    });
    const deviceToken = `cd_${'a'.repeat(43)}`;
    const sessionToken = `cs_${'b'.repeat(43)}`;
    const appFor = (row: Record<string, unknown>) =>
      createNativePostgresApp({
        enabled: true,
        pool: poolFor(row) as never,
        runTenant: (async () => {
          tenantCalls += 1;
          return { ok: true };
        }) as never,
        runAuth: (async () => ({ ok: true })) as never,
      });
    const headersFor = (token: string) => ({ Authorization: `Bearer ${token}` });

    // Device with orders:write reaches orders routes but not menu/kds routes.
    let response = await appFor(deviceRow).request('/v1/native/orders', {
      method: 'POST', headers: headersFor(deviceToken), body: JSON.stringify({ takeaway: true }),
    });
    assert.equal(response.status, 201);
    assert.equal(tenantCalls, 1);
    response = await appFor(deviceRow).request('/v1/native/menu/items', { headers: headersFor(deviceToken) });
    assert.equal(response.status, 403);
    response = await appFor(deviceRow).request('/v1/native/kds/pending-push', { headers: headersFor(deviceToken) });
    assert.equal(response.status, 403);
    assert.equal(tenantCalls, 1);

    // Human sessions bypass capability checks (role gates still apply elsewhere).
    response = await appFor(sessionRow).request('/v1/native/menu/items', { headers: headersFor(sessionToken) });
    assert.equal(response.status, 200);
    assert.equal(tenantCalls, 2);
  });

  it('preserves the pos:order:created payload contract', () => {
    const event = buildOrderCreatedEvent({
      eventId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      tenantId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      orderId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      tableNumber: 'T4',
      serverName: 'Sam',
      createdAt: '2026-10-01T12:00:00.000Z',
      items: [
        {
          lineItemId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          menuItemId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          name: 'Burger',
          quantity: 2,
          station: 'grill',
          courseNumber: 1,
          modifiers: ['no onion'],
          notes: null,
        },
      ],
    });
    assert.equal(event.eventType, 'pos:order:created');
    assert.equal(event.version, 1);
    assert.equal(event.payload.orderId, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    assert.equal(event.payload.tableNumber, 'T4');
    assert.equal(event.payload.items[0]?.station, 'grill');
    assert.equal(event.payload.items[0]?.courseNumber, 1);
  });
});
