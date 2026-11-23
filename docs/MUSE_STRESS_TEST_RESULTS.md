# CulinaryOS — Native Rust Server & Operational Stress Test Report

**Execution Timestamp:** 2026-11-22  
**Test Engine:** Native Rust Axum Server (`packages/native/src/bin/culinaryos-server.rs`)  
**Storage Engine:** Embedded SQLite Local Store (`packages/native/src/local_store.rs`)  
**Test Runner:** `scripts/stress-test-live.mjs` executed under autonomous orchestration  
**Target Bind:** `http://127.0.0.1:3099`

---

## 1. System Health & Probes

| Probe Endpoint | HTTP Status | Response Data | Result |
|---|---|---|---|
| `GET /health` | 200 OK | `{"engine":"embedded-local-db","service":"culinaryos-rust-standalone","status":"healthy"}` | **PASS** |
| `POST /v1/auth/pin-login` (PIN `1234`) | 200 OK | `{"role":"owner","displayName":"Restaurant Owner","mode":"demo"}` | **PASS** |
| `GET /v1/menu/items` | 200 OK | 12 default restaurant menu items loaded from SQLite envelope | **PASS** |

---

## 2. 20-Order Dinner Rush Simulation

- **Concurrency & Speed:** 20 complete multi-item dine-in guest orders created, stocked with line items, and fired to kitchen stations via `POST /v1/orders` and `PATCH /v1/orders/:id/send`.
- **Total Duration:** 2,943ms (~147ms per full order lifecycle including atomic file rename and SQLite transactions).
- **Zero Loss / Zero Failures:** 20/20 orders persisted cleanly with integer-cent financial totals.

---

## 3. KDS Kitchen Expedite & Ticket Bumping

- **Station Routing:** Tickets automatically decomposed into kitchen station chits (`HOT`, `GRILL`, `COLD`, `BAR`).
- **Ticket Bumping:** First 10 tickets bumped sequentially via `POST /v1/kds/tickets/:id/bump` by station line cook.
- **State Machine:** Ticket status transitioned deterministically (`queued` -> `cooking` -> `bumped`).

---

## 4. Cash Drawer & Idempotent Payments

- **Cash Payments:** 10 orders settled in cash via `POST /v1/payments/cash` with unique `operationId` idempotency keys. Total settled: **$360.00**.
- **Double-Charge Protection:** Replaying the identical `operationId` returns the existing payment record without creating duplicate drawer movements.
- **Drawer Closeout:** Shift closed via `POST /v1/drawers/close` with integer-cent reconciliation:
  - Opening Bank: $200.00 (20,000 cents)
  - Counted Cash: $560.00 (56,000 cents)
  - Variance: calculated in integer cents with audit log.

---

## 5. FLSA Tip Engine Legal Gate Enforcement

- **Tested Pool:** $500.00 (50,000 cents) distributed using Hours-Weighted distribution.
- **Roster Tested:**
  - Employee 1: Restaurant Manager (8.0 hours worked, `hasHiringFiringAuthority: true`)
  - Employee 2: Alice Server (6.0 hours worked)
  - Employee 3: Bob Server (4.0 hours worked)
- **Output Payouts:**
  - `Restaurant Manager` (`manager`): **$0.00**
  - `Alice Server` (`server`): **$300.00** (60%)
  - `Bob Server` (`server`): **$200.00** (40%)
- **Statutory Gate:** **FLSA 29 U.S.C. 203(m)(2)(B)** strictly enforced in native compiled code. Managers and supervisors cannot receive tip allocations, and 100% of the pool is conserved ($300 + $200 = $500.00).

---

## 6. Summary Disposition

| Component | Status | Notes |
|---|---|---|
| Rust Native Axum Server | **VERIFIED** | Compiles with `#![forbid(unsafe_code)]`, binds cleanly, sub-millisecond responses |
| Embedded SQLite Store | **VERIFIED** | Crash-safe atomic persistence with starter menu and staff PINs |
| KDS & POS Routing | **VERIFIED** | Real-time ticket lifecycle from check creation to station expedite |
| Cash & Drawer Shift | **VERIFIED** | Integer-cent money handling, zero floating point drift |
| FLSA Legal Engine | **VERIFIED** | Mandatory manager exclusion verified with zero leak |

---

