// ============================================================
// CulinaryOS-SaaS — Cloud Bridge, Remote Storage & Add-On Server
// Connects to Installed CulinaryOS Native Rust Applications
// ============================================================

import crypto from 'node:crypto';

export const SAAS_ADDONS = Object.freeze({
  CLOUD_STORAGE_SYNC: 'cloud_storage_sync',
  ONLINE_ORDERING_BRIDGE: 'online_ordering_bridge',
  AI_AUTOPILOT: 'ai_autopilot',
  MULTI_UNIT_COMMISSARY: 'multi_unit_commissary',
  MANAGED_STRIPE_CONNECT: 'managed_stripe_connect',
});

export const PLAN_ADDON_BUNDLES = Object.freeze({
  saas_starter: [
    SAAS_ADDONS.CLOUD_STORAGE_SYNC,
    SAAS_ADDONS.ONLINE_ORDERING_BRIDGE,
  ],
  saas_pro: [
    SAAS_ADDONS.CLOUD_STORAGE_SYNC,
    SAAS_ADDONS.ONLINE_ORDERING_BRIDGE,
    SAAS_ADDONS.AI_AUTOPILOT,
    SAAS_ADDONS.MANAGED_STRIPE_CONNECT,
  ],
  saas_enterprise: [
    SAAS_ADDONS.CLOUD_STORAGE_SYNC,
    SAAS_ADDONS.ONLINE_ORDERING_BRIDGE,
    SAAS_ADDONS.AI_AUTOPILOT,
    SAAS_ADDONS.MULTI_UNIT_COMMISSARY,
    SAAS_ADDONS.MANAGED_STRIPE_CONNECT,
  ],
});

/**
 * Produces the canonical JSON payload matching Rust's `SaasEntitlementPayload`
 * in `packages/native/src/cloud_bridge.rs` (sorted unique `addons` array).
 */
export function buildEntitlementPayload({
  grantId,
  customerId,
  siteId,
  planTier,
  addons,
  cloudEndpoint = 'https://cloud.culinaryos.io',
  issuedAtUnix,
  expiresAtUnix,
  offlineGraceSeconds = 86_400,
}) {
  if (!grantId || !customerId || !siteId || !planTier) {
    throw new Error('grantId, customerId, siteId, and planTier are required');
  }
  const sortedAddons = Array.from(new Set(addons ?? PLAN_ADDON_BUNDLES[planTier] ?? [])).sort();
  return {
    grantId: String(grantId),
    customerId: String(customerId),
    siteId: String(siteId),
    planTier: String(planTier),
    addons: sortedAddons,
    cloudEndpoint: String(cloudEndpoint),
    issuedAtUnix: Number(issuedAtUnix),
    expiresAtUnix: Number(expiresAtUnix),
    offlineGraceSeconds: Number(offlineGraceSeconds),
  };
}

export function signEntitlementPayload(payload, signingSecret) {
  if (!signingSecret || signingSecret.length < 16) {
    throw new Error('Signing secret must be at least 16 characters');
  }
  const canonicalJson = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', Buffer.from(signingSecret, 'utf8'))
    .update(Buffer.from(canonicalJson, 'utf8'))
    .digest('hex');
}

export function issueSaasGrant(options, signingSecret) {
  const payload = buildEntitlementPayload(options);
  const signatureHex = signEntitlementPayload(payload, signingSecret);
  return {
    payload,
    signatureHex,
  };
}

export function verifySaasGrant(signedGrant, expectedSiteId, signingSecret, nowUnix) {
  if (!signedGrant?.payload || typeof signedGrant.signatureHex !== 'string') {
    return { ok: false, code: 'INVALID_GRANT_FORMAT' };
  }
  if (signedGrant.payload.siteId !== expectedSiteId) {
    return { ok: false, code: 'WRONG_SITE' };
  }
  const expectedHex = signEntitlementPayload(signedGrant.payload, signingSecret);
  const a = Buffer.from(signedGrant.signatureHex, 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  if (a.length !== 32 || b.length !== 32 || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: 'INVALID_SIGNATURE' };
  }
  const deadline =
    Number(signedGrant.payload.expiresAtUnix) +
    Number(signedGrant.payload.offlineGraceSeconds ?? 0);
  if (nowUnix > deadline) {
    return { ok: false, code: 'GRANT_EXPIRED' };
  }
  return { ok: true, payload: signedGrant.payload };
}

/**
 * In-memory / pluggable SaaS Cloud Vault & Online Server Bridge for installed
 * CulinaryOS Rust applications.
 */
export class CulinaryCloudVault {
  constructor({ signingSecret }) {
    if (!signingSecret || signingSecret.length < 16) {
      throw new Error('CulinaryCloudVault requires a signingSecret (>= 16 chars)');
    }
    this.signingSecret = signingSecret;
    // siteId -> { customerId, batches: Map<batchId, envelope>, events: Array }
    this.storageBySite = new Map();
    // siteId -> Array<RelayedOnlineOrder>
    this.onlineOrdersBySite = new Map();
    // Processed Stripe webhook event IDs for idempotency (Rule 3)
    this.processedWebhookEvents = new Set();
    // customerId -> subscription state
    this.subscriptions = new Map();
  }

