import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import {
  SAAS_ADDONS,
  CulinaryCloudVault,
  issueSaasGrant,
  verifySaasGrant,
} from '../packages/cloud-bridge-server/src/index.mjs';
import { createCloudBridgeHttpHandler } from '../packages/cloud-bridge-server/src/server.mjs';

const SIGNING_SECRET = 'culinaryos-saas-signing-secret-key-2026-prod';
const WEBHOOK_SECRET = 'whsec_culinaryos_saas_stripe_secret_2026';
const SITE_A = '00000000-0000-0000-0000-000000000777';
const SITE_B = '00000000-0000-0000-0000-000000000888';

describe('CulinaryOS-SaaS Private Repo — Installed Rust App Cloud Bridge & Billing Suite', () => {
  it('1. issues HMAC-SHA256 signed add-on entitlement grants compatible with the installed Rust application', () => {
    const grant = issueSaasGrant(
      {
        grantId: 'grant-001',
        customerId: 'cust-alley-katz',
        siteId: SITE_A,
        planTier: 'saas_pro',
        addons: [
          SAAS_ADDONS.CLOUD_STORAGE_SYNC,
          SAAS_ADDONS.ONLINE_ORDERING_BRIDGE,
          SAAS_ADDONS.AI_AUTOPILOT,
        ],
        issuedAtUnix: 1000,
        expiresAtUnix: 2000,
        offlineGraceSeconds: 600,
      },
      SIGNING_SECRET
    );

    // Valid within window and offline grace window
    const valid = verifySaasGrant(grant, SITE_A, SIGNING_SECRET, 2500);
    assert.equal(valid.ok, true);
    assert.deepEqual(valid.payload.addons, [
      'ai_autopilot',
      'cloud_storage_sync',
      'online_ordering_bridge',
    ]);

    // Wrong site rejected (prevents copying a license key across different restaurant sites)
    const wrongSite = verifySaasGrant(grant, SITE_B, SIGNING_SECRET, 1500);
    assert.equal(wrongSite.ok, false);
    assert.equal(wrongSite.code, 'WRONG_SITE');

    // Past offline grace window rejected
    const expired = verifySaasGrant(grant, SITE_A, SIGNING_SECRET, 2601);
    assert.equal(expired.ok, false);
    assert.equal(expired.code, 'GRANT_EXPIRED');
  });

  it('2. ingests cloud storage sync batches from installed Rust apps, verifies SHA-256 integrity, and blocks cross-tenant leaks', () => {
    const vault = new CulinaryCloudVault({ signingSecret: SIGNING_SECRET });
    const grantA = issueSaasGrant(
      {
        grantId: 'g-site-a',
        customerId: 'cust-a',
        siteId: SITE_A,
        planTier: 'saas_pro',
        issuedAtUnix: 1000,
        expiresAtUnix: 5000,
      },
      SIGNING_SECRET
    );
    const grantB = issueSaasGrant(
      {
        grantId: 'g-site-b',
        customerId: 'cust-b',
        siteId: SITE_B,
        planTier: 'saas_pro',
        issuedAtUnix: 1000,
        expiresAtUnix: 5000,
      },
      SIGNING_SECRET
    );

    const events = [
      { type: 'order.created', orderId: 'ord-1', totalCents: 5413 },
      { type: 'payment.cash.settled', operationId: 'op-1', amountCents: 5413 },
    ];
    const payloadSha256 = crypto
      .createHash('sha256')
      .update(Buffer.from(JSON.stringify(events), 'utf8'))
      .digest('hex');

    const envelope = {
      batchId: 'sync-batch-1',
      siteId: SITE_A,
      customerId: 'cust-a',
      cloudEndpoint: 'https://cloud.culinaryos.io',
      eventCount: events.length,
      payloadSha256,
      events,
    };

    const res = vault.ingestStorageSyncBatch(grantA, envelope, 1500);
    assert.equal(res.ok, true);
    assert.equal(res.storedEventsCount, 2);

    // Duplicate batch upload is idempotent
    const dup = vault.ingestStorageSyncBatch(grantA, envelope, 1500);
    assert.equal(dup.ok, true);
    assert.equal(dup.storedEventsCount, 2);

    // Site B cannot read Site A's cloud storage
    const crossRead = vault.getSiteStoredEvents(grantB, SITE_A, 1500);
    assert.equal(crossRead.ok, false);
    assert.equal(crossRead.code, 'WRONG_SITE');
  });

  it('3. bridges online storefront orders to the restaurant installed Rust application', () => {
    const vault = new CulinaryCloudVault({ signingSecret: SIGNING_SECRET });
    const grant = issueSaasGrant(
      {
        grantId: 'g-online-1',
        customerId: 'cust-a',
        siteId: SITE_A,
        planTier: 'saas_starter',
        issuedAtUnix: 1000,
        expiresAtUnix: 5000,
      },
      SIGNING_SECRET
    );

    vault.queueOnlineOrderForSite(SITE_A, {
      externalOrderId: 'web-1001',
      customerName: 'Nathaniel',
      fulfillmentMode: 'pickup',
      items: [['item-margherita', 2]],
    });

    const drained = vault.drainPendingOnlineOrders(grant, SITE_A, 1500);
    assert.equal(drained.ok, true);
    assert.equal(drained.orders.length, 1);
    assert.equal(drained.orders[0].externalOrderId, 'web-1001');

    // Second drain is empty once delivered to installed app
    const drainedAgain = vault.drainPendingOnlineOrders(grant, SITE_A, 1500);
    assert.equal(drainedAgain.orders.length, 0);
  });

  it('4. enforces integer-cent Stripe Connect application fees and idempotent webhook verification', () => {
    assert.equal(CulinaryCloudVault.calculateApplicationFeeCents(10_000, 150), 150);
    assert.throws(() => CulinaryCloudVault.calculateApplicationFeeCents(19.99, 100));

    const vault = new CulinaryCloudVault({ signingSecret: SIGNING_SECRET });
    const rawBody = JSON.stringify({
      id: 'evt_stripe_001',
      type: 'customer.subscription.created',
      data: {
        object: {
          customer: 'cus_alleykatz',
          status: 'active',
          metadata: { siteId: SITE_A, planTier: 'saas_enterprise' },
        },
      },
    });
    const sig = crypto
      .createHmac('sha256', Buffer.from(WEBHOOK_SECRET, 'utf8'))
      .update(Buffer.from(rawBody, 'utf8'))
      .digest('hex');

    const first = vault.processStripeWebhook(rawBody, sig, WEBHOOK_SECRET);
    assert.equal(first.ok, true);
    assert.equal(first.deduplicated, false);

    // Replay with same event ID is deduplicated
    const second = vault.processStripeWebhook(rawBody, sig, WEBHOOK_SECRET);
    assert.equal(second.ok, true);
    assert.equal(second.deduplicated, true);

    // Invalid signature rejected
    const bad = vault.processStripeWebhook(rawBody, '00'.repeat(32), WEBHOOK_SECRET);
    assert.equal(bad.ok, false);
    assert.equal(bad.code, 'INVALID_WEBHOOK_SIGNATURE');
  });

  it('5. serves HTTP /health, /v1/auth/signup, /v1/cloud/issue-grant, /v1/cloud/storage/ingest, and /v1/cloud/orders/drain', async () => {
    const server = http.createServer(
      createCloudBridgeHttpHandler({
        signingSecret: SIGNING_SECRET,
        webhookSecret: WEBHOOK_SECRET,
      })
    );
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    try {
      const healthRes = await fetch(`${baseUrl}/health`);
      assert.equal(healthRes.status, 200);
      const healthBody = await healthRes.json();
      assert.equal(healthBody.ok, true);
      assert.equal(healthBody.installedAppRequired, true);

      const signupRes = await fetch(`${baseUrl}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: 'Alley Katz Kitchen',
          email: 'owner@alleykatz.com',
          password: 'securepassword123',
          timezone: 'America/New_York',
        }),
      });
      assert.equal(signupRes.status, 201);
      const signupBody = await signupRes.json();
      assert.equal(signupBody.data.verification_required, true);
      assert.equal(signupBody.data.installed_app_required, true);
      assert.ok(signupBody.data.tenant_id.startsWith('site-'));

      // Duplicate signup returns 409
      const dupRes = await fetch(`${baseUrl}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: 'Alley Katz Kitchen',
          email: 'owner@alleykatz.com',
          password: 'securepassword123',
        }),
      });
      assert.equal(dupRes.status, 409);

      // Issue SaaS grant via HTTP
      const grantRes = await fetch(`${baseUrl}/v1/cloud/issue-grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantId: 'http-grant-1',
          customerId: 'cust-http-1',
          siteId: SITE_A,
          planTier: 'saas_pro',
          issuedAtUnix: 1000,
          expiresAtUnix: 5000,
        }),
      });
      assert.equal(grantRes.status, 200);
      const { signedGrant } = await grantRes.json();
      assert.equal(signedGrant.payload.siteId, SITE_A);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