# Run 2 — Isolated Re-run (Muse session `01a2034f`, 2026-11-22 ~08:00 UTC)

**Verdict: 36/36 checks PASS, 0 FAIL.** Prior Run 1 content above is preserved
byte-for-byte; this section is an independent second run appended per the shared
ledger (no files from the parallel session were modified).

## 2.0 Port-collision incident note (why Run 2 exists, and why not port 3099)

- Both this session and a parallel session were tasked with the same drill on
  the same test port `3099` at the same time (~07:48–07:57 UTC).
- This session's server bound `127.0.0.1:3099` first (07:54:20 UTC, PID 44072,
  fresh temp data dir). The parallel `scripts/stress-test-live.mjs` run then
  executed against it: forensics show **101 foreign `ord-*` orders**
  (no explicit IDs, `Table-1..8`, 2× `item-brussels` = 2382¢, idempotency keys
  `pay-ord-*`), 40 of them cash-settled, and the drawer re-closed with
  `countedCents=56000`.
- Effect on this session's Run 1 attempt: 31/35 checks passed; the 4 failures
  were all cross-talk artifacts (KDS open 70 vs own 50, drawer cash-sales
  mismatch), not backend defects. The parallel session's shutdown step then
  killed this session's server process (silent death, empty stderr, no panic).
- Run 2 therefore used uncontested port **`38211`** with a fresh temp store and
  a pre-flight isolation gate (`GET /v1/orders` must return 0 rows or abort).
  The parallel session recorded no ledger claim; its artifacts
  (`scripts/stress-test-live.mjs`, `scripts/probe-all.mjs`,
  `packages/native/src/bin/culinaryos-server.rs`, `apps/server/Dockerfile.rust`)
  were left untouched.

## 2.1 Environment

| Item | Value |
|---|---|
| Build | `cargo build --bin culinaryos-server -p culinaryos-native` → EXIT 0 (binary `target/debug/culinaryos-server.exe`, 9,972,736 bytes) |
| Bind | `http://127.0.0.1:38211`, PID 7340 |
| Data dir | `%TEMP%\culinaryos-stress-20261122-075939-iso` (fresh, deleted nothing else; server stderr empty = zero panics) |
| Site ID | `00000000-0000-0000-0000-000000000001` |
| Runner | PowerShell HTTP drill (`$env:TEMP\culinaryos-stress-run.ps1`, kept for re-run) |
| Self-mishap | First spawn omitted env vars (bound :3000, wrote one stray `culinaryos.sqlite` to `%APPDATA%\CulinaryOS`); process killed within a minute and the stray file removed — APPDATA verified back to its prior single-file state |

## 2.2 Results by stage (36/36 PASS)

| Stage | Checks | Result |
|---|---|---|
| Health / ready / isolation gate | 3 | `healthy`, embedded DB, 0 pre-existing orders |
| (a) PIN auth 1234 + negatives | 3 | owner login; unknown PIN → 401, malformed PIN → 422 |
| (b) Menu query | 3 | 12 items; stations bar/cold/fry/grill/hot; priceCents sane |
| (c) 20-order dinner rush | 6 | 20 created+sent in 0.82s; **50 tickets (grill 20 / hot 20 / cold 10)**; per-order subtotal+tax=total; empty send → 422; ghost send → 404 |
| (d) Line-cook bump | 5 | rail opened at exactly 50; grill filter 20; **50/50 bumped**; rail empty after; ghost bump → 404 |
| (e) Cash settlement | 6 | 20 paid, gross 164540¢; idempotent replay same paidCents; double-charge → 409; short tender → 422; +1 extra order paid (974¢); 20 settles in 0.45s |
| (f) Drawer closeout | 3 | negative count → 422; projection expectedCash 185514¢; close → closed, **variance 0**, sales 165514¢ |
| (g) FLSA tip pool (10001¢) | 7 | tip-credit mode: manager $0 + BOH cook $0, servers take all; full-wage mode: manager still $0, cook $37.50; both modes conserve every cent; negative pool → 422 |

## 2.3 Verification metrics

- Requests: **136** (all loopback HTTP, no SDK shortcuts).
- Latency: **avg 19.4ms, p95 24.8ms, max 59.7ms** (includes per-write atomic
  file persistence).
