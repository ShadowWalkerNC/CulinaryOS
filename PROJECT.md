# Project: CulinaryOS

## Architecture
Monorepo using pnpm workspaces and Turborepo.
Packages:
- `backend/`: Core API server (Node.js/TypeScript)
- `pos/` & `pos-client/`: Point of Sale server and terminal client
- `kds/` & `kds-client/`: Kitchen Display System server and client
- `web/`: Web dashboard / portal (React)
- `admin-client/`: Admin panel client
- `mobile/`: React Native + Expo app
- `android/`: Kotlin / Jetpack Compose native app
- `mcp/`: TypeScript MCP server — extension platform
- `extensions/`: First-party extensions (`extension_template/` contract compliance)
- `packages/`: Shared internal packages (`types`, `ui`, `event-bus`, `config`, `auth`, `shared`, etc.)
- `supabase/`: Migrations and schema definitions

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Monorepo Alignment & Package Contracts | R2: Clean up monorepo workspace boundaries, eliminate direct src/ imports & circular dependencies, standardize TypeScript package interfaces | none | IN_PROGRESS (Conv ID: 42359612-1199-4830-abf4-1bb9114ef99f) |
| 2 | M2: Turborepo & Dev Environment Stability | R4: Validate turbo.json & pnpm-workspace.yaml, resolve all build & lint issues across monorepo | M1 | PLANNED |
| 3 | M3: Multi-Tenant Security & Database Isolation | R3: RLS on all Supabase tables, tenant context in all queries, zero-data-loss forward-compatible migrations | M2 | PLANNED |
| 4 | M4: POS & KDS Real-Time Architecture & State Synchronization | R1: Re-architect POS/KDS WebSocket message contracts, offline queue, state management & instant ticket updates | M1, M2, M3 | PLANNED |
| 5 | M5: MCP Extension Platform & External Integrations | Integrate/bridge CulinaryOps, KitchenKit, Plated, Post-Pilot, and RecipeOS into `mcp/` & `extensions/` per `extension_template/` contract | M1, M2, M3, M4 | PLANNED |
| 6 | M6: E2E Integration & Verification | Final monorepo test suite, adversarial challenge, forensic integrity audit | M1..M5 | PLANNED |

## Interface Contracts
- POS WebSocket Server ↔ Client: JSON & binary event schema, connection lifecycle, heartbeat, offline queue sync protocol
- KDS WebSocket Server ↔ Client: Order ticket state transition schema, station filtering, ticket age events
- Database Query Interface: All queries must include `tenant_id` context parameter and enforce Supabase RLS.
- MCP Extension API: Exposes `Plated` (inventory), `Post-Pilot` (loyalty), `RecipeOS` (recipe scaling), and `KitchenKit` (prep engine) via `extension_template/` standard interfaces.

## Code Layout
- `packages/shared/`: canonical cross-package types (`types.ts`, `contracts.ts`, `events.ts`)
- `packages/ui/`: shared UI primitives (`CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge`)
- `packages/event-bus/`: binary encoding / decoding and event hub
- `mcp/`: MCP servers (`inventory-server.ts`, `post-pilot-server.ts`, `recipe-server.ts`, `prep-server.ts`)
- `extensions/`: First-party MCP extensions conforming to `extension_template/`
