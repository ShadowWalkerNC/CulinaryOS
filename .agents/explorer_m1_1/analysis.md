# Monorepo Alignment & Package Contracts Analysis (Requirement R2)

**Workspace Directory:** `c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS`  
**Explorer:** Explorer 1 (Milestone 1)  
**Date:** 2026-08-01  

---

## Executive Summary

An audit of all 16 workspace `package.json` declarations, TypeScript configuration files (`tsconfig*.json`), Vite build configurations, and 191 source files was conducted to detect direct internal `src/` cross-package imports, relative path escapes across package boundaries, tsconfig rootDir violations, undeclared workspace dependencies, and unmonorepoized root directories.

A total of **26 distinct violation instances** across **6 core categories** were identified. Crucially, the codebase suffers from:
1. **12 test files** importing directly into internal package `src/` subpaths (e.g. `../../packages/event-bus/src/binary-protocol`, `../../apps/server/src/routes/pantry`) instead of using package exports or published package contracts.
2. **`apps/pos` escaping package boundaries** via relative paths into an unmonorepoized root `shared/` directory (`../../../../shared/realtime`, `../../../../shared/types`).
3. **3 test files** importing from an unmonorepoized root directory `kds/server/lib/course-engine.ts`.
4. **`apps/server/tsconfig.json` violating monorepo isolation** by declaring `"rootDir": "../../"` and manually compiling internal `src/` directories of 4 external workspace packages (`config`, `db`, `auth`, `event-bus`).
5. **`apps/server/package.json` missing 4 declared workspace dependencies** (`@culinaryos/config`, `@culinaryos/db`, `@culinaryos/auth`, `@culinaryos/event-bus`) that its source code directly imports.
6. **Vite build configs in 4 apps (`admin`, `kds`, `pos`, `web`)** overriding path resolution directly to `../../packages/*/src/index.ts` source files.

---

## Detailed Category Analysis & Fix Strategies

### Category 1: Direct Internal `src/` Cross-Package Imports in Test Suites

These files bypass the monorepo package export boundaries (`package.json` `exports` and barrel index files) by importing internal `.ts` files via relative paths containing `/src/`.

