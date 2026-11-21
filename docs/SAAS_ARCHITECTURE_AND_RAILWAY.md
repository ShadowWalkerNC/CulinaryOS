# CulinaryOS — Unified Cloud Architecture & Railway Runbook

## 1. Unified Monorepo Architectural Boundary

All CulinaryOS on-premise native binaries and cloud services deploy directly from the unified **`ShadowWalkerNC/CulinaryOS`** monorepo (there is no separate `CulinaryOS-SaaS` repository):

- **On-Premise Native Rust Execution (`ShadowWalkerNC/CulinaryOS`):**
  Every restaurant installs the native Rust workstation binaries (`culinaryos-desktop.exe`, `culinaryos-site.exe`, `culinaryos-edge-daemon.exe` from official GitHub Release `v1.3.1`). The local Rust node serves all 8 operational web apps + embedded REST API on a single port (`http://127.0.0.1:3000`) and handles POS orders, KDS ticket routing, ESC/POS thermal/impact printing, cash drawer kicks, and FLSA tip pool calculations with zero internet dependency.
- **Primary Cloud API & SaaS Cloud Bridge (`ShadowWalkerNC/CulinaryOS` on Railway):**
  Hosted on Railway directly from `ShadowWalkerNC/CulinaryOS`, the cloud control plane runs Native PostgreSQL Primary Cloud Mode (`@culinaryos/server` with `DATABASE_URL` + `CULINARYOS_NATIVE_PG=true` — zero Supabase dependency required) alongside the SaaS Cloud Bridge (`@culinaryos/cloud-bridge-server`), Marketing Portal (`@culinaryos/app-marketing`), Admin Back-Office (`@culinaryos/admin`), and Online Storefront (`@culinaryos/app-web`). It issues HMAC-SHA256 signed capability grants (`SignedSaasGrant`), ingests encrypted offsite storage backups (`CloudSyncEnvelope`), relays customer web orders down to the restaurant's installed Rust node (`RelayedOnlineOrder`), and processes Bring-Your-Own-Stripe Connect Standard webhooks in integer cents.

---

## 2. Unified Railway Service Matrix (`ShadowWalkerNC/CulinaryOS`)

All Railway services build and deploy from the root of `ShadowWalkerNC/CulinaryOS` using the shared `railway.toml` Railpack configuration:

| Railway Service | Monorepo Package | Build Command | Start Command / Static Hosting | Key Environment Variables |
|---|---|---|---|---|
| `culinaryos-api` | `@culinaryos/server` | `pnpm --filter @culinaryos/server build` | `pnpm --filter @culinaryos/server start` | `NODE_ENV=production`, `DATABASE_URL`, `CULINARYOS_NATIVE_PG=true`, `CULINARYOS_AUTO_MIGRATE=true`, `CULINARYOS_PIN_LOOKUP_SECRET` |
| `culinaryos-cloud-bridge` | `@culinaryos/cloud-bridge-server` | `pnpm --filter @culinaryos/cloud-bridge-server build` | `pnpm --filter @culinaryos/cloud-bridge-server start` | `NODE_ENV=production`, `DATABASE_URL`, `CULINARYOS_SAAS_SIGNING_SECRET`, `STRIPE_WEBHOOK_SECRET` |
| `culinaryos-marketing` | `@culinaryos/app-marketing` | `pnpm --filter @culinaryos/app-marketing build` | Leave unset for Railpack static hosting (`RAILPACK_SPA_OUTPUT_DIR=apps/marketing/out`) | `NEXT_PUBLIC_API_URL`, `RAILPACK_SPA_OUTPUT_DIR=apps/marketing/out` |
| `culinaryos-admin` | `@culinaryos/admin` | `pnpm --filter @culinaryos/admin build` | Leave unset for Railpack SPA hosting (`RAILPACK_SPA_OUTPUT_DIR=apps/admin/dist`) | `VITE_API_URL`, `RAILPACK_SPA_OUTPUT_DIR=apps/admin/dist` |
| `culinaryos-web` | `@culinaryos/app-web` | `pnpm --filter @culinaryos/app-web build` | Leave unset for Railpack SPA hosting (`RAILPACK_SPA_OUTPUT_DIR=apps/web/dist`) | `VITE_API_URL`, `RAILPACK_SPA_OUTPUT_DIR=apps/web/dist` |

