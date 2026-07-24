# CulinaryOS — Workspace Structure, Build System, & Infrastructure Analysis

> **Date:** July 24, 2026  
> **Target:** `c:\Users\User\Documents\CulinaryOS`  
> **Investigator:** Explorer Agent (`.agents/teamwork_preview_explorer_workspace_1`)

---

## 1. Executive Summary

CulinaryOS is an AI-native restaurant operating system monorepo managed with **pnpm workspaces** and **Turborepo**. The codebase targets web dashboards, Hono API backend, MCP extension servers, Kotlin Multiplatform (KMP) operational clients, and React Native mobile apps.

### Key Investigation Findings
1. **Build Success:** `npx pnpm@9 run build` succeeds across all 8 buildable TypeScript packages in turbo scope. `npx pnpm@9 run typecheck` passes cleanly across all 11 workspace packages.
2. **Missing Package Manifest (`apps/admin`):** `apps/admin` has a `Dockerfile`, `nginx.conf`, and `src/pages/Pantry.tsx`, but **lacks a `package.json`**. `docker-compose.yml` references `apps/admin/Dockerfile` which fails on `docker compose up` because it attempts to filter and build `@culinaryos/admin`.
3. **Workspace Omissions:** `cli/` (`culinary-cli`) and `mobile/` (`culinaryos-mobile`) contain valid `package.json` files but are **omitted from `pnpm-workspace.yaml`** (which only includes `apps/*`, `packages/*`, and `mcp`).
4. **Script Failures (`lint` & `test`):** 
   - `npx pnpm@9 run lint` fails because `@culinaryos/app-kds` requires `eslint` which is not installed.
   - `npx pnpm@9 run test` fails because `@culinaryos/ratio-engine` runs `bun test`, but `bun` is not present on the environment PATH.
5. **Port Discrepancies & LAN Deployment:** Docker container ports (`5172` POS, `5173` KDS, `5174` Admin, `3000` API) mismatch dev script ports in package.json (e.g., POS dev script defaults to `5173` while Docker host port is `5172`). In `docker-compose.yml`, `VITE_KDS_URL` and `VITE_POS_URL` hardcode `http://localhost:3000`, breaking remote LAN deployment for physical hardware/tablets.
6. **Desktop Architecture:** Contrary to standard Electron expectations, CulinaryOS operational desktop terminals are built using **Compose Multiplatform (KMP)** (`apps/pos/build.gradle.kts` targeting JVM Desktop + Android) with SQLDelight local event queuing for offline-first operation.

---

## 2. Workspace & Monorepo Configuration Analysis

