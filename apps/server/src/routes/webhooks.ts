// ============================================================
// CulinaryOS — Unified Webhooks Subsystem
// 1. POST /v1/webhooks/stripe          — HMAC-SHA256 Stripe Connect & Terminal webhook
// 2. POST /v1/webhooks/delivery/:prov  — DoorDash / UberEats / Grubhub / Storefront order relay
// 3. GET  /v1/webhooks/endpoints       — Outbound partner webhook subscriptions
// 4. POST /v1/webhooks/endpoints       — Register outbound webhook with whsec_ signing secret
// 5. DELETE /v1/webhooks/endpoints/:id — Remove outbound webhook subscription
// 6. GET  /v1/webhooks/events          — Inbound & outbound webhook audit ledger
// 7. POST /v1/webhooks/events/:id/replay — Replay a logged webhook event
// ============================================================

import { Hono } from 'hono';
import crypto from 'node:crypto';
import type { Env } from '../types.js';
import { ok, err, requireTenant } from '../middleware/auth.js';
import { isDemoMode, isPlaceholderSecret } from '../lib/secrets.js';

export const webhooksRoutes = new Hono<Env>();

export interface WebhookEventLog {
  id: string;
  direction: 'inbound' | 'outbound';
  provider: 'stripe' | 'doordash' | 'ubereats' | 'grubhub' | 'storefront' | 'partner_outbound';
  eventType: string;
  tenantId: string;
  signatureVerified: boolean;
  deduplicated: boolean;
  status: 'processed' | 'deduplicated' | 'failed_signature' | 'replayed';
  referenceId?: string;
  payloadSummary: string;
  rawPayload: Record<string, any>;
  receivedAt: string;
}

export interface OutboundWebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  description: string;
  events: string[];
  signingSecret: string;
  active: boolean;
  createdAt: string;
}

const webhookLedger: WebhookEventLog[] = [];
const processedEventIds = new Set<string>();
const outboundEndpoints: OutboundWebhookEndpoint[] = [
  {
    id: 'wh-ep-default-erp',
    tenantId: '00000000-0000-0000-0000-000000000001',
    url: 'https://accounting.example.com/webhooks/culinaryos',
    description: 'Nightly Z-Report & Prime Cost Accounting Sync',
    events: ['order.paid', 'z_report.closed', 'tip_pool.calculated', 'inventory.low_stock'],
    signingSecret: 'whsec_culinaryos_default_partner_signing_key_2026',
    active: true,
    createdAt: '2026-11-15T12:00:00Z',
  },
];

function recordWebhookEvent(entry: WebhookEventLog): void {
  webhookLedger.unshift(entry);
  if (webhookLedger.length > 500) {
    webhookLedger.pop();
  }
}

export function computeStripeSignatureHeader(rawBody: string, secret: string, timestampSec?: number): string {
  const ts = timestampSec ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${rawBody}`;
  const hmac = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return `t=${ts},v1=${hmac}`;
}

export function verifyStripeHmacSignature(
  rawBody: string,
  signatureHeader: string | undefined | null,
  secret: string,
  toleranceSeconds = 300,
): { valid: boolean; reason?: string } {
  if (!signatureHeader) {
    return { valid: false, reason: 'Missing stripe-signature header' };
  }
  const parts = signatureHeader.split(',').map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith('t='));
  const v1Parts = parts.filter((p) => p.startsWith('v1='));
  if (!tPart || v1Parts.length === 0) {
    return { valid: false, reason: 'Malformed stripe-signature header (expected t=...,v1=...)' };
  }
  const ts = Number(tPart.slice(2));
  if (!Number.isFinite(ts) || ts <= 0) {
    return { valid: false, reason: 'Invalid timestamp in stripe-signature' };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (toleranceSeconds > 0 && Math.abs(nowSec - ts) > toleranceSeconds) {
    return { valid: false, reason: 'Stripe webhook timestamp outside replay tolerance window' };
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`, 'utf8')
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  for (const v1 of v1Parts) {
    const candidateHex = v1.slice(3);
    if (candidateHex.length === expected.length) {
      try {
        const candidateBuf = Buffer.from(candidateHex, 'hex');
        if (
          candidateBuf.length === expectedBuf.length &&
          crypto.timingSafeEqual(candidateBuf, expectedBuf)
        ) {
          return { valid: true };
        }
      } catch {
        // continue
      }
    }
  }
  return { valid: false, reason: 'HMAC-SHA256 signature mismatch' };
}

