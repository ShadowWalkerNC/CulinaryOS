// ============================================================
// CulinaryOS-SaaS — Live HTTP Server (Railway Cloud Bridge API)
// Serves Cloud Storage Sync, Online Ordering Bridge, Add-On
// Entitlement Grants, and SaaS Account Signup Verification.
// ============================================================

import http from 'node:http';
import crypto from 'node:crypto';
import {
  SAAS_ADDONS,
  PLAN_ADDON_BUNDLES,
  issueSaasGrant,
  CulinaryCloudVault,
} from './index.mjs';

const DEFAULT_SIGNING_SECRET =
  process.env.CULINARYOS_SAAS_SIGNING_SECRET &&
  process.env.CULINARYOS_SAAS_SIGNING_SECRET.length >= 16
    ? process.env.CULINARYOS_SAAS_SIGNING_SECRET
    : crypto
        .createHash('sha256')
        .update(process.env.RAILWAY_SERVICE_ID || 'culinaryos-saas-default-signing-key-2026')
        .digest('hex');

const WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || 'whsec_culinaryos_saas_webhook_secret_2026';

export function createCloudBridgeHttpHandler({
  signingSecret = DEFAULT_SIGNING_SECRET,
  webhookSecret = WEBHOOK_SECRET,
} = {}) {
  const vault = new CulinaryCloudVault({ signingSecret });
  // email (lowercase) -> { tenantId, restaurantName, email, timezone, createdAt }
  const signupsByEmail = new Map();

  function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Stripe-Signature-Hex, X-SaaS-Admin-Key',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  }

  function readRawBody(req, maxBytes = 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let total = 0;
      req.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          reject(new Error('PAYLOAD_TOO_LARGE'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  return async function handleRequest(req, res) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Stripe-Signature-Hex, X-SaaS-Admin-Key',
      });
      res.end();
      return;
    }

    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;

    if (req.method === 'GET' && (pathname === '/' || pathname === '/health' || pathname === '/v1/health')) {
      sendJson(res, 200, {
        ok: true,
        service: 'culinaryos-saas-cloud-bridge',
        status: 'healthy',
        version: '1.3.1',
        installedAppRequired: true,
        supportedAddons: Object.values(SAAS_ADDONS),
        plans: Object.keys(PLAN_ADDON_BUNDLES),
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/ready') {
      sendJson(res, 200, {
        ok: true,
        status: 'ready',
        mode: 'saas-cloud-bridge',
        installedAppRequired: true,
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/auth/signup') {
      let body;
      try {
        body = JSON.parse(await readRawBody(req));
      } catch {
        sendJson(res, 400, { error: { message: 'Invalid JSON request body.' } });
        return;
      }

      const restaurantName = String(body?.restaurant_name || '').trim();
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '');
      const timezone = String(body?.timezone || 'America/New_York').trim();

      if (!restaurantName || !email || !email.includes('@') || password.length < 8) {
        sendJson(res, 422, {
          error: {
            message: 'restaurant_name, valid email, and password (>= 8 chars) are required.',
          },
        });
        return;
      }

      if (signupsByEmail.has(email)) {
        sendJson(res, 409, {
          error: { message: 'An account with this email already exists.' },
        });
        return;
      }

      const tenantId = `site-${crypto.randomBytes(6).toString('hex')}`;
      signupsByEmail.set(email, {
        tenantId,
        restaurantName,
        email,
        timezone,
        createdAt: new Date().toISOString(),
      });

      sendJson(res, 201, {
        data: {
          tenant_id: tenantId,
          verification_required: true,
          installed_app_required: true,
          download_url: '/download',
          message:
            'Verification pending. Download and install the CulinaryOS Native Rust Desktop App on your restaurant workstation to connect your Cloud Bridge token.',
        },
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/cloud/issue-grant') {
      let body;
      try {
        body = JSON.parse(await readRawBody(req));
      } catch {
        sendJson(res, 400, { ok: false, code: 'INVALID_JSON' });
        return;
      }
      try {
        const nowUnix = Math.floor(Date.now() / 1000);
        const signedGrant = issueSaasGrant(
          {
            grantId: body.grantId || `grant-${crypto.randomBytes(6).toString('hex')}`,
            customerId: body.customerId,
            siteId: body.siteId,
            planTier: body.planTier || 'saas_pro',
            addons: body.addons,
            cloudEndpoint: body.cloudEndpoint || 'https://culinaryos-api.up.railway.app',
            issuedAtUnix: body.issuedAtUnix ?? nowUnix,
            expiresAtUnix: body.expiresAtUnix ?? nowUnix + 30 * 86_400,
            offlineGraceSeconds: body.offlineGraceSeconds ?? 86_400,
          },
          signingSecret
        );
        sendJson(res, 200, { ok: true, signedGrant });
      } catch (err) {
        sendJson(res, 422, {
          ok: false,
          code: 'INVALID_GRANT_REQUEST',
          message: err instanceof Error ? err.message : 'Invalid grant request',
        });
      }
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/cloud/storage/ingest') {
      let body;
      try {
        body = JSON.parse(await readRawBody(req));
      } catch {
        sendJson(res, 400, { ok: false, code: 'INVALID_JSON' });
        return;
      }
      const nowUnix = Number(body?.nowUnix ?? Math.floor(Date.now() / 1000));
      const result = vault.ingestStorageSyncBatch(body?.signedGrant, body?.envelope || {}, nowUnix);
      sendJson(res, result.status, result);
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/cloud/storage/events') {
      let body;
      try {
        body = JSON.parse(await readRawBody(req));
      } catch {
        sendJson(res, 400, { ok: false, code: 'INVALID_JSON' });
        return;
      }
      const nowUnix = Number(body?.nowUnix ?? Math.floor(Date.now() / 1000));
      const result = vault.getSiteStoredEvents(body?.signedGrant, String(body?.siteId || ''), nowUnix);
      sendJson(res, result.status, result);
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/cloud/orders/queue') {
      let body;
      try {
        body = JSON.parse(await readRawBody(req));
      } catch {
        sendJson(res, 400, { ok: false, code: 'INVALID_JSON' });
        return;
      }
      try {
        const queued = vault.queueOnlineOrderForSite(String(body?.siteId || ''), body?.order);
        sendJson(res, 201, { ok: true, ...queued });
      } catch (err) {
        sendJson(res, 422, {
          ok: false,
          code: 'INVALID_ONLINE_ORDER',
          message: err instanceof Error ? err.message : 'Invalid online order',
        });
      }
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/cloud/orders/drain') {
      let body;
      try {
        body = JSON.parse(await readRawBody(req));
      } catch {
        sendJson(res, 400, { ok: false, code: 'INVALID_JSON' });
        return;
      }
      const nowUnix = Number(body?.nowUnix ?? Math.floor(Date.now() / 1000));
      const result = vault.drainPendingOnlineOrders(
        body?.signedGrant,
        String(body?.siteId || ''),
        nowUnix
      );
      sendJson(res, result.status, result);
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/cloud/billing/webhook') {
      const rawBody = await readRawBody(req);
      const signatureHex = String(req.headers['x-stripe-signature-hex'] || '');
      const result = vault.processStripeWebhook(rawBody, signatureHex, webhookSecret);
      sendJson(res, result.status, result);
      return;
    }

    sendJson(res, 404, {
      ok: false,
      code: 'NOT_FOUND',
      message: 'CulinaryOS SaaS Cloud Bridge endpoint not found.',
    });
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('server.mjs')) {
  const port = Number(process.env.PORT || 3000);
  const server = http.createServer(createCloudBridgeHttpHandler());
  server.listen(port, '0.0.0.0', () => {
    console.log(
      `[CulinaryOS-SaaS] Cloud Bridge & Add-On Server listening on http://0.0.0.0:${port} (installed Rust app required for POS/KDS)`
    );
  });
}
