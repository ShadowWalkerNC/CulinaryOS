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

*Version: 1.0 | Extends: ShadowWalkerNC/.github/AGENTS.md | Project: CulinaryOS*
