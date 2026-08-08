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
- **Local data plane:** `docker-compose` does not bundle Postgres — use Supabase cloud or `supabase start`. Demo mode uses the API mock kitchen store.
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

*Version: 1.0 | Extends: ShadowWalkerNC/.github/AGENTS.md | Project: CulinaryOS*
