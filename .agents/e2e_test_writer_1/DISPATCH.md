## 2026-08-16T06:21:05Z
You are e2e_test_writer_1 for CulinaryOS E2E Testing Track.
Your working directory: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_test_writer_1

You MUST read before starting work:
- ORIGINAL_REQUEST.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\PROJECT.md
- TEST_INFRA.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\TEST_INFRA.md
- Survey Report: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_spec_miner_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Exclusive Write Ownership:
1. C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\tests\e2e\tier1-ratio-engine.test.ts
2. C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\tests\e2e\tier1-pos-kds-order.test.ts

Mission:
Write comprehensive Tier 1 test suites (>=5 test cases per feature) using native node:test or describe/it/expect runner compatible with scripts/run-all-tests.cjs and scripts/test-hook.cjs:
1. `tests/e2e/tier1-ratio-engine.test.ts`: Cover all 14 mathematical functions (scaleRecipeTree, flattenScaledTree, scaleByServings, calculateRatio, totalFormulaWeight, formatAmount, gramsToCups, cupsToGrams, computeRecipeCost, calculateCostVariance, summarizeWaste, calculateWastePercentage, generateShiftPrepPlan, projectBatchRequirement).
2. `tests/e2e/tier1-pos-kds-order.test.ts`: Cover POS order creation (dine-in/takeaway), line items (subtotal/tax), order fire idempotency, station ticket splitting (grill, cold, fry, bar), course holding (Course 1 fired vs Course 2+ held), manual course fire (/fire-course), ticket bump, aging alert thresholds (<5m green, 5-10m amber, >=10m red), station tab mapping (1 -> grill/hot, 2 -> cold, 3 -> fry, 4 -> bar), and allergy modifiers priority.

Requirements:
- Execute `node ./scripts/run-all-tests.cjs` using run_command to verify your tests run and pass cleanly.
- Document test counts and verification results in C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_test_writer_1\handoff.md.
- Send a completion message back when done.
