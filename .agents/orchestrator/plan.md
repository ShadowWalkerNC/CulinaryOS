# CulinaryOS Execution Plan

## Milestones Overview

### Milestone 1: Monorepo Alignment & Package Contracts (R2)
- Inspect monorepo workspace boundaries (`packages/`, `shared/`, `apps/`, `pos`, `kds`, `backend`, `web`, `mobile`, `android`).
- Identify and eliminate circular dependencies and direct `src/` cross-package imports.
- Standardize shared TypeScript interfaces across backend APIs, KDS, POS, web, and shared packages (`@culinaryos/shared`).

### Milestone 2: Turborepo & Dev Environment Stability (R4)
- Validate `turbo.json` pipelines (`build`, `test`, `lint`) and `pnpm-workspace.yaml`.
- Ensure all workspace packages build cleanly with `pnpm build` and test cleanly with `pnpm test`.
- Eliminate build and type-checking failures monorepo-wide.

### Milestone 3: Multi-Tenant Security & Database Isolation (R3)
- Audit all PostgreSQL / Supabase tables in `supabase/` and backend / service queries.
- Ensure Row Level Security (RLS) policies are active and enforced on every table.
- Verify all database queries include strict tenant filtering (`tenant_id` context).
- Ensure schema migrations are forward-compatible without data loss.

### Milestone 4: POS & KDS Real-Time Architecture & State Synchronization (R1)
- Re-architect WebSocket message contracts between POS (`pos/`, `pos-client/`) and KDS (`kds/`, `kds-client/`).
- Implement/harden state management, connection loss handling, offline transaction queuing, and instant ticket updates without race conditions or memory leaks.
- Ensure 0ms offline response and reconnection delta flush with zero unhandled promise rejections.

### Milestone 5: MCP Extension Platform & External Integrations
- Evaluate external repository architectures: CulinaryOps, KitchenKit, Plated, Post-Pilot, RecipeOS.
- Port/bridge these integrations into `mcp/` and `extensions/` under CulinaryOS following the extension template (`extension_template/`).
- Maintain clean package boundaries and strict multi-tenant security across all MCP integration points.

### Milestone 6: Final E2E Verification & Forensic Integrity Audit
- Run comprehensive monorepo build and test suites.
- Perform adversarial challenge tests and forensic integrity verification.
- Report full completion to Sentinel.
