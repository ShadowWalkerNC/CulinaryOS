## 2026-08-16T01:24:22Z

You are the Worker for Milestone 1 (M1: Ratio Engine Consolidation & Database Types).
Working Directory: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\sub_orch_m1_worker_1
Scope Document: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\sub_orch_m1\SCOPE.md
Project Plan: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\PROJECT.md
Original Request: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\ORIGINAL_REQUEST.md

Explorer Reports:
- Explorer 1 (Ratio Engine): C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\sub_orch_m1_explorer_1\handoff.md and analysis.md
- Explorer 2 (Database Schema V1-V14): C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\sub_orch_m1_explorer_2\handoff.md and analysis.md
- Explorer 3 (Cross-package Ops Math): C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\sub_orch_m1_explorer_3\handoff.md and analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Implement `packages/ratio-engine/src/index.ts` with all 14 canonical interface contracts from SCOPE.md and preserve the 5 legacy exports (`scaleBlueprint`, `computeCost`, `fromTotalWeight`, `RatioBlueprint`, `RatioBlueprintIngredient`) as documented in Explorer 1's and Explorer 3's handoff.
2. Implement `packages/ratio-engine/src/index.test.ts` with comprehensive unit tests for all 14 functions and legacy behavior, edge cases (zero/negative yield, rounding, density conversions, variance calculation, prep scheduling, batch projections).
3. Implement `packages/db/src/types.ts` with the complete Supabase database schema matching migrations V1–V14 as specified in Explorer 2's handoff.
4. Verify your changes:
   - Run `pnpm run typecheck` (or `npx tsc --noEmit` across packages) and ensure 0 errors.
   - Run `node ./scripts/run-all-tests.cjs` (or `bun test` if available) and verify unit tests pass.
5. Write your summary and verification output to `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\sub_orch_m1_worker_1\handoff.md` and send a completion message to your parent.
