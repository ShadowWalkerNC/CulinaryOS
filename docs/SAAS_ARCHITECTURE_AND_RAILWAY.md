# CulinaryOS-SaaS — Cloud Bridge Architecture & Railway Runbook

## 1. Architectural Boundary

`ShadowWalkerNC/CulinaryOS-SaaS` is the **private commercial SaaS control plane and marketing repository** for CulinaryOS.

- **On-Premise Execution (Public Repo `ShadowWalkerNC/CulinaryOS`):**
  Every restaurant installs the native Rust binaries (`culinaryos-desktop.exe`, `culinaryos-site.exe`, `culinaryos-edge-daemon.exe`) locally. The local Rust node handles POS orders, KDS ticket routing, ESC/POS thermal/impact printing, cash drawer kicks, and FLSA tip pool calculations with zero internet dependency.
- **Cloud Bridge & Add-On Licensing (Private Repo `ShadowWalkerNC/CulinaryOS-SaaS`):**
  Hosted on Railway (`culinaryos-api.up.railway.app` and `culinaryos-demo.up.railway.app`), this repository issues HMAC-SHA256 signed capability grants (`SignedSaasGrant`), ingests encrypted offsite storage backups (`CloudSyncEnvelope`), relays customer web orders down to the restaurant's installed Rust node (`RelayedOnlineOrder`), and processes Bring-Your-Own-Stripe Connect Standard webhooks in integer cents.

---

## 2. Cloud Bridge API Endpoints (`packages/cloud-bridge-server`)

### Health & Readiness
- `GET /` or `GET /health` or `GET /v1/health`
  Returns `200 OK`:
  ```json
  {
    "ok": true,
    "service": "culinaryos-saas-cloud-bridge",
    "status": "healthy",
    "version": "1.3.1",
    "installedAppRequired": true,
    "supportedAddons": [
      "cloud_storage_sync",
      "online_ordering_bridge",
      "ai_autopilot",
      "multi_unit_commissary",
      "managed_stripe_connect"
    ],
    "plans": ["saas_starter", "saas_pro", "saas_enterprise"]
  }
  ```
- `GET /ready`
  Returns `200 OK` `{ "ok": true, "status": "ready", "mode": "saas-cloud-bridge", "installedAppRequired": true }`.

### SaaS Account Signup
- `POST /v1/auth/signup`
  - Request body: `{ "restaurant_name": "Alley Katz", "email": "owner@alleykatz.com", "password": "••••••••", "timezone": "America/New_York" }`
  - Response (`201 Created`): Returns `tenant_id`, `verification_required: true`, `installed_app_required: true`, and `download_url: "/download"`.
  - Duplicate email returns `409 Conflict`.

### Entitlement Grant Issuance
- `POST /v1/cloud/issue-grant`
  - Issues a canonical `SignedSaasGrant` (`{ payload, signatureHex }`) signed with `CULINARYOS_SAAS_SIGNING_SECRET` that the restaurant pastes into their installed Rust application (`POST http://127.0.0.1:3000/v1/cloud/connect`).

### Offsite Storage Replication (`cloud_storage_sync`)
- `POST /v1/cloud/storage/ingest`
  - Verifies the restaurant's `SignedSaasGrant`, enforces `cloud_storage_sync` entitlement and tenant isolation (`customerId` + `siteId`), validates the SHA-256 checksum of the `events` array, and idempotently stores the `CloudSyncEnvelope` batch.
- `POST /v1/cloud/storage/events`
  - Returns stored offsite delta events for a verified `siteId` and `SignedSaasGrant`.

### Online Ordering Bridge (`online_ordering_bridge`)
- `POST /v1/cloud/orders/queue`
  - Queues a customer web storefront order (`RelayedOnlineOrder`) for a specific restaurant `siteId`.
- `POST /v1/cloud/orders/drain`
  - Authenticated by the restaurant's `SignedSaasGrant` (requiring `online_ordering_bridge`). Drains pending web orders so the installed Rust application can inject them directly into the local KDS rail via `POST /v1/cloud/inbound-orders`.

### Stripe Connect Billing Webhook (`managed_stripe_connect`)
- `POST /v1/cloud/billing/webhook`
  - Verifies `X-Stripe-Signature-Hex` using constant-time `crypto.timingSafeEqual`, deduplicates `event.id`, and updates subscription entitlements. All platform application fees are computed in integer cents via `CulinaryCloudVault.calculateApplicationFeeCents(orderTotalCents, feeBasisPoints)`.

---

## 3. Environment Variables

| Variable | Service | Description |
|---|---|---|
| `PORT` | `culinaryos-api` / `culinaryos-web` | Listening port injected by Railway (`3000` / `8080`) |
| `CULINARYOS_SAAS_SIGNING_SECRET` | `culinaryos-api` | Shared HMAC-SHA256 secret (>= 16 chars) used to sign `SignedSaasGrant` tokens verified by installed Rust nodes |
| `STRIPE_WEBHOOK_SECRET` | `culinaryos-api` | HMAC secret for verifying Stripe Connect subscription webhooks |
| `DATABASE_URL` | `culinaryos-api` | Railway PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | `culinaryos-web` | Public URL of the SaaS Cloud Bridge (`https://culinaryos-api.up.railway.app`) |
| `RAILPACK_SPA_OUTPUT_DIR` | `culinaryos-web` | Set to `apps/marketing/out` when using Railway's Caddy static server |
