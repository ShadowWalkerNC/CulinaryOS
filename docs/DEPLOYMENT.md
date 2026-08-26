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

A `railway.toml` is included in the repository root. Deploy the unified API to Railway in one step:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link   # link to your Railway project
railway up
```

Set all required environment variables in the Railway dashboard under **Variables**.

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

