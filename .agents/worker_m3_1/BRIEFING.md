# BRIEFING — 2026-08-15T21:26:30Z

## Mission
Modernize Admin portal (`apps/admin`) with `@culinaryos/ui` design system components and Tailwind CSS, optionally establish shared Tailwind preset in `packages/ui`, and ensure POS alignment and full workspace typecheck/build clean passes.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\worker_m3_1
- Original parent: 08684e4e-f6b9-47ef-a543-8f435ce4fd4f
- Milestone: Milestone 3 (UI Design Tokens & Admin Portal Modernization)

## 🔒 Key Constraints
- Exclusively owns: `apps/admin/*`, `packages/ui/*`, and styling files in `apps/pos/src/*`.
- Do NOT touch `apps/server/*`, `supabase/*`, or other backend packages.
- Integrity mandate: No dummy implementations, real state and UI logic only.
- Must verify via full workspace `typecheck` and `turbo run build`.

## Current Parent
- Conversation ID: 08684e4e-f6b9-47ef-a543-8f435ce4fd4f
- Updated: not yet

## Task Summary
- **What to build**: 
  1. Shared tailwind preset in `packages/ui` (exporting standard `--cos-*` tokens & theme).
  2. Tailwind setup in `apps/admin` (postcss.config.js, tailwind.config.js, index.css, package.json dependencies).
  3. Modernize `apps/admin/src/pages/Menu.tsx` & `Staff.tsx` using `CulinaryHeader`, `CulinaryCard`, `CulinaryBadge`, `CulinaryButton`, and clean sub-nav.
  4. Align `apps/admin/src/main.tsx` (Pantry / Menu / Staff shared layout / navigation).
  5. Check `apps/pos/tailwind.config.js` token alignment.
  6. Typecheck & turbo build across all packages.
- **Success criteria**: Zero typecheck errors across all 18 workspace targets, zero build errors, genuine styled UI components.
- **Interface contracts**: `PROJECT.md`, `SCOPE.md`, `packages/ui/src/index.ts`.
- **Code layout**: `apps/admin/`, `packages/ui/`, `apps/pos/`.

## Key Decisions Made
- [TBD]

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Pending
- **Tests added/modified**: Pending

## Loaded Skills
- None loaded yet

## Artifact Index
- `.agents/worker_m3_1/DISPATCH.md` — Assignment log
- `.agents/worker_m3_1/BRIEFING.md` — Agent state & memory
