## 2026-08-16T01:20:29Z
You are e2e_spec_miner_3 for the CulinaryOS E2E Testing Track.
Your working directory: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_spec_miner_3
You MUST read:
- ORIGINAL_REQUEST.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\PROJECT.md
- TEST_INFRA.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\TEST_INFRA.md
- Test Runner: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\scripts\run-all-tests.cjs and C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\scripts\test-hook.cjs

Mission:
Survey the codebase for:
1. Tier 3 Cross-Feature Combinations (Pairwise workflows across the whole monorepo):
   - Order Fire -> Recipe Deduction -> Par Alert -> Draft PO -> Receiving.
   - Multi-course Holding -> Course Fire -> Station Routing -> Bump -> Order Ready.
   - Food Waste Logging -> Waste Summary -> Variance Spike Alert -> Plate Economics Re-calculation.
   - Offline POS Order Queueing -> Reconnect Replay -> Deduplicated Fire & Inventory Decrement.
2. Tier 4 Real-World Application Scenarios:
   - Full Dinner Rush Simulation (concurrent high volume orders across grill, cold, fry, bar).
   - End-of-Day Financial & Inventory Reconciliation.
   - Multi-Course Multi-Station Banquet Service.
   - Automated Reorder & PO Receiving Fulfillment Loop.
3. Runner architecture requirements so that all test files in tests/e2e/ run seamlessly via `node ./scripts/run-all-tests.cjs`.

Write your comprehensive survey report with test blueprints to:
C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_spec_miner_3\survey_report.md
and write a self-contained handoff to:
C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_spec_miner_3\handoff.md
Send a completion message back when done.