  /**
   * Ingests a `CloudSyncEnvelope` uploaded by an installed Rust application
   * (`packages/native/src/cloud_bridge.rs`).
   */
  ingestStorageSyncBatch(signedGrant, envelope, nowUnix) {
    const verification = verifySaasGrant(
      signedGrant,
      envelope.siteId,
      this.signingSecret,
      nowUnix
    );
    if (!verification.ok) {
      return { ok: false, status: 401, code: verification.code };
    }
    if (!verification.payload.addons.includes(SAAS_ADDONS.CLOUD_STORAGE_SYNC)) {
      return { ok: false, status: 403, code: 'SAAS_ADDON_REQUIRED' };
    }
    if (verification.payload.customerId !== envelope.customerId) {
      return { ok: false, status: 403, code: 'CROSS_TENANT_DENIED' };
    }

    const actualSha256 = crypto
      .createHash('sha256')
      .update(Buffer.from(JSON.stringify(envelope.events ?? []), 'utf8'))
      .digest('hex');

    if (actualSha256 !== envelope.payloadSha256) {
      return { ok: false, status: 422, code: 'PAYLOAD_CHECKSUM_MISMATCH' };
    }

    let siteBucket = this.storageBySite.get(envelope.siteId);
    if (!siteBucket) {
      siteBucket = {
        customerId: envelope.customerId,
        batches: new Map(),
        events: [],
      };
      this.storageBySite.set(envelope.siteId, siteBucket);
    }

    if (siteBucket.customerId !== envelope.customerId) {
      return { ok: false, status: 403, code: 'CROSS_TENANT_DENIED' };
    }

    // Idempotent batch deduplication
    if (!siteBucket.batches.has(envelope.batchId)) {
      siteBucket.batches.set(envelope.batchId, envelope);
      siteBucket.events.push(...envelope.events);
    }

    return {
      ok: true,
      status: 200,
      batchId: envelope.batchId,
      storedEventsCount: siteBucket.events.length,
    };
  }

  getSiteStoredEvents(signedGrant, siteId, nowUnix) {
    const verification = verifySaasGrant(signedGrant, siteId, this.signingSecret, nowUnix);
    if (!verification.ok) {
      return { ok: false, status: 401, code: verification.code };
    }
    const bucket = this.storageBySite.get(siteId);
    if (!bucket) {
      return { ok: true, status: 200, events: [] };
    }
    if (bucket.customerId !== verification.payload.customerId) {
      return { ok: false, status: 403, code: 'CROSS_TENANT_DENIED' };
    }
    return { ok: true, status: 200, events: [...bucket.events] };
  }

  /**
   * Queues a customer web order to be bridged down to the restaurant's installed
   * Rust application (`RelayedOnlineOrder`).
   */
  queueOnlineOrderForSite(siteId, relayedOrder) {
    if (!relayedOrder?.externalOrderId || !Array.isArray(relayedOrder.items)) {
      throw new Error('Invalid relayed online order');
    }
    const queue = this.onlineOrdersBySite.get(siteId) ?? [];
    if (!queue.some((o) => o.externalOrderId === relayedOrder.externalOrderId)) {
      queue.push(relayedOrder);
      this.onlineOrdersBySite.set(siteId, queue);
    }
    return { queued: true, queueDepth: queue.length };
  }

  /**
   * Called by the installed Rust application to pull pending online orders from
   * the SaaS server bridge.
   */
  drainPendingOnlineOrders(signedGrant, siteId, nowUnix) {
    const verification = verifySaasGrant(signedGrant, siteId, this.signingSecret, nowUnix);
    if (!verification.ok) {
      return { ok: false, status: 401, code: verification.code };
    }
    if (!verification.payload.addons.includes(SAAS_ADDONS.ONLINE_ORDERING_BRIDGE)) {
      return { ok: false, status: 403, code: 'SAAS_ADDON_REQUIRED' };
    }
    const orders = this.onlineOrdersBySite.get(siteId) ?? [];
    this.onlineOrdersBySite.set(siteId, []);
    return { ok: true, status: 200, orders };
  }

  /**
   * Rule 3: Money in integer cents. Calculates platform application fee on
   * Bring-Your-Own-Stripe Connect Standard transactions.
   */
  static calculateApplicationFeeCents(orderTotalCents, feeBasisPoints = 100) {
    if (!Number.isInteger(orderTotalCents) || orderTotalCents < 0) {
      throw new Error('orderTotalCents must be a non-negative integer');
    }
    if (!Number.isInteger(feeBasisPoints) || feeBasisPoints < 0 || feeBasisPoints > 2000) {
      throw new Error('feeBasisPoints must be an integer between 0 and 2000');
    }
    return Math.floor((orderTotalCents * feeBasisPoints + 5000) / 10_000);
  }

  /**
   * Verifies HMAC-SHA256 webhook signature and processes SaaS billing events
   * idempotently.
   */
  processStripeWebhook(rawBody, signatureHex, webhookSecret) {
    const expectedHex = crypto
      .createHmac('sha256', Buffer.from(webhookSecret, 'utf8'))
      .update(Buffer.from(rawBody, 'utf8'))
      .digest('hex');
    const a = Buffer.from(signatureHex || '', 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    if (a.length !== 32 || b.length !== 32 || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, status: 400, code: 'INVALID_WEBHOOK_SIGNATURE' };
    }

    const event = JSON.parse(rawBody);
    if (!event?.id || !event?.type) {
      return { ok: false, status: 422, code: 'INVALID_EVENT_PAYLOAD' };
    }

    if (this.processedWebhookEvents.has(event.id)) {
      return { ok: true, status: 200, deduplicated: true, eventId: event.id };
    }
    this.processedWebhookEvents.add(event.id);

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const sub = event.data?.object;
      if (sub?.customer && sub?.metadata?.siteId) {
        this.subscriptions.set(sub.customer, {
          customerId: sub.customer,
          siteId: sub.metadata.siteId,
          planTier: sub.metadata.planTier ?? 'saas_pro',
          status: sub.status ?? 'active',
        });
      }
    }

    return { ok: true, status: 200, deduplicated: false, eventId: event.id };
  }
}
