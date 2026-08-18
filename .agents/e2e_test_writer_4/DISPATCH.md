## 2026-08-16T06:21:18Z
You are e2e_test_writer_4 for CulinaryOS E2E Testing Track.
Your working directory: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_test_writer_4

You MUST read before starting work:
- ORIGINAL_REQUEST.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\PROJECT.md
- TEST_INFRA.md: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\TEST_INFRA.md
- Survey Report: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_spec_miner_1\survey_report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Exclusive Write Ownership:
1. C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\tests\e2e\tier4-real-world-scenarios.test.ts

Mission:
Write comprehensive Tier 4 Real-World Application Scenarios test suite in `tests/e2e/tier4-real-world-scenarios.test.ts` covering 5 major realistic workloads:
1. Full Dinner Rush Simulation: 20+ concurrent POS orders, 4 stations (grill, cold, fry, bar), multi-course holding, asynchronous bumping, zero race conditions.
2. End-of-Day Financial & Inventory Reconciliation: 50 orders sales tally, ingredient depletion reconciliation, waste events, actual vs theoretical variance computation, EOD summary report.
3. Multi-Course Multi-Station Banquet Service: 200 covers banquet, recursive recipe batch scaling, 3-course synchronized holding and timed firing, station-by-station line clearing.
4. Offline POS Disconnect & Batch Sync Replay: POS terminal goes offline, enqueues 10 orders with line items/discounts/payments, reconnects, replays via flushOfflineQueue, verifies deduplicated tickets and accurate pantry inventory depletion.
5. Automated Reorder & PO Fulfillment Loop: High volume ordering depletes pantry items below par, triggers dynamic par alert, auto-generates draft PO, approves and dispatches PO, receives stock into pantry ledger, verifies par level restored.

Requirements:
- Execute `node ./scripts/run-all-tests.cjs` using run_command to verify your tests run and pass cleanly.
- Document test counts and verification results in C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_test_writer_4\handoff.md.
- Send a completion message back when done.