| Item | File Path | Line | Offending Import | Violation Description | Fix Strategy |
|---|---|---|---|---|---|
| 1 | `tests/api/pantry.test.ts` | 6 | `import { pantryRoutes } from '../../apps/server/src/routes/pantry';` | Imports directly from `@culinaryos/server` internal route file `src/routes/pantry.ts`. | Export pantryRoutes from `@culinaryos/server` (e.g. via `src/routes/index.ts` or package export) and import `@culinaryos/server`. |
| 2 | `tests/empirical/r1_r2_stress.test.ts` | 20 | `import { encodeBinaryEvent, decodeBinaryEvent } from '../../packages/event-bus/src/binary-protocol';` | Direct import into `@culinaryos/event-bus` internal `src/binary-protocol.ts`. | Import from `@culinaryos/event-bus` directly (both functions are exported by `packages/event-bus/src/index.ts`). |
| 3 | `tests/empirical/r1_r2_stress.test.ts` | 21 | `import type { DomainEvent } from '../../packages/event-bus/src/types';` | Direct import into `@culinaryos/event-bus` internal `src/types.ts`. | Import `type { DomainEvent }` from `@culinaryos/event-bus` (exported in index barrel). |
| 4 | `tests/empirical/r1_r2_stress.test.ts` | 27 | `} from '../../packages/shared/src/offline-sync';` | Direct import into `@culinaryos/shared` internal `src/offline-sync.ts`. | Import from `@culinaryos/shared` directly (re-exported by `packages/shared/src/index.ts`). |
| 5 | `tests/empirical/r3_r4_r5_stress.test.ts` | 6 | `import { kdsRoutes } from '../../apps/server/src/routes/kds';` | Direct import into `@culinaryos/server` internal `src/routes/kds.ts`. | Export kdsRoutes from `@culinaryos/server` entrypoint and import `@culinaryos/server`. |
| 6 | `tests/empirical/r3_r4_r5_stress.test.ts` | 7 | `import { pantryRoutes } from '../../apps/server/src/routes/pantry';` | Direct import into `@culinaryos/server` internal `src/routes/pantry.ts`. | Export pantryRoutes from `@culinaryos/server` entrypoint and import `@culinaryos/server`. |
| 7 | `tests/empirical/step1_plated_inventory.test.ts` | 2 | `import { scaleBlueprint, RatioBlueprint } from '../../packages/ratio-engine/src/index';` | Reaches into `@culinaryos/ratio-engine` internal `src/index`. | Change import to package specifier `@culinaryos/ratio-engine`. |
| 8 | `tests/empirical/step3_mcp_servers.test.ts` | 2 | `import { scaleBlueprint } from '../../packages/ratio-engine/src/index';` | Reaches into `@culinaryos/ratio-engine` internal `src/index`. | Change import to package specifier `@culinaryos/ratio-engine`. |
| 9 | `tests/event-bus/binary-protocol.test.ts` | 6 | `import { encodeBinaryEvent, decodeBinaryEvent } from '../../packages/event-bus/src/binary-protocol';` | Reaches into `@culinaryos/event-bus` internal `src/binary-protocol.ts`. | Change import to package specifier `@culinaryos/event-bus`. |
| 10 | `tests/event-bus/binary-protocol.test.ts` | 7 | `import type { DomainEvent } from '../../packages/event-bus/src/types';` | Reaches into `@culinaryos/event-bus` internal `src/types.ts`. | Change import to package specifier `@culinaryos/event-bus`. |
| 11 | `tests/event-bus/broker.test.ts` | 21 | `import { handleIncomingEvent } from '../../packages/event-bus/src/broker';` | Reaches into `@culinaryos/event-bus` internal `src/broker.ts`. | Change import to package specifier `@culinaryos/event-bus`. |
| 12 | `tests/event-bus/handlers.test.ts` | 74 | `const { handleTicketBumped } = await import('../../packages/event-bus/src/handlers/kds-ticket-bumped');` | Dynamic import reaching into `@culinaryos/event-bus` internal handler `src/handlers/kds-ticket-bumped.ts`. | Export `handleTicketBumped` from `@culinaryos/event-bus` barrel or handlers entrypoint and import via package specifier. |
| 13 | `tests/event-bus/handlers.test.ts` | 111 | `const { handleTicketBumped } = await import('../../packages/event-bus/src/handlers/kds-ticket-bumped');` | Dynamic import reaching into internal handler file. | Export `handleTicketBumped` from `@culinaryos/event-bus` and import via package specifier. |
| 14 | `tests/event-bus/handlers.test.ts` | 135 | `const { handleTicketBumped } = await import('../../packages/event-bus/src/handlers/kds-ticket-bumped');` | Dynamic import reaching into internal handler file. | Export `handleTicketBumped` from `@culinaryos/event-bus` and import via package specifier. |
| 15 | `tests/event-bus/handlers.test.ts` | 165 | `const { handleOrderCancelled } = await import('../../packages/event-bus/src/handlers/pos-order-cancelled');` | Dynamic import reaching into `@culinaryos/event-bus` internal handler `src/handlers/pos-order-cancelled.ts`. | Export `handleOrderCancelled` from `@culinaryos/event-bus` and import via package specifier. |
| 16 | `tests/server/htmx-kds.test.ts` | 6 | `import { kdsRoutes } from '../../apps/server/src/routes/kds';` | Direct internal import into `@culinaryos/server` route file. | Export kdsRoutes from `@culinaryos/server` and import `@culinaryos/server`. |
| 17 | `tests/shared/offline-sync.test.ts` | 23 | `} from '../../packages/shared/src/offline-sync';` | Direct import into `@culinaryos/shared` internal `src/offline-sync.ts`. | Change import to package specifier `@culinaryos/shared`. |

---

### Category 2: Relative Path Escapes into Unmonorepoized Root Directories

These files use relative path navigation (`../../../../` or `../../`) to escape workspace package boundaries into unmonorepoized root directories (`shared/` and `kds/`).