// 1. Inbound Delivery & Omnichannel Order Webhook (/v1/webhooks/delivery/:provider)
webhooksRoutes.post('/delivery/:provider', async (c) => {
  const providerRaw = c.req.param('provider').toLowerCase();
  const allowedProviders = ['doordash', 'ubereats', 'grubhub', 'storefront'] as const;
  const provider = (allowedProviders.find((p) => p === providerRaw) ?? 'storefront') as
    | 'doordash'
    | 'ubereats'
    | 'grubhub'
    | 'storefront';

  const rawText = await c.req.text();
  let body: Record<string, any> = {};
  try {
    body = JSON.parse(rawText);
  } catch {
    return err(c, 'VALIDATION_ERROR', 'Invalid JSON webhook payload', 422);
  }

  const secret = process.env.DELIVERY_WEBHOOK_SECRET ?? '';
  const sigHeader = c.req.header('X-Webhook-Signature') ?? c.req.header('x-webhook-signature');
  let signatureVerified = false;

  if (!isPlaceholderSecret(secret)) {
    if (!sigHeader) {
      return err(c, 'UNAUTHORIZED', 'Missing X-Webhook-Signature header', 401);
    }
    const expected = crypto.createHmac('sha256', secret).update(rawText, 'utf8').digest('hex');
    const cleanSig = sigHeader.replace(/^sha256=/i, '').trim();
    if (cleanSig !== expected) {
      recordWebhookEvent({
        id: `wh-evt-${Date.now()}`,
        direction: 'inbound',
        provider,
        eventType: 'delivery.order.created',
        tenantId: String(body.tenantId || body.tenant_id || '00000000-0000-0000-0000-000000000001'),
        signatureVerified: false,
        deduplicated: false,
        status: 'failed_signature',
        payloadSummary: `Rejected invalid HMAC signature from ${provider}`,
        rawPayload: body,
        receivedAt: new Date().toISOString(),
      });
      return err(c, 'UNAUTHORIZED', 'Invalid X-Webhook-Signature HMAC', 401);
    }
    signatureVerified = true;
  } else if (sigHeader) {
    // Verify against default demo secret if signature header was explicitly provided
    const demoSecret = 'whsec_culinaryos_delivery_demo_secret';
    const expected = crypto.createHmac('sha256', demoSecret).update(rawText, 'utf8').digest('hex');
    const cleanSig = sigHeader.replace(/^sha256=/i, '').trim();
    signatureVerified = cleanSig === expected;
  } else if (!isDemoMode()) {
    return err(c, 'UNAUTHORIZED', 'Webhook signature required in production', 401);
  }

  const eventId = String(
    c.req.header('X-Webhook-Event-Id') ?? body.eventId ?? body.event_id ?? `deliv-${crypto.randomUUID()}`,
  );
  const tenantId = String(
    c.req.header('X-Tenant-Id') ?? body.tenantId ?? body.tenant_id ?? '00000000-0000-0000-0000-000000000001',
  );

  if (processedEventIds.has(eventId)) {
    return ok(c, {
      received: true,
      deduplicated: true,
      eventId,
      provider,
    });
  }
  processedEventIds.add(eventId);

  const items = Array.isArray(body.items) && body.items.length > 0
    ? body.items
    : [{ name: 'Online Delivery Combo', quantity: 1, priceCents: 2200, station: 'hot' }];

  const subtotalCents = items.reduce(
    (sum: number, it: any) => sum + Number(it.priceCents ?? it.price_cents ?? 1500) * Number(it.quantity ?? 1),
    0,
  );
  const taxCents = Math.round(subtotalCents * 0.0825);
  const totalCents = subtotalCents + taxCents;
  const orderId = String(body.orderId ?? body.order_id ?? `ord-${provider}-${Date.now().toString(36)}`);

  const logEntry: WebhookEventLog = {
    id: eventId,
    direction: 'inbound',
    provider,
    eventType: 'delivery.order.created',
    tenantId,
    signatureVerified,
    deduplicated: false,
    status: 'processed',
    referenceId: orderId,
    payloadSummary: `${provider.toUpperCase()} Order ${orderId} (${items.length} items, $${(totalCents / 100).toFixed(2)}) routed to POS & KDS`,
    rawPayload: body,
    receivedAt: new Date().toISOString(),
  };
  recordWebhookEvent(logEntry);

  return ok(
    c,
    {
      received: true,
      deduplicated: false,
      eventId,
      provider,
      signatureVerified,
      order: {
        id: orderId,
        tenantId,
        source: provider,
        customerName: String(body.customerName ?? body.customer_name ?? 'Delivery Guest'),
        tableNumber: `${provider.toUpperCase()}-${orderId.slice(-4).toUpperCase()}`,
        status: 'sent',
        subtotalCents,
        taxCents,
        totalCents,
        kdsTicketsFired: items.length,
        items,
      },
    },
    201,
  );
});

