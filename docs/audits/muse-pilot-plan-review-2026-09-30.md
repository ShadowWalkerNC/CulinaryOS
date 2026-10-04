# Pilot-plan review: POS correctness spec (Muse, 2026-09-30)

Date: 2026-09-30. Source baseline: `64e56ab`. Review target: [POS_PILOT_CORRECTNESS_SPEC.md](../POS_PILOT_CORRECTNESS_SPEC.md) (Codex, 2026-09-30). Prior audit: [product-review-council-2026-09-22.md](product-review-council-2026-09-22.md). Ledger: [AI_SHARED_LEDGER.md](../AI_SHARED_LEDGER.md).

Documentation only: targeted read-only source inspection at the baseline above. No tests run, no database touched, no deployment changed, no code edited. Severity scale follows project convention: BLOCKER / RISK / NIT. “Confirmed” means verified in the named source at this baseline.

## Verdict

**Approve the P0 freeze with additions — no blocking objection to the spec’s structure, but four evidence-matrix gaps (G1–G4) should be folded into the spec before P2/P3/P5 scoping, one live payment defect (G1) needs a P5 containment decision, and purchasing (G4) needs an explicit in/out-of-pilot ruling.** The 12 invariants, transition contracts, stage ordering (P0→P7), and acceptance matrices (A01–A14) are sound and consistent with the inspected source. Counts check out: 12 invariants, 10 evidence entries, 14 scenarios, all NOT RUN as labeled. The companion P1 design is [POSTGRES_TRANSITION_DESIGN.md](../POSTGRES_TRANSITION_DESIGN.md).

## 1. Evidence re-verification (spec §5, E01–E10)

All ten entries re-checked against source. Result: **9 confirmed as written, 1 confirmed with an extension (E04).**

| ID | Re-verification | Result |
|---|---|---|
| E01 | `finalize_payment` honors client `allow_offline_card` and inserts `status: 'completed'` + marks order paid: [pos-sync.ts](../../apps/server/src/routes/pos-sync.ts:64). Client sets the flag unconditionally for card: [CheckoutView.tsx](../../apps/pos/src/views/CheckoutView.tsx:151). | CONFIRMED |
| E02 | `enqueueOfflineDelta` swallows persistence failure and still returns the delta; queue key is the single global `culinaryos_offline_transaction_queue`: [offline-sync.ts](../../packages/shared/src/offline-sync.ts:33). Extension: `readQueue` also swallows parse failure and returns `[]`, silently dropping a malformed queue (see G5). | CONFIRMED + EXTENSION |
| E03 | Device/service-key branch calls `next()` on header tenant with no membership check: [auth.ts](../../apps/server/src/middleware/auth.ts:82). JWT branch does verify membership ([auth.ts](../../apps/server/src/middleware/auth.ts:110)), so the defect is isolated to the key path as the spec states. | CONFIRMED |
| E04 | Send updates `pos_orders.status='sent'` ([orders.ts](../../apps/server/src/routes/orders.ts:491)) before `emitOrderCreated` ([orders.ts](../../apps/server/src/routes/orders.ts:532)); handler writes ticket → items → `pending_push` (best-effort `.catch`) in separate statements and re-updates the order: [pos-order-created.ts](../../packages/event-bus/src/handlers/pos-order-created.ts:58). Extension: the broker never dedupes on `event_id` (unique per V5) — insert errors are unhandled and the handler always runs ([broker.ts](../../packages/event-bus/src/broker.ts:74)) — so redelivery double-fires (see G3). | CONFIRMED + EXTENSION |
| E05 | Quarantine loop returns 503 for `/terminal/process`, `/split`, `/tabs/preauth` before the legacy handlers: [payments.ts](../../apps/server/src/routes/payments.ts:26). The legacy `/terminal/process` body below it still fabricates settlement, so the quarantine must never be lifted without replacement (spec states this correctly). | CONFIRMED |
| E06 | Webhook verifies Stripe signature when configured (unsigned fixtures only in demo mode) and marks the order paid only when a tenant-scoped payment row matches `stripe_payment_intent_id`: [stripe-webhook.ts](../../apps/server/src/routes/stripe-webhook.ts:28). Capture/refund routes exist ([payments.ts](../../apps/server/src/routes/payments.ts:370)). | CONFIRMED |
| E07 | `adminSupabase()` service-role client injected into all requests; fresh-PostgreSQL decision recorded in ledger; `DATABASE_URL` in `.env.example:13` points at Supabase’s own Postgres, reinforcing “URL swap is insufficient.” | CONFIRMED |
| E08 | ESC/POS encoder exists ([printer.ts](../../packages/shared/src/printer.ts:1)); no certified-hardware evidence at baseline — correctly labeled RISK, not a claim. | CONFIRMED |
| E09 | Prior-audit items (F01 purchasing exposure, F05 dietary, F09 doctor honesty, F10 public claims) accurately summarized; F01/F02/F04 still present at this baseline (see G4/G1/G2). Correctly labeled as needing revalidation. | CONFIRMED |
| E10 | Sync-doc header names `PATCH /v1/orders/:id/send` as the sync path while replay uses `POST /v1/pos/sync-deltas`: [sync-protocol.md](../sync-protocol.md:5) vs [pos-sync.ts](../../apps/server/src/routes/pos-sync.ts:32). `OrderStatus` mixes fulfillment (`sent`) and settlement (`paid`): [order.ts](../../packages/shared/src/types/order.ts:8). | CONFIRMED |

