# E2E Test Infra: CulinaryOS

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Tests are derived strictly from `ORIGINAL_REQUEST.md` and `PROJECT.md § Feature Inventory` user requirements, exercising the system via public APIs, domain engine interfaces, and simulated user interactions.
- **Methodology**: Category-Partition (Tier 1 Equivalence Classes) + Boundary Value Analysis (Tier 2 Extrema) + Pairwise Combinatorial Testing (Tier 3 Cross-Feature Interactions) + Real-World Workload Simulation (Tier 4 Realistic Operations).
- **Zero Flakiness**: All async operations use deterministic mock storage or in-memory API stores where live Supabase is absent.

---

## Feature Inventory & Test Matrix

| # | Feature Domain | Tier 1 (Happy Path) | Tier 2 (Boundary & Corner) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|----------------|:-------------------:|:--------------------------:|:----------------------:|:-------------------:|
| F1 | Pure Ratio Engine (Tree scaling, portions, baker %, conversions, formatting) | ≥5 tests | ≥5 tests | Pairwise | Dinner Rush / Banquet |
| F2 | Recipe Food Costing, Variances, & Waste Analysis | ≥5 tests | ≥5 tests | Pairwise | EOD Reconciliation |
| F3 | Mise en Place & Shift Prep Planning | ≥5 tests | ≥5 tests | Pairwise | Banquet Service |
| F4 | Terminal PIN Authentication & Access Control | ≥5 tests | ≥5 tests | Pairwise | Dinner Rush |
| F5 | POS Order Firing & Multi-Course Routing | ≥5 tests | ≥5 tests | Pairwise | Dinner Rush / Banquet |
| F6 | Closed-Loop Inventory Deduction & Par Alerts | ≥5 tests | ≥5 tests | Pairwise | EOD / PO Loop |
| F7 | Automated Purchase Orders & Receiving Lifecycle | ≥5 tests | ≥5 tests | Pairwise | PO Fulfillment Loop |
| F8 | Operational Waste, Plate Economics & Loyalty APIs | ≥5 tests | ≥5 tests | Pairwise | EOD Reconciliation |
| F9 | Offline LocalStorage Sync & Transaction Replay | ≥5 tests | ≥5 tests | Pairwise | Offline Replay |
| F10| MCP Tool Suite (Live & Mock Tool Handlers) | ≥5 tests | ≥5 tests | Pairwise | Multi-surface Ops |

---

## Test Architecture

- **Runner**: `node ./scripts/run-all-tests.cjs`
- **Execution Engine**: `tsx` with custom `test-hook.cjs` assertion environment.
- **Test File Organization**:
  - `tests/e2e/tier1-ratio-engine.test.ts`
  - `tests/e2e/tier1-pos-kds-order.test.ts`
  - `tests/e2e/tier1-inventory-pantry.test.ts`
  - `tests/e2e/tier1-ops-loyalty-mcp.test.ts`
  - `tests/e2e/tier2-boundaries-corner-cases.test.ts`
  - `tests/e2e/tier3-cross-feature-combinations.test.ts`
  - `tests/e2e/tier4-real-world-scenarios.test.ts`

---

## Real-World Application Scenarios (Tier 4)

| # | Scenario | Features Exercised | Target Metric |
|---|----------|--------------------|---------------|
| 1 | Full Dinner Rush Simulation | F4, F5, F6, F1, F8 | 20+ concurrent tickets, 100% station routing, 0 race conditions |
| 2 | End-of-Day Financial & Inventory Reconciliation | F2, F6, F7, F8 | Accurate theoretical vs actual variance, waste ledger reconciliation |
| 3 | Multi-Course Multi-Station Banquet Service | F1, F3, F5, F6 | Recursive batch scaling, 3-course synchronized holding/firing |
| 4 | Offline POS Disconnect & Batch Sync Replay | F4, F5, F9, F6 | Zero duplicate orders, full ledger deduplication on replay |
| 5 | Automated Reorder & PO Receiving Fulfillment | F6, F7, F8 | Stock drop -> Par alert -> Auto-generate PO -> Receive stock -> Par restored |

---

## Minimum Thresholds & Pass Criteria
- **Tier 1 (Feature Coverage)**: ≥40 test cases (≥5 per core feature domain).
- **Tier 2 (Boundary & Corner)**: ≥40 test cases (empty strings, zero prices, negative values, NaN, overflow, inverted ranges).
- **Tier 3 (Cross-Feature Combinations)**: ≥15 pairwise test cases validating complete multi-step event chains.
- **Tier 4 (Real-World Scenarios)**: ≥5 comprehensive multi-module end-to-end integration scenarios.
- **Total Test Count**: ≥100 rigorous test cases across `tests/e2e/`.
- **Exit Criteria**: `node ./scripts/run-all-tests.cjs` exits with code 0 with all legacy (29) + all new E2E tests passing.
