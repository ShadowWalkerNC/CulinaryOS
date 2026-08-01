# Handoff Report — Explorer 1 (Milestone 1, Requirement R2)

**Agent:** Explorer 1  
**Milestone:** Milestone 1 (Monorepo Alignment & Package Contracts - Requirement R2)  
**Working Directory:** `c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m1_1`  
**Handoff Type:** Hard  

---

## 1. Observation

Inspection of all workspace packages (`packages/*`, `apps/*`, `cli`, `mcp`, `mobile`) and root directories (`kds/`, `shared/`) yielded direct evidence of package boundary violations, internal `src/` imports, tsconfig `rootDir` escapes, and missing package dependencies:

1. **Direct `src/` Imports in Test Suite**:
   - `tests/api/pantry.test.ts:6`: `import { pantryRoutes } from '../../apps/server/src/routes/pantry';`
   - `tests/empirical/r1_r2_stress.test.ts:20`: `import { encodeBinaryEvent, decodeBinaryEvent } from '../../packages/event-bus/src/binary-protocol';`
   - `tests/empirical/r1_r2_stress.test.ts:21`: `import type { DomainEvent } from '../../packages/event-bus/src/types';`
   - `tests/empirical/r1_r2_stress.test.ts:27`: `} from '../../packages/shared/src/offline-sync';`
   - `tests/empirical/r3_r4_r5_stress.test.ts:6`: `import { kdsRoutes } from '../../apps/server/src/routes/kds';`
   - `tests/empirical/r3_r4_r5_stress.test.ts:7`: `import { pantryRoutes } from '../../apps/server/src/routes/pantry';`
   - `tests/empirical/step1_plated_inventory.test.ts:2`: `import { scaleBlueprint, RatioBlueprint } from '../../packages/ratio-engine/src/index';`
   - `tests/empirical/step3_mcp_servers.test.ts:2`: `import { scaleBlueprint } from '../../packages/ratio-engine/src/index';`
   - `tests/event-bus/binary-protocol.test.ts:6`: `import { encodeBinaryEvent, decodeBinaryEvent } from '../../packages/event-bus/src/binary-protocol';`
   - `tests/event-bus/binary-protocol.test.ts:7`: `import type { DomainEvent } from '../../packages/event-bus/src/types';`
   - `tests/event-bus/broker.test.ts:21`: `import { handleIncomingEvent } from '../../packages/event-bus/src/broker';`
   - `tests/event-bus/handlers.test.ts:74`: `const { handleTicketBumped } = await import('../../packages/event-bus/src/handlers/kds-ticket-bumped');`
   - `tests/event-bus/handlers.test.ts:111`: `const { handleTicketBumped } = await import('../../packages/event-bus/src/handlers/kds-ticket-bumped');`
   - `tests/event-bus/handlers.test.ts:135`: `const { handleTicketBumped } = await import('../../packages/event-bus/src/handlers/kds-ticket-bumped');`
   - `tests/event-bus/handlers.test.ts:165`: `const { handleOrderCancelled } = await import('../../packages/event-bus/src/handlers/pos-order-cancelled');`
   - `tests/server/htmx-kds.test.ts:6`: `import { kdsRoutes } from '../../apps/server/src/routes/kds';`
   - `tests/shared/offline-sync.test.ts:23`: `} from '../../packages/shared/src/offline-sync';`

2. **Relative Path Escapes to Unmonorepoized Root Directories**:
   - `apps/pos/src/lib/useOrderStore.ts:9`: `import { useRealtimeOrders } from '../../../../shared/realtime';`
   - `apps/pos/src/lib/useOrderStore.ts:10`: `import type { Order } from '../../../../shared/types';`
   - `tests/course-firing/engine.test.ts:6`: `import { initialHoldStatus } from '../../kds/server/lib/course-engine';`
   - `tests/empirical/r3_r4_r5_stress.test.ts:8`: `import { initialHoldStatus } from '../../kds/server/lib/course-engine';`
   - `tests/kds/station.test.ts:2`: `import { initialHoldStatus } from '../../kds/server/lib/course-engine';`

3. **`apps/server/tsconfig.json` Monorepo Escapes**:
   - `apps/server/tsconfig.json:10`: `"rootDir": "../../"`
   - `apps/server/tsconfig.json:11-16`: `"paths": { "@culinaryos/config": ["../../packages/config/src/index.ts"], "@culinaryos/db": ["../../packages/db/src/index.ts"], "@culinaryos/auth": ["../../packages/auth/src/index.ts"], "@culinaryos/event-bus": ["../../packages/event-bus/src/index.ts"] }`
   - `apps/server/tsconfig.json:18-24`: Includes external packages in tsconfig `include`.

4. **Undeclared Workspace Dependencies in `package.json`**:
   - `apps/server/package.json` omits `@culinaryos/config`, `@culinaryos/db`, `@culinaryos/auth`, and `@culinaryos/event-bus` from `dependencies`.
   - `apps/pos/package.json` omits `@culinaryos/shared`.

