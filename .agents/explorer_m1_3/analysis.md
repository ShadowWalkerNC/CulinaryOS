# Monorepo Alignment & Package Contracts Analysis (Milestone 1 - Requirement R2)

**Explorer**: Explorer 3  
**Working Directory**: `c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m1_3`  
**Date**: 2026-08-01  
**Scope**: `pnpm-workspace.yaml`, `package.json` in all root and subdirectories, `tsconfig*.json` configurations, inter-package dependencies, circular dependencies, workspace specifiers, and TSConfig path mappings.

---

## 1. Executive Summary

A comprehensive read-only static analysis of the CulinaryOS monorepo was conducted across 16 `package.json` files, 15 `tsconfig` files, `pnpm-workspace.yaml`, `turbo.json`, and all TypeScript/JavaScript source files.

Key Findings:
1. **Circular Dependencies**: **None detected**. The package dependency graph is a clean Directed Acyclic Graph (DAG).
2. **Workspace Specifiers (`workspace:*`)**: All existing workspace dependencies in `package.json` files correctly use `workspace:*`.
3. **Missing `package.json` Dependencies**: `apps/server` (`@culinaryos/server`) imports `@culinaryos/event-bus`, `@culinaryos/config`, `@culinaryos/db`, and `@culinaryos/auth` in code/tsconfig, but **omits all of them** from `apps/server/package.json` `dependencies`.
4. **Unlinked Root Imports**: `apps/pos` reaches out of workspace boundaries via relative paths (`../../../../shared/realtime` and `../../../../shared/types`). Root `shared/` (containing types, realtime, service client, and Kotlin KMP code) and root `kds/` (containing `course-engine.ts`) are not workspace packages.
5. **TSConfig Misalignments**:
   - 6 workspace tsconfigs (`apps/admin`, `apps/kds`, `apps/pos`, `apps/web`, `cli`, `mcp`) do **not** extend `tsconfig.base.json`.
   - `mobile/` has no `tsconfig.json` file.
   - `apps/server/tsconfig.json` sets `rootDir: "../../"` and maps `@culinaryos/*` to `../../packages/*/src/index.ts`, bypassing node_modules resolution and Turborepo dependency tracking.
   - `mcp/tsconfig.json` maps `@culinaryos/ratio-engine` to `../packages/ratio-engine/dist/index.d.ts`, creating a fragile build-order coupling.

---

## 2. Inventory of Workspace Packages & TSConfigs

### 2.1 Workspace Configuration (`pnpm-workspace.yaml`)
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'mcp'
  - 'cli'
  - 'mobile'
