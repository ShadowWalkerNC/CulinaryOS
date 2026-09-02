# E2E Test Infra: CulinaryOS

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation internals.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.
- 4-Tier Test Architecture exercising all 26 feature definitions (F1.1 through F4.5).

## Feature Inventory & Coverage Mapping
| # | Feature | Source | Tier 1 (>=5) | Tier 2 (>=5) | Tier 3 (Pairwise) |
|---|---------|--------|:------------:|:------------:|:-----------------:|
| F1.1 | Hierarchical Modifiers | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| F1.2 | 2D/3D Floor Map Operations | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| F1.3 | Daypart / Happy Hour Pricing | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| F1.4 | 3-Mode Tableside QR | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| F2.1 | Live 86 Countdowns | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| F2.2 | Multi-Course Hold/Fire Pacing | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| F2.3 | Per-Station Dual Translation | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| F2.4 | 1-Click Waste & Food Cost Variance | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| F2.5 | Batch Prep Scaling & Labels | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| F3.1 | Manager PIN Gatekeeper | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| F3.2 | Post-Send Void Auto-Waste | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| F3.3 | Multi-Rate Tax Engine | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| F3.4 | Role-Weighted Tip Pooling | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| F3.5 | Automated EOD Z-Report | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| F4.1 | Turnkey Windows Installer | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F4.2 | System Tray Background Daemon | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F4.3 | Automated Diagnostics Preflight | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F4.4 | Port Conflict Self-Healing | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| F4.5 | Local QR & mDNS Discovery | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Node test runner integrated into `scripts/run-all-tests.cjs` and `turbo.json`.
- **Pass/Fail Semantics**: Deterministic exit code 0 on all test passes; non-zero on assertion failure.
- **Directory Layout**:
  - `tests/e2e/tier1-features/`: Granular unit and functional tests per feature (>=5 per feature).
  - `tests/e2e/tier2-boundaries/`: Corner cases, zero counts, negative quantities, boundary timestamps, deep nesting limits.
  - `tests/e2e/tier3-pairwise/`: Cross-feature interaction (e.g., Happy Hour Pricing + Hierarchical Modifiers + 86 Decrement + Multi-Rate Tax).
  - `tests/e2e/tier4-scenarios/`: End-to-end full service lifecycle workloads.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | High-Volume Saturday Night Dinner Rush | F1.1, F1.2, F2.1, F2.2, F2.3, F3.1 | High |
| 2 | Happy Hour Shift Transition & Tableside QR Ordering | F1.3, F1.4, F2.1, F3.3 | High |
| 3 | Large Banquet Table Merge, Split Bill & Manager Comps | F1.2, F3.1, F3.2, F3.3, F3.4 | High |
| 4 | Morning Prep Batch Scaling, Adhesive Label Printing & Waste Tracking | F2.4, F2.5, F3.2 | Medium |
| 5 | End-of-Day Shift Closeout, Cash Reconciliation, Tip Distribution & Z-Report | F3.3, F3.4, F3.5 | High |
| 6 | Zero-Tech Storefront Deployment, Tray Supervision & LAN Handheld Pairing | F4.1, F4.2, F4.3, F4.4, F4.5 | Medium |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: 19 features × 5 = 95 test assertions minimum.
- **Tier 2 (Boundary & Corner Cases)**: 19 features × 5 = 95 test assertions minimum.
- **Tier 3 (Cross-Feature Combinations)**: 19 pairwise interaction scenarios minimum.
- **Tier 4 (Real-World Workloads)**: 6 comprehensive end-to-end workflow suites.
- **Total Suite**: 215+ discrete assertions covering 100% of R1-R4 requirements.
