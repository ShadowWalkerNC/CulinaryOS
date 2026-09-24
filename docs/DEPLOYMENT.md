# Production Deployment Guide — CulinaryOS

This guide covers deploying CulinaryOS for real-world restaurant operations.

---

## 1. Prerequisites & Environment Setup

Copy `.env.example` to `.env` and populate production credentials:

```bash
# Supabase Configuration
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Direct PostgreSQL URL (Required for migrations/seed)
DATABASE_URL=postgresql://postgres:<password>@db.<your-project-ref>.supabase.co:5432/postgres

# Tenant Context
VITE_TENANT_ID=00000000-0000-0000-0000-000000000001
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Client Endpoints
VITE_API_URL=https://api.yourdomain.com
CULINARYOS_URL=https://api.yourdomain.com

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional AI Agent Layer
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## 2. Database Migrations & Initial Tenant Seed

Apply all forward migrations (V1–V14) and seed initial restaurant data:

```bash
# Seed initial restaurant tenant, dinner menu, and staff PINs
pnpm seed
```

---

## 3. Deployment Option A: Self-Hosted On-Premise (Docker Compose)

Ideal for independent operators running a dedicated hardware server/NUC inside the restaurant:

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

### Backend API (Cloud Run / Fly.io)
Build and deploy the backend Docker container:
```bash
docker build -t culinaryos-server -f apps/server/Dockerfile .
```

### Frontend Applications (Vercel)
Deploy individual apps by linking the monorepo root to Vercel and configuring root directories:
- **POS**: Root directory `apps/pos`, Build command `pnpm run build`, Output directory `dist`
- **KDS**: Root directory `apps/kds`, Build command `pnpm run build`, Output directory `dist`
- **Admin**: Root directory `apps/admin`, Build command `pnpm run build`, Output directory `dist`
- **Web Store**: Root directory `apps/web`, Build command `pnpm run build`, Output directory `dist`

---

## 5. Deployment Option C: Railway

Use separate Railpack services with the repository root as the build context. The current Railway project is `9d7feb1d-d852-4c93-a2a8-75de59bf43a0`. The root `railway.toml` describes the old Docker setup; it is not the configuration used by the current dashboard-managed services.

| Service | Build command | Start command | Service variable |
| --- | --- | --- | --- |
| culinaryos-api | `pnpm --filter @culinaryos/server build` | `pnpm --filter @culinaryos/server start` | `NODE_ENV=production` |
| culinaryos-web | `pnpm --filter @culinaryos/app-web build` | Leave unset for native SPA hosting | `RAILPACK_SPA_OUTPUT_DIR=apps/web/dist` |
| culinaryos-admin | `pnpm --filter @culinaryos/admin build` | Leave unset for native SPA hosting | `RAILPACK_SPA_OUTPUT_DIR=apps/admin/dist` |

Railpack installs from the pnpm lockfile before the build command. Web and Admin explicitly build their compiled config package, so they do not depend on outputs from a prior local API build. The API starts TypeScript through its production `tsx` dependency because workspace packages export TypeScript source and the server typecheck does not emit `dist/index.js`.

[Railpack native SPA hosting](https://railpack.com/languages/node) serves static assets with Caddy and supports client-side routes. A custom start command disables SPA mode. Do not use the repository's interactive root `start` command for these services. Set `VITE_API_URL` on each frontend **before building** to the API's public URL. Configure API healthcheck `/health` and frontend healthcheck `/`; API health is currently a process check, not a database readiness check.

### Deployment verification and rollback

1. Run `pnpm install --frozen-lockfile`, then the three build commands above. Both Next apps elsewhere in this monorepo must also have patched dependencies: Railway scans the shared lockfile even when deploying a Vite app.
2. After the reviewed commit is pushed, inspect each service's build/deploy logs and verify the deployed commit. Never bypass Railway's vulnerability scan.
3. Verify public Web/Admin HTML and nested-route fallback, API `/health`, and configured API calls. A green healthcheck alone does not prove authentication, tenant isolation, payment or database behavior.
4. Record deployment IDs, commit, and results in [the shared ledger](AI_SHARED_LEDGER.md). Roll back a failed release by restoring the previous service settings and reverting the relevant logical commit; never reset the database as a deployment workaround.

### Database transition status

The user selected **fresh Railway PostgreSQL, replacing Supabase**, with no existing data to migrate. This is a target decision, not an implemented backend. Current code still uses Supabase Auth, data APIs, and realtime, and current migrations reference Supabase roles/functions/publications. A `DATABASE_URL` substitution is insufficient. Do not remove Supabase variables and label the resulting offline/demo behavior production-ready. Complete replacement authentication, restricted runtime database access with tenant RLS tests, query adapters, and realtime delivery before a database cutover.

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

