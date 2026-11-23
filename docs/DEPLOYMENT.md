# Production Deployment Guide — CulinaryOS

This guide covers deploying CulinaryOS for real-world restaurant operations.

> Release status (`v1.3.1`): All on-premise Rust workstation binaries (`culinaryos-desktop.exe`, `culinaryos-site.exe`, `culinaryos-edge-daemon.exe`) and all Railway cloud services (`@culinaryos/server`, `@culinaryos/cloud-bridge-server`, `@culinaryos/app-marketing`, `@culinaryos/admin`, `@culinaryos/app-web`) deploy directly from the unified **`ShadowWalkerNC/CulinaryOS`** monorepo (there is no separate `CulinaryOS-SaaS` repository). Native PostgreSQL Primary Cloud Mode is automatically enabled whenever `DATABASE_URL` is configured (or `CULINARYOS_NATIVE_PG=true` is set) with zero Supabase dependency required, and supports automatic boot-time schema migrations via `CULINARYOS_AUTO_MIGRATE=true`.

Packaged POS/KDS/Admin/storefront builds use `VITE_API_URL=/` and forward `/v1/` through nginx to the compose backend. This keeps API requests on the address the client opened, including LAN IPs and HTTPS domains. It does not provide TLS certificates: a public installation still needs a TLS reverse proxy and DNS configuration. Independent cloud deployments continue to use an explicit API URL and CORS allowlist.

Workstation startup uses the installed checkout without pulling `main`. Schedule upgrades deliberately with a database backup and a known rollback version.

---

## 1. Prerequisites & Environment Setup

Copy `.env.example` to `.env` and populate production credentials.

### Option 1A: Native PostgreSQL Primary Cloud Mode (Recommended — Zero Supabase Required)

```bash
# Primary Native PostgreSQL Configuration (Railway / Managed Postgres / Self-Hosted Postgres)
DATABASE_URL=postgresql://culinaryos_runtime:<password>@<db-host>:5432/culinaryos
CULINARYOS_NATIVE_PG=true
CULINARYOS_AUTO_MIGRATE=true
DATABASE_MIGRATION_URL=postgresql://postgres:<owner-password>@<db-host>:5432/culinaryos
CULINARYOS_PIN_LOOKUP_SECRET=<32-plus-char-hmac-secret>

# SaaS Cloud Bridge Signing Secret (@culinaryos/cloud-bridge-server)
CULINARYOS_SAAS_SIGNING_SECRET=<16-plus-char-hmac-secret>

# Client Endpoints
VITE_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
CULINARYOS_URL=https://api.yourdomain.com

# Payments (Bring-Your-Own-Stripe Connect Standard)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional AI Agent Layer (Off by default)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Option 1B: Legacy Supabase Configuration (Optional)

```bash
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
VITE_TENANT_ID=00000000-0000-0000-0000-000000000001
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## 2. Database Migrations & Initial Tenant Seed

Apply forward PostgreSQL migrations (`001_foundation.sql`–`009_native_device_pairing.sql`) using the `@culinaryos/db` migration CLI (or set `CULINARYOS_AUTO_MIGRATE=true` on `@culinaryos/server` to execute `runPostgresMigrations` automatically on boot):

```bash
# Apply first-party PostgreSQL migrations via @culinaryos/db
DATABASE_MIGRATION_URL=postgresql://postgres:<password>@<db-host>:5432/culinaryos pnpm --filter @culinaryos/db tsx src/cli.ts migrate --apply

# Verify runtime role restrictions (culinaryos_app, NOBYPASSRLS, 0 owned tables)
DATABASE_URL=postgresql://culinaryos_runtime:<password>@<db-host>:5432/culinaryos pnpm --filter @culinaryos/db tsx src/cli.ts check-role

# Seed initial restaurant tenant, dinner menu, and staff PINs
pnpm seed
```

---

## 3. Deployment Option A: Self-Hosted On-Premise (Docker Compose / Native Rust Server)

Ideal for independent operators running a dedicated hardware server, edge NUC, or workstation inside the restaurant:

### 3.1 Native High-Performance Rust Axum Server (`culinaryos-server`)

CulinaryOS includes a zero-overhead native Rust Axum server (`culinaryos-server`) compiled directly from `packages/native`. It handles local order dispatch, KDS bump routing, real-time pantry inventory depletion, FLSA tip calculations, and SQLite / Postgres persistence with sub-millisecond response times.

```bash
# Run release Rust server natively (standalone edge mode on port 3000)
pnpm --filter @culinaryos/server start:rust

# Or directly with Cargo:
cargo run --release --bin culinaryos-server -p culinaryos-native

# Command options:
#   --port <PORT>        Listen port (default: 3000 or $PORT)
#   --db-path <PATH>     Local SQLite / state storage path
#   --spa-dir <PATH>     Path to prebuilt POS/KDS/Admin static SPAs
```

### 3.2 Multi-Stage Rust Container (`apps/server/Dockerfile.rust`)