```

### 2.2 Discovered `package.json` Files (16 Total)

| Package Name | Location | Type | Workspace Dependencies Declared |
|---|---|---|---|
| `culinaryos` | `/package.json` | Root | None |
| `@culinaryos/admin` | `apps/admin/package.json` | App | `@culinaryos/config`: "workspace:*", `@culinaryos/ui`: "workspace:*" |
| `@culinaryos/app-kds` | `apps/kds/package.json` | App | `@culinaryos/db`: "workspace:*", `@culinaryos/ui`: "workspace:*", `@culinaryos/auth`: "workspace:*" |
| `@culinaryos/app-pos` | `apps/pos/package.json` | App | `@culinaryos/ui`: "workspace:*" |
| `@culinaryos/server` | `apps/server/package.json` | App | **NONE** (Missing 4 workspace dependencies!) |
| `@culinaryos/app-web` | `apps/web/package.json` | App | `@culinaryos/ui`: "workspace:*", `@culinaryos/config`: "workspace:*" |
| `culinary-cli` | `cli/package.json` | CLI | None |
| `culinaryos-mcp-servers` | `mcp/package.json` | MCP | `@culinaryos/ratio-engine`: "workspace:*" |
| `culinaryos-mobile` | `mobile/package.json` | Mobile | None |
| `@culinaryos/auth` | `packages/auth/package.json` | Package | None |
| `@culinaryos/config` | `packages/config/package.json` | Package | None |
| `@culinaryos/db` | `packages/db/package.json` | Package | None |
| `@culinaryos/event-bus` | `packages/event-bus/package.json` | Package | None |
| `@culinaryos/ratio-engine` | `packages/ratio-engine/package.json` | Package | None |
| `@culinaryos/shared` | `packages/shared/package.json` | Package | None |
| `@culinaryos/ui` | `packages/ui/package.json` | Package | None |

---

## 3. Detailed Audit Findings

### 3.1 Circular Dependency Analysis
- **Method**: Depth-First Search (DFS) cycle detection over the full dependency graph composed of both explicit `package.json` dependencies and source code imports.
- **Graph Edges**:
  - `@culinaryos/admin` → `@culinaryos/config`, `@culinaryos/ui`
  - `@culinaryos/app-kds` → `@culinaryos/db`, `@culinaryos/ui`, `@culinaryos/auth`
  - `@culinaryos/app-pos` → `@culinaryos/ui`
  - `@culinaryos/server` → `@culinaryos/event-bus`
  - `@culinaryos/app-web` → `@culinaryos/ui`, `@culinaryos/config`
  - `culinaryos-mcp-servers` → `@culinaryos/ratio-engine`
  - Leaf packages (`packages/*`, `cli`, `mobile`): 0 internal dependencies.
- **Result**: **0 cycles detected**. The monorepo architecture maintains strict layer separation where `packages/*` are foundational dependencies and `apps/*`, `mcp`, `cli` sit at the top.

---

### 3.2 Missing Package Dependencies in `package.json`

#### Issue #1: `apps/server` (`@culinaryos/server`) Missing Workspace Dependencies
- **Observation**:
  - `apps/server/src/index.ts:10` imports `@culinaryos/event-bus`.
  - `apps/server/tsconfig.json:12-15` defines path mappings for `@culinaryos/config`, `@culinaryos/db`, `@culinaryos/auth`, and `@culinaryos/event-bus`.
  - `apps/server/package.json:13-20` lists zero `@culinaryos/*` packages in `dependencies` or `devDependencies`.
- **Root Cause**: `apps/server` relies on TypeScript path mappings (`../../packages/...`) to resolve modules directly from source files, bypassing `package.json`.
- **Impact**: Turborepo (`turbo.json`) relies on `package.json` dependency declarations to build dependencies before dependents. Because `apps/server/package.json` does not list `@culinaryos/event-bus`, `@culinaryos/config`, `@culinaryos/db`, or `@culinaryos/auth`, Turbo will not guarantee that these packages are built before `apps/server`.

---

### 3.3 Workspace Specifier Consistency (`workspace:*`)
- **Observation**: All existing inter-package references in `package.json` files use `"workspace:*"`.
  - `apps/admin/package.json`: `"@culinaryos/config": "workspace:*"`, `"@culinaryos/ui": "workspace:*"`
  - `apps/kds/package.json`: `"@culinaryos/db": "workspace:*"`, `"@culinaryos/ui": "workspace:*"`, `"@culinaryos/auth": "workspace:*"`
  - `apps/pos/package.json`: `"@culinaryos/ui": "workspace:*"`
  - `apps/web/package.json`: `"@culinaryos/ui": "workspace:*"`, `"@culinaryos/config": "workspace:*"`
  - `mcp/package.json`: `"@culinaryos/ratio-engine": "workspace:*"`
- **Result**: Compliant. Standard `"workspace:*"` specifier is used across all declared workspace dependencies.

---

### 3.4 Unlinked Root Folder Escape Imports

#### Issue #2: `apps/pos` Bypassing Workspace Package Boundaries
- **Observation**: `apps/pos/src/lib/useOrderStore.ts` lines 9–10:
  ```ts
  import { useRealtimeOrders } from '../../../../shared/realtime';
  import type { Order } from '../../../../shared/types';
  ```
- **Context**: Root-level `shared/` directory contains `types/`, `realtime/`, `service-client/`, and Kotlin source code (`src/commonMain/kotlin`). However, root `shared/` is NOT a pnpm workspace package (it has no `package.json`). Meanwhile, `packages/shared/` (`@culinaryos/shared`) IS in `pnpm-workspace.yaml`, but only exports `offline-sync.ts`.
- **Impact**: Relative imports (`../../../../shared/...`) break module encapsulation, fail if the package directory is relocated, and cause issues when building `apps/pos` isolated in Docker.

#### Issue #3: Tests & Root `kds/` Imports
- **Observation**:
  - `tests/course-firing/engine.test.ts:6`: `import { initialHoldStatus } from '../../kds/server/lib/course-engine';`
  - `tests/empirical/r3_r4_r5_stress.test.ts:5`: `import { initialHoldStatus } from '../../kds/server/lib/course-engine';`
  - `tests/kds/station.test.ts:4`: `import { initialHoldStatus } from '../../kds/server/lib/course-engine';`
- **Context**: Root `kds/server/lib/course-engine.ts` sits outside the pnpm workspace (`apps/kds` is the workspace package).

---

### 3.5 TSConfig Alignment & Path Mapping Misconfigurations

#### Issue #4: Non-Extending TSConfig Files
The following 6 `tsconfig.json` files do **NOT** extend `tsconfig.base.json`:
1. `apps/admin/tsconfig.json`
2. `apps/kds/tsconfig.json`
3. `apps/pos/tsconfig.json`
4. `apps/web/tsconfig.json`
5. `cli/tsconfig.json`
6. `mcp/tsconfig.json`

Furthermore, `mobile/` lacks a `tsconfig.json` file completely.

#### Issue #5: `apps/server/tsconfig.json` Path Mapping & `rootDir` Anti-Pattern
- **Observation**: `apps/server/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "dist",
      "rootDir": "../../",
      "paths": {
        "@culinaryos/config": ["../../packages/config/src/index.ts"],
        "@culinaryos/db": ["../../packages/db/src/index.ts"],
        "@culinaryos/auth": ["../../packages/auth/src/index.ts"],
        "@culinaryos/event-bus": ["../../packages/event-bus/src/index.ts"]
      }
    },
    "include": [
      "src",
      "../../packages/config/src",
      "../../packages/db/src",
      "../../packages/auth/src",
      "../../packages/event-bus/src"
    ]
  }
  ```
- **Impact**: Setting `"rootDir": "../../"` causes TypeScript to output files into `dist/apps/server/src/index.js` and compile `packages/*` into `apps/server/dist/packages/*`. It bypasses pnpm workspace package boundaries.

#### Issue #6: `mcp/tsconfig.json` Path Mapping to Build Output
- **Observation**: `mcp/tsconfig.json`:
  ```json
  "paths": {
    "@culinaryos/ratio-engine": ["../packages/ratio-engine/dist/index.d.ts"]
  }
  ```
- **Impact**: Pointing `paths` to a `dist/*.d.ts` file breaks typechecking if `packages/ratio-engine` has not been built yet. pnpm workspace symlinks already resolve `@culinaryos/ratio-engine` via `node_modules/@culinaryos/ratio-engine`.

---

## 4. Remediation Steps

### Step 1: Update `apps/server/package.json`
Add missing workspace dependencies to `apps/server/package.json`:
```json
"dependencies": {
  "@culinaryos/config": "workspace:*",
  "@culinaryos/db": "workspace:*",
  "@culinaryos/auth": "workspace:*",
  "@culinaryos/event-bus": "workspace:*",
  ...
}
```

### Step 2: Fix `apps/server/tsconfig.json`
Clean up `apps/server/tsconfig.json` to rely on pnpm node_modules resolution:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### Step 3: Standardize TSConfig Inheritance (`extends`)
Update `apps/admin/tsconfig.json`, `apps/kds/tsconfig.json`, `apps/pos/tsconfig.json`, `apps/web/tsconfig.json`, `cli/tsconfig.json`, and `mcp/tsconfig.json` to include:
```json
"extends": "../../tsconfig.base.json" // (or "../tsconfig.base.json" for top-level folders)
```
Create `mobile/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-native",
    "moduleResolution": "bundler"
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

### Step 4: Fix `mcp/tsconfig.json`
Remove the explicit `paths` override for `@culinaryos/ratio-engine` in `mcp/tsconfig.json` so TypeScript relies on node_modules resolution linked by pnpm.

### Step 5: Consolidate Root `shared/` and `kds/` Code into Workspace Packages
1. Move `shared/types`, `shared/realtime`, and `shared/service-client` into `packages/shared/src/` (or re-export them from `@culinaryos/shared`). Update `apps/pos/src/lib/useOrderStore.ts` to import from `@culinaryos/shared`.
2. Move `kds/server/lib/course-engine.ts` into `apps/kds/src/lib/course-engine.ts` or `packages/shared/src/course-engine.ts`, and update test imports.

---

## 5. Matrix of Issues and Action Items

| ID | Issue Description | Location | Category | Target Action | Priority |
|---|---|---|---|---|---|
| **ISSUE-01** | Missing 4 workspace deps in `package.json` | `apps/server/package.json` | Package Contract | Add `"@culinaryos/*": "workspace:*"` | HIGH |
| **ISSUE-02** | `rootDir: "../../"` & hardcoded paths to package `src` | `apps/server/tsconfig.json` | TSConfig Path | Remove `paths` & set `rootDir: "src"` | HIGH |
| **ISSUE-03** | Relative path escape imports (`../../../../shared/...`) | `apps/pos/src/lib/useOrderStore.ts` | Monorepo Boundary | Migrate imports to `@culinaryos/shared` | HIGH |
| **ISSUE-04** | Hardcoded `paths` pointing to package `dist/*.d.ts` | `mcp/tsconfig.json` | TSConfig Path | Remove `paths` override | MEDIUM |
| **ISSUE-05** | TSConfig files not extending `tsconfig.base.json` | `apps/admin`, `kds`, `pos`, `web`, `cli`, `mcp` | TSConfig Governance | Add `"extends": ".../tsconfig.base.json"` | MEDIUM |
| **ISSUE-06** | Missing `tsconfig.json` | `mobile/` | TSConfig Governance | Create `mobile/tsconfig.json` | MEDIUM |
| **ISSUE-07** | Root unlinked `kds/` folder referenced by tests | `kds/server/lib/course-engine.ts` | Workspace Boundary | Move code into `apps/kds` or `packages/shared` | LOW |