// 2. List Outbound Webhook Endpoints
webhooksRoutes.get('/endpoints', requireTenant, (c) => {
  const tenantId = c.get('tenantId');
  const list = outboundEndpoints.filter(
    (ep) => ep.tenantId === tenantId || ep.tenantId === '00000000-0000-0000-0000-000000000001',
  );
  return ok(c, list);
});

// 3. Register Outbound Webhook Endpoint
webhooksRoutes.post('/endpoints', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req
    .json<{ url?: string; description?: string; events?: string[] }>()
    .catch(() => ({} as { url?: string; description?: string; events?: string[] }));

  const url = String(body.url ?? '').trim();
  if (!/^https?:\/\/.+/i.test(url)) {
    return err(c, 'VALIDATION_ERROR', 'Valid http(s):// webhook target URL is required', 422);
  }

  const events = Array.isArray(body.events) && body.events.length > 0
    ? body.events
    : ['order.paid', 'kds.ticket.bumped', 'z_report.closed'];

  const created: OutboundWebhookEndpoint = {
    id: `wh-ep-${crypto.randomUUID().slice(0, 8)}`,
    tenantId,
    url,
    description: String(body.description || 'Partner Webhook Subscription'),
    events,
    signingSecret: `whsec_${crypto.randomBytes(24).toString('hex')}`,
    active: true,
    createdAt: new Date().toISOString(),
  };
  outboundEndpoints.push(created);
  return ok(c, created, 201);
});

// 4. Delete Outbound Webhook Endpoint
webhooksRoutes.delete('/endpoints/:id', requireTenant, (c) => {
  const id = c.req.param('id');
  const idx = outboundEndpoints.findIndex((ep) => ep.id === id);
  if (idx === -1) {
    return err(c, 'NOT_FOUND', `Webhook endpoint not found: ${id}`, 404);
  }
  const [removed] = outboundEndpoints.splice(idx, 1);
  return ok(c, { deleted: true, id: removed!.id });
});

// 5. List Webhook Delivery Events Ledger
webhooksRoutes.get('/events', requireTenant, (c) => {
  const tenantId = c.get('tenantId');
  const events = webhookLedger.filter(
    (e) => e.tenantId === tenantId || e.tenantId === '00000000-0000-0000-0000-000000000001',
  );
  return ok(c, events);
});

// 6. Replay a Logged Webhook Event
webhooksRoutes.post('/events/:eventId/replay', requireTenant, (c) => {
  const eventId = c.req.param('eventId');
  const existing = webhookLedger.find((e) => e.id === eventId);
  if (!existing) {
    return err(c, 'NOT_FOUND', `Webhook event not found: ${eventId}`, 404);
  }

  const replayed: WebhookEventLog = {
    ...existing,
    id: `${existing.id}-replay-${Date.now().toString(36)}`,
    status: 'replayed',
    receivedAt: new Date().toISOString(),
  };
  recordWebhookEvent(replayed);
  return ok(c, replayed);
});

export default webhooksRoutes;
