# Project: CulinaryOS

## Architecture
Monorepo using pnpm workspaces and Turborepo.

**Canonical layout (current):**
- `apps/server/`: Unified Hono API (orders, KDS, pantry, payments, online orders)
- `apps/pos/`, `apps/kds/`, `apps/admin/`, `apps/web/`: React / Vite clients
- `packages/`: Shared contracts (`shared`, `event-bus`, `auth`, `db`, `ui`, `config`, `ratio-engine`)
- `mcp/`: Domain MCP servers (inventory, prep, recipe, post-pilot)
- `extensions/` + `extension_template/`: Extension manifests / public contract
- `supabase/`: Migrations, RLS, seeds (`config.toml` for local Supabase CLI)
- `mobile/`: Expo companion (early stub)
- `cli/`: Operator CLI

**Integration spine:** POS fires via `PATCH /v1/orders/:id/send` → `pos:order:created` event
(or in-memory mock kitchen store when Supabase is offline) → KDS reads `kitchen_tickets`
(Realtime when live, API poll in demo mode).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Monorepo Alignment & Package Contracts | Clean workspace boundaries; docs/CI match `apps/*` | none | IN_PROGRESS — CI typecheck/build/tests wired; CONTRIBUTING aligned |
| 2 | M2: Turborepo & Dev Environment Stability | turbo/pnpm green; compose + supabase local demo path | M1 | IN_PROGRESS — `pnpm local:supabase` helper + seed; compose still uses external Supabase |
| 3 | M3: Multi-Tenant Security & Database Isolation | RLS + PIN→Supabase Auth (`/v1/auth/pin-login`, `staff_pins`, V14); manager RBAC fail-closed; adversarial membership tests | M2 | IN_PROGRESS — demo + live paths; deploy needs service-role |
| 4 | M4: POS & KDS Real-Time Architecture | Harden Realtime + offline outbox; full course fire | M1–M3 | IN_PROGRESS — fire spine + mock kitchen; live when service role set |
| 5 | M5: MCP Extension Platform & Integrations | Runnable extensions + ops/RecipeOS bridge | M1–M4 | IN_PROGRESS — culinaryops-mcp prefers `/v1/ops` live |
| 6 | M6: E2E Integration & Verification | Full suite + adversarial audit | M1–M5 | PLANNED |

## Interface Contracts
- **Order fire:** `PATCH /v1/orders/:id/send` emits `pos:order:created` (required — clients must not bypass)
- **KDS tickets:** Supabase Realtime on `kitchen_tickets` when configured; else `GET /v1/kds/tickets` poll
- **Database:** All queries scoped by `tenant_id` + RLS
- **MCP Extension API:** `extension_template/` contract for Plated / Post-Pilot / RecipeOS / KitchenKit

## Code Layout
- `packages/shared/`: canonical types + `apiHeaders` / `getApiBase`
- `packages/event-bus/`: domain event broker + handlers
- `apps/server/src/lib/mock-kitchen.ts`: demo POS→KDS bridge without Supabase
- `mcp/`: MCP servers (`inventory-server.ts`, `post-pilot-server.ts`, `recipe-server.ts`, `prep-server.ts`)