| Item | File Path | Line | Offending Import | Root Directory | Fix Strategy |
|---|---|---|---|---|---|
| 18 | `apps/pos/src/lib/useOrderStore.ts` | 9 | `import { useRealtimeOrders } from '../../../../shared/realtime';` | `shared/realtime` | Migrate `shared/realtime` into `@culinaryos/shared` (or `@culinaryos/event-bus`), add workspace dependency to `apps/pos/package.json`, import via package specifier. |
| 19 | `apps/pos/src/lib/useOrderStore.ts` | 10 | `import type { Order } from '../../../../shared/types';` | `shared/types` | Migrate `shared/types` into `@culinaryos/shared`, add workspace dependency to `apps/pos/package.json`, import via package specifier `@culinaryos/shared`. |
| 20 | `tests/course-firing/engine.test.ts` | 6 | `import { initialHoldStatus } from '../../kds/server/lib/course-engine';` | `kds/server/lib` | Move `kds/server/lib/course-engine.ts` into `@culinaryos/app-kds` (`apps/kds/src/lib/course-engine.ts`) or `@culinaryos/shared`, update package export, and import via package specifier. |
| 21 | `tests/empirical/r3_r4_r5_stress.test.ts` | 8 | `import { initialHoldStatus } from '../../kds/server/lib/course-engine';` | `kds/server/lib` | Update import to package specifier after moving `course-engine.ts`. |
| 22 | `tests/kds/station.test.ts` | 2 | `import { initialHoldStatus } from '../../kds/server/lib/course-engine';` | `kds/server/lib` | Update import to package specifier after moving `course-engine.ts`. |

---

### Category 3: tsconfig.json Monorepo Boundary Violations & RootDir Escapes

| Item | Config File Path | Lines | Offending Config | Violation Description | Fix Strategy |
|---|---|---|---|---|---|
| 23 | `apps/server/tsconfig.json` | 10, 11-16, 18-24 | `"rootDir": "../../"`, `"paths": { "@culinaryos/config": ["../../packages/config/src/index.ts"], ... }`, `"include": ["src", "../../packages/config/src", ...]` | `apps/server` escapes its own package root directory, sets `rootDir` to monorepo root, and includes source files from 4 external packages inside its compiler context. | Set `"rootDir": "./src"`, remove external package paths from `"paths"` and `"include"`, declare workspace dependencies in `apps/server/package.json`, and rely on pnpm workspace package resolution. |
| 24 | `mcp/tsconfig.json` | 16 | `"paths": { "@culinaryos/ratio-engine": ["../packages/ratio-engine/dist/index.d.ts"] }` | `mcp` uses explicit relative path mapping to `../packages/ratio-engine/dist/index.d.ts` in tsconfig paths. | Remove custom path mapping from `mcp/tsconfig.json` to allow standard pnpm workspace package resolution via `node_modules`. |

---

### Category 4: Bundler / Vite Alias Escapes Bypassing Package Entrypoint Contracts

| Item | Config File Path | Lines | Offending Config | Violation Description | Fix Strategy |
|---|---|---|---|---|---|
| 25 | `apps/admin/vite.config.ts` | 9-10 | `'@culinaryos/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts')`, `'@culinaryos/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')` | Hardcodes relative paths directly into internal `packages/*/src/index.ts` files. | Verify package `exports` point to `./src/index.ts` for TS source mode and let Vite resolve via pnpm workspace node_modules resolution. |
| 26 | `apps/kds/vite.config.ts` | 9-10 | Same relative path alias override to `../../packages/*/src/index.ts`. | Bypasses package contracts. | Align with package entrypoint contracts. |
| 27 | `apps/pos/vite.config.ts` | 9-10 | Same relative path alias override to `../../packages/*/src/index.ts`. | Bypasses package contracts. | Align with package entrypoint contracts. |
| 28 | `apps/web/vite.config.ts` | 9-10 | Same relative path alias override to `../../packages/*/src/index.ts`. | Bypasses package contracts. | Align with package entrypoint contracts. |

---

### Category 5: Missing / Undeclared Workspace Package Dependencies in `package.json`

