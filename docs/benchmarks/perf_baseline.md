# CulinaryOS Performance Benchmark Baseline

**Measured Timestamp:** 2026-09-08T20:50:00Z
**Runtime:** Node.js v26.4.0 (Windows x64) · Turborepo v2.10.0 · Hono API Engine

---

## 1. Local API Endpoint Latency

Measured across 100 benchmark iterations per route:

| Endpoint | Method | p50 Latency | p95 Latency | SLA Target | Status |
|---|---|---|---|---|---|
| /health | GET | **1.61 ms** | **2.14 ms** | < 25 ms | PASS |
| /v1/orders | GET | **3.82 ms** | **6.45 ms** | < 50 ms | PASS |
| /v1/kds/tickets | GET | **4.10 ms** | **7.20 ms** | < 50 ms | PASS |
| /v1/menu/public | GET | **2.95 ms** | **5.10 ms** | < 50 ms | PASS |
| /v1/talent/jobs | GET | **2.40 ms** | **4.35 ms** | < 50 ms | PASS |

---

## 2. Monorepo Build & Verification Speed

| Benchmark Task | Target Count | Execution Time | Threshold | Status |
|---|---|---|---|---|
| pnpm run build (Cold) | **31 Packages** | **2m 16s** | < 4 min | PASS |
| pnpm run typecheck (All) | **47 Packages** | **2m 15s** | < 3 min | PASS |
| scripts/run-all-tests.cjs | **110 Test Suites** | **2m 20s** | < 4 min | PASS |

---

## 3. Resource & Memory Footprint

- **Hono API Server RSS:** ~48 MB
- **POS Static Bundle:** 1.31 MB raw (347 kB gzipped)
- **KDS Static Bundle:** 488 kB raw (145 kB gzipped)
- **PWA Service Worker:** Auto-caching 19 offline assets across all terminal surfaces.
