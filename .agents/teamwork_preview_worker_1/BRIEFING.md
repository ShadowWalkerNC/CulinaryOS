# BRIEFING — 2026-07-25T10:45:24Z

## Mission
Primary Implementer & Verification Worker for CulinaryOS / KitchenKit features (R1-R5) and Monorepo Build & Test Verification.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_1
- Original parent: af4e08ac-1c55-45ed-9b6b-b7b9d6dcbb9a
- Milestone: CulinaryOS Multi-Module Design System, Binary Protocol, HTMX KDS, Offline Sync, Inventory & Loyalty Integration

## 🔒 Key Constraints
- Minimal change principle: only modify what is necessary.
- Genuine implementation mandatory: no hardcoding, dummy logic, or test bypasses.
- All workspace builds must pass (`npx pnpm@9 run build`).
- All tests must pass (`pnpm test` / `node ./scripts/run-all-tests.cjs`).

## Current Parent
- Conversation ID: af4e08ac-1c55-45ed-9b6b-b7b9d6dcbb9a
- Updated: 2026-07-25T10:45:24Z

## Task Summary
- **What to build**:
  1. R1: Update `packages/ui/src/CulinaryHeader.tsx` (add KitchenKit :5175) and mount in KitchenKit (`c:\Users\User\Documents\KitchenKit\apps\web\src\components\layout\Layout.tsx` or root layout). Ensure design system components mounted across apps.
  2. R2: Binary protocol tests in `tests/event-bus/binary-protocol.test.ts` (encode/decode + ~60% size reduction vs JSON). Offline sync tests in `tests/shared/offline-sync.test.ts` (`enqueueOfflineDelta`, `flushOfflineQueue`, UUIDv4 deltas).
  3. R3: HTMX Kiosk `GET /v1/kds/htmx-cards` returning micro-HTML fragments, with test in `tests/server/htmx-kds.test.ts`.
  4. R4: KDS station filters, 1s timers, age alert colors, course hold/fire, Expo pass in KDS/KitchenKit; verify `@culinaryos/ratio-engine`, `prep-engine`, `recipe-mcp`, `prep-mcp`.
  5. R5: Inventory deduction via recipe ratio scaling in `mcp/src/inventory-server.ts`, low-stock par level alerts on Admin Pantry (`apps/admin/src/pages/Pantry.tsx`), loyalty coupons (`SAVE15`/`SAVE20`) in `mcp/src/post-pilot-server.ts`.
  6. Build and test verification.
- **Success criteria**: All builds clean, all tests passing, clear handoff and changes report.
- **Interface contracts**: PROJECT.md / AGENTS.md

## Key Decisions Made
- Initializing briefing and task analysis.

## Change Tracker
- **Files modified**: None yet
- **Build status**: Not run yet
- **Pending issues**: None

## Quality Status
- **Build/test result**: TBD
- **Lint status**: TBD
- **Tests added/modified**: TBD

## Loaded Skills
- None explicitly requested via skill paths.

## Artifact Index
- `.agents/teamwork_preview_worker_1/ORIGINAL_REQUEST.md` — Original prompt requirements
- `.agents/teamwork_preview_worker_1/BRIEFING.md` — Agent briefing state
- `.agents/teamwork_preview_worker_1/progress.md` — Heartbeat and progress tracking
