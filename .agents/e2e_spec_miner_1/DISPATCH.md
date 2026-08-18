## 2026-08-16T01:20:29Z
You are e2e_spec_miner_1 for the CulinaryOS E2E Testing Track.
Your working directory: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_spec_miner_1
You MUST read:
- ORIGINAL_REQUEST.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\PROJECT.md
- TEST_INFRA.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\TEST_INFRA.md

Mission:
Survey the codebase for Tier 1 Feature Coverage (>=5 per feature) on core domains:
1. Pure Ratio Engine (packages/ratio-engine/src/index.ts: scaleRecipeTree, flattenScaledTree, scaleByServings, calculateRatio, totalFormulaWeight, formatAmount, gramsToCups, cupsToGrams, computeRecipeCost, calculateCostVariance, summarizeWaste, calculateWastePercentage, generateShiftPrepPlan, projectBatchRequirement).
2. POS Order Firing & Station Routing (apps/server, packages/shared/src/stations.ts, packages/shared/src/course-engine.ts, apps/kds).
3. Terminal PIN Authentication (apps/server/src/routes/auth.ts, packages/auth).
4. Offline LocalStorage Sync Queue (packages/shared/src/offline-sync.ts).

Examine the public exports, function signatures, data contracts, and how tests are written in tests/server/ and packages/ratio-engine/src/index.test.ts.
Write your comprehensive survey report with test blueprints to:
C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_spec_miner_1\survey_report.md
and write a self-contained handoff to:
C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_spec_miner_1\handoff.md
Send a completion message back when done.
