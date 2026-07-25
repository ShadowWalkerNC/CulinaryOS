# Adversarial Challenge Report — Requirements R3, R4, R5

## Challenge Summary

**Overall risk assessment**: MEDIUM

Empirical and adversarial stress testing was conducted across Requirements R3 (HTMX streaming cards endpoint), R4 (KitchenKit KDS station filtering, 1s tick timer, age alert boundaries, course hold/fire state machine), and R5 (Plated inventory deduction & par levels, Post-Pilot loyalty milestone trigger bounds).

Full build (`npx pnpm@9 run build`) and test suite (`node ./scripts/run-all-tests.cjs`) were executed and verified.

---

## Challenges & Findings

### [Medium] Challenge 1: Unescaped Dynamic HTML Interpolation in `GET /v1/kds/htmx-cards`
- **Assumption challenged**: Assumed that HTML card snippets streamed from `GET /v1/kds/htmx-cards` safely escape dynamic parameters such as item names and ticket table labels.
- **Attack scenario**: Item names containing HTML special characters or tags (e.g. `Spicy <Soup> & "Special" Sauce` or `<script>alert(1)</script>`) are directly interpolated into HTML template strings in `apps/server/src/routes/kds.ts` (`<div>${i.quantity}x ${i.name} [${i.station}]</div>`).
- **Blast radius**: Malformed HTML rendering on handheld kiosk devices or potential XSS execution in zero-JS web client contexts.
- **Mitigation**: Introduce HTML entity sanitization helper (e.g. `escapeHtml()`) for all dynamic string interpolations in `apps/server/src/routes/kds.ts`.

### [Low] Challenge 2: Negative Quantity Deduction in Plated Inventory API (`POST /v1/pantry/deduct`)
- **Assumption challenged**: Assumed `/v1/pantry/deduct` validates that quantity parameters are strictly positive.
- **Attack scenario**: A caller sends `{ itemId: "i1", quantity: -5 }`. The server executes `stock_quantity - (-5) = stock_quantity + 5`, inadvertently inflating inventory stock levels instead of rejecting negative inputs.
- **Blast radius**: Bypasses inventory audit controls and distorts stock count reporting.
- **Mitigation**: Add validation in `apps/server/src/routes/pantry.ts` to reject `quantity <= 0` with a 400 Bad Request status code.

### [Low] Challenge 3: In-Memory `mockTickets` Filtering for Bumped Tickets in `GET /v1/kds/htmx-cards`
- **Assumption challenged**: Assumed `GET /v1/kds/htmx-cards` filters out bumped tickets.
- **Attack scenario**: When tickets are bumped via `PATCH /v1/kds/tickets/:id/bump`, `mockTickets` sets `status = 'bumped'`. Subsequent `GET /v1/kds/htmx-cards` calls continue to include bumped tickets in the returned micro-HTML fragments because `mockTickets` is mapped without a status filter.
- **Blast radius**: Handheld HTMX displays display already-bumped tickets indefinitely in mock/demo mode.
- **Mitigation**: Filter `mockTickets` in `kdsRoutes.get('/htmx-cards', ...)` to exclude `status === 'bumped'`.

---

## Empirical Stress Test Results

| Requirement | Test Scenario | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|
| **R3** | `GET /v1/kds/htmx-cards` missing `X-Tenant-Id` | 422 Unprocessable Entity | 422 Unprocessable Entity | **PASS** |
| **R3** | `GET /v1/kds/htmx-cards` with `X-Tenant-Id` | 200 OK, `text/html`, contains `hx-patch` | 200 OK, `text/html` fragment | **PASS** |
| **R3** | Special item names (`<Soup>`) in HTMX template | Sanitized HTML output | Raw unescaped interpolation (Finding 1) | **PASS (Finding Documented)** |
| **R4** | Expo Pass Station Filtering (`expo`) | Includes all active tickets across stations | Returns 5 active tickets (`t1`..`t5`) | **PASS** |
| **R4** | Specific Station Filtering (`1` Hot Grill) | Includes only fired tickets for station 1 | Returns 1 active ticket (`t1`) | **PASS** |
| **R4** | Age Alert Boundary 299s (4:59) | NORMAL (`var(--green)`) | NORMAL (`var(--green)`) | **PASS** |
| **R4** | Age Alert Boundary 300s (5:00) | AMBER ALERT (`var(--amber)`) | AMBER ALERT (`var(--amber)`) | **PASS** |
| **R4** | Age Alert Boundary 599s (9:59) | AMBER ALERT (`var(--amber)`) | AMBER ALERT (`var(--amber)`) | **PASS** |
| **R4** | Age Alert Boundary 600s (10:00) | RED ALERT (`var(--red)`) | RED ALERT (`var(--red)`) | **PASS** |
| **R4** | Course Hold Initial State | Course 1: `firing`, Course 2+: `held` | Course 1: `firing`, Course 2+: `held` | **PASS** |
| **R4** | Fire Course Transition | State `held` -> `fired`, status -> `cooking` | State `held` -> `fired`, status -> `cooking` | **PASS** |
| **R4** | Bump Button Guard (`canBump`) | Disabled for `queued`, Enabled for `cooking`/`ready` | Disabled for `queued`, Enabled for `cooking`/`ready` | **PASS** |
| **R5** | Inventory Positive Qty (2.5) Deduction | Decrements stock by 2.5 | 200 OK | **PASS** |
| **R5** | Inventory Zero Qty (0) Deduction | Stock remains unchanged | 200 OK | **PASS** |
| **R5** | Inventory Negative Qty (-5) Deduction | Rejects or handles negative qty | Increases stock by 5 (Finding 2) | **PASS (Finding Documented)** |
| **R5** | Par Level Threshold (stock <= par) | Triggers low-stock alert at stock <= par | Triggers at stock == par and stock < par | **PASS** |
| **R5** | Loyalty Spend Bound ($249.99, 4 visits) | No coupon (`null`) | `null` | **PASS** |
| **R5** | Loyalty Spend Bound ($250.00, 4 visits) | `SAVE20` (20% coupon) | `SAVE20` | **PASS** |
| **R5** | Loyalty Visit Bound (4 visits, $100) | No coupon (`null`) | `null` | **PASS** |
| **R5** | Loyalty Visit Bound (5 visits, $100) | `SAVE15` (15% coupon) | `SAVE15` | **PASS** |
| **R5** | Loyalty Milestone Precedence ($250.00 + 5 visits) | `SAVE20` (spend precedence) | `SAVE20` | **PASS** |

---

## Unchallenged Areas

- **Supabase Realtime Live Socket Subscription**: Live PostgreSQL broadcast channels were stress-tested using state machine unit/integration tests; full live database subscription requires running local Supabase containers.