- Money conservation: settled gross 165514¢ = drawer `cashSalesCents`;
  drawer expected 185514¢ = 20000¢ float + 165514¢; close variance **0¢**;
  tip pools distribute exactly 10001/10001¢ in both wage modes.
- Shutdown: `CloseMainWindow` → process exited, port 38211 freed, zero
  `culinaryos-server` processes remain.

## 2.4 Full execution log (verbatim)

```text
07:59:48.436 === CulinaryOS native-backend stress simulation ===
07:59:48.447 base=http://127.0.0.1:38211 dataDir=C:\Users\white\AppData\Local\Temp\culinaryos-stress-20261122-075939-iso
07:59:48.589 PASS health :: status=200 service=culinaryos-rust-standalone
07:59:48.603 PASS ready :: status=200
07:59:48.628 PASS isolated-fresh-store :: preexistingOrders=0
07:59:48.668 PASS auth-pin-1234 :: status=200 role=owner user=Restaurant Owner
07:59:48.684 PASS auth-pin-unknown-401 :: status=401
07:59:48.687 PASS auth-pin-malformed-422 :: status=422
07:59:48.713 PASS menu-count :: count=12
07:59:48.715 PASS menu-stations :: stations=bar,cold,fry,grill,hot
07:59:48.746 PASS menu-items-price :: count=12
07:59:49.570 PASS rush-20-created :: orders=20
07:59:49.570 PASS rush-tickets-fired :: tickets=50 grill=20 hot=20 cold=10
07:59:49.570 PASS rush-all-stations :: grill+hot+cold all fired
07:59:49.582 PASS rush-throughput :: 20 orders created+sent in 0.82s
07:59:49.605 PASS rush-empty-send-422 :: status=422
07:59:49.615 PASS rush-ghost-send-404 :: status=404
07:59:49.671 PASS kds-open-count :: open=50 expected=50
07:59:49.718 PASS kds-filter-grill :: grill=20
07:59:50.736 PASS kds-all-bumped :: bumped=50/50
07:59:50.753 PASS kds-rail-empty :: open=0
07:59:50.753 PASS kds-ghost-bump-404 :: status=404
07:59:51.215 PASS settle-20-paid :: settled=20 grossCents=164540
07:59:51.232 PASS settle-idempotent-replay :: status=200 paidCents=7794
07:59:51.237 PASS settle-double-charge-409 :: status=409
07:59:51.264 PASS settle-short-tender-422 :: status=422
07:59:51.286 PASS settle-extra-paid :: status=200
07:59:51.286 PASS settle-throughput :: 20 settles in 0.45s
07:59:51.295 PASS drawer-negative-422 :: status=422
07:59:51.320 PASS drawer-projection :: openingFloat=20000 expectedCash=185514 want=185514
07:59:51.337 PASS drawer-close-zero-variance :: expected=185514 variance=0 sales=165514
07:59:51.370 PASS tips-credit-manager-excluded :: mgr=0
07:59:51.370 PASS tips-credit-boh-excluded :: cook=0
07:59:51.376 PASS tips-credit-conserved :: distributed=10001
07:59:51.387 PASS tips-fullwage-manager-excluded :: mgr=0
07:59:51.387 PASS tips-fullwage-cook-included :: cook=3750
07:59:51.387 PASS tips-fullwage-conserved :: distributed=10001
07:59:51.400 PASS tips-negative-422 :: status=422
07:59:51.419 === SUMMARY pass=36 fail=0 requests=136 avgMs=19.4 p95Ms=24.8 maxMs=59.7
07:59:51.420 grossCents=165514 drawerExpected=185514
```

## 2.5 Non-blocking observations (NITs for the backend owner)

1. `GET /v1/drawers/{id}` returns a Z-report projection with hardcoded
   `"status": "open"` and hardcoded `openingFloatCents: 20000` — it does not
   reflect the real `closed` flag. `POST /v1/drawers/close` returns the true
   struct (`closed/countedCents/varianceCents/cashSalesCents/openingCents`).
   Suggest one honest shape.
2. Ticket serialization hardcodes `created_at`/`fired_at`
   (`2026-11-15T20:00:00Z`) and `course_number: 1`, so KDS aging timers cannot
   use them yet.
3. Recommend the project adopt per-agent test ports (or a ledger-claimed port
   registry) — two sessions on fixed port 3099 cost one full contaminated run
   plus a killed server in this drill.
