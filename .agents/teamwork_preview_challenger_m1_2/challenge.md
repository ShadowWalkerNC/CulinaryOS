# Adversarial Challenge Report — Docker & Environment Setup (Milestone 1)

## Challenge Summary

**Overall Risk Assessment**: CRITICAL  
**Pass/Fail Verdict**: **FAIL**

Empirical stress-testing of `docker-compose.yml`, Dockerfiles, `.env.example`, and `.env` revealed 1 critical blocking issue in `docker-compose.yml` healthcheck execution, widespread environment variable omissions in `.env.example`, and obsolete Dockerfile artifacts in the repository root.

---

## Challenges

### [CRITICAL] Challenge 1: Broken Backend Healthcheck Blocks All Dependent Services

- **Assumption challenged**: `docker compose up` successfully starts the full stack with healthy service dependencies.
- **Attack Scenario**:
  - `docker-compose.yml` configures a healthcheck for `backend`:
    ```yaml
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
    ```
  - However, `apps/server/Dockerfile` uses `FROM node:20-slim AS base`. Debian slim images do **not** include `wget` or `curl` by default, and `apps/server/Dockerfile` does not install `wget`.
  - When Docker executes the healthcheck command inside the container, it fails with exit code 127 (`command not found: wget`).
  - After 3 retries (45s), Docker marks `backend` as **unhealthy**.
  - All 4 client services (`pos-client`, `kds-client`, `admin-client`, `web-client`) declare:
    ```yaml
    depends_on:
      backend:
        condition: service_healthy
    ```
- **Blast Radius**: `docker compose up` will hang indefinitely waiting for `backend` to become healthy, preventing all 4 frontend services from starting. The system cannot be spun up via Docker Compose.
- **Mitigation**:
  Option A (Recommended): Update healthcheck in `docker-compose.yml` to use Node's native `fetch` (available in Node 20):
  ```yaml
  healthcheck:
    test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
  ```
  Option B: Install `wget` in `apps/server/Dockerfile`:
  ```dockerfile
  RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
  ```

---

### [HIGH] Challenge 2: Incomplete Environment Documentation (`.env.example` vs Codebase & AGENTS.md)

- **Assumption challenged**: Copying `.env.example` to `.env` provides a complete, documented set of environment variables required to run CulinaryOS.
- **Attack Scenario**:
  - Developers or CI pipelines copying `.env.example` to `.env` will miss 14+ required or used environment variables.
  - Missing build args / env vars used in `docker-compose.yml`:
    - `VITE_POS_URL` (used in `pos-client` build args)
    - `VITE_KDS_URL` (used in `kds-client` build args)
    - `VITE_API_URL` (used in `pos-client`, `kds-client`, `admin-client`, `web-client` build args and source files: `Pantry.tsx`, `Station.tsx`, `CheckoutDrawer.tsx`, `useMenu.ts`)
  - Missing payment & auth keys used in source code:
    - `VITE_STRIPE_PUBLISHABLE_KEY` (`apps/pos/src/components/CheckoutDrawer.tsx`)
    - `STRIPE_SECRET_KEY` (`apps/server/src/routes/payments.ts`)
    - `SUPABASE_ANON_KEY` (`apps/server/src/routes/menu.ts`, `packages/db/src/index.ts`)
    - `PORT`, `SERVICE_NAME` (`apps/server/src/index.ts`, `apps/server/src/middleware/auth.ts`)
    - `CULINARYOS_HOST` (`apps/server/src/routes/orders.ts`)
    - `CULINARY_API_URL`, `CULINARY_API_KEY` (`cli/src/lib/api-client.ts`, `mcp/culinary-os-server.ts`)
    - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`mobile/lib/supabase.ts`)
  - Missing variables mandated by `AGENTS.md` (Project Rules):
    - `ANTHROPIC_API_KEY`
    - `RECIPEOS_MCP_URL`
    - `RECIPEOS_JWT_SECRET`
    - `KDS_WEBSOCKET_PORT`
    - `POS_WEBSOCKET_PORT`
    - `DATABASE_URL`
- **Blast Radius**: Runtime runtime crashes (e.g. `process.env.STRIPE_SECRET_KEY!` throwing undefined errors), unconfigured client API endpoints, or unauthenticated internal calls.
- **Mitigation**: Update `.env.example` and `.env` with default values / placeholders for all referenced variables.

---

### [MEDIUM] Challenge 3: Stale Legacy Dockerfiles in Root Directory

- **Assumption challenged**: Root Dockerfiles (`Dockerfile.backend`, `Dockerfile.kds`, `Dockerfile.pos`, `Dockerfile.recipeos`) are valid build scripts.
- **Attack Scenario**:
  - The root directory contains legacy Dockerfiles: `Dockerfile.backend`, `Dockerfile.kds`, `Dockerfile.pos`, `Dockerfile.recipeos`.
  - These legacy Dockerfiles reference non-existent paths (e.g., `backend/server.ts`, `kds/server/index.ts`) from prior pre-monorepo layouts, whereas active monorepo code lives in `apps/server/src/index.ts`, `apps/kds/src/index.html`, etc.
  - If a user runs `docker build -f Dockerfile.backend .`, the build fails immediately.
- **Blast Radius**: Confusion for developers and potential CI misconfigurations.
- **Mitigation**: Remove or deprecate legacy `Dockerfile.*` files at root level, keeping only `apps/*/Dockerfile`.

---

### [LOW] Challenge 4: Deprecated Compose Version Field

- **Assumption challenged**: `docker-compose.yml` follows modern Compose specification.
- **Attack Scenario**:
  - Line 8 uses `version: '3.9'`. Modern Docker Compose (v2) treats `version` as obsolete and displays warning output on invocation.
- **Blast Radius**: Minor warning log noise.
- **Mitigation**: Omit top-level `version` property per Docker Compose V2 spec recommendations.

---

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Pass/Fail |
|---|---|---|---|
| Parse `docker-compose.yml` structure & context paths | Valid syntax, context paths exist | Valid syntax, all 5 context/Dockerfile paths exist | **PASS** |
| Verify host port assignments in `docker-compose.yml` | No host port collisions (3000, 5172, 5173, 5174, 5176) | No host port collisions detected | **PASS** |
| Verify `apps/*/Dockerfile` build commands & `nginx.conf` | Filter names match `package.json`, `nginx.conf` exists | Filter names match (`@culinaryos/server`, `@culinaryos/app-pos`, etc.), `nginx.conf` files present | **PASS** |
| Verify container healthcheck execution | `backend` healthcheck binary present in image | `wget` missing in `node:20-slim`, healthcheck fails with exit 127 | **FAIL** |
| Verify `.env.example` completeness vs `docker-compose.yml` & codebase | All referenced env vars documented | 14+ variables referenced in code & compose missing from `.env.example` | **FAIL** |

---

## Verdict Summary

**Verdict**: **FAIL**  
The docker-compose setup fails empirical verification due to a broken healthcheck dependency chain (`wget` missing in `node:20-slim`) and incomplete environment variable documentation in `.env.example`.
