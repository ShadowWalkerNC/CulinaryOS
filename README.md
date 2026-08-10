# CulinaryOS

**The open operating system for restaurants** — humans on POS/KDS, agents on MCP, your Postgres. MIT licensed. AI never required for service.

[![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

> Not a cheaper Toast clone. A **protocol restaurant**: kitchen state is a versioned contract that operators *and* AI agents can drive — with sovereign data and a closed economic loop (recipe → fire → waste/cost).

---

## Why this is different

| Everyone else | CulinaryOS |
|---|---|
| Closed SaaS UIs (+ bolted-on chat) | **Agent-operable OS** — MCP tools on live tickets, inventory, waste, food-cost |
| Proprietary partner APIs | **Public contracts** — order fire spine, RLS tenants, `extension_template/` |
| POS and food-cost in different products | **Closed-loop economics** — fire emits pantry deduct + `plate_economics` |
| Vendor-hosted lock-in | **Operator-owned Postgres** (Supabase / self-host) |
| AI as a hard dependency | **AI additive** — POS/KDS work if Claude is down |

**Free & open source forever** (MIT). No per-terminal license fees. You still pay your own hosting and Stripe fees.

---

## Surfaces

| App | Port | Role |
|---|---|---|
| `@culinaryos/server` | `:3000` | Hono API — auth, orders, KDS, pantry, ops, payments, admin |
| `@culinaryos/app-pos` | `:5172` | POS terminal (PIN → session) |
| `@culinaryos/app-kds` | `:5173` | Kitchen display |
| `@culinaryos/admin` | `:5174` | Thin admin — menu 86, staff, pantry |
| `@culinaryos/app-web` | `:5176` | Online ordering |

MCP: `mcp/src/kds-server.ts`, `pos-server.ts`, `culinaryops-server.ts` (live `/v1/ops` when API is up).

---

## Quick start

```bash
git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
cd CulinaryOS
pnpm install
cp .env.example .env

# Terminal 1
pnpm --filter @culinaryos/server dev

# Terminal 2
pnpm --filter @culinaryos/app-pos dev

# Terminal 3
pnpm --filter @culinaryos/app-kds dev
```

**Demo PINs** (no live Supabase): `1234` server · `5678` manager  
`POST /v1/auth/pin-login` returns a session; POS stores it and sends `Authorization` on API calls.

### Live tenant (differentiation demo)

1. Set real `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (never expose service role to Vite).
2. Apply migrations (`supabase/migrations/`, including **V14** staff pins / waste / plate economics).
3. `pnpm seed` — tenant + menu + Auth users + `staff_pins` / `tenant_users`.
4. Set `AUTH_RELAXED=false`. Fire from POS → KDS on shared DB; MCP `log_waste` / `get_food_cost` hit `/v1/ops/*`.

Without a service-role key, the API keeps the **mock kitchen** path so you can still evaluate UX offline.

---

## How the spine works

```
POS / agent  →  PATCH /v1/orders/:id/send
             →  pos:order:created (event-bus)
             →  kitchen_tickets + plate_economics + pantry deduct
KDS / agent  →  Realtime or GET /v1/kds/tickets · bump
MCP          →  /v1/ops/waste · /v1/ops/food-cost/:id · KDS/POS tools
```

Contract doc: [`docs/integration-spine.md`](docs/integration-spine.md).

---

## Auth model

- **Live:** PIN → `staff_pins` → Supabase Auth password session → JWT + `tenant_users` membership (`requireTenant`).
- **Demo:** PIN → device/internal API key session when service role is unset/placeholder.
- Placeholder secrets (`your-service-role-key`, etc.) are treated as **unset** so mock mode stays safe.

---

## Scripts

| Command | Purpose |
|---|---|
| `pnpm --filter @culinaryos/server dev` | API |
| `pnpm seed` | Demo tenant + staff PINs (needs service role or `DATABASE_URL`) |
| `node ./scripts/run-all-tests.cjs` | Preferred test runner |
| `pnpm --filter @culinaryos/admin dev` | Admin UI |

---

## Status

| Area | Status |
|---|---|
| PIN → session auth | Shipped (`/v1/auth/pin-login`) |
| Live POS→KDS | Needs your service-role key + migrations |
| MCP ops on live API | Shipped (`/v1/ops`, culinaryops-mcp prefers live) |
| Plate economics on fire | Shipped (best-effort) |
| Stripe webhook | `/v1/webhooks/stripe` |
| Thin admin menu/staff | Shipped |
| Multi-tenant hardening | Ongoing |

Milestones: [`PROJECT.md`](PROJECT.md). Agent rules: [`AGENTS.md`](AGENTS.md).

---

## License

[MIT](./LICENSE) — own your stack. Built with TypeScript, React, Vite, Hono, Supabase, Turborepo, pnpm, MCP.