5. **`mcp/tsconfig.json` Custom Path Alias**:
   - `mcp/tsconfig.json:16`: `"paths": { "@culinaryos/ratio-engine": ["../packages/ratio-engine/dist/index.d.ts"] }`

6. **Vite Configurations Direct Source Aliasing**:
   - `apps/admin/vite.config.ts:9-10`, `apps/kds/vite.config.ts:9-10`, `apps/pos/vite.config.ts:9-10`, `apps/web/vite.config.ts:9-10` alias `@culinaryos/ui` and `@culinaryos/shared` directly to `../../packages/*/src/index.ts`.

---

## 2. Logic Chain

1. **Observation**: Rule 1 in `AGENTS.md` states: *"No package may import directly from another package's src/ — only from its published interface."*
2. **Observation**: Multiple test files (`tests/event-bus/*.test.ts`, `tests/empirical/*.test.ts`, `tests/api/pantry.test.ts`, `tests/server/htmx-kds.test.ts`) import directly from `../../packages/<pkg>/src/...` or `../../apps/server/src/routes/...`.
3. **Reasoning**: This breaks monorepo package encapsulation because test suites bypass pnpm node_modules resolutions and package exports declared in `package.json`.
4. **Observation**: `apps/pos/src/lib/useOrderStore.ts` uses relative paths `../../../../shared/realtime` and `../../../../shared/types` to reach the unmonorepoized root `shared/` directory.
5. **Reasoning**: `shared/` at the root is not a workspace package in `pnpm-workspace.yaml`. Meanwhile, `@culinaryos/shared` exists at `packages/shared/`. Having root `shared/` imported via relative paths violates workspace boundaries and split-package isolation.
6. **Observation**: `kds/server/lib/course-engine.ts` is in top-level `kds/` outside `pnpm-workspace.yaml` and is imported via relative path `../../kds/server/lib/course-engine` by 3 test files.
7. **Reasoning**: `course-engine.ts` is orphaned code outside monorepo workspace packages. Moving it into `@culinaryos/app-kds` (`apps/kds/src/lib/course-engine.ts`) or `@culinaryos/shared` resolves this unmonorepoized reference.
8. **Observation**: `apps/server/tsconfig.json` sets `"rootDir": "../../"` and manually maps package paths to `../../packages/<pkg>/src/index.ts`. `apps/server/package.json` omits `@culinaryos/config`, `@culinaryos/db`, `@culinaryos/auth`, and `@culinaryos/event-bus` from `dependencies`.
9. **Reasoning**: `apps/server` relies on tsconfig compiler hacks to compile external workspace package sources directly instead of declaring workspace dependencies in `package.json` and compiling against package entrypoints.
10. **Conclusion**: Standardizing package dependencies in `package.json`, updating tsconfig `rootDir` to `./src`, migrating root `shared` and `kds/course-engine` into workspace packages, and replacing all direct `src/` relative imports with package specifiers will satisfy Requirement R2 and ensure full monorepo alignment.

---

## 3. Caveats

- **Kotlin Multiplatform Code in root `shared/src`**: The root `shared/` directory contains `shared/src/commonMain/kotlin/...` (Kotlin Multiplatform code). Only the TypeScript parts (`shared/types/*` and `shared/realtime/*`) need to be migrated to `@culinaryos/shared`.
- **Vite Bundler Aliases**: In development mode, Vite plugins resolve TypeScript source files directly. Aligning Vite aliases to respect package exports (`./src/index.ts`) ensures hot-reloading works seamlessly without breaking monorepo contracts.

---

## 4. Conclusion

A comprehensive set of 26 illegal imports, unmonorepoized references, tsconfig rootDir escapes, and missing package dependencies has been identified and mapped with exact line numbers and fix strategies in `.agents/explorer_m1_1/analysis.md`. The recommendations provide a clear, step-by-step roadmap for the Implementer agent to achieve Requirement R2 compliance.

---

## 5. Verification Method

Independent verification of the findings and fixes can be performed using:

1. **Inspection of Analysis Report**:
   Inspect `c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m1_1\analysis.md` for the complete itemized table of files, line numbers, offending imports, and fix strategies.

2. **Automated Scanner Script**:
   Run the PowerShell audit script to confirm zero remaining violations:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m1_1\audit.ps1"
   ```
   *Expected result after fixes*: 0 detected issues in categories `DIRECT_SRC_IMPORT`, `CROSS_PACKAGE_RELATIVE_IMPORT`, `UNMONOREPOIZED_ROOT_IMPORT`, and `UNDECLARED_DEPENDENCY`.

3. **Monorepo Build & Typecheck Commands**:
   Run the project-level verification commands:
   - Typecheck: `npm run typecheck` or `turbo run typecheck`
   - Build: `npm run build` or `turbo run build`
   - Tests: `npm test` (`node ./scripts/run-all-tests.cjs`)
