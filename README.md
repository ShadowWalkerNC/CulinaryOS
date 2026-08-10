# CulinaryOS

**Free & open-source restaurant POS platform** — self-hostable point of sale, kitchen display, online ordering, inventory, and an AI/MCP extension layer. MIT licensed. No SaaS lock-in. No per-terminal fees.

[![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

<p align="center">
  <img src="docs/screenshots/pos-order.webp" alt="CulinaryOS POS — order entry" width="48%" />
  <img src="docs/screenshots/kds-board.webp" alt="CulinaryOS KDS — kitchen board" width="48%" />
</p>

<p align="center"><em>POS order entry · Kitchen display — run both locally with one command each</em></p>

---

## Looking for a free POS system?

If you searched for a **free POS**, **open-source restaurant POS**, **self-hosted Square alternative**, or **Toast alternative without monthly fees**, this is what CulinaryOS is:

| What you get | What that means |
|---|---|
| **MIT license** | Use it commercially, modify it, host it yourself. No vendor license fees. |
| **Self-hosted** | Your data stays in *your* Supabase (Postgres) project — or any Postgres you control. |
| **Full restaurant stack** | Not just a cash drawer UI: POS + KDS + admin + guest ordering + inventory + AI tools. |
| **Offline-capable POS** | Terminals keep working when the network drops; changes sync when you’re back online. |
| **No per-seat tax** | Clone the repo. Run as many terminals and kitchens as your hardware allows. |

**Honest scope:** CulinaryOS is an **in-development, production-oriented open-source platform**, not a polished turnkey SaaS. You (or your integrator) operate the stack: Node API, Vite frontends, and Supabase. Demo mode works without a real database so you can evaluate the UX in minutes. Live multi-device sync and payments need your own Supabase project and (optionally) Stripe keys.

---

## Table of contents

1. [What CulinaryOS really is](#what-culinaryos-really-is)
2. [Who it’s for](#who-its-for)
3. [Feature overview](#feature-overview)
4. [How the system works](#how-the-system-works)
5. [Quick start — try it free in minutes](#quick-start--try-it-free-in-minutes)
6. [How to use CulinaryOS](#how-to-use-culinaryos)
7. [Production / self-host setup](#production--self-host-setup)
8. [Environment variables](#environment-variables)
9. [AI & MCP extensions](#ai--mcp-extensions)
10. [Repository layout](#repository-layout)
11. [Scripts & development](#scripts--development)
12. [Testing](#testing)
13. [Documentation](#documentation)
14. [FAQ — free POS questions](#faq--free-pos-questions)
15. [Status & roadmap](#status--roadmap)
16. [Contributing](#contributing)
17. [License & credits](#license--credits)

---

## What CulinaryOS really is

**CulinaryOS is an AI-native restaurant operating system** packaged as a TypeScript monorepo. It is designed to replace the closed, subscription-heavy POS ecosystems many restaurants are stuck in — with software you can own, audit, and extend.

At its core it is:

1. **A unified API** (`apps/server`) — Hono on Node.js 20. Auth, menu, orders, kitchen tickets, inventory, payments hooks, and internal service routes.
2. **Operator surfaces**
   - **POS** (`apps/pos`) — floor / counter terminal: PIN login, categories, cart, fire to kitchen, pay flow, offline queue.
   - **KDS** (`apps/kds`) — kitchen display: ticket columns, bump / recall, station filtering, low-light dark UI.
   - **Admin** (`apps/admin`) — back-office dashboard for operators.
   - **Web ordering** (`apps/web`) — guest-facing online menu / checkout UI.
3. **A multi-tenant Postgres data model** (Supabase) with **Row Level Security** — every row is scoped by `tenant_id`. Cross-tenant leakage is treated as a critical bug.
4. **An MCP extension platform** — Model Context Protocol servers so AI agents (Claude, Cursor, custom bots) can call restaurant tools: recipes, inventory, orders, labor/food-cost (via CulinaryOps), and more.
5. **Shared packages** — auth helpers, DB clients, event bus, UI primitives, domain types — so POS, KDS, and server speak the same contracts.

It is **not**:

- A hosted cloud product we bill you for (you host it).
- A hardware vendor (bring your own tablets, printers, cash drawers).
- A finished competitor to every Toast/Square feature on day one — payments, full admin editing, and multi-location hardening are actively being built. See [Status & roadmap](#status--roadmap).

---

## Who it’s for

| Audience | Why CulinaryOS |
|---|---|
| **Independent restaurants & groups** | Want POS + kitchen without $100+/mo/terminal SaaS fees. |
| **Technical owners / CTOs** | Want Postgres ownership, RLS, and the ability to fork. |
| **Integrators & agencies** | Want a white-labelable stack to deploy for clients. |
| **Hackers & AI builders** | Want MCP tools that actually know tickets, inventory, and recipes. |
| **Students & evaluators** | Want a free local demo of a real restaurant stack. |

**Not ideal yet if** you need zero-IT, turnkey hardware + merchant services in a box tomorrow. You’ll need basic Node/Docker familiarity and a Supabase project for live ops.

---

## Feature overview

### Point of sale (POS)
- Staff PIN login (demo PINs included; production uses Supabase Auth + `tenant_users`)
- Category → item → modifier cart
- Fire orders to the kitchen
- Payment flow UI (Stripe integration path available; keys required for live card)
- Offline mode: mock menu + localStorage queue when the API/DB is unreachable
- Touch-friendly CulinaryOS Core UI (navy / slate, Material Symbols)

### Kitchen display (KDS)
- Live ticket board by status (e.g. new → preparing → ready)
- Bump / recall workflow
- Station filtering
- Dark, low-light kitchen theme
- Demo tickets when offline so kitchens can evaluate UX without a backend

### Online ordering (web)
- Guest menu browsing and cart
- Checkout UI wired for future Stripe / webhook completion

### Admin
- Operator dashboard shell for tenant operations (menu/staff/reports depth expanding)

### Inventory & pantry
- Schema + API paths for stock, waste, and purchase flows
- Designed to integrate with RecipeOS / CulinaryOps MCP satellites

### AI / MCP
- First-party MCP servers under `mcp/`
- Extension manifests under `extensions/`
- CulinaryOps labor / food-cost / waste / vendor tools bridged in-repo
- Core rule: **AI is additive** — POS and KDS must work without Anthropic or any LLM

### Platform
- Multi-tenant by design (`tenant_id` everywhere + Supabase RLS)
- Docker Compose for packaged API + static frontends
- Turborepo + pnpm workspaces
- GitHub Actions CI

---

## How the system works

```
┌─────────────┐   HTTP/JSON    ┌──────────────────┐   PostgREST / SQL   ┌────────────┐
│  POS / KDS  │ ─────────────► │  apps/server     │ ──────────────────► │  Supabase  │
│  Admin/Web  │ ◄───────────── │  (Hono API)      │ ◄────────────────── │  Postgres  │
└─────────────┘                └────────┬─────────┘                     │  + Auth    │
                                        │                               │  + RLS     │
                                        │ MCP / extensions              └────────────┘
                                        ▼
                               ┌──────────────────┐
                               │  mcp/* servers   │  ← Claude / Cursor / agents
                               │  CulinaryOps …   │
                               └──────────────────┘
```

1. Staff open **POS** or **KDS** in a browser (or kiosk).
2. Clients call the **unified API** with tenant context.
3. The API reads/writes **Supabase** under RLS; service-role is used only on the server for privileged jobs (seed, admin ops).
4. When POS fires an order, the server creates kitchen tickets; **KDS** polls or receives updates and cooks bump them.
5. Optional: AI agents connect to **MCP servers** for ops questions and mutations — without becoming a hard dependency of service.

Offline path: if Supabase/API is down, POS still sells from a local menu cache and queues mutations for later sync.

---

## Quick start — try it free in minutes

You need **Node.js 20+** and **pnpm 9**.

```bash
git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
cd CulinaryOS
pnpm install

cp .env.example .env
# Demo works with placeholder Supabase values from .env.example

# Terminal 1 — API
pnpm --filter @culinaryos/server dev
# → http://localhost:3000

# Terminal 2 — POS
pnpm --filter @culinaryos/app-pos dev
# → http://localhost:5172

# Terminal 3 — KDS
pnpm --filter @culinaryos/app-kds dev
# → http://localhost:5173
```

### Demo login (offline / local)

| Role | PIN |
|---|---|
| Server / floor staff | `1234` |
| Manager (client demo path) | `5678` |

Open the POS, enter a PIN, build a ticket, fire it. Open the KDS to see the kitchen board (demo tickets appear when you’re not on a live shared DB).

> **Note:** Without a real Supabase project + `SUPABASE_SERVICE_ROLE_KEY`, POS and KDS do **not** share live order state — each surface can still be evaluated in demo/offline mode. See [Production setup](#production--self-host-setup) for the live path.

### Docker (packaged stack)

```bash
cp .env.example .env
docker compose up --build
```

Compose builds the API and nginx-served frontends. Bring your own Postgres/Supabase via env vars (compose does not ship an embedded database).

---

## How to use CulinaryOS

### 1. Run a service shift (POS)

1. Start the server and POS app (see Quick start).
2. Sign in with a staff PIN.
3. Pick a category → add items / modifiers → review the cart.
4. **Fire** the order to send it to the kitchen.
5. Take payment when ready (live card needs Stripe keys; demo can complete the UI path offline).
6. If the network drops mid-shift, keep ringing — the offline queue holds work until reconnect.

### 2. Run the kitchen (KDS)

1. Start the KDS app on a kitchen display or browser.
2. Watch new tickets appear in the board columns.
3. **Bump** tickets as courses leave the pass; **recall** if needed.
4. Filter by station when the line is split (grill, expo, bar, …).

### 3. Manage the restaurant (Admin)

1. Start `pnpm --filter @culinaryos/app-admin dev`.
2. Use the admin shell for tenant-level operations as features land (menu, staff, reporting).

### 4. Take online orders (Web)

1. Start `pnpm --filter @culinaryos/app-web dev`.
2. Guests browse the menu and checkout UI.
3. Wire Stripe + webhooks for production card capture (see env table).

### 5. Seed a demo tenant (live Supabase)

With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set:

```bash
pnpm seed
```

This applies the base tenant + menu seed path used for demos (`supabase/seeds/`). Default demo tenant id used in seeds:

`00000000-0000-0000-0000-000000000001`

### 6. Extend with AI (optional)

Point an MCP client at the CulinaryOS / CulinaryOps servers under `mcp/`. Example tools include recipe/inventory/order helpers and CulinaryOps labor, food-cost, waste, and vendor tools. Core service never requires the LLM to be up.

---

## Production / self-host setup

### Checklist

1. **Create a Supabase project** (free tier works to start).
2. **Apply migrations** from `supabase/migrations/` (V1 → current) via Supabase SQL editor or CLI.
3. **Enable RLS** — migrations define policies; do not disable RLS in production.
4. Copy `.env.example` → `.env` and fill:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never ship to browsers)
   - `DATABASE_URL` if you run direct Postgres tooling
   - `INTERNAL_API_KEY` / `DEVICE_API_KEY` (generate strong secrets)
5. **Seed** with `pnpm seed`.
6. Create real **Auth users** and `tenant_users` rows (replace demo PINs for production).
7. Deploy:
   - API: Render / Fly / VM / Docker image from `apps/server`
   - Frontends: static hosts (Vercel, Netlify, nginx) — see `vercel.json` / `render.yaml` where present
8. Optional: Stripe keys + webhook endpoint for card payments.
9. Optional: Anthropic / RecipeOS / CulinaryOps MCP URLs for AI features.

### Security rules (non-negotiable)

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `INTERNAL_API_KEY` to Vite/`VITE_*` client env.
- Every query must be tenant-scoped.
- Treat WebSocket / order message contracts as versioned APIs — change POS and KDS together.

---

## Environment variables

| Variable | Required | Where | Purpose |
|---|---|---|---|
| `SUPABASE_URL` | Yes (live) | Server + clients | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes (live) | Server + `VITE_*` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server live) | Server only | Privileged seed/admin; never client-side |
| `DATABASE_URL` | Recommended | Server / tooling | Direct Postgres URL |
| `INTERNAL_API_KEY` | Yes (prod) | Server | Protects internal routes |
| `DEVICE_API_KEY` / `VITE_DEVICE_API_KEY` | Device auth | Server + POS/KDS | Device pairing |
| `STRIPE_SECRET_KEY` / webhook secret | Payments | Server | Card capture |
| `ANTHROPIC_API_KEY` | AI only | MCP / AI layer | Claude — optional |
| `RECIPEOS_MCP_URL` / `RECIPEOS_JWT_SECRET` | Phase bridge | Server / recipeos | RecipeOS integration |
| `KDS_WEBSOCKET_PORT` / `POS_WEBSOCKET_PORT` | If used | Realtime | WS endpoints |
| `PORT` | Optional | Server | API port (default `3000`) |

Full template: [`.env.example`](./.env.example). Never commit real `.env` values.

---

## AI & MCP extensions

CulinaryOS ships an **extension platform**, not a single chatbot bolted on.

| Piece | Role |
|---|---|
| `mcp/culinary-os-server.ts` | Core CulinaryOS MCP (recipes, inventory, orders, …) |
| `mcp/src/*-server.ts` | Domain servers (including CulinaryOps ops bridge) |
| `extensions/` | Manifests for first-party extensions |
| `extension_template/` | Public contract for third-party builders |
| [CulinaryOps](https://github.com/ShadowWalkerNC/CulinaryOps) | Satellite: labor, food-cost, waste, vendors |

**Extension API stability:** treat `extension_template/` like a published SDK. Breaking changes need ARCHITECT review, semver, and a CHANGELOG note.

Related satellites in the ecosystem: **KitchenKit**, **Post-Pilot**, **RecipeOS** — bridged, not scattered across random packages.

---

## Repository layout

```
CulinaryOS/
├── apps/
│   ├── server/          # Hono API (Node 20)
│   ├── pos/             # POS terminal (Vite + React)
│   ├── kds/             # Kitchen Display (Vite + React)
│   ├── admin/           # Admin dashboard
│   └── web/             # Online ordering
├── packages/            # shared, auth, db, event-bus, ui, …
├── mcp/                 # MCP servers (AI tool layer)
├── extensions/          # First-party extension manifests
├── extension_template/  # Third-party extension contract
├── supabase/            # Migrations, RLS, seeds
├── services/            # Shared microservices
├── mobile/              # Expo companion (early)
├── android/             # Native Kotlin surface (separate target)
├── cli/                 # Operator CLI
├── recipeos/            # RecipeOS bridge (isolated)
├── tests/               # Integration / empirical tests
├── docs/                # Technical docs + screenshots
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Scripts & development

| Command | Purpose |
|---|---|
| `pnpm install` | Install all workspace deps |
| `pnpm --filter @culinaryos/server dev` | API on `:3000` |
| `pnpm --filter @culinaryos/app-pos dev` | POS on `:5172` |
| `pnpm --filter @culinaryos/app-kds dev` | KDS on `:5173` |
| `pnpm --filter @culinaryos/app-admin dev` | Admin |
| `pnpm --filter @culinaryos/app-web dev` | Web ordering |
| `pnpm seed` | Seed demo tenant (needs service role) |
| `pnpm build` | Turborepo build |
| `node ./scripts/run-all-tests.cjs` | Preferred full test runner |
| `docker compose up --build` | Packaged local stack |

Monorepo rules: put new code in the correct package; share types via `packages/` or `shared/`; do not import another package’s `src/` internals.

For Cursor Cloud / agent notes, see [`AGENTS.md`](./AGENTS.md).

---

## Testing

```bash
# Preferred — avoids recursive pnpm test issues
node ./scripts/run-all-tests.cjs
```

CI runs on GitHub Actions (`.github/workflows/ci.yml`). CulinaryOps bridge drift is guarded by `scripts/check-culinaryops-bridge.mjs`.

---

## Documentation

| Doc | Contents |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Project identity, agent rules, env, known issues |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Branching, PRs, tenant isolation, structure |
| [`PROJECT.md`](./PROJECT.md) | Product / integration spine (when present) |
| [`docs/`](./docs/) | Sync protocol, integration notes, screenshots |
| [`LICENSE`](./LICENSE) | MIT |

---

## FAQ — free POS questions

**Is CulinaryOS really free?**  
Yes. The software is **MIT licensed** — free to use, modify, and run commercially. You still pay for your own hosting (Supabase, VPS, Stripe fees if you take cards). There is no CulinaryOS per-terminal license fee in this repository.

**Is this a Toast / Square / Clover killer?**  
It’s an **open alternative architecture**: you own the code and the database. Feature parity with every closed SaaS module is a journey, not a marketing claim. Today you get a real POS + KDS + API + multi-tenant schema you can extend.

**Do I need to pay for AI?**  
No. AI/MCP is optional. The restaurant can run without Anthropic or any model provider.

**Can I white-label it?**  
Under MIT, yes — keep the license notice. Branding in the Vite apps is yours to restyle.

**Does offline mode work?**  
POS is built with an offline queue and local menu fallback. Always test reconnect/replay against your deployment before go-live.

**Why isn’t live POS→KDS working on my laptop?**  
Demo mode uses local/mock data per app. Shared tickets need Supabase migrations applied, seed data, and server env including `SUPABASE_SERVICE_ROLE_KEY`.

**Android vs mobile?**  
`android/` is native Kotlin/Compose. `mobile/` is React Native/Expo. Different deployment targets — don’t conflate them.

**Where do I get support?**  
Open a GitHub Issue on this repo. For agent/automation context, see `AGENTS.md`.

---

## Status & roadmap

**Phase goal:** Core restaurant OS — POS, KDS, ordering, inventory, multi-tenant auth — operational; MCP extension platform live; RecipeOS bridge integrated.

| Area | Status |
|---|---|
| POS + KDS UX (demo/offline) | Usable locally |
| Unified Hono API | Active |
| Supabase schema + RLS migrations | Active |
| Seed / bootstrap | Active (`pnpm seed`) |
| Live POS → KDS on shared DB | Needs your Supabase + service role |
| Supabase Auth (replace demo PIN) | In progress |
| Stripe webhooks / web pay | Partial — keys + webhook work remain |
| Admin depth (menu/staff/reports) | Expanding |
| CulinaryOps MCP bridge | Bridged in-repo |
| Multi-tenant production hardening | Next phase |

---

## Contributing

CulinaryOS is **free and open source**. Contributions that improve reliability, tenant isolation, docs, and real restaurant workflows are welcome.

1. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`AGENTS.md`](./AGENTS.md).
2. Branch as `feature/[module]-[short-description]` (or `fix/` / `chore/`).
3. Keep every DB touch tenant-scoped.
4. Don’t break POS ↔ KDS contracts without a migration plan.
5. Open a PR with a clear description and test notes.

---

## License & credits

**License:** [MIT](./LICENSE) — © CulinaryOS contributors.

**Built with:** TypeScript, React, Vite, Hono, Supabase (Postgres + Auth + RLS), Turborepo, pnpm, Docker, Model Context Protocol.

**Ecosystem:** [CulinaryOps](https://github.com/ShadowWalkerNC/CulinaryOps) · RecipeOS · KitchenKit · Post-Pilot

---

<p align="center">
  <strong>Own your restaurant stack.</strong><br />
  Free POS platform · Open source · Self-hosted · Built for operators and builders.
</p>