## 2. New gaps (source-confirmed at `64e56ab`)

### G1 — BLOCKER candidate: live `/terminal/create-intent` keeps the 2500-cent default on missing order

`POST /v1/payments/terminal/create-intent` is **live** (not quarantined): [payments.ts](../../apps/server/src/routes/payments.ts:68). It initializes `let orderTotal = 2500; // default for demo`, looks up the order, and proceeds with the default when the lookup misses (`if (order)` — no rejection): [payments.ts](../../apps/server/src/routes/payments.ts:80). There is no paid/voided/closed guard, no integer/non-negative validation of `tip_cents`/`auto_gratuity_cents`, and when Stripe is configured it creates a **real** `PaymentIntent` for the defaulted amount. The sibling `/checkout` route does validate (404 on missing order, 409 on paid/voided, positive-charge check: [payments.ts](../../apps/server/src/routes/payments.ts:308)), proving the omission is local to the terminal path.

The spec’s E05 inventories only the quarantined `/terminal/process`; this live sibling is not named anywhere in §5–§7, yet the pilot contract promises “one verified card flow.” Recommended spec change: add an E11 (BLOCKER, confirmed source issue) and make P5 explicitly harden-or-quarantine `create-intent` (the `/terminal/connection-token` route is lower risk — token minting only — but should be listed in the P5 inventory for completeness). This is the live half of prior-audit F04; the quarantined half is already covered.

### G2 — RISK: checkout fallback checks HTTP status, not per-delta acknowledgement

Online cash/comp finalize in [CheckoutView.tsx](../../apps/pos/src/views/CheckoutView.tsx:181): when `flushOfflineQueue` returns 0, the fallback `POST /v1/pos/sync-deltas` treats `res.ok` as success without checking that `confirmedIds` contains the submitted delta id. A 200 carrying only `failures` (or another delta’s confirmations) would mark the tender paid locally. This is the client half of prior-audit F04 and belongs in the evidence matrix (E02/E04 area) with P4a ownership: require per-operation acknowledgement before local paid state (consistent with I03/A03, which already demand it — the gap is only that the call site is not inventoried).

Related call site for P4a/P5: the offline branch marks the mock order paid and calls `setPaid(true)` even for card (with `setPaymentQueued(true)` alongside): [CheckoutView.tsx](../../apps/pos/src/views/CheckoutView.tsx:153). I02/I05/A07 cover the requirement; naming the lines prevents them being missed in implementation.

### G3 — RISK: broker redelivery has no `event_id` dedupe (extends E04)

`handleIncomingEvent` inserts into `domain_events` without checking the result, then always runs the handler: [broker.ts](../../packages/event-bus/src/broker.ts:74). V5 declares `event_id unique`, but the duplicate-key error on redelivery is ignored and execution continues — so a retried `pos:order:created` (HTTP fallback in [orders.ts](../../apps/server/src/routes/orders.ts:89), operator retry, or webhook redelivery) creates duplicate tickets, duplicate `plate_economics` rows, and duplicate stock decrements. Recommended spec change: extend E04’s “required proof” with redelivery-dedupe evidence (already implied by “replay reconstructs one complete production effect”) and make the P4b scope explicitly include broker dedupe, not just send/handler recovery. A05/A10 already cover the scenarios.