### 2.1 Workspace Definition (`pnpm-workspace.yaml`)

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'mcp'
```

#### Included Packages (11 Workspace Packages)
- **Apps (`apps/*`):**
  - `@culinaryos/app-kds` (`apps/kds`) — KDS Web Client (Vite + React)
  - `@culinaryos/app-pos` (`apps/pos`) — POS Web Client (Vite + React)
  - `@culinaryos/app-web` (`apps/web`) — Web Dashboard / Admin (Vite + React)
  - `@culinaryos/server` (`apps/server`) — Unified Hono API Gateway
- **Packages (`packages/*`):**
  - `@culinaryos/auth` (`packages/auth`) — Session & PIN auth utilities
  - `@culinaryos/config` (`packages/config`) — Constants & feature flags
  - `@culinaryos/db` (`packages/db`) — Database models & Supabase types
  - `@culinaryos/event-bus` (`packages/event-bus`) — Realtime bridge & event handling
  - `@culinaryos/ratio-engine` (`packages/ratio-engine`) — Recipe scaling ratio engine
  - `@culinaryos/ui` (`packages/ui`) — Shared UI primitives
- **MCP Server (`mcp`):**
  - `culinaryos-mcp-servers` (`mcp`) — AI agent tool servers

#### Omitted Root Directories
- `cli/` (`culinary-cli`): Omitted from `pnpm-workspace.yaml`.
- `mobile/` (`culinaryos-mobile`): Omitted from `pnpm-workspace.yaml`.
- `shared/`: Kotlin Multiplatform module using Gradle (`build.gradle.kts`).
- `services/api/`: Legacy/stale directory containing only build output artifacts (`dist`, `.turbo`).
- `apps/admin/`: Directory with `Dockerfile` & `src`, missing `package.json`.

---

### 2.2 Turborepo Configuration (`turbo.json`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

- Root `package.json` scripts map directly to Turbo tasks (`turbo run build`, `turbo run dev`, `turbo run test`, `turbo run lint`, `turbo run typecheck`).

---

### 2.3 Package Manifest Summary Table

| Location | Package Name | Version | Private | Type | Build Script | Main/Export Entry | Status |
|---|---|---|---|---|---|---|---|
| `package.json` | `culinaryos` | `0.1.0` | `true` | - | `turbo run build` | N/A | Root |
| `apps/kds` | `@culinaryos/app-kds` | `0.1.0` | `true` | `module` | `tsc && vite build` | N/A | OK |
| `apps/pos` | `@culinaryos/app-pos` | `0.1.0` | `true` | `module` | `tsc && vite build` | N/A | OK |
| `apps/server` | `@culinaryos/server` | `0.1.0` | `true` | `module` | `tsc` | `dist/apps/server/src/index.js` | OK |
| `apps/web` | `@culinaryos/app-web` | `0.1.0` | `true` | `module` | `tsc && vite build` | N/A | OK |
| `apps/admin` | *Missing* | - | - | - | - | - | 🚨 Missing `package.json` |
| `cli` | `culinary-cli` | `1.0.0` | `false` | - | `tsc` | `dist/index.js` | ⚠️ Excluded from workspace |
| `mcp` | `culinaryos-mcp-servers` | `1.0.0` | `false` | `module` | `tsc` | `dist/pos-server.js` | OK |
| `mobile` | `culinaryos-mobile` | `1.0.0` | `false` | - | Expo CLI | `expo-router/entry` | ⚠️ Excluded from workspace |
| `packages/auth` | `@culinaryos/auth` | `0.1.0` | `true` | - | `tsc` | `./dist/index.js` | OK |
| `packages/config` | `@culinaryos/config` | `0.1.0` | `true` | - | `tsc` | `./dist/index.js` | OK |
| `packages/db` | `@culinaryos/db` | `0.1.0` | `true` | `module` | *None* | `./src/index.ts` | Source-only package |
| `packages/event-bus` | `@culinaryos/event-bus` | `0.1.0` | `true` | `module` | *None* | `./src/index.ts` | Source-only package |
| `packages/ratio-engine` | `@culinaryos/ratio-engine` | `0.1.0` | `true` | - | `tsc` | `./dist/index.js` | OK |
| `packages/ui` | `@culinaryos/ui` | `0.1.0` | `true` | `module` | *None* | `./src/index.ts` | Source-only package |

---

## 3. Build System & Execution Audit

### 3.1 `pnpm run build` Execution Results

Running `npx pnpm@9 run build --force` triggers Turborepo across 11 workspace packages:
- **Successful Builds (8 packages):**
  - `@culinaryos/config` (`tsc`)
  - `@culinaryos/auth` (`tsc`)
  - `@culinaryos/ratio-engine` (`tsc`)
  - `@culinaryos/server` (`tsc`)
  - `culinaryos-mcp-servers` (`tsc`)
  - `@culinaryos/app-web` (`tsc && vite build`)
  - `@culinaryos/app-kds` (`tsc && vite build`)
  - `@culinaryos/app-pos` (`tsc && vite build`)
- **No-op Packages (3 packages):** `@culinaryos/db`, `@culinaryos/event-bus`, `@culinaryos/ui` do not declare a `"build"` script as they export raw TypeScript source (`./src/index.ts`).

### 3.2 `pnpm run typecheck` Results
- **Status:** PASS (11/11 packages verified with zero TypeScript errors).

### 3.3 `pnpm run lint` Audit
- **Status:** FAIL
- **Error Cause:** `@culinaryos/app-kds` defines `"lint": "eslint src --ext .ts,.tsx"`. Running `pnpm run lint` yields:
  `'eslint' is not recognized as an internal or external command`.
- **Root Cause:** Neither root nor package `devDependencies` include `eslint`.

### 3.4 `pnpm run test` Audit
- **Status:** FAIL
- **Error Cause:** `@culinaryos/ratio-engine` defines `"test": "bun test"`. Running `pnpm run test` yields:
  `'bun' is not recognized as an internal or external command`.
- **Root Cause:** System environment runs Node.js without `bun` CLI installed.

---

## 4. Docker & Infrastructure Setup

### 4.1 Hono API Gateway Backend (`apps/server`)

The core server is built with **Hono** running on Node.js (`@hono/node-server`) at `apps/server/src/index.ts`.

#### Endpoint Architecture
- `GET /health` — Health check endpoint (`status: healthy`).
- `POST /internal/events` — Event bus ingress (`handleIncomingEvent`).
- `GET /internal/events` — Event log querying.
- `/v1/kds` — Kitchen display routes.
- `/v1/pantry` — Inventory & pantry management.
- `/v1/reports` — Analytics & reporting.
- `/v1/orders` — Order lifecycle.
- `/v1/tabs` — Tab & guest management.
- `/v1/menu` — Menu snapshot & item management.
- `/v1/payments` — Payment processing.

---

### 4.2 Docker Services (`docker-compose.yml`)

```yaml
version: '3.9'
services:
  backend:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    ports:
      - "3000:3000"
    env_file: .env
    environment:
      PORT: 3000
      SERVICE_NAME: culinaryos

  kds-client:
    build:
      context: .
      dockerfile: apps/kds/Dockerfile
      args:
        VITE_KDS_URL: http://localhost:3000
    ports:
      - "5173:80"

  pos-client:
    build:
      context: .
      dockerfile: apps/pos/Dockerfile
      args:
        VITE_POS_URL: http://localhost:3000
    ports:
      - "5172:80"

  admin-client:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    ports:
      - "5174:80"
```

---

### 4.3 Port Matrix & Discrepancy Analysis

| Service | Container Internal Port | Docker Host Published Port | Package `package.json` Dev Script Port | Port Conflict / Discrepancy |
|---|---|---|---|---|
| API Backend (`server`) | `3000` | `3000` | `3000` (`tsx watch src/index.ts`) | Aligned |
| POS Client (`pos`) | `80` (Nginx) | `5172` | `5173` (`vite` default) | ⚠️ **Mismatch:** Dev uses 5173, Docker maps 5172 |
| KDS Client (`kds`) | `80` (Nginx) | `5173` | `5174` (`vite --port 5174`) | ⚠️ **Mismatch:** Dev uses 5174, Docker maps 5173 |
| Admin Client (`admin`) | `80` (Nginx) | `5174` | `5176` (`vite --port 5176` in `apps/web`) | ⚠️ **Mismatch & Broken Build:** Docker maps 5174; missing `apps/admin/package.json` |

#### Local LAN Deployment Impact
In `docker-compose.yml`, build arguments for static Vite bundles hardcode:
`VITE_KDS_URL: http://localhost:3000` and `VITE_POS_URL: http://localhost:3000`.
When deploying on a local restaurant LAN (e.g. server IP `192.168.1.100`), handheld terminals or KDS tablets accessing the web apps will attempt to connect to `localhost:3000` on their own device rather than the host server, causing connection failures.

---

## 5. Desktop & Hardware Deployment Architecture

### 5.1 Electron vs. Compose Multiplatform Finding

Task 4 requested inspection of the Electron desktop configuration for `apps/pos`.
- **Finding:** CulinaryOS does **NOT** use Electron for desktop terminals.
- **Actual Architecture:** As documented in `docs/architecture.md` and implemented in `apps/pos/build.gradle.kts`, operational clients (POS Terminal, KDS Display, Admin Panel) use **Kotlin / Compose Multiplatform (KMP)** targeting:
  1. **Android Tablets** (`androidTarget()`)
  2. **JVM Desktop Applications** (`jvm("desktop")`)

### 5.2 POS Hardware & Offline Resilience Stack

```kotlin
// apps/pos/build.gradle.kts
kotlin {
    androidTarget()
    jvm("desktop")

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation(project(":shared"))
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.ui)
            }
        }
    }
}
```

- **Local-First Architecture:** Local write operations persist to SQLite via SQLDelight (`LocalEventQueue`) in the `:shared` KMP module.
- **Sync Protocol:** Events queue locally with monotonically increasing sequence numbers and background sync coroutines drain the queue to Hono server (`/internal/events` or `/v1/orders`) when network connectivity is re-established.

---

## 6. Actionable Fix Recommendations

1. **Create `apps/admin/package.json`:**
   Add package manifest for `@culinaryos/admin` with name `@culinaryos/admin` and build script (`tsc && vite build`), enabling `docker compose up` to complete without failure.
2. **Update `pnpm-workspace.yaml`:**
   Include `cli` and `mobile` in workspace configuration:
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
     - 'mcp'
     - 'cli'
     - 'mobile'
   ```
3. **Harmonize Dev Ports:**
   Align package scripts in `package.json` with Docker host ports:
   - `apps/pos`: `vite --port 5172`
   - `apps/kds`: `vite --port 5173`
   - `apps/admin` (or `apps/web`): `vite --port 5174`
4. **Dynamic LAN Environment Variables:**
   Update `docker-compose.yml` to allow `VITE_API_URL` to accept host LAN IP environment variables (e.g. `${SERVER_LAN_IP:-http://localhost:3000}`).
5. **Fix Test and Lint Tooling:**
   - Install `eslint` in root or package `devDependencies` for `@culinaryos/app-kds`.
   - Update `@culinaryos/ratio-engine` package.json to use `vitest` or `node --test` instead of uninstalled `bun test`.
