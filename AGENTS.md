# AGENTS.md — CulinaryOS

> **Extends:** `ShadowWalkerNC/.github/AGENTS.md` — all global rules apply unconditionally.
> **Auto-loaded by:** Claude Code · GitHub Copilot · OpenAI Codex · Cursor · Windsurf
> **Canonical global system:** [ShadowWalkerNC/.github](https://github.com/ShadowWalkerNC/.github)

---

## Project Identity

```
Project:      CulinaryOS
Description:  AI-native restaurant operating system — POS, KDS, ordering,
              inventory, staff management, and MCP extension platform for
              food service operations.
Status:       In development
Phase:        Active development — core platform build
Priority:     Active — flagship product
Monorepo:     Yes — pnpm workspaces + Turborepo
```

---

## Tech Stack

```
Language:     TypeScript (all packages)
Monorepo:     pnpm workspaces + Turborepo
Web/Admin:    React (web/, admin-client/)
Android:      Kotlin / Jetpack Compose (android/)
Mobile:       React Native + Expo (mobile/)
Backend:      Node.js / TypeScript (backend/, services/)
KDS:          TypeScript client + server (kds/, kds-client/)
POS:          TypeScript client + server (pos/, pos-client/)
MCP:          TypeScript MCP server (mcp/) — extension platform
Database:     Supabase (PostgreSQL) — RLS enforced
Auth:         Supabase Auth + JWT
Extensions:   Custom extension system (extensions/, extension_template/)
CI/CD:        GitHub Actions + Docker (docker-compose.yml)
Shared:       packages/ + shared/ — cross-package types and utilities
Key APIs:     Anthropic Claude (AI agent layer), Supabase, RecipeOS MCP
```

---

## Repository Structure

```
CulinaryOS/
├── apps/
│   ├── server/          ← Unified Hono API (orders, KDS, pantry, payments)
│   ├── pos/             ← POS terminal (React / Vite)
│   ├── kds/             ← Kitchen Display client (React / Vite)
│   ├── admin/           ← Admin / pantry portal (React / Vite)
│   └── web/             ← Online ordering storefront (React / Vite)
├── packages/            ← shared, event-bus, auth, db, ui, config, ratio-engine
├── mcp/                 ← MCP servers — AI agent tool layer
├── extensions/          ← First-party extension manifests
├── extension_template/  ← Public contract for third-party extensions
├── mobile/              ← React Native + Expo companion (stub)
├── supabase/            ← Migrations + seeds (config.toml for local CLI)
├── cli/                 ← Operator CLI tool
├── tests/               ← Integration + e2e tests
├── docs/                ← Technical documentation
├── docker-compose.yml   ← API + static clients (Supabase external / CLI)
├── pnpm-workspace.yaml  ← Monorepo workspace config
├── turbo.json           ← Turborepo pipeline config
└── .env.example         ← All required env vars — always update alongside new vars
```

> Legacy packages (`backend/`, `pos/`, `kds/`, `recipeos/`, `android/`) were consolidated
> into `apps/*`. Realtime is Supabase Realtime (+ API poll in demo mode), not dedicated
> WebSocket microservices. Prefer this tree and README.md over older KMP docs.

---

## Active Agents for CulinaryOS

```
Always active:    COHERENCE · SECURITY · DOCS

Default on-demand (most sessions will need these):
  ARCHITECT     ← Cross-package integration, extension system design,
                  WebSocket architecture, MCP tool design
  ENGINEER      ← TypeScript, backend APIs, React, Kotlin/Android
  DATABASE      ← Schema changes, migrations, RLS, multi-tenant data isolation
  DEVOPS        ← Docker, Turborepo pipelines, CI/CD, deployment

Load when relevant:
  QA            ← Test coverage, integration tests, performance benchmarks
  AI            ← MCP tool design, Anthropic integration, agent orchestration
  UX            ← KDS/POS UI, admin dashboard, accessibility
  PRODUCT       ← Phase planning, extension platform decisions, scope

Rarely needed:
  BUSINESS      ← Load for pricing model, restaurant vertical positioning,
                  third-party extension licensing decisions
```

---

## Project-Specific Rules

These extend global rules. Global Tier 1–3 rules cannot be overridden.

1. **Monorepo discipline.** All new code belongs in the correct package. Do not create files at the root level. Shared types go in `packages/` or `shared/`. No package may import directly from another package’s `src/` — only from its published interface.
2. **Turborepo pipeline compliance.** All tasks (build, test, lint) must be declared in `turbo.json`. Do not run build steps outside the pipeline without explicit justification.
3. **RLS on every table.** Every Supabase table requires Row Level Security. Every query scoped by tenant/user context. An unscoped query is a critical security bug — SECURITY agent hard veto.
4. **Multi-tenant isolation.** CulinaryOS serves multiple restaurant tenants. Data must never bleed between tenants. DATABASE agent reviews all queries that touch multi-tenant boundaries.
5. **Realtime contracts are stable.** KDS and POS rely on `pos:order:created` → `kitchen_tickets` (Supabase Realtime when live; API poll in demo). Do not bypass `PATCH /v1/orders/:id/send` from clients. Schema changes need ARCHITECT review.
6. **Extension system stability.** The MCP extension API (`extension_template/`) is a public interface for third-party developers. Breaking changes require ARCHITECT review, semantic versioning, and a deprecation notice in CHANGELOG.md.
7. **Android is native Kotlin.** The `android/` package uses Kotlin + Jetpack Compose. Do not propose React Native solutions for `android/`. The two mobile surfaces (android/ and mobile/) serve different deployment targets.
8. **RecipeOS / pantry bridge is isolated.** Pantry APIs live on `apps/server` (`/v1/pantry`); MCP recipe tools and `extensions/` own RecipeOS-facing contracts. Do not scatter deduct logic across clients.
9. **AI is additive, not required.** The MCP AI layer enhances operations but the system must function fully without it. No core operation may have a hard dependency on Anthropic API availability.
10. **Migrations are forward-only.** Numbered sequential migrations in `supabase/migrations/`. DATABASE agent reviews all migrations before push. No destructive migration without an explicit data preservation plan.
11. **docker-compose is the dev standard.** All local development runs via `docker-compose up`. Do not require manual service startup steps outside of Docker.
12. **Branch naming:** `feature/[module]-[short-description]` · `fix/[module]-[issue]` · `chore/[scope]`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Service role — never expose client-side |
| `ANTHROPIC_API_KEY` | AI layer | Claude API key — AI layer only |
| `RECIPEOS_MCP_URL` | Phase 5 | RecipeOS MCP server endpoint |
| `RECIPEOS_JWT_SECRET` | Phase 5 | JWT bridge secret for RecipeOS auth |
| `CULINARYOS_URL` | Yes | Canonical API base for service callbacks |
| `DATABASE_URL` | Yes (migrate/seed) | Direct PostgreSQL connection string |
| `VITE_API_URL` | Yes (clients) | Browser → API base URL |
| `VITE_TENANT_ID` | Yes (clients) | Demo / device tenant UUID |

Never commit values. Always use `.env.example`.

---

## Current Phase Context

```
Phase goal:         Build the core restaurant OS — POS, KDS, ordering,
                    inventory, and multi-tenant auth.
Definition of done: All core modules (POS, KDS, ordering, inventory) operational
                    in a single-tenant deployment. MCP extension platform live.
                    RecipeOS bridge integrated.
Current status:     Active development
Next phase:         Multi-tenant production hardening + extension marketplace
```

---

## Known Issues / Watch List

- **POS → KDS spine:** Clients must fire via `PATCH /v1/orders/:id/send`. Direct `pos_orders` status updates skip kitchen ticket creation.
- **Local data plane:** `docker-compose` does not bundle Postgres — use Supabase cloud or `pnpm local:supabase`. Demo mode uses the API mock kitchen store.
- **POS terminal offline mode:** Offline queue must replay through the send/event path after reconnect.
- **Extension API stability:** `extension_template/` is a public contract — breaking changes need major version bump.
- **Pantry deduct:** `pos:menu:item-sold` calls `/v1/pantry/deduct` on the unified API (not a separate RecipeOS process).
- **Multi-tenant data:** Cross-tenant exposure is the highest-severity bug class — every query must be tenant-scoped.
- **pnpm lockfile:** Always commit `pnpm-lock.yaml` changes alongside `package.json` changes. Never manually edit the lockfile.
- **Stale docs:** Some files under `docs/` still describe Kotlin Multiplatform / Flyway — treat README + AGENTS + PROJECT as source of truth until those are rewritten.

---

## Agent Confirmation for CulinaryOS

After loading this file, add to `DISPATCH CONFIRMED`:

```
Project AGENTS.md: loaded — CulinaryOS
Stack: TypeScript · pnpm monorepo · Turborepo · Supabase · Docker
Surfaces: web · android · mobile · kds · pos · admin · mcp · cli
Project rules active: 12 overrides
Multi-tenant: active — all DB queries must be tenant-scoped
Extension API: stable contract — breaking changes require ARCHITECT review
Known issues noted: yes
```

---

## Cursor Cloud specific instructions

Durable notes for running/developing this repo in the Cloud Agent VM (dependencies are already installed by the startup update script). Standard commands live in root `package.json` and `docker-compose.yml`; this section only records non-obvious caveats.

### Running services for development

- Use the Turborepo/pnpm dev commands directly, NOT `docker compose up`. The compose file builds production nginx images of the frontends (ports 5172/5173/5174/5176) and does not provision a local Postgres/Supabase — it expects external Supabase env vars. For iterative development use Vite dev servers instead.
- Core end-to-end loop = 3 services: `apps/server` (API, `:3000`), `apps/pos` (`:5172`), `apps/kds` (`:5173`). `apps/admin` (`:5174`) and `apps/web` (`:5176`) are optional. Run one service at a time in its own long-lived shell/tmux window:
  - `pnpm --filter @culinaryos/server dev` (Hono API via `tsx watch`)
  - `pnpm --filter @culinaryos/app-pos dev`
  - `pnpm --filter @culinaryos/app-kds dev`
  - `pnpm dev` (root) runs `turbo run dev` for everything in parallel, but interleaved logs make single-service debugging harder.

### Degraded / offline demo mode (no external services)

- The apps are designed to boot with NO Supabase/Postgres/Stripe. `cp .env.example .env` is enough. When `SUPABASE_URL`/`VITE_SUPABASE_URL` is missing or still contains `your-project`, the Supabase client is `null` and:
  - The server logs `[Realtime] Skip starting realtime bridge (Supabase offline)` and auth auto-relaxes (no bearer token needed; send `X-Tenant-Id: 00000000-0000-0000-0000-000000000001`).
  - POS serves a hardcoded `MOCK_MENU` and a localStorage-backed order store (`apps/pos/src/lib/mockDb.ts`). KDS shows built-in demo tickets with live aging timers and supports BUMP/FIRE locally.
- Caveat: POS and KDS are separate origins (`:5172` vs `:5173`), so in offline mode they do NOT share order state — a POS "Send to Kitchen" will not appear on the KDS board without a real Supabase backend. For a true cross-app POS→KDS flow, provision Supabase (`SUPABASE_URL`/`ANON_KEY`/`SERVICE_ROLE_KEY` + `VITE_` equivalents), run `supabase db reset` + migrations, then run the apps.
- POS login goes through `POST /v1/auth/pin-login` (demo PINs `1234` / `5678` when service role is unset). Live mode uses `staff_pins` + Supabase Auth (V14); run `pnpm seed` after setting `SUPABASE_SERVICE_ROLE_KEY`.
- Placeholder service-role values are treated as unset (`apps/server/src/lib/secrets.ts`) so mock kitchen stays available.
- CulinaryOps satellite file `mcp/src/culinaryops-server.ts` must stay drift-synced; for live `/v1/ops` tools use `pnpm --filter culinaryos-mcp-servers run start-culinaryops-live`.

### Lint / test / typecheck caveats

- `pnpm run typecheck` works and is the reliable static check (18 tasks pass).
- `pnpm run lint` is currently non-functional: only `apps/kds` and `mobile` define a `lint` script and neither declares `eslint` as a dependency (eslint is absent from the lockfile and there are no eslint configs). Expect `eslint: not found` until this is fixed.
- `pnpm run test` (i.e. `turbo run test`) fails immediately with a Turborepo "recursive_turbo_invocations" error because the root `//#test` task loops. Prefer CI's gate: `bun test tests/server/` (requires Bun). Broader suite: `node ./scripts/run-all-tests.cjs` (tsx shim; no Bun required). Some legacy files under `tests/api/*` / `tests/empirical/*` may still be red.
- `pnpm seed` is wired (`scripts/seed.ts`) — needs `DATABASE_URL` and/or `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. For a one-shot local stack: `pnpm local:supabase`.

### Connecting to a real Supabase project (live mode)

- A real Supabase project named "CulinaryOS" (ref `npwybcqqgonhohkdxwyg`) exists and has been provisioned with the core migrations (V1–V6, V11, **V14**) and seeded with a demo tenant (`00000000-0000-0000-0000-000000000001`, "The Golden Fork") plus an active "Dinner Menu". `.env` holds the real `SUPABASE_URL` + `SUPABASE_ANON_KEY`.
- The backend only creates its Supabase client when BOTH `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set and neither is a placeholder (`apps/server/src/lib/secrets.ts`). Without a real service-role key, **stay in demo mode**: `AUTH_RELAXED=true`, mock kitchen, PIN login returns a device-key session. That is enough for agent cloud work (PIN → fire → mock KDS tickets → `/v1/ops/waste`).
- Live shared POS↔KDS + Auth `staff_pins` seeding (`pnpm seed`) requires `SUPABASE_SERVICE_ROLE_KEY` from the Supabase dashboard (Project Settings → API). Do not block setup on that secret; develop against the mock path until it is provided.
- V14 makes `my_tenant_id()` / `my_role()` `SECURITY DEFINER` and adds `staff_pins`, `waste_events`, `plate_economics`.

---

*Version: 1.0 | Extends: ShadowWalkerNC/.github/AGENTS.md | Project: CulinaryOS*
