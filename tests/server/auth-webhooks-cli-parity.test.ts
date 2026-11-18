import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Hono } from 'hono';
import { authRoutes } from '../../apps/server/src/routes/auth.ts';
import {
  webhooksRoutes,
  computeStripeSignatureHeader,
  verifyStripeHmacSignature,
} from '../../apps/server/src/routes/webhooks.ts';
import { createCulinaryClient } from '../../packages/sdk/src/index.ts';

describe('Authentication, RBAC Roles, Device Tokens, Webhooks & SDK/CLI Parity', () => {
  it('verifies cryptographic Stripe HMAC-SHA256 signatures and blocks replay/tampering', () => {
    const secret = 'whsec_test_stripe_hmac_secret_2026';
    const payload = JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded', amount: 4800 });
    const sig = computeStripeSignatureHeader(payload, secret);

    const okRes = verifyStripeHmacSignature(payload, sig, secret);
    assert.equal(okRes.valid, true);

    const tampered = verifyStripeHmacSignature(payload + ' ', sig, secret);
    assert.equal(tampered.valid, false);

    const expiredTs = Math.floor(Date.now() / 1000) - 900;
    const expiredSig = computeStripeSignatureHeader(payload, secret, expiredTs);
    const expiredRes = verifyStripeHmacSignature(payload, expiredSig, secret, 300);
    assert.equal(expiredRes.valid, false);
    assert.match(expiredRes.reason || '', /tolerance/);
  });

  it('ingests signed inbound delivery webhooks (DoorDash/UberEats/Storefront) with deduplication and KDS ticket routing', async () => {
    const app = new Hono();
    app.route('/v1/webhooks', webhooksRoutes);

    const payloadObj = {
      eventId: 'deliv-evt-unique-901',
      orderId: 'ord-dd-901',
      customerName: 'Jordan Lee',
      items: [
        { name: 'Double Wagyu Smash Burger', quantity: 2, priceCents: 1950, station: 'grill' },
        { name: 'Tallow Pommes Frites', quantity: 1, priceCents: 900, station: 'fry' },
      ],
    };
    const raw = JSON.stringify(payloadObj);
    const demoSecret = 'whsec_culinaryos_delivery_demo_secret';
    const hmac = crypto.createHmac('sha256', demoSecret).update(raw, 'utf8').digest('hex');

    const res1 = await app.request('/v1/webhooks/delivery/doordash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
        'X-Webhook-Signature': `sha256=${hmac}`,
        'X-Webhook-Event-Id': 'deliv-evt-unique-901',
      },
      body: raw,
    });
    assert.equal(res1.status, 201);
    const body1 = (await res1.json()) as any;
    assert.equal(body1.data.received, true);
    assert.equal(body1.data.deduplicated, false);
    assert.equal(body1.data.signatureVerified, true);
    assert.equal(body1.data.order.subtotalCents, 4800);
    assert.equal(body1.data.order.kdsTicketsFired, 2);

    // Duplicate replay must be deduplicated idempotently
    const res2 = await app.request('/v1/webhooks/delivery/doordash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
        'X-Webhook-Signature': `sha256=${hmac}`,
        'X-Webhook-Event-Id': 'deliv-evt-unique-901',
      },
      body: raw,
    });
    assert.equal(res2.status, 200);
    const body2 = (await res2.json()) as any;
    assert.equal(body2.data.deduplicated, true);
  });

  it('manages outbound partner webhook endpoints (whsec_ provisioning) and event replay ledger', async () => {
    const app = new Hono();
    app.route('/v1/webhooks', webhooksRoutes);
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
    };

    const createRes = await app.request('/v1/webhooks/endpoints', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        url: 'https://erp.example.com/hooks/culinaryos',
        description: 'QuickBooks & NetSuite GL Sync',
        events: ['order.paid', 'z_report.closed'],
      }),
    });
    assert.equal(createRes.status, 201);
    const created = ((await createRes.json()) as any).data;
    assert.match(created.signingSecret, /^whsec_[0-9a-f]{48}$/);

    const listRes = await app.request('/v1/webhooks/endpoints', { headers });
    assert.equal(listRes.status, 200);
    const endpoints = ((await listRes.json()) as any).data;
    assert.ok(endpoints.some((e: any) => e.id === created.id));

    const eventsRes = await app.request('/v1/webhooks/events', { headers });
    assert.equal(eventsRes.status, 200);
    const events = ((await eventsRes.json()) as any).data;
    assert.ok(events.length >= 1);

    const replayRes = await app.request(`/v1/webhooks/events/${events[0].id}/replay`, {
      method: 'POST',
      headers,
    });
    assert.equal(replayRes.status, 200);
    const replayed = ((await replayRes.json()) as any).data;
    assert.equal(replayed.status, 'replayed');
  });

  it('enforces RBAC role matrix, FLSA manager exclusions, and manager-gated device token minting', async () => {
    const app = new Hono();
    app.route('/v1/auth', authRoutes);
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
    };

    const rolesRes = await app.request('/v1/auth/roles', { headers });
    assert.equal(rolesRes.status, 200);
    const roles = ((await rolesRes.json()) as any).data;
    const owner = roles.find((r: any) => r.role === 'owner');
    const manager = roles.find((r: any) => r.role === 'manager');
    const server = roles.find((r: any) => r.role === 'server');
    assert.equal(owner.flsaTipPoolEligible, false);
    assert.equal(manager.flsaTipPoolEligible, false);
    assert.equal(server.flsaTipPoolEligible, true);

    // Server PIN (1234 in demo_staff is server) must be rejected when minting a device token
    const badMint = await app.request('/v1/auth/device-token', {
      method: 'POST',
      headers,
      body: JSON.stringify({ label: 'Bar iPad', deviceRole: 'pos', managerPin: '0000' }),
    });
    assert.equal(badMint.status, 403);

    // Manager PIN (5678 in demo_staff is manager) must succeed
    const goodMint = await app.request('/v1/auth/device-token', {
      method: 'POST',
      headers,
      body: JSON.stringify({ label: 'Grill KDS Screen', deviceRole: 'kds', station: 'grill', managerPin: '5678' }),
    });
    assert.equal(goodMint.status, 201);
    const tokenData = ((await goodMint.json()) as any).data;
    assert.match(tokenData.token, /^cos_dev_kds_/);
    assert.ok(tokenData.capabilities.includes('kds:grill'));
  });

  it('exposes auth, webhooks, cloud, and intelligence namespaces on @culinaryos/sdk client', () => {
    const client = createCulinaryClient({
      baseUrl: 'http://127.0.0.1:3000',
      tenantId: '00000000-0000-0000-0000-000000000001',
    });
    assert.equal(typeof client.auth.pinLogin, 'function');
    assert.equal(typeof client.auth.verifyManagerPin, 'function');
    assert.equal(typeof client.auth.roles, 'function');
    assert.equal(typeof client.auth.mintDeviceToken, 'function');
    assert.equal(typeof client.webhooks.listEvents, 'function');
    assert.equal(typeof client.webhooks.simulateDelivery, 'function');
    assert.equal(typeof client.webhooks.registerEndpoint, 'function');
    assert.equal(typeof client.cloud.status, 'function');
    assert.equal(typeof client.cloud.demoEnroll, 'function');
  });
});