```bash
# Build production native Rust container
docker build -t culinaryos-server-rust -f apps/server/Dockerfile.rust .

# Run container with mapped state volume and host port 3000
docker run -d -p 3000:3000 -v culinaryos-data:/data culinaryos-server-rust
```

### 3.3 Traditional Docker Compose (Full Monorepo Stack)

```bash
# Build and run all services in detached mode
docker compose up -d --build

# View container status
docker compose ps

# View backend logs
docker compose logs -f backend
```

### Port Mappings
- `apps/server` (API Gateway): `http://localhost:3000`
- `apps/pos` (Touchscreen POS): `http://localhost:5172`
- `apps/kds` (Kitchen Display): `http://localhost:5173`
- `apps/admin` (Back Office): `http://localhost:5174`
- `apps/web` (Online Storefront): `http://localhost:5176`

---

## 4. Deployment Option B: Cloud Hosting (Vercel + Cloud Run / Fly.io)

### Backend API (Cloud Run / Fly.io / AWS ECS)
Build and deploy the native Rust backend Docker container:
```bash
docker build -t culinaryos-server -f apps/server/Dockerfile.rust .
```
*(Legacy Node/Hono container remains available at `apps/server/Dockerfile`)*

### Frontend Applications (Vercel)
Deploy individual apps by linking the monorepo root to Vercel and configuring root directories:
- **POS**: Root directory `apps/pos`, Build command `pnpm run build`, Output directory `dist`
- **KDS**: Root directory `apps/kds`, Build command `pnpm run build`, Output directory `dist`
- **Admin**: Root directory `apps/admin`, Build command `pnpm run build`, Output directory `dist`
- **Web Store**: Root directory `apps/web`, Build command `pnpm run build`, Output directory `dist`

---

## 5. Deployment Option C: Railway (Unified `ShadowWalkerNC/CulinaryOS` Monorepo)

All Railway services deploy directly from the unified **`ShadowWalkerNC/CulinaryOS`** monorepo (do not deploy from any separate `CulinaryOS-SaaS` repository). Use separate Railpack services with the repository root as the build context. The current Railway project is `9d7feb1d-d852-4c93-a2a8-75de59bf43a0`. The root `railway.toml` selects the shared Railpack builder; service-specific commands and variables are managed in the dashboard.

| Service | Monorepo Package | Build command | Start command | Service variables |
| --- | --- | --- | --- | --- |
| `culinaryos-api` | `@culinaryos/server` | `pnpm --filter @culinaryos/server build` | `pnpm --filter @culinaryos/server start` | `NODE_ENV=production`, `CULINARYOS_NATIVE_PG=true`, `DATABASE_URL`, `CULINARYOS_AUTO_MIGRATE=true`, `CULINARYOS_PIN_LOOKUP_SECRET` |
| `culinaryos-cloud-bridge` | `@culinaryos/cloud-bridge-server` | `pnpm --filter @culinaryos/cloud-bridge-server build` | `pnpm --filter @culinaryos/cloud-bridge-server start` | `NODE_ENV=production`, `DATABASE_URL`, `CULINARYOS_SAAS_SIGNING_SECRET`, `STRIPE_WEBHOOK_SECRET` |
| `culinaryos-marketing` | `@culinaryos/app-marketing` | `pnpm --filter @culinaryos/app-marketing build` | Leave unset for native SPA/static hosting | `RAILPACK_SPA_OUTPUT_DIR=apps/marketing/out`, `NEXT_PUBLIC_API_URL` |
| `culinaryos-admin` | `@culinaryos/admin` | `pnpm --filter @culinaryos/admin build` | Leave unset for native SPA hosting | `RAILPACK_SPA_OUTPUT_DIR=apps/admin/dist`, `VITE_API_URL` |
| `culinaryos-web` | `@culinaryos/app-web` | `pnpm --filter @culinaryos/app-web build` | Leave unset for native SPA hosting | `RAILPACK_SPA_OUTPUT_DIR=apps/web/dist`, `VITE_API_URL` |

Railpack installs from the pnpm lockfile before the build command. Web, Admin, and Marketing explicitly build from the unified monorepo root. The API starts TypeScript through its production `tsx` dependency because workspace packages export TypeScript source.

