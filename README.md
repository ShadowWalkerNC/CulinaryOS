# CulinaryOS

> **AI‑native, self‑hostable restaurant operating system** — POS · Kitchen Display · Online Ordering · Inventory · MCP extension layer.
> TypeScript · React 18 · Vite · **Hono** (Node 20) · Supabase · Turborepo · pnpm · MIT.

![Stack](https://img.shields.io/badge/stack-TypeScript%20%C2%B7%20React%2018%20%C2%B7%20Hono%20%C2%B7%20Supabase-informational)
![Monorepo](https://img.shields.io/badge/monorepo-pnpm%20%C2%B7%20Turborepo-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)

CulinaryOS is a web‑first restaurant platform: React apps run on any tablet, kitchen display, or browser — no native install. It runs fully in an **offline/demo mode** out of the box, and connects to **Supabase** for a real multi‑tenant backend.

---

## Screenshots

| POS — PIN login | POS — live order ticket | KDS — kitchen board |
|---|---|---|
| ![POS login](docs/screenshots/pos-login.webp) | ![POS order](docs/screenshots/pos-order.webp) | ![KDS board](docs/screenshots/kds-board.webp) |

The UI uses the **CulinaryOS Core** design system — a deep‑navy/slate "corporate modern" theme (Inter + JetBrains Mono, Material Symbols), with a dark "low‑light kitchen" variant for the KDS.

---

## The differentiator: the Ratio Blueprint Engine

Traditional POS software stores menu items as fixed weights (e.g. `500g flour`). CulinaryOS stores **mathematical ratio relationships** via the zero‑dependency `@culinaryos/ratio-engine` package:

- Baker's percentages (`flour: 100%`, `water: 75%`, `salt: 2%`).
- Dynamic batch scaling by expected cover counts.
- Food‑cost projection and sub‑recipe substitution.
- Exposed to AI agents via MCP (`mcp/src/recipe-server.ts`).

```typescript
import { scaleBlueprint, computeCost } from '@culinaryos/ratio-engine';

const sourdough = {
  id: 'sourdough-boule', name: 'Sourdough Boule', baseYield: 1, yieldUnit: 'loaf',
  ingredients: [
    { id: 'flour',   name: 'Bread Flour', ratioWeight: 100, unit: 'g' },
    { id: 'water',   name: 'Water',       ratioWeight: 75,  unit: 'ml' },
    { id: 'starter', name: 'Starter',     ratioWeight: 20,  unit: 'g' },
    { id: 'salt',    name: 'Salt',        ratioWeight: 2,   unit: 'g' },
  ],
};

const scaled = scaleBlueprint(sourdough, 12);   // 12 loaves — ratios preserved
```

---

## Repository layout

```
CulinaryOS/                        # pnpm workspaces + Turborepo
├── apps/
│   ├── server/    # Hono API gateway + event bus (:3000)
│   ├── pos/       # Point‑of‑Sale terminal — "CulinaryOps" (:5172)
│   ├── kds/       # Kitchen Display System — "KitchenKit" view (:5173)
│   ├── admin/     # Back‑office (pantry / purchase orders) (:5174)
│   └── web/       # Customer online‑ordering storefront (:5176)
├── packages/
│   ├── ratio-engine/  # Baker's‑percentage recipe engine (the differentiator)
│   ├── ui/            # @culinaryos/ui — shared design system
│   ├── db/            # Supabase client + generated types
│   ├── auth/          # session + API‑key helpers
│   ├── event-bus/     # domain event broker + Supabase realtime bridge
│   ├── shared/        # cross‑package types + API client
│   └── config/        # env + constants
├── mcp/               # Model Context Protocol servers (AI agent layer)
├── supabase/          # migrations (V1–V13 + feature migrations) + seeds
├── cli/               # operator CLI
├── mobile/            # React Native / Expo companion (scaffold)
├── docker-compose.yml # local containerized stack
└── turbo.json
```

---

## Quickstart

**Prerequisites:** Node.js `>=20`, pnpm `>=9` (`corepack enable` or `npm i -g pnpm`).

```bash
git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
cd CulinaryOS
pnpm install
cp .env.example .env      # runs in offline/demo mode as‑is; fill in Supabase for a live backend
pnpm dev                  # starts all apps + API in watch mode (Turborepo)
```

### Local endpoints

| Service | Workspace | Command | URL |
|---|---|---|---|
| Core API | `apps/server` | `pnpm --filter @culinaryos/server dev` | http://localhost:3000/health |
| POS terminal | `apps/pos` | `pnpm --filter @culinaryos/app-pos dev` | http://localhost:5172 |
| KDS | `apps/kds` | `pnpm --filter @culinaryos/app-kds dev` | http://localhost:5173 |
| Admin | `apps/admin` | `pnpm --filter @culinaryos/admin dev` | http://localhost:5174 |
| Web store | `apps/web` | `pnpm --filter @culinaryos/app-web dev` | http://localhost:5176 |

> **Demo mode:** with placeholder Supabase values in `.env`, the apps serve mock data (POS uses a built‑in menu + `localStorage` orders; KDS shows demo tickets). This is great for UI work but POS and KDS don't share state without a real backend. POS login PINs: `1234` (server), `5678` (manager).

---

## Backend (Supabase)

For a real, persisted multi‑tenant backend, set these in `.env`:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | project URL + public key (client reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | server‑side key — **required** for the API's live DB path (bypasses RLS) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | client copies |
| `DATABASE_URL` | direct Postgres connection (used by migrations + SQL seed) |
| `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` | payments (optional) |
| `INTERNAL_API_KEY`, `DEVICE_API_KEY` | service‑to‑service + terminal auth |

```bash
pnpm db:migrate     # supabase db push — applies migrations
pnpm seed           # seed the demo tenant + menu (see scripts/seed.ts)
```

The schema lives in `supabase/migrations/` (V1–V13 plus dated feature migrations): tenants + RLS, KDS tickets, POS/menus/orders/payments, event‑bus audit log, realtime, pantry/purchase‑orders, course firing, Stripe columns, public‑menu read policies, and beta/extension tables.

---

## Build, test, lint

```bash
pnpm typecheck                     # tsc --noEmit across all packages (green)
pnpm build                         # Turborepo production build (green)
node ./scripts/run-all-tests.cjs   # run the test suite (see note below)
```

> **Testing note:** run tests with `node ./scripts/run-all-tests.cjs`, **not** `pnpm test` — the turbo `test` task currently recurses into the root `//#test` task. The suite uses a custom `bun:test`→`tsx` shim (no Bun runtime needed). A few suites are currently red (non‑UUID tenant headers in fixtures + one offline‑sync mock shape) and are being fixed.
>
> **Lint note:** `pnpm lint` is not yet functional (ESLint isn't wired into the workspace).

---

## API (`apps/server`)

Hono on Node 20. All routes are mounted in `apps/server/src/index.ts`; tenant‑scoped routes require an `X-Tenant-Id` (UUID) plus a bearer token, or run relaxed in demo mode (`AUTH_RELAXED`).

| Mount | Auth | Notes |
|---|---|---|
| `GET /health` | none | liveness + version |
| `POST/GET /internal/events` | `INTERNAL_API_KEY` | domain event ingest |
| `/v1/orders`, `/v1/tabs`, `/v1/pos` | tenant | POS order lifecycle + offline sync |
| `/v1/kds` | tenant | tickets, bump, fire, analytics, pending‑push |
| `/v1/pantry` | tenant | inventory + full purchase‑order workflow |
| `/v1/reports` | tenant | EOD + range revenue |
| `/v1/menu` | public | active menu by tenant slug |
| `/v1/payments` | tenant | Stripe checkout / capture / refund |
| `/v1/online-orders` | public (slug) | guest ordering |

Firing an order emits `pos:order:created`, which the event bus (`@culinaryos/event-bus`) turns into `kitchen_tickets` for the KDS.

---

## MCP (AI agent layer)

CulinaryOS exposes its operations as [Model Context Protocol](https://modelcontextprotocol.io) servers so any MCP‑compatible agent (Claude Desktop, Cursor, …) can drive it. Servers live in `mcp/` and compile to `mcp/dist/`:

| Server | File | Role |
|---|---|---|
| Unified | `mcp/culinary-os-server.ts` | calls the live API (`CULINARY_API_URL`) — recipes, inventory, orders |
| POS | `mcp/src/pos-server.ts` | create/void/fire orders |
| KDS | `mcp/src/kds-server.ts` | fetch/bump tickets |
| Inventory | `mcp/src/inventory-server.ts` | pantry levels + POs |
| Recipe | `mcp/src/recipe-server.ts` | ratio scaling (RecipeOS/KitchenKit bridge) |
| Prep | `mcp/src/prep-server.ts` | mise‑en‑place / prep lists (KitchenKit bridge) |
| Post‑Pilot | `mcp/src/post-pilot-server.ts` | marketing / loyalty bridge |

```bash
pnpm --filter culinaryos-mcp-servers build
node mcp/dist/culinary-os-server.js      # unified server
node mcp/dist/src/pos-server.js          # domain servers live under dist/src/
```

The unified server reads `CULINARY_API_URL` + `CULINARY_API_KEY`. See `mcp/README.md` for a Claude Desktop config example.

### Ecosystem

CulinaryOS is the hub of a small family of standalone, MCP‑bridged repositories:

- **[KitchenKit](https://github.com/ShadowWalkerNC/KitchenKit)** — standalone recipe manager + shift‑prep planner (merges the archived *RecipeOS* + *PrepFlow*). Bridges into CulinaryOS via the recipe + prep MCP servers.
- **[Post‑Pilot](https://github.com/ShadowWalkerNC/Post-Pilot)** — social/marketing automation; bridges via the post‑pilot MCP server.

> "CulinaryOps" and "KitchenKit view" are the branded **POS and KDS surfaces inside this repo** — not separate repositories.

---

## Deployment

- **Docker (self‑host):** `docker compose up --build` builds the API (`apps/server`) plus the four frontends (served via nginx). Supabase credentials are supplied via `.env` (`env_file`); no database is bundled.
- **Render:** `render.yaml` provisions the Hono API as a Docker web service; the Vite frontends build from the monorepo as static sites.
- **Vercel:** `vercel.json` deploys the `apps/web` storefront as a static SPA. The API is hosted separately (Render/Docker), not as a Vercel function.

---

## Status

**Working today:** unified Hono API with all routes mounted · Supabase schema + RLS + realtime migrations · offline/demo mode across POS/KDS/Web · navy design system on POS + KDS · Ratio Blueprint Engine · pantry/purchase‑order workflow · MCP servers (compile + run) · green typecheck & build.

**In progress / roadmap:** real Supabase Auth + `tenant_users` provisioning (so clients hold a session instead of demo/PIN) · routing all POS mutations through the server so POS→KDS persists live · Stripe webhooks + web‑checkout payments · admin breadth (menu editor, staff, reports) · rolling the navy design system to web/admin/mobile · fixing the red test suites + wiring ESLint · finishing the mobile app.

---

## Ground rules

1. Every table carries `tenant_id` + RLS — multi‑tenant isolation is non‑negotiable.
2. Every mutation is auditable via the `domain_events` log.
3. Stock changes write ledger deltas — never overwrite a running total.
4. No raw card data on the server — Stripe PaymentIntents only.
5. AI is additive — the platform must work with the Anthropic layer absent.
6. MCP tools validate inputs and go through the API, never straight to the DB.
7. The Ratio Blueprint Engine stays dependency‑free.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Before opening a PR: `pnpm typecheck`, `pnpm build`, and `node ./scripts/run-all-tests.cjs`.

*MIT License · © 2026 ShadowWalkerNC*
