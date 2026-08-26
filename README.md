# CulinaryOS

**The open operating system for restaurants** — humans on POS/KDS, agents on MCP, your Postgres. MIT licensed. AI never required for service.

[![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml)
[![Tests: 32/32 Passing](https://img.shields.io/badge/Tests-32%2F32%20Passing-brightgreen.svg)](./scripts/run-all-tests.cjs)
[![Typecheck: 18/18 Passing](https://img.shields.io/badge/Typecheck-18%2F18%20Passing-blue.svg)](./turbo.json)
[![UI: shadcn + Three.js](https://img.shields.io/badge/UI-shadcn%20%2B%20Three.js-purple.svg)](./packages/ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<p align="center">
  <img src="docs/screenshots/pos-order.webp" alt="CulinaryOS POS — order entry" width="48%" />
  <img src="docs/screenshots/kds-board.webp" alt="CulinaryOS KDS — kitchen board" width="48%" />
</p>

<p align="center"><em>POS order entry · Kitchen display · Three.js 3D dining floor visualizer · Canonical shadcn/ui design system</em></p>

> Not a cheaper Toast clone. A **protocol restaurant**: kitchen state is a versioned contract that operators *and* AI agents can drive — with sovereign data and a closed economic loop (recipe → fire → waste/cost).

---

## Why CulinaryOS?

| Feature | Legacy Restaurant SaaS | CulinaryOS |
|---|---|---|
| **Architecture** | Closed proprietary silos (+ bolted-on chat) | **Agent-operable OS** — MCP tools on live tickets, inventory, waste, and food-cost |
| **API & Contracts** | Proprietary walled gardens | **Open contracts** — standard order fire spine, RLS multi-tenancy, `extension_template/` |
| **Economics** | Separate POS and inventory software | **Closed-loop economics** — fire automatically emits pantry deduction & `plate_economics` |
| **Data Sovereignty** | Vendor lock-in | **Operator-owned PostgreSQL** (Supabase / self-hosted PostgreSQL) |
| **Design & Ergonomics** | Clunky legacy interfaces | **Modern shadcn/ui suite + Three.js 3D spatial floor map** with real-time status glow halos |
| **Dietary Safety** | Basic static ingredient text | **FDA FASTER Act Top 9 allergen engine** + cross-contact matrix & safe substitution paths |
| **Operations Review** | Expensive manual consultants | **Built-in AI Operations Manager agent** + daily workflow audits (`pnpm ops:audit`) |
| **Service Resilience** | AI or cloud outage halts operation | **AI is additive & offline-first** — POS/KDS continue running offline with delta queues |

**Free & open source forever** (MIT). No per-terminal licensing fees. You only pay your own infrastructure and Stripe processing fees.

---

## Surfaces & Packages

| Package | Port / Target | Role |
|---|---|---|
| `apps/server` | `:3000` | Unified Hono API — authentication, orders, KDS, pantry, payments, ops, admin, **marketplace** |
| `apps/pos` | `:5172` | POS terminal (PIN login, 2D/3D floor map, contactless tap/scan/card checkout, offline delta queue) |
| `apps/kds` | `:5173` | Kitchen Display System (real-time tickets, station filters, course hold/fire timers, bump bar) |
| `apps/admin` | `:5174` | Admin portal — menu catalog & 86ing, staff PINs, pantry par levels, PO automation |
| `apps/web` | `:5176` | Online ordering storefront (dietary filtering, cart customization, instant checkout) |
| `packages/ui` | Shared | Centralized **shadcn/ui** design system (`components.json`, Radix UI primitives, Three.js 3D canvas) |
| `packages/shared` | Shared | TypeScript interfaces, event envelopes, offline-sync delta engine, FDA Top 9 dietary engine |
| `packages/auth` | Shared | Session helpers, PIN authentication, RBAC utilities |
| `packages/event-bus`| Shared | Binary and JSON event envelope broker and handlers |
| `packages/ratio-engine` | Shared | Culinary scaling, recipe formula costing, and yield calculation |
| `mcp/` | Extension | MCP AI agent tool layer (`culinaryops`, `kds`, `pos`, `recipeos`) |

---

## Extension Marketplace

CulinaryOS ships a built-in extension marketplace at `/v1/marketplace`. Any operator can browse, install, and manage first-party and partner extensions — all without requiring an active LLM:

```bash
# List all available extensions
GET /v1/marketplace/extensions

# Install an extension for the current session/tenant
POST /v1/marketplace/extensions/com.axomai.culinaryos/install

# Check AI layer availability
GET /v1/marketplace/ai/status
```

### Built-in Extensions

| Extension | ID | Category | Description |
|---|---|---|---|
| RecipeOS Bridge | `com.culinaryos.ext.recipeos` | Recipes | Recipe ratio scaling & baker's percentage engine |
| KitchenKit | `com.culinaryos.ext.kitchenkit` | KDS | Multi-course routing, station prep planning |
| CulinaryOps | `com.culinaryos.ext.culinaryops` | Operations | Waste diagnostics, food costing, plate economics |
| Plated | `com.culinaryos.ext.plated` | Inventory | Advanced pantry tracking and reorder automation |
| Post-Pilot | `com.culinaryos.ext.post-pilot` | Marketing | Loyalty campaigns and postcard automation |
| Voice Ordering | `com.culinaryos.ext.voice` | POS | Voice-driven order entry assistant |
| Hardware Agent | `com.culinaryos.ext.hardware` | Hardware | Receipt printers, cash drawers, KDS bump bars |

### Partner Extensions

| Partner | ID | Status |
|---|---|---|
| **AxomAI** | `com.axomai.culinaryos` | ✅ Verified Partner |

### Optional AI Layer (Claude)

When `ANTHROPIC_API_KEY` is set, optional AI-powered endpoints activate:

| Endpoint | Purpose | Fallback (no key) |
|---|---|---|
| `POST /v1/marketplace/ai/ops-insight` | AI shift performance analysis | Plain metric summary |
| `POST /v1/marketplace/ai/prep-plan` | AI morning prep checklist | Cover count + low stock list |
| `POST /v1/marketplace/ai/loyalty-message` | AI loyalty postcard copy | Template message |

**AI is strictly additive** — all core restaurant operations (PIN login, order fire, KDS bump, pantry deduct, tender) function identically with or without the Anthropic API.

---

## Quick Start (Local Demo Mode)

Run the entire system locally in under 30 seconds with **zero database setup and zero external API keys**:

```bash
# 1. Clone repository and install dependencies
git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
cd CulinaryOS
pnpm install

# 2. One-command turnkey boot (launches POS, KDS, Admin, Web, and API)
pnpm quickstart
```
*(On Windows you can also double-click `quickstart.bat`, or run `./quickstart.sh` on macOS/Linux).*

👉 **Full 5-minute interactive test walkthrough:** See [`SEAN_QUICKSTART.md`](SEAN_QUICKSTART.md).

### Demo Credentials
- **POS Server PIN**: `1234`
- **POS Manager PIN**: `5678`
- **Default Tenant ID**: `00000000-0000-0000-0000-000000000001`
- **POS Terminal**: [http://localhost:5172](http://localhost:5172)
- **Kitchen Display (KDS)**: [http://localhost:5173](http://localhost:5173)
- **Admin Portal**: [http://localhost:5174](http://localhost:5174)
- **Online Storefront**: [http://localhost:5176](http://localhost:5176)
- **Unified Hono API**: [http://localhost:3000](http://localhost:3000)

In offline/demo mode, POS serves a sample menu, buffers transactions to localStorage, and communicates with the in-memory mock kitchen store on the API.

---

## Operations Consultant & Daily Audits

CulinaryOS includes an autonomous **Restaurant Operations Manager & Consultant** framework for continuous review of hospitality workflows:

```bash
# Run daily operations audit & generate report
pnpm ops:audit

# View the latest operational critique
cat docs/DAILY_OPERATIONS_REPORT.md
```

The audit evaluates speed-of-service, touchscreen ergonomics, KDS course hold/fire timers, FDA Top 9 allergen classifications, and shared fryer cross-contact risks, and generates targeted daily operational questions for engineering refinement.

---

## Connecting to Live Supabase Backend

To enable multi-device sync, PostgreSQL Row Level Security (RLS), and live Supabase Realtime:

1. Provide valid keys in `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   AUTH_RELAXED=false
   ```
2. Apply database migrations:
   ```bash
   npx supabase db reset
   ```
3. Seed default tenant, menu, and staff PINs:
   ```bash
   pnpm seed
   ```
4. Start the stack — POS, KDS, Admin, and MCP agents will now operate on your live database with strict tenant isolation.

---

## Quality & Testing Gate

CulinaryOS enforces strict quality gates across the monorepo:

```bash
# Run complete test suite (32 test files, 110+ tests)
node ./scripts/run-all-tests.cjs

# Run workspace-wide typecheck (18 tasks across 15 packages)
pnpm run typecheck

# Build all packages and applications
pnpm run build

# Run production readiness preflight doctor
pnpm doctor
```

For full on-premise Docker Compose and cloud hosting steps, see the [Production Deployment Guide](docs/DEPLOYMENT.md).

---

## License

[MIT](./LICENSE) — Own your stack. Built with TypeScript, React, Vite, Three.js, Radix UI, Hono, Supabase, Turborepo, and Model Context Protocol (MCP).
