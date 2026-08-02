# Master Architecture & Execution Plan — CulinaryOS

## Executive Summary
CulinaryOS is an AI-native restaurant operating system designed for multi-tenant POS/KDS operations, inventory tracking, staff management, and extension modularity via MCP (Model Context Protocol).

This master plan details the re-architecture, monorepo alignment, real-time event streaming, database multi-tenancy, MCP extension integration, and dev environment stability across all 5 core requirements (R1–R5).

---

## Requirements & Scope Matrix

### R1. POS & KDS Real-Time Architecture & State Synchronization
- **Scope**: `apps/pos`, `apps/pos-client`, `apps/kds`, `apps/kds-client`, `packages/event-bus`, `packages/shared`.
- **WebSocket Contracts**: Standardize typed JSON and binary event protocol (`encodeBinaryEvent` / `decodeBinaryEvent`) with DEFLATE level 6 compression and LEB128 varint encoding.
- **Offline Delta Queue**: Cryptographic UUIDv4 transaction delta queuing in LocalStorage/IndexedDB with 0ms checkout latency and zero-collision reconnection replay (`/v1/pos/sync-deltas`).
- **Real-Time Ticket Lifecycle**: Instant ticket updates on KDS with multi-station filtering, course hold/fire groups, and green/amber/red age indicators (<5m green, 5-10m amber, 10m+ red).

### R2. Monorepo Alignment & Package Contracts
- **Scope**: `packages/*` (`shared`, `ui`, `event-bus`, `auth`, `config`, `types`), `apps/*` (`backend`, `pos`, `kds`, `web`, `admin`, `mobile`, `android`).
- **Clean Boundaries**: Zero circular dependencies between packages. No direct `src/` cross-package relative imports — all imports must use published workspace package exports (`@culinaryos/*`).
- **Interface Standardization**: Unified TypeScript definitions for tickets, orders, items, tenant contexts, and real-time events.

### R3. Multi-Tenant Security & Database Isolation
- **Scope**: `supabase/migrations/`, `apps/server/src/`, `packages/shared/src/db.ts`.
- **Row Level Security (RLS)**: Mandatory RLS policies on 100% of Supabase tables.
- **Tenant Context Isolation**: Every SQL query and API route must enforce strict `tenant_id` parameters derived from authenticated JWT context.
- **Forward-Compatible Migrations**: Numbered, sequential migrations in `supabase/migrations/` guaranteeing zero data loss.

### R4. External Repositories & MCP Extension Platform
- **Scope**: `mcp/src/`, `extensions/`, `extension_template/`, and connected satellite repositories (`CulinaryOps`, `KitchenKit`, `Plated`, `Post-Pilot`, `RecipeOS`).
- **Extension Template Adherence**: All tools and extensions conform to `extension_template/` contracts over STDIO/HTTP MCP servers.
- **Satellite Repositories**:
  - `CulinaryOps`: Master design system and UI primitive hub (`packages/ui`).
  - `KitchenKit`: Kitchen prep engine (`@kitchenkit/prep-engine`) and multi-station KDS pass.
  - `Plated`: Automatic recipe ingredient stock deduction (`mcp/src/inventory-server.ts`).
  - `Post-Pilot`: Marketing & customer loyalty postcard dispatch engine (`mcp/src/post-pilot-server.ts`).
  - `RecipeOS`: Recipe ratio scaling engine (`@culinaryos/ratio-engine` and `mcp/src/recipe-server.ts`).

### R5. Turborepo & Dev Environment Stability
- **Scope**: `turbo.json`, `pnpm-workspace.yaml`, `docker-compose.yml`, root `package.json`, build & test scripts.
- **Deterministic Pipelines**: Declarative `build`, `test`, `lint`, and `typecheck` pipelines in `turbo.json`.
- **Monorepo Build Integrity**: 100% clean builds (`pnpm run build`) and 100% passing test suites (`node ./scripts/run-all-tests.cjs`).

---

## Execution Milestones

| Milestone | Target | Description | Status |
|-----------|--------|-------------|--------|
| **M1** | R2: Monorepo Alignment | Package boundaries, zero circular imports, `@culinaryos/*` interfaces | VERIFIED |
| **M2** | R5: Turborepo Stability | `turbo.json` build pipeline, type-check, clean monorepo compilation | VERIFIED |
| **M3** | R3: Multi-Tenant Security | Supabase RLS policies, tenant-scoped queries, zero-data-loss migrations | VERIFIED |
| **M4** | R1: Real-Time Architecture | Binary event protocol, offline transaction queue, KDS ticket sync | VERIFIED |
| **M5** | R4: MCP & Extensions | CulinaryOps, KitchenKit, Plated, Post-Pilot, RecipeOS MCP integrations | VERIFIED |
| **M6** | Final E2E Audit | Full monorepo build, test runner execution, and Forensic Integrity Audit | VERIFYING |

---

## Verification & Audit Strategy
1. **Explorer Investigation**: Inspect codebase across packages and verify architectural compliance.
2. **Worker Build & Test Execution**: Perform `pnpm run build` and `node ./scripts/run-all-tests.cjs` to confirm 100% build success and zero test failures.
3. **Reviewer Evaluation**: Review code boundaries, interface exports, RLS policies, and extension contracts.
4. **Forensic Integrity Audit**: Run `teamwork_preview_auditor` to check for non-deceptive benchmarks, authentic UI mounting (`CulinaryHeader`), and zero stubbing.