---

## 3. Native PostgreSQL Primary Cloud Mode (`@culinaryos/server`)

When `DATABASE_URL` is configured (or `CULINARYOS_NATIVE_PG=true` is set), `@culinaryos/server` automatically boots in **Native PostgreSQL Primary Cloud Mode** without requiring `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`:

1. **Optional Automatic Migrations on Boot (`CULINARYOS_AUTO_MIGRATE=true`):**
   - `setupNativePostgres` in `apps/server/src/postgres/startup.ts` invokes `runPostgresMigrations` from `@culinaryos/db` (using `DATABASE_MIGRATION_URL` when provided, or the configured PostgreSQL connection) to apply migrations `001_foundation.sql` through `009_native_device_pairing.sql` under a PostgreSQL session advisory lock.
2. **Restricted Runtime Role Verification:**
   - Before opening the HTTP listener, `assertRuntimeDatabaseRole` verifies that the runtime connection is a member of `culinaryos_app`, has `NOBYPASSRLS`, is not a superuser, and owns `0` public tables.
3. **Token-Derived RLS Enforcement:**
   - Every tenant transaction binds only `app.token_hash` via `withVerifiedTenantTransaction`, enforcing database-verified session (`cs_...`) and device (`cd_...`) isolation.

---

## 4. Cloud Bridge API Endpoints (`@culinaryos/cloud-bridge-server`)

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

## 5. Environment Variables Reference

| Variable | Service | Description |
|---|---|---|
| `PORT` | All API services | Listening port injected by Railway (`3000` / `8080`) |
| `DATABASE_URL` | `@culinaryos/server` / `@culinaryos/cloud-bridge-server` | Railway PostgreSQL connection string (automatically enables Native PostgreSQL mode on `@culinaryos/server`) |
| `CULINARYOS_NATIVE_PG` | `@culinaryos/server` | Set to `true` for explicit Native PostgreSQL mode (also auto-enabled when `DATABASE_URL` is configured) |
| `CULINARYOS_AUTO_MIGRATE` | `@culinaryos/server` | Set to `true` to execute pending `@culinaryos/db` PostgreSQL migrations automatically on boot |
| `DATABASE_MIGRATION_URL` | `@culinaryos/server` | Optional migration-owner PostgreSQL URL used when `CULINARYOS_AUTO_MIGRATE=true` |
| `CULINARYOS_PIN_LOOKUP_SECRET` | `@culinaryos/server` | 32+ char HMAC secret for deterministic staff PIN lookup in Native PostgreSQL mode |
| `CULINARYOS_SAAS_SIGNING_SECRET` | `@culinaryos/cloud-bridge-server` | Shared HMAC-SHA256 secret (>= 16 chars) used to sign `SignedSaasGrant` tokens verified by installed Rust nodes |
| `STRIPE_WEBHOOK_SECRET` | `@culinaryos/server` / `@culinaryos/cloud-bridge-server` | HMAC secret for verifying Stripe Connect webhooks |
| `NEXT_PUBLIC_API_URL` | `@culinaryos/app-marketing` | Public URL of the API / Cloud Bridge (`https://culinaryos-api.up.railway.app`) |
| `VITE_API_URL` | `@culinaryos/admin` / `@culinaryos/app-web` | Public URL of the CulinaryOS API (`https://culinaryos-api.up.railway.app`) |
| `RAILPACK_SPA_OUTPUT_DIR` | `@culinaryos/app-marketing` / `@culinaryos/admin` / `@culinaryos/app-web` | Static output directory served by Railpack Caddy (`apps/marketing/out`, `apps/admin/dist`, `apps/web/dist`) |