### G4 — BLOCKER candidate (scope ruling needed): purchasing still unauthenticated with in-memory stores

`purchasing.ts` imports no auth middleware and holds vendors/catalog in module-level mutable arrays: [purchasing.ts](../../apps/server/src/routes/purchasing.ts:42); it is mounted at `/v1/purchasing` with no route-level gate: [index.ts](../../apps/server/src/index.ts:135). Prior-audit F01 is therefore still present at this baseline. The spec’s E09 (“revalidate before enabling affected surfaces; hide/isolate excluded routes”) is directionally right but does not rule purchasing in or out of the pilot, and no P-row owns the “hide/isolate” work for a currently-reachable route.

Recommended spec change: P0 must explicitly exclude purchasing endpoints (and the Admin Pantry UI that drives them) from the pilot, and one P-row (P2b or a P0b-equivalent) must own the disable-or-gate work with anonymous/foreign-tenant rejection proof. Leaving a reachable unauthenticated mutating route unowned through P3 would contradict I01/I09.

### G5 — RISK: malformed queue silently resets to empty (extends E02)

`readQueue` catches JSON parse errors and returns `[]`: [offline-sync.ts](../../packages/shared/src/offline-sync.ts:38). A corrupted `localStorage` value therefore discards all pending work without surfacing a failure — worse than E02’s stated enqueue-failure semantics. Recommended spec change: fold into E02/P4a required proof (corruption must be visible and recoverable; A02 already lists “malformed queue” — the gap is only that the current code path is unnamed).

### G6 — RISK: transition must not port permissive policy semantics (P1/P3 scope note)

V15 KitchenKit policies contain `OR auth.uid() IS NULL` fallbacks (anonymous access when no JWT is present), and V11/V16/V17 use `TO anon` / `service_role_*` policies. The companion P1 design addresses this (drop, don’t port), but the spec’s P1/P3 rows describe the migration as “identity/RLS/query/realtime/function plan” without naming a policy-semantics audit. Recommended spec change: one line in P1 exit evidence — “ported policies enumerated with Supabase-isms and permissive fallbacks dispositioned, not mechanically copied.” Low cost, prevents a silent authorization regression.

### G7 — NIT: MCP access paths not inventoried (I01 names MCP; §5 doesn’t)

`mcp/src/kds-server.ts` holds a direct service-role client for prep/recipe tables ([kds-server.ts](../../mcp/src/kds-server.ts:36)), and `culinary-os-server.ts`/`unified-server.ts` fall back to `SUPABASE_SERVICE_ROLE_KEY` as the API bearer ([unified-server.ts](../../mcp/src/unified-server.ts:13)). I01 correctly requires CLI/MCP under the same boundary, but no E-row inventories these paths, so P2b/P3 could miss them. The P1 design covers the target behavior; the spec needs only an inventory line (suggest folding into E07’s scope or a P1 checklist item).

### G8 — NIT: `managerGate` device-key passthrough should be an explicit A01 case

`managerGate('api_key', undefined)` returns `ok` and the test suite asserts that behavior: [tenant-isolation.test.ts](../../tests/server/tenant-isolation.test.ts:11). E03’s required proof (“unauthorized elevation fail”) and A01 (“non-manager override”) cover the requirement, but A01 should explicitly list “device-key caller attempting a manager-gated action (comp/void/refund approval)” so P2b tests the exact passthrough. One-line addition.

### G9 — NIT: recipe/dietary surfaces need the same in/out ruling as purchasing

Prior-audit F05 (dietary certainty) and F13 (recipe math) are P0/P1 items, but the spec’s pilot boundary and deferred-modules list never mention recipes, menus-as-culinary-data, or dietary surfaces — they are neither in the pilot contract nor explicitly deferred. Assuming the intent is “out of pilot” (the pilot is order/kitchen/settlement/close), say so in §1 with the same claim-gating note as split/tab workflows. If any dietary display ships in the pilot, it needs its own invariant/acceptance row.

### G10 — NIT: P3 estimate is open-ended (“25–45k per slice,” slice count unspecified)

The P1 design proposes six slices (S1–S6), which bounds P3 at roughly 150–270k total. Recommend the spec either reference that slice list or restate P3 as a capped sequence once P1 lands, so the “stop and propose a split” rule has a baseline to trigger against. P1’s own 10–20k estimate proved accurate for the design deliverable.

## 3. Scope and structural assessment

