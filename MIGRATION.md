# CulinaryOS Monorepo Migration & Repository Lifecycle Guide

> **Document Version:** 1.0.0
> **Audience:** Core Engineers, Architects, and AI Pair Programmers

---

## 1. Migration Overview

The CulinaryOS project is consolidating fragmented restaurant tools into a single, high-density monorepo. This guide governs how external repositories are absorbed and phased out.

### The 6 Canonical Consolidation Tracks

```text
1. KitchenKit    ──▶ CulinaryOS Prep         (apps/prep & packages/prep)
2. RecipeOS      ──▶ CulinaryOS Prep         (merged into recipe vault & packages/recipes)
3. CulinaryOps   ──▶ CulinaryOS Ops          (apps/ops & packages/ops)
4. Post-Pilot    ──▶ CulinaryOS Marketing    (apps/marketing & services/marketing-python)
5. Plated        ──▶ CulinaryOS Web          (apps/web & packages/template-engine)
6. RestRevive    ──▶ CulinaryOS Intelligence (intelligence/ & packages/intelligence)
```

---

## 2. Six-Step Repository Lifecycle

External repositories must NEVER be deleted immediately. Every absorbed project follows a rigorous 6-step lifecycle:

```text
[1. AUDIT] ──▶ [2. DOCUMENT] ──▶ [3. MIGRATE] ──▶ [4. VERIFY] ──▶ [5. DEPRECATE] ──▶ [6. ARCHIVE]
```

### Step 1: Audit
- Inspect the source repository for unique production logic, algorithms, UI patterns, schemas, tests, and documentation.
- Identify duplicate or abandoned experiments.
- Record dependencies, framework versions, and external API integrations.

### Step 2: Document
- Add an entry into [`docs/MIGRATION_MATRIX.md`](file:///c:/Users/white/Documents/GitHub/CulinaryOS/docs/MIGRATION_MATRIX.md).
- Define target package names, application paths, and migration risks.

### Step 3: Migrate
- Port code into the target CulinaryOS package or application folder.
- Namespace all packages under `@culinaryos/*`.
- Convert UI components to use `@culinaryos/ui` design tokens (OKLCH color space, 6-state buttons, 48px touch targets).
- Replace hardcoded secrets with environment variable configurations from `.env.example`.

### Step 4: Verify
- Run static typechecks: `pnpm --filter <target> typecheck`.
- Run unit test suites: `node -r ./scripts/test-hook.cjs --import tsx tests/<domain>/*.test.ts`.
- Run production build: `pnpm --filter <target> build`.
- Verify zero regression on existing core services (POS, KDS, Admin, Server).

### Step 5: Deprecate
- Update the source repository's `README.md` with the official Deprecation Notice:
  ```markdown
  > ⚠️ **NOTICE: This project has been consolidated into CulinaryOS.**
  > Active development continues in the primary repository:
  > 👉 [ShadowWalkerNC/CulinaryOS](https://github.com/ShadowWalkerNC/CulinaryOS)
  > This repository is now READ-ONLY.
  ```
- Change the repository status on GitHub to **Read-Only / Archived**.

### Step 6: Archive
- Retain the source repository in read-only state for at least 30 days after verified production deployment.
- Maintain git tags and releases for historical auditability.

---

## 3. Explicit Non-Absorption Boundaries

### ShorelineOps
- **NEVER ABSORB.** ShorelineOps is an independent healthcare & clinical dining operations vertical with separate HIPAA constraints.
- Integrates with CulinaryOS exclusively through the `@culinaryos/sdk`, public REST API, and domain events.

### MuseLab
- **NEVER ABSORB.** Experimental Meta Muse SDK, AI glasses, and XR device prototypes remain isolated in MuseLab.
- Only battle-tested, stable, production-ready interfaces are ported into CulinaryOS.

### ForgeSatchel & JOSH
- **DECOUPLED INFRASTRUCTURE.** ForgeSatchel provides developer tooling; JOSH provides fast System 1 classification.
- CulinaryOS connects via standardized adapters without embedding developer framework dependencies.
