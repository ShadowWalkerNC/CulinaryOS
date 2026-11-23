# Muse Real-User Simulation Results — CulinaryOS Native Server

**Date:** 2026-11-22
**Binary:** `target/release/culinaryos-server.exe` (5,537,280 bytes, built 2026-11-22 08:26)
**Base URL:** `http://127.0.0.1:38222`
**Data dir (isolated):** `%TEMP%\culinaryos-sim-38222\culinaryos.sqlite` (fresh first-run DB, production `%APPDATA%\CulinaryOS` untouched)
**Launch:** `$env:PORT='38222'; $env:CULINARYOS_DATA_DIR="$env:TEMP\culinaryos-sim-38222"; ./target/release/culinaryos-server.exe`
**Method:** live HTTP as a real user (setup → login → order → fire → bump → pay → closeout → reports). No mocks.
**Result: 30/30 checks PASS** (25 scripted + 5 follow-up proofs). Zero panics, zero 500s.

## 1. First-run setup (real-user onboarding)

| Check | Result |
|---|---|
| `GET /health` | `status=healthy, service=culinaryos-rust-standalone, engine=embedded-local-db` |
| `GET /v1/setup/status` before | `setupCompleted=false`, 12 menu items, 16 tables, tax 825 bps |
| `POST /v1/setup/complete` (Muse Sim Diner, Raleigh NC, owner PIN `4321`, sample data) | `ok=true`, owner renamed to "Sim Owner" |
| Sample seed | 2 seed orders fired to kitchen automatically (`ord-seed-101`, `ord-seed-102`) |

## 2. PIN auth

| Check | Result |
|---|---|
| `POST /v1/auth/pin-login` PIN `4321` | PASS — `user=Sim Owner, role=owner, token=rust-session-00000000-…0001-4321` |
| Wrong PIN `0000` | PASS — rejected with `401 INVALID_CREDENTIAL` |

## 3. Menu lookup

| Check | Result |
|---|---|
| `GET /v1/menu` | 12 items (brussels, burrata, caesar, calamari, diavola, fries, halibut, margherita, negroni, ribeye, smashburger, tiramisu) |
| `GET /v1/menu/items` | 12 rows with `status=available`, station routing (`hot/cold/grill/fry/bar`) |

## 4. Order creation (Table 7)

- `POST /v1/orders` — brussels x2 + burrata x1 → `ord-de65b54d4a6bd6eb`, subtotal 3850c, total 4168c (8.25% tax). PASS
- `POST /v1/orders/{id}/items` — added Little Gem Caesar x1 (course 2). PASS
- `GET /v1/orders/{id}` — `status=open`, 3 lines, total 5683c. PASS

## 5. Fire to kitchen + KDS bump

- `POST /v1/orders/{id}/send` → 2 station tickets (`…-cold`, `…-hot`). PASS
- Re-fire same order → same 2 tickets, **no duplicate pantry depletion** (idempotent `was_already_sent`). PASS
- `GET /v1/kds/tickets` → 8 open tickets (6 seed + 2 new). PASS
- `POST /v1/kds/tickets/{id}/bump` on both new tickets → `status=bumped`. PASS

## 6. Cash payment (idempotent)

- `POST /v1/payments/cash` (`operationId=op-sim-001`, tendered total+500) → `status=paid`, change 500c. PASS
- Replay with same `operationId` → `status=paid`, no double-settle. PASS

## 7. Drawer closeout

- `POST /v1/drawers/close` (`countedCents=15000`) → drawer `drawer-default` closed, persisted.
- Z-report reconciliation proves it: opening float 20000c + cash sales 5683c = expected 25683c vs counted 15000c → variance **−10683c** (short). PASS
- Minor observation: `GET /v1/drawers/{id}` returns `actualCashCents/expectedCashCents/status` but does not surface the `closed` flag / counted-vs-expected fields from `CashDrawerSession` — closeout truth lives in the Z-report. Cosmetic only.

## 8. FLSA tip pool (`POST /v1/tips/calculate`, pool 10000c, Alice=server / Bob=cook / Cara=manager)

**Tip-credit employer (`paysFullMinimumWage=false`):** Alice 10000c, Bob excluded ("FLSA Tip Credit Gate: BOH staff require full minimum wage…"), Cara excluded ("FLSA 29 U.S.C. 203(m)(2)(B): Managers… strictly excluded"). Sum 10000/10000. PASS

**Full-minimum-wage employer (`paysFullMinimumWage=true`):** Alice 5000c, Bob 5000c, Cara still excluded per 203(m)(2)(B). Sum 10000/10000, exact penny conservation. PASS

(Note: first attempt failed with 422 — `TipParticipantInput` requires `staffId` + `hoursWorkedTenths` etc.; corrected schema passes. Client-facing validation works honestly.)

## 9. Pantry recipe depletion (Table 9: margherita x2 + ribeye x1)

| Ingredient | Before | After | Delta | Expected |
|---|---|---|---|---|
| pantry-flour | 44.5 | 44.0 | −0.5 | −0.5 ✓ |
| pantry-tomatoes | 22.5 | 21.5 | −1.0 | −1.0 ✓ |
| pantry-burrata | 19.0 | 17.0 | −2.0 | −2.0 ✓ |
| pantry-ribeye | 13.0 | 12.0 | −1.0 | −1.0 ✓ |

Re-fire of the same order produced **zero further depletion** — no stock leakage. PASS

`GET /v1/reports/pantry-usage` reports live depletion quantities, unit costs, and `low` stock alerts on all 8 ingredients. PASS

## 10. Food cost & profitability

Final `GET /v1/ops/food-cost` (after both fired orders):

- Gross sales 31501c, theoretical cost 8125c (2579 bps), actual cost 11425c (3626 bps)
- Variance 3298c / 1047 bps, waste 3300c, **gross profit 20076c (63.73%)**. PASS

`GET /v1/reports/sales-summary`: 3 orders, net sales 20900c, tax 1724c. PASS
`GET /v1/reports/z-report`: `Z-NATIVE-001`, avg check 6966c, 6 covers, `flsaCompliant=true`. PASS

## Performance (observed, local loopback)

25 scripted requests: 10–115 ms each (setup/health slowest at first-touch SQLite init; steady-state reads ~10–20 ms, writes ~12–30 ms). No retries needed.

## Verdict

The native Rust server completes a full commercial shift loop end-to-end as a real user: setup → PIN login → menu → order → fire → bump → cash pay → drawer closeout → FLSA tip pool → pantry depletion → food-cost P&L. Idempotency holds on fire-to-kitchen and cash settlement; FLSA gates (BOH tip-credit exclusion, manager exclusion, penny conservation) behave exactly per statute text in the API responses.

## Reproduce

```powershell
$env:PORT='38222'; $env:CULINARYOS_DATA_DIR="$env:TEMP\culinaryos-sim-38222"
./target/release/culinaryos-server.exe
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\culinaryos-sim-test.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\culinaryos-sim-test2.ps1"
```

Raw artifacts: `%TEMP%\culinaryos-sim-38222-results.json`, `%TEMP%\sim-tip-credit.json`, `%TEMP%\sim-tip-fullwage.json`, `%TEMP%\culinaryos-sim-38222\culinaryos.sqlite`.
