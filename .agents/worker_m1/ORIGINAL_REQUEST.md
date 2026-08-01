## 2026-08-01T14:07:04Z

<USER_REQUEST>
You are the Worker for Milestone 1 (Monorepo Alignment & Package Contracts - Requirement R2).
Your working directory is c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\worker_m1.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task Scope & Detailed Instructions:
1. Initialize your working directory .agents/worker_m1 by creating BRIEFING.md and progress.md.
2. Consolidate @culinaryos/shared package:
   - Copy/move all TypeScript code from root shared/ (types/events.ts, types/menu.ts, types/order.ts, types/service.ts, realtime/, service-client/) into packages/shared/src/.
   - Re-export all domain types, realtime hooks/utilities, and service clients from packages/shared/src/index.ts.
   - Ensure packages/shared/package.json correctly defines exports and dependencies.
3. Reconcile Domain Contracts & Types:
   - Reconcile KitchenTicket, TicketStatus, KitchenStation, and EventType in packages/shared/src/types/ so they are canonical and superset definitions matching all usage across apps/kds, apps/pos, apps/server, packages/event-bus, and apps/web.
   - Include snake_case <-> camelCase DB row mapping functions in @culinaryos/shared for realtime ticket/order payloads to prevent runtime undefined property access.
4. Fix Monorepo Imports & Relative Path Escapes:
   - Update apps/pos/src/lib/useOrderStore.ts and any other files using ../../../../shared/* to import from @culinaryos/shared.
   - Replace any direct src/ cross-package imports across apps/, backend/, pos/, kds/, web/, mcp/ with package imports.
5. Fix Workspace package.json Dependencies:
   - Add "@culinaryos/event-bus": "workspace:*", "@culinaryos/config": "workspace:*", "@culinaryos/db": "workspace:*", and "@culinaryos/auth": "workspace:*" to apps/server/package.json.
6. Fix TSConfig Configurations:
   - Fix apps/server/tsconfig.json: set "rootDir": "src", remove path overrides pointing to ../../packages/*/src.
   - Fix mcp/tsconfig.json: remove path overrides pointing to ../packages/ratio-engine/dist/index.d.ts.
   - Ensure apps/admin/tsconfig.json, apps/kds/tsconfig.json, apps/pos/tsconfig.json, apps/web/tsconfig.json, cli/tsconfig.json, and mcp/tsconfig.json extend tsconfig.base.json.
   - Create mobile/tsconfig.json extending ../../tsconfig.base.json.
7. Verification:
   - Run typechecking and build commands (pnpm typecheck or npx pnpm@9 run build).
   - Confirm all workspace packages pass typechecking cleanly without circular dependencies or unlinked import errors.
8. Documentation:
   - Document all changes made in c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\worker_m1\changes.md and write a comprehensive handoff report to c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\worker_m1\handoff.md. Include exact build/test output.
9. Send a message to parent (26739128-9c88-4cf9-9a94-ad0515e297e0) when finished.
</USER_REQUEST>
