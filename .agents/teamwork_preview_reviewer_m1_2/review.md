# Review Report — Milestone 1 Infrastructure & Docker Compose Review

> **Reviewer Agent:** `.agents/teamwork_preview_reviewer_m1_2`  
> **Reviewed Worker:** Worker 1 (`.agents/teamwork_preview_worker_m1_1`)  
> **Date:** 2026-07-24  
> **Verdict:** `REQUEST_CHANGES` (VETO)

---

## 1. Review Summary

Worker 1 has performed substantial, high-quality work to resolve workspace integrity and infrastructure gaps for Milestone 1. Specifically:
- Created the missing `@culinaryos/admin` package structure, manifest, Vite configuration, TypeScript declarations, and React application (`PantryPage`).
- Updated `pnpm-workspace.yaml` to register `cli` and `mobile`.
- Ensured all workspace applications (`admin`, `kds`, `pos`, `web`, `server`, `cli`) pass both `npx pnpm@9 run typecheck` (14/14 tasks) and `npx pnpm@9 run build` (10/10 tasks) with zero errors.
- Assigned unique non-conflicting host ports across all applications (`3000` Server, `5172` POS, `5173` KDS, `5174` Admin, `5176` Web).
- Propagated `VITE_API_URL` build args across all 4 frontend Dockerfiles and `docker-compose.yml`.

However, during adversarial stress-testing of `docker-compose.yml`, a **Major Infrastructure Defect** was identified: the `backend` service healthcheck relies on `wget`, but `apps/server/Dockerfile` uses `node:20-slim` which does not contain `wget`. Because all four frontend services (`pos-client`, `kds-client`, `admin-client`, `web-client`) use `depends_on: backend: condition: service_healthy`, `docker compose up` will fail to start the frontend containers due to an unresolvable healthcheck failure.

---

## 2. Findings

### [Major] Finding 1: Backend Healthcheck Mismatch (`wget` missing in `node:20-slim`)

- **What:** In `docker-compose.yml`, the `backend` service defines a healthcheck command:
  ```yaml
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
  ```
  However, `apps/server/Dockerfile` is built `FROM node:20-slim AS base`. Debian slim distributions do not include `wget` by default.
- **Where:** `docker-compose.yml` (lines 24–28) & `apps/server/Dockerfile` (line 1).
- **Why this is a problem:** When `docker compose up` runs, Docker executes `wget` inside the container, which fails with `executable file not found in $PATH`. Consequently, `backend` is permanently marked `unhealthy`. Since `pos-client`, `kds-client`, `admin-client`, and `web-client` all specify:
  ```yaml
  depends_on:
    backend:
      condition: service_healthy
  ```
  none of the client containers will ever start, rendering the containerized stack unusable.
- **Suggested Fix:** Update `docker-compose.yml` to use Node's native `fetch` for the healthcheck test, which requires no external binaries:
  ```yaml
  healthcheck:
    test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
    interval: 15s
    timeout: 5s
    retries: 3
  ```

---

### [Minor] Finding 2: Obsolete Root Dockerfiles (`Dockerfile.backend`, `Dockerfile.kds`, `Dockerfile.pos`)

- **What:** Root-level Dockerfiles (`Dockerfile.backend`, `Dockerfile.kds`, `Dockerfile.pos`, `Dockerfile.recipeos`) exist alongside the application-level Dockerfiles (`apps/*/Dockerfile`).
- **Where:** Monorepo root directory.
- **Why this is a problem:** `Dockerfile.backend` references a legacy Bun image (`oven/bun:1.1`), while `docker-compose.yml` uses `apps/server/Dockerfile` (Node 20). Leaving unmaintained root Dockerfiles creates ambiguity for developers building images outside of `docker-compose.yml`.
- **Suggested Fix:** Remove or archive obsolete root-level Dockerfiles or document their deprecation in `README.md`.

---

## 3. Verified Claims

| Claim by Worker 1 | Verification Method | Result | Rationale / Evidence |
|---|---|---|---|
| Workspace Typecheck passes across monorepo | `npx pnpm@9 run typecheck` | **PASS** | Executed independently. 14 successful tasks, 0 failures. |
| Monorepo Build passes cleanly | `npx pnpm@9 run build` | **PASS** | Executed independently. 10 successful tasks, `@culinaryos/admin` bundle created (`dist/assets/index-W0QgCvW8.js`). |
| `@culinaryos/admin` structure created | Code & build inspection | **PASS** | `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/pages/Pantry.tsx`, `src/vite-env.d.ts` exist and build cleanly. |
| No host port conflicts | Port mapping audit | **PASS** | `3000` (Server), `5172` (POS), `5173` (KDS), `5174` (Admin), `5176` (Web) are distinct across dev scripts, Vite configs, and `docker-compose.yml`. |
| `VITE_API_URL` build arg propagation | Dockerfile & compose audit | **PASS** | Present in all 4 client Dockerfiles (`apps/admin`, `apps/kds`, `apps/pos`, `apps/web`) and `docker-compose.yml`. |
| Integrity & Anti-Cheating Verification | Source & test audit | **PASS** | Real React/TS implementations with real Hono API endpoints. No hardcoded test stubs, mock facades, or fabricated outputs detected. |

---

## 4. Adversarial Attack Surface & Stress-Testing

1. **Host Port Collision Test:**
   - Evaluated ports `3000`, `5172`, `5173`, `5174`, `5176`.
   - Result: **PASS** — No host port collisions exist.

2. **LAN Networking (`VITE_API_URL` Injection) Test:**
   - Evaluated build args when building docker containers on a LAN IP host (e.g. `VITE_API_URL=http://192.168.1.100:3000`).
   - Result: **PASS** — Build args `VITE_API_URL` are defined in `docker-compose.yml` and declared as `ARG` + `ENV` in all 4 frontend Dockerfiles before `vite build`.

3. **Container Healthcheck & Startup Dependency Test:**
   - Evaluated `docker compose up` execution path with `backend` healthcheck.
   - Result: **FAIL** — `node:20-slim` lacks `wget`, causing healthcheck execution failure and blocking dependent frontend containers (`condition: service_healthy`).

---

## 5. Verdict Rationale

**Verdict**: `REQUEST_CHANGES` (VETO)

Worker 1's implementation of `@culinaryos/admin`, `pnpm-workspace.yaml` updates, build scripts, typecheck rules, and `VITE_API_URL` build arg propagation is well-architected, complete, and verified. However, because the backend healthcheck in `docker-compose.yml` uses a binary (`wget`) not present in `apps/server/Dockerfile` (`node:20-slim`), `docker compose up` will fail healthchecks and refuse to start client containers. Fixing the healthcheck command to use Node's native `fetch` will allow immediate approval.
