import assert from 'node:assert/strict';
import { describe, it } from 'bun:test';
import { createNativePostgresApp } from '../../apps/server/src/postgres/app.ts';
import type { NativeVerifiedIdentity, NativeExecutor } from '../../apps/server/src/postgres/executor.ts';

const tenant = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
function fixture(kind: 'session' | 'device', role: string | null) {
  const identity: NativeVerifiedIdentity = { kind, tenantId: tenant, userId: kind === 'session' ? 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' : null, role, deviceId: kind === 'device' ? 'cccccccc-cccc-cccc-cccc-cccccccccccc' : null, capabilities: [] };
  let writes = 0;
  const tx: NativeExecutor = { query: async () => { writes++; throw new Error('Unexpected business database access'); } };
  const pool = { connect: async () => ({ query: async (sql: string) => ({ rows: sql.includes('resolve_identity') ? [{ kind, tenant_id: tenant, user_id: identity.userId, role, device_id: identity.deviceId, capabilities: [] }] : [], rowCount: 1 }), release() {} }) };
  const app = createNativePostgresApp({ enabled: true, pool, runTenant: async (_hash, callback) => callback(tx, identity), runAuth: async callback => callback(tx) });
  const token = `${kind === 'device' ? 'cd' : 'cs'}_${'x'.repeat(43)}`;
  return { app, writes: () => writes, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } };
}

describe('Native HTTP trust boundaries', () => {
  it('cannot acknowledge or reconcile an unsigned processor event from a staff bearer', async () => {
    const f = fixture('session', 'owner');
    const response = await f.app.request('/v1/native/webhooks/stripe', { method: 'POST', headers: f.headers, body: JSON.stringify({ stripeEventId: 'evt_unsigned_fixture', eventType: 'payment_intent.succeeded', payload: {}, intent: { id: 'pi_unsigned_fixture', orderId: tenant, amount: 100 } }) });
    assert.ok([400, 401, 403, 404, 501, 503].includes(response.status), `Unsigned event must be intentionally denied, got ${response.status}`);
    assert.equal(f.writes(), 0, 'Unsigned event must never access the payment ledger');
  });
  it('denies order writes to a device with no verified capability', async () => {
    const f = fixture('device', null);
    const response = await f.app.request('/v1/native/orders', { method: 'POST', headers: f.headers, body: JSON.stringify({ tableNumber: '1', coverCount: 1, serverName: 'Fixture' }) });
    assert.equal(response.status, 403);
    assert.equal(f.writes(), 0);
  });
  it('requires a human manager for comp tender before financial writes', async () => {
    const f = fixture('session', 'server');
    const response = await f.app.request('/v1/native/payments/cash-comp', { method: 'POST', headers: f.headers, body: JSON.stringify({ orderId: tenant, method: 'comp', amount: 100, operationId: 'comp-fixture' }) });
    assert.equal(response.status, 403);
    assert.equal(f.writes(), 0);
  });
});