| Item | Target Package | File / Importer | Missing Workspace Dependency | Fix Strategy |
|---|---|---|---|---|
| 29 | `apps/server` | `apps/server/package.json` | `@culinaryos/config`, `@culinaryos/db`, `@culinaryos/auth`, `@culinaryos/event-bus` | Add `"@culinaryos/config": "workspace:*", "@culinaryos/db": "workspace:*", "@culinaryos/auth": "workspace:*", "@culinaryos/event-bus": "workspace:*"` to `apps/server/package.json`. |
| 30 | `apps/pos` | `apps/pos/package.json` | `@culinaryos/shared` | Add `"@culinaryos/shared": "workspace:*"` to `apps/pos/package.json` when migrating `shared/realtime` and `shared/types`. |

---

### Category 6: Unmonorepoized Root Code & Orphaned Directories

1. **`kds/server/lib/course-engine.ts`**:
   - Location: Top-level `kds/` folder (not declared in `pnpm-workspace.yaml`).
   - Content: `initialHoldStatus(courseNumber: number)` function.
   - Used By: `tests/course-firing/engine.test.ts`, `tests/empirical/r3_r4_r5_stress.test.ts`, `tests/kds/station.test.ts`.
   - Action Required: Move to `apps/kds/src/lib/course-engine.ts` or `@culinaryos/shared`, export it, and update test imports.

2. **Top-Level `shared/` Directory (`shared/types/*`, `shared/realtime/*`, `shared/service-client/*`, `shared/src/*`)**:
   - Location: Top-level `shared/` folder (not declared as a workspace package in `pnpm-workspace.yaml`).
   - Conflict: `@culinaryos/shared` exists at `packages/shared/` with its own `package.json`, causing a split between root `shared/` and `packages/shared/`.
   - Used By: `apps/pos/src/lib/useOrderStore.ts:9-10`.
   - Action Required: Consolidate TS types (`shared/types/*`) and realtime logic (`shared/realtime/*`) into `@culinaryos/shared` (`packages/shared/src/`), update `packages/shared/package.json` exports, and update `apps/pos/src/lib/useOrderStore.ts` to import `@culinaryos/shared`.

---

## Action Plan & Recommendations for Implementer

1. **Package Declarations (`package.json` updates)**:
   - In `apps/server/package.json`, add:
     ```json
     "dependencies": {
       "@culinaryos/config": "workspace:*",
       "@culinaryos/db": "workspace:*",
       "@culinaryos/auth": "workspace:*",
       "@culinaryos/event-bus": "workspace:*"
     }
     ```
   - In `apps/pos/package.json`, add:
     ```json
     "dependencies": {
       "@culinaryos/shared": "workspace:*"
     }
     ```

2. **TSConfig Alignment (`tsconfig.json` updates)**:
   - In `apps/server/tsconfig.json`:
     - Change `"rootDir": "../../"` to `"rootDir": "./src"`.
     - Remove `paths` pointing to `../../packages/*/src/index.ts`.
     - Remove external package source directories from `include`.
   - In `mcp/tsconfig.json`:
     - Remove `paths` mapping `@culinaryos/ratio-engine` to `../packages/ratio-engine/dist/index.d.ts`.

3. **Unmonorepoized Root Code Migration**:
   - Move `kds/server/lib/course-engine.ts` into `apps/kds/src/lib/course-engine.ts` (or `@culinaryos/shared`).
   - Move `shared/types/*` and `shared/realtime/*` into `packages/shared/src/types/` and `packages/shared/src/realtime/`. Re-export them from `packages/shared/src/index.ts`.

4. **Import Replacement in Tests and Apps**:
   - Replace all `import ... from '../../packages/event-bus/src/...'` with `import ... from '@culinaryos/event-bus'`.
   - Replace all `import ... from '../../packages/shared/src/...'` with `import ... from '@culinaryos/shared'`.
   - Replace all `import ... from '../../packages/ratio-engine/src/...'` with `import ... from '@culinaryos/ratio-engine'`.
   - Replace `import { pantryRoutes } from '../../apps/server/src/routes/pantry'` and `kdsRoutes` with package exports from `@culinaryos/server`.
   - Replace `apps/pos/src/lib/useOrderStore.ts` imports of `../../../../shared/*` with `@culinaryos/shared`.

5. **Verification**:
   - Run `pnpm build` across the monorepo via Turborepo (`turbo run build`).
   - Run `pnpm typecheck` via Turborepo (`turbo run typecheck`).
   - Run test suite `node ./scripts/run-all-tests.cjs`.