- **Pilot boundary (§1):** reasonable and appropriately conservative. The “second POS in acceptance testing” requirement is the right concurrency forcing function; the split/tab quarantine and offline-cards-disabled default match the source reality (E05, terminal SDK matrix caveat). Two consistency notes: (a) the single-currency (USD) assumption matches the code, which hardcodes `currency: 'usd'` in both intent-creation paths ([payments.ts](../../apps/server/src/routes/payments.ts:114) terminal, [payments.ts](../../apps/server/src/routes/payments.ts:334) checkout) — multi-currency would be new work, correctly out of scope; (b) tips appear in I10/close language as recorded amounts, while tip *pooling/distribution* (project Rule 9, hours-weighted default) is untouched — recommend one clarifying line that the pilot covers tip recording/reconciliation, not pool distribution.
- **Invariants (I01–I12, §3):** well-formed; each is falsifiable and mapped to scenarios. I05’s “timeout means unknown/pending, never assumed” and I02’s “optimistic display must not masquerade as durable acceptance” directly pin the G2/G4-class defects. No invariant changes proposed.
- **Transition contracts (§4):** align with the actual state machines in source (order/send, ticket fire/bump/recall, drawer session, card-attempt lifecycle). The OrderStatus split-fulfillment-vs-settlement note correctly anticipates the E10 modeling work.
- **Stage ordering (§7):** sound. P2a-before-P3 containment, P2b/P3-shared-identity, and P4/P5/P6-on-target-backend sequencing are all correct; the “do not expand Supabase-dependent services that will immediately be replaced” guard is important and should be enforced at PR review.
- **External claims (§2):** the Stripe offline-matrix statement and PCI SAQ note are presented with links and appropriate hedging (“validate the actual environment”). They were not independently verified in this review (no network verification performed); treat as hypotheses per the spec’s own research-disposition rule until P5/P7 evidence lands.
- **Prior-audit traceability:** F01→G4, F02→E03/G8, F03→E01, F04→G1/G2, F06→A-matrix, F07→E02/G5, F08/F09→P-rows/doctor notes, F10→§1 claim gating, F12→deferred AI, F13→G9. F05→G9, F11→G4 (purchasing UX follows the purchasing scope ruling), F14–F22→out of pilot scope (correctly untouched). No prior P0/P1 item is lost; G1/G2/G4/G9 are the ones needing explicit spec text.

## 4. Recommended spec edits (minimal)

1. Add E11 (BLOCKER, confirmed source issue): live `create-intent` 2500-default/missing guards → P5 scope.
2. Extend E02 with G5 (malformed-queue reset) and name the G2 call sites ([CheckoutView](../../apps/pos/src/views/CheckoutView.tsx:181), [offline branch](../../apps/pos/src/views/CheckoutView.tsx:153)) in E02/E01 required proof.
3. Extend E04 with G3 (broker `event_id` dedupe) → P4b scope.
4. P0: rule purchasing endpoints + Admin Pantry UI out of pilot; assign the disable-or-gate work to a P-row with rejection proof (G4).
5. P1 exit evidence: add policy-semantics audit line (G6) and MCP-path inventory line (G7).
6. A01: add device-key-vs-manager-gate case (G8). §1: add recipe/dietary out-of-pilot line (G9), tip-recording-vs-pooling clarification, and P3 slice-list reference (G10).

None of these changes the spec’s architecture, staging, or acceptance philosophy — they close inventory gaps so implementation PRs cannot miss the named lines.

## 5. Review completion

DONE: re-verified E01–E10 against `64e56ab` source (§1); filed ten findings G1–G10 with file:line evidence (§2); assessed scope/structure/traceability (§3); proposed minimal spec edits (§4).

VERIFIED: read-only inspection only; no runtime, database, payment, hardware, or deployment verification performed or claimed. External (Stripe/PCI) claims in the reviewed spec not independently verified.

DECISIONS: none — this review proposes spec text only; Codex owns the spec and ledger updates.

ISSUES: G1 (live payment defect, needs P5 containment decision) and G4 (purchasing scope ruling) are the two items that should block P0-freeze sign-off until dispositioned; G2/G3/G5–G10 can ride as tracked spec amendments.

NEXT: Codex dispositions §4 edits in the spec + ledger; operator freezes P0 scope (including G4/G9 rulings and the P1 design’s §6 questions); implementation remains separately authorized.