[Railpack native SPA hosting](https://railpack.com/languages/node) serves static assets with Caddy and supports client-side routes. A custom start command disables SPA mode. Do not use the repository's interactive root `start` command for these services. Set `VITE_API_URL` / `NEXT_PUBLIC_API_URL` on each frontend **before building** to the API's public URL. Configure API healthcheck `/health` and readiness `/ready`, and frontend healthcheck `/`.

### Deployment verification and rollback

1. Run `pnpm install --frozen-lockfile`, then the build commands above from the `ShadowWalkerNC/CulinaryOS` root.
2. After the reviewed commit is pushed, inspect each service's build/deploy logs and verify the deployed commit. Never bypass Railway's vulnerability scan.
3. Verify public Marketing/Web/Admin HTML and nested-route fallback, API `/health` and `/ready` (`database: "postgres"`), and configured API calls.
4. Record deployment IDs, commit, and results in [the shared ledger](AI_SHARED_LEDGER.md). Roll back a failed release by restoring the previous service settings and reverting the relevant logical commit; never reset the database as a deployment workaround.

### Native PostgreSQL Primary Cloud Mode Status

Railway PostgreSQL is a first-class production backend for `@culinaryos/server`. When `DATABASE_URL` is configured (or `CULINARYOS_NATIVE_PG=true` is set), `@culinaryos/server` automatically enables Native PostgreSQL mode without requiring `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`. Setting `CULINARYOS_AUTO_MIGRATE=true` executes pending migrations (`001_foundation.sql`–`009_native_device_pairing.sql`) via `runPostgresMigrations` from `@culinaryos/db` before verifying the restricted `culinaryos_app` runtime role (`NOBYPASSRLS`, 0 owned tables) and opening the HTTP listener.

---

## 6. Deployment Option D: Render

A `render.yaml` is included in the repository root for multi-service Render deployment:

1. Connect your GitHub repository to [Render](https://render.com).
2. Render automatically detects `render.yaml` and provisions the service blueprint.
3. Set required environment variables in the Render dashboard.
4. Deploy — Render handles builds, restarts, and zero-downtime deploys.

---

## 7. Stripe Terminal & Hardware Pairing

1. Open POS at `https://pos.yourdomain.com` or `http://localhost:5172`.
2. Login using Manager PIN (`5678`) or Server PIN (`1234`).
3. Navigate to **Settings** → **Stripe Card Readers**.
4. Select or pair your **WisePOS E** or **BBPOS Chipper**.
5. Connect USB/Network thermal receipt printers.

---

## 8. Native Handheld Mobile Deployment (iOS via xtool & Android via Expo)

### 8.1 Native iOS Handheld Terminal (`apps/CulinaryOSHandheld`)
The iOS tableside ordering app is built using Swift 6.1 with SwiftUI and configured for cross-platform compilation on Windows using `xtool`.

1. **Verify xtool environment:**
   ```bash
   xtool doctor
   ```
2. **Run local dev & hot-reload:**
   ```bash
   cd apps/CulinaryOSHandheld
   xtool dev
   ```
3. **Inspect connected iOS devices over USB:**
   ```bash
   xtool devices
   ```
4. **Provision and install onto device:**
   ```bash
   xtool install
   xtool launch
   ```
5. **Configuration (`xtool.yml`):**
   - Bundle ID: `com.shadowwalker.culinaryos.handheld`
   - Target: iOS 17.0+
   - API Endpoint: Configured in `APIClient.swift` (`http://<local-lan-ip>:3000` or production URL).

### 8.2 Universal Android & Manager Companion (`mobile/`)
Built with Expo SDK 52 and React Native, targeting physical Android handheld terminals (e.g. Elo, Sunmi, Clover, or commodity Android tablets/phones).

1. **Local Development (Expo Go / Dev Client):**
   ```bash
   cd mobile
   pnpm start
   ```
2. **Android Standalone Production Build (EAS CLI):**
   ```bash
   cd mobile
   pnpm exec eas build --platform android --profile production
   ```
3. **Local APK Preview Generation:**
   ```bash
   cd mobile
   pnpm exec eas build --platform android --profile preview --local
   ```
4. **Environment Configuration:**
   - Configure `EXPO_PUBLIC_API_URL` to point to the production Hono API (`https://api.yourdomain.com`).
   - Configure `EXPO_PUBLIC_TENANT_ID` with the restaurant tenant UUID.

---

## 9. Android TV Kiosk (`apps/android-tv`) & CleanMyTV Provisioning

CulinaryOS ships a 7-in-1 TV Display web surface (`apps/display` on `:5181`) and a native Android TV Kiosk shell (`apps/android-tv`, package `com.culinaryos.display`) optimized for **Walmart `onn. 4K` Android TV 14** boxes and **CleanMyTV**.

1. **Build APK & Stage into CleanMyTV Library (Zero Global SDK Install Required):**
   Uses the portable JDK 17, Android SDK 34, and Gradle toolchain pre-installed in `%APPDATA%\cleanmytv\tools`:
   ```powershell
   powershell -ExecutionPolicy Bypass -File ./scripts/build-android-tv.ps1
   ```
   This compiles `apps/android-tv/app/build/outputs/apk/debug/app-debug.apk` and automatically copies it to `%APPDATA%\cleanmytv\apks\culinaryos-display.apk`.

2. **One-Command ADB Sideload & Server Binding (`culinary display sideload`):**
   ```bash
   # Sideload APK onto Walmart onn. 4K box and point to Railway Cloud or LAN server
   culinary display sideload --device adb-b289ed1e0bf02fbe --url https://culinaryos-demo.up.railway.app --push-launcher
   ```

3. **CleanMyTV Launcher Engine v1 (`com.cleanmytv.launcher.culinaryos`):**
   Generate or push the live restaurant launcher layout (`version: 1`) directly from the API or CLI:
   ```bash
   culinary display launcher-config --brand culinaryos --mode kitchen --out launcher-config.json
   ```
