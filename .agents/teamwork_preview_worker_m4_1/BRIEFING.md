# BRIEFING — 2026-07-24T10:12:35Z

## Mission
Implement Milestone 4 (Plated Automatic Inventory & Post-Pilot Automated Loyalty Marketing).

## 🔒 My Identity
- Archetype: Worker / Implementer / QA / Specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m4_1
- Original parent: 69557e78-fbb2-4a0f-85bc-a21fc59f5367
- Milestone: Milestone 4

## 🔒 Key Constraints
- Minimal change principle.
- No dummy/facade implementations or hardcoding.
- RLS / multi-tenant scoping where appropriate.
- Verify typecheck and build pass cleanly (`npx pnpm@9 run typecheck`, `npx pnpm@9 run build`).

## Current Parent
- Conversation ID: 69557e78-fbb2-4a0f-85bc-a21fc59f5367
- Updated: 2026-07-24T10:12:35Z

## Task Summary
- **What to build**: Automatic inventory stock decrementing upon POS order completion via @culinaryos/ratio-engine scaling, low-stock warnings in Pantry.tsx, automated Post-Pilot marketing triggers upon guest visit/spend milestones calling send_marketing_postcard, verifying inventory-server.ts and post-pilot-server.ts.
- **Success criteria**: pnpm typecheck & build pass with 0 errors, correct implementation of inventory decrementing & marketing triggers, changes.md and handoff.md created, handoff sent to parent.
- **Interface contracts**: AGENTS.md, monorepo packages.

## Key Decisions Made
- Initializing BRIEFING.md and starting codebase exploration.

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending initial run
- **Pending issues**: None

## Quality Status
- **Build/test result**: Not run yet
- **Lint status**: Pending
- **Tests added/modified**: Pending

## Loaded Skills
- None loaded yet

## Artifact Index
- c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m4_1\ORIGINAL_REQUEST.md — Original request log
- c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m4_1\BRIEFING.md — Working memory state
