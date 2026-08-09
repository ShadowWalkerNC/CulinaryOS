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
├── backend/             ← Core API server (Node.js/TypeScript)
├── web/                 ← Web dashboard / portal (React)
├── admin-client/        ← Admin panel client
├── android/             ← Android native app (Kotlin / Jetpack Compose)
├── mobile/              ← React Native + Expo (cross-platform mobile)
├── kds/                 ← Kitchen Display System server
├── kds-client/          ← KDS front-of-house client
├── pos/                 ← Point of Sale server
├── pos-client/          ← POS terminal client
├── mcp/                 ← MCP server — AI agent tool layer + extension registry
├── extensions/          ← First-party extensions (RecipeOS bridge, etc.)
├── extension_template/  ← Template for third-party extension developers
├── services/            ← Shared microservices (notifications, sync, etc.)
├── apps/                ← Turborepo app packages
├── packages/            ← Shared internal packages (types, utils, UI primitives)
├── shared/              ← Cross-package TypeScript types and constants
├── supabase/            ← Migrations + seed data
├── cli/                 ← Operator CLI tool
├── recipeos/            ← RecipeOS integration module
├── tests/               ← Integration + e2e tests
├── docs/                ← Technical documentation
├── docker-compose.yml   ← Local dev environment
├── pnpm-workspace.yaml  ← Monorepo workspace config
├── turbo.json           ← Turborepo pipeline config
└── .env.example         ← All required env vars — always update alongside new vars
```

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
5. **WebSocket contracts are stable.** KDS and POS rely on WebSocket message contracts. Do not change message schemas without DATABASE + ARCHITECT agent review and a documented migration plan.
6. **Extension system stability.** The MCP extension API (`extension_template/`) is a public interface for third-party developers. Breaking changes require ARCHITECT review, semantic versioning, and a deprecation notice in CHANGELOG.md.
7. **Android is native Kotlin.** The `android/` package uses Kotlin + Jetpack Compose. Do not propose React Native solutions for `android/`. The two mobile surfaces (android/ and mobile/) serve different deployment targets.
8. **RecipeOS integration is isolated.** All RecipeOS bridge code lives in `recipeos/` and `extensions/`. Do not scatter RecipeOS references across other packages.
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
| `KDS_WEBSOCKET_PORT` | Yes | KDS WebSocket server port |
| `POS_WEBSOCKET_PORT` | Yes | POS WebSocket server port |
| `DATABASE_URL` | Yes | Direct PostgreSQL connection string |

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

- **KDS WebSocket contracts:** Any change to the WebSocket message format in `kds/` breaks `kds-client/`. These are tightly coupled. Always change both together, always with ARCHITECT review.
- **POS terminal offline mode:** The POS client has an offline queue. Changes to the POS server API must account for offline transactions that may replay after reconnect.
- **Android vs. mobile targets:** `android/` is a separate Kotlin native app serving a different deployment scenario than `mobile/` (React Native). Do not conflate the two.
- **Extension API stability:** The `extension_template/` defines the public contract for third-party extensions. Treat it like a published SDK — breaking changes need major version bump.
- **RecipeOS JWT bridge:** The `recipeos/` integration module depends on the RecipeOS MCP server being available. It must degrade gracefully when RecipeOS is offline.
- **Multi-tenant data:** The most dangerous class of bug in this system is cross-tenant data exposure. Every new database query must be reviewed for tenant scoping.
- **pnpm lockfile:** Always commit `pnpm-lock.yaml` changes alongside `package.json` changes. Never manually edit the lockfile.

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
- POS demo login: PIN `1234` (Server) or `5678` (Manager).

### Lint / test / typecheck caveats

- `pnpm run typecheck` works and is the reliable static check (18 tasks pass).
- `pnpm run lint` is currently non-functional: only `apps/kds` and `mobile` define a `lint` script and neither declares `eslint` as a dependency (eslint is absent from the lockfile and there are no eslint configs). Expect `eslint: not found` until this is fixed.
- `pnpm run test` (i.e. `turbo run test`) fails immediately with a Turborepo "recursive_turbo_invocations" error because the root `//#test` task loops. Run the suite directly instead: `node ./scripts/run-all-tests.cjs`. Tests use a custom `bun:test` → tsx shim (`scripts/test-hook.cjs` + `scripts/bun-test-impl.js`); no Bun runtime is required. On Linux this yields ~21/25 test files passing; the remaining failures (`tests/api/pantry.test.ts` purchase-order endpoints returning 422, `tests/server/htmx-kds.test.ts`, and the two `tests/empirical/*_stress.test.ts`) are pre-existing app/test issues, not environment problems.
- The root `pnpm seed` script points at a nonexistent `scripts/seed.ts` and will fail; there is no working seed script in the current tree.

### Connecting to a real Supabase project (live mode)

- A real Supabase project named "CulinaryOS" (ref `npwybcqqgonhohkdxwyg`) exists and has been provisioned with the core migrations (V1–V6, V11) and seeded with a demo tenant (`00000000-0000-0000-0000-000000000001`, "The Golden Fork") plus an active "Dinner Menu". `.env` holds the real `SUPABASE_URL` + `SUPABASE_ANON_KEY`.
- The backend only creates its Supabase client when BOTH `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set and the URL isn't the `your-project` placeholder (`apps/server/src/middleware/supabase.ts`). The service-role key is a secret the Supabase integration/MCP cannot expose — it must be copied from the dashboard (Project Settings → API) into `SUPABASE_SERVICE_ROLE_KEY` to enable the live backend path. Until then keep `AUTH_RELAXED=true` (setting a real `SUPABASE_URL` with a placeholder service-role key would otherwise flip `isAuthRelaxed()` off and make the API require real JWTs).
- The Vite frontends are intentionally left in offline/demo mode. Pointing them at the real project currently breaks them for two independent reasons: (1) a pre-existing RLS recursion — `public.my_tenant_id()` (defined in `V1__tenants.sql`) is plain `security invoker`, and the `tenant_users` policy in `V4__rls_policies.sql` calls it, so any anon RLS evaluation recurses (`stack depth limit exceeded`); the standard fix is to make `my_tenant_id()` `SECURITY DEFINER`. (2) The apps authenticate via a client-side demo PIN, never a Supabase Auth session, so `auth.uid()` is null and all tenant-scoped writes (`pos_orders`, `kitchen_tickets`) are RLS-blocked. A full live POS→KDS flow therefore needs the service-role backend path (or real Supabase Auth sessions), not just the anon keys.

---

*Version: 1.0 | Extends: ShadowWalkerNC/.github/AGENTS.md | Project: CulinaryOS*
