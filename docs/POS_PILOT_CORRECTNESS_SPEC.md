# POS pilot correctness specification and evidence plan

Date: 2026-09-30. Source baseline: `64e56ab`. Status: proposed acceptance contract; not production certification or authorization to implement/deploy.

Implementation update (2026-09-30): user subsequently authorized code edits using Muse/Codex. P2a payment containment implemented locally for E01/E12 plus POS per-delta acknowledgement/local cash persistence checks. See [shared ledger](AI_SHARED_LEDGER.md) for 51 passing targeted tests, server/POS typechecks and POS build evidence. This is partial invariant coverage with mocked route dependencies; the complete acceptance scenarios below remain NOT RUN, including physical hardware and full-service rehearsal. Device identity, PostgreSQL transition, split/coursing and Intelligence work remain open. No production release authorized or performed.

Requirement: operationalize the supplied September 30 Restaurant POS Benchmark recommendation for a correctness specification and failure-injection evidence. Extend the [existing audit](audits/product-review-council-2026-09-22.md); do not treat its historical findings as fresh runtime results. Follow the [shared ledger](AI_SHARED_LEDGER.md), [surface ownership](APP_SURFACE_OWNERSHIP.md), and existing project security/payment rules.

This document was produced from targeted source inspection. No tests, live database operations, payment transactions, hardware checks, or deployments were performed. Existing tests listed below are candidates, not passing evidence. Source links are relative to this document; future implementation must refresh the baseline and ownership.

## 1. Proposed pilot boundary

Operator-selected service style (2026-09-30): **full service with split checks and coursing**. Propose one US restaurant location, one configured currency (USD), one approved tax/service-charge policy, one POS device, one KDS station profile, one certified printer/drawer combination, and one Stripe Connect Standard merchant account. Include a second POS in acceptance testing to expose concurrency; enabling multiple operational POS devices requires those checks to pass.

Full-service split checks and coursing are required pilot capabilities. Jurisdiction, actual devices, card/offline risk policy, and whether tabs are required remain open; geography/currency/device assumptions above remain proposals. No hardware purchase or vendor commitment is implied.

| Capability | Proposed pilot contract |
| --- | --- |
| Menu and orders | Required modifiers, availability, quantities, immutable sold-price/tax snapshots, explicit sent/unsent items, authorized corrections |
| Kitchen | Send through `PATCH /v1/orders/:id/send`; station/course routing, acknowledgement, bump/recall, visible delivery fault |
| Settlement | Cash and one verified card flow; explicit uncertain/pending state; permissioned refund; receipt/reprint |
| Close | Drawer session, attributable cash movements, tips, variance, business-day report and unresolved-item list |
| WAN outage | Locally durable order/cash acceptance and local kitchen/print delivery for a two-hour test; actual architecture remains to be selected |
| Offline cards | Disabled unless the selected reader/SDK/provider workflow is certified and operator risk policy is approved; never infer settlement from local acceptance |
| Split checks and coursing | Required for launch: seat/item allocation, exact tax/discount/charge/tip allocation, partial and mixed-tender settlement, held-course fire and correction; no pilot release until verified |
| Restricted flows | Existing split settlement and terminal-processing routes remain quarantined until replacements pass provider-backed gates; tabs/preauthorization excluded unless separately selected |
| Deferred modules | Delivery aggregators, loyalty, enterprise configuration, payroll integrations, forecasting and generative AI |

Do not market this scope as full-service/bar readiness if required split/tab workflows remain unavailable. Do not enable a live money-handling pilot solely because deployment or static tests pass.

## 2. Research disposition and locked constraints

- Adopt transactional reliability, a narrow certification matrix, deterministic financial authority, and failure-injection testing.
- Treat vendor tables, calendar dates, pricing, SLA targets and integration suggestions as hypotheses. The pasted report lacks reproducible vendor citations and code-level implementation evidence.
- Preserve integer cents, tenant isolation/RLS, no PAN/CVV handling, manager authorization, CLI parity and stable POS-to-KDS event contracts.
- Preserve the decision for fresh Railway PostgreSQL; no legacy Supabase data migration is assumed. Replacing Supabase includes identity, authorization, queries, realtime, functions and storage consumers where applicable. `DATABASE_URL` alone is insufficient.
- Keep quarantined payment routes disabled until authoritative settlement is verified. Deployment priority and release-owner permissions remain as recorded in the ledger.
- Processor isolation does not automatically establish an SAQ category. Validate the actual card-present environment with the processor/acquirer. [PCI SAQ guidance](https://listings.pcisecuritystandards.org/pci_security/completing_self_assessment).
- Stripe's current offline reader matrix lists iOS/Android/React Native SDK integrations. Select a compatible POS/reader integration before promising offline cards in the browser POS. [Stripe offline support](https://docs.stripe.com/terminal/features/operate-offline/overview.md?reader-type=internet).

## 3. Authority and invariants

These are required behaviors, not claims about current code or instructions to replace the schema with these names. Reuse existing entities where they can satisfy the contract.

| ID | Required invariant |
| --- | --- |
| I01 Identity | Tenant/location context comes from authenticated membership or a registered, revocable device/service capability; caller headers cannot grant another tenant or manager privilege. CLI/MCP obey the same boundary. |
| I02 Durability | Show accepted local work only after persistent commit. Quota/corruption/write failure produces a visible failure with recoverable intent. An optimistic display must not masquerade as durable acceptance. |
| I03 Retry | Every business mutation has a tenant-scoped operation ID. Same ID/same payload returns its prior result; same ID/different payload conflicts. Concurrent duplicates yield one business effect. |
| I04 Money | Server/domain authority validates integer cents, currency, quantities, discounts, tax rounding and authorization; client totals are proposals. Persist the calculation inputs/version and historical result. |
| I05 Payment | Only matched provider evidence can establish card settlement: merchant account, tenant, check/order, currency, amount and attempt identity. Timeout means unknown/pending reconciliation, never assumed decline/success. |
| I06 Refund | Cumulative successful refunds cannot exceed captured refundable amount. Partial refunds retain the remaining balance; retries do not duplicate refunds. Record original instrument, actor, reason and provider outcome. |
| I07 Kitchen | A committed send creates durable production intent and recovery information. Retry does not double-fire, double-decrement stock or lose items. Delivery acknowledgement is distinct from preparation completion. |
| I08 Concurrency | Mutation uses a version/precondition or equivalent serialization. Stale edits cannot overwrite settlement, void, sent production instructions or another device's accepted change. Conflicts are visible. |
| I09 Audit | Sensitive transitions have attributable actor/device, tenant, operation ID, previous/new state, reason, timestamps and relevant provider/event references. Corrections append evidence; financial history is not silently overwritten. |
| I10 Close | Accepted tenders, change, cash movements, refunds, tips, charges and variance reconcile to transaction records. Missing-device/pending-card work prevents final close or produces an explicitly provisional report. |
| I11 Isolation | Local working sets and replay queues are scoped to tenant/device/session. Switching staff or tenants cannot expose/replay another context's work; revocation and offline authorization limits are defined. |
| I12 Safety | Training/demo cannot create live settlement. AI cannot authorize pricing, refunds, permissions or dietary safety; off means no AI requests/spend. |

Kitchen fulfillment and financial settlement are separate dimensions: a paid order may still be cooking. Existing `OrderStatus` combines them; document a compatible representation before changing types or migrations.

## 4. Transition contracts

| Domain | Allowed behavior and guards |
| --- | --- |
| Order | Draft/open -> accepted production intent -> fulfillment progress -> served/complete. Pre-send editing validates modifiers/prices. Post-send changes create an attributable production revision/cancellation. Payment does not erase production progress. |
| Check | Open -> settlement pending -> partially settled/settled -> closed. Balance must reconcile to authoritative tenders and adjustments. Closed changes require corrective transactions. Split/merge/transfer preserves item/tax allocations and total value; excluded until validated. |
| Ticket | Held/queued -> fired -> cooking -> bumped; recall returns to an explicit actionable state without creating another sale. Cancellation identifies already-prepared work. Receipt by KDS/printer is tracked separately. |
| Card attempt | Created -> collecting -> provider pending/authorized -> captured, declined, cancelled or unknown. Unknown reconciles the original attempt; retries cannot create an unrelated charge. Authorization alone is not captured revenue. |
| Offline card | Provider-supported locally stored/awaiting forwarding -> provider pending -> captured/declined/unknown. Pending risk appears in UI and close reports. No client flag can promote it to captured. |
| Refund | Requested -> authorized -> provider pending -> succeeded/failed/unknown. Preserve partial refund ledger and reconcile original attempt on uncertainty. |
| Drawer | Unopened -> open session -> closing -> closed. Opening float, cash sales, change, paid-in/out, no-sale openings, count and variance belong to an identified session. Reopening is authorized and audited. |
| BusinessDay | Open -> closing/provisional -> final. Use configured location timezone/cutoff, not device clock alone. Delayed work retains originating day; corrections reference the original close without rewriting it. |

No implicit last-write-wins for money or sent tickets. Define conflict outcomes for add/edit, send/send, send/void, pay/pay, pay/edit and close/late-replay before implementation.

## 5. Current evidence matrix

Labels: CONFIRMED SOURCE ISSUE = inspected control flow; CONFIRMED LIMITATION = explicit unavailable capability; RISK = needs executable validation. None imply a live exploit or deployed exposure.

| ID / severity | Current evidence | Required proof | Candidate source/tests |
| --- | --- | --- | --- |
| E01 BLOCKER, confirmed source issue | Offline card replay accepts `allow_offline_card` and inserts completed payment | Forged/stale/repeated deltas cannot settle cards; provider evidence required | [pos-sync](../apps/server/src/routes/pos-sync.ts), [payment tests](../tests/payments/stripe.test.ts) |
| E02 BLOCKER, confirmed source issue | Enqueue catches localStorage write failure and returns delta; queue key is global | Persistence failure fails acceptance; tenant/device partition; corruption/restart recovery | [offline engine](../packages/shared/src/offline-sync.ts), [offline tests](../tests/shared/offline-sync.test.ts) |
| E03 BLOCKER, confirmed source issue | Shared service/device key path accepts header-selected tenant without membership verification in that branch | Device identity is tenant/capability-bound; foreign tenant and unauthorized elevation fail | [auth middleware](../apps/server/src/middleware/auth.ts), [tenant tests](../tests/server/tenant-isolation.test.ts) |
| E04 RISK | Order send updates status before emitting kitchen event; handler writes ticket/items/outbox separately and outbox is best-effort | Fail at every write boundary; replay reconstructs one complete production effect | [orders](../apps/server/src/routes/orders.ts), [handler](../packages/event-bus/src/handlers/pos-order-created.ts), [fire tests](../tests/server/pos-kds-fire.test.ts) |
| E05 Confirmed limitation | `/terminal/process`, `/split`, `/tabs/preauth` return 503 before legacy handlers | UI/CLI represent unavailable flows truthfully; any replacement gets independent provider evidence | [payments](../apps/server/src/routes/payments.ts), [quarantine test](../tests/server/payment-settlement-quarantine.test.ts) |
| E06 RISK | Capture/refund and webhook paths exist; inspected webhook has signature checking and tenant-scoped payment matching | Provider/account/amount matching, crash recovery, replay/out-of-order delivery, cumulative partial refunds | [webhook](../apps/server/src/routes/stripe-webhook.ts), [webhook tests](../tests/server/stripe-webhook.test.ts) |
| E07 Confirmed dependency | Supabase admin client remains injected into server; ledger records fresh PostgreSQL decision | Target identity/query/realtime contract and real two-tenant DB tests; health distinguished from readiness | [middleware](../apps/server/src/middleware/supabase.ts), [ledger](AI_SHARED_LEDGER.md) |
| E08 RISK | ESC/POS encoder and printer test exist | Physical delivery/status/reroute/reprint and drawer accountability on exact certified hardware | [printer](../packages/shared/src/printer.ts), [hardware test](../tests/hardware/printer.test.ts) |
| E09 RISK | Historical audit covers purchasing exposure, dietary certainty, doctor honesty and public claims | Revalidate before enabling affected surfaces; hide/isolate excluded routes rather than assuming exclusion makes them safe | [prior audit](audits/product-review-council-2026-09-22.md) |
| E10 RISK / docs drift | Sync document is partly superseded; header references order send while replay uses `sync-deltas`; existing order status mixes fulfillment and payment | Current endpoint/state map and executable contract tests | [sync document](sync-protocol.md), [order types](../packages/shared/src/types/order.ts) |
| E11 BLOCKER for selected full-service pilot, confirmed source issue | Order-split handler recalculates tax at fixed 10%, moves original line items to newly created orders through separate writes, and writes status `split` absent from canonical `OrderStatus` | Preserve original tax/charge/discount snapshots and kitchen identity; validate complete nonduplicated allocations; crash/concurrency proof; reconcile schema/type contract | [order split handler](../apps/server/src/routes/orders.ts), [canonical order types](../packages/shared/src/types/order.ts); A15/A16 |
| E12 BLOCKER, confirmed source issue | Live terminal create-intent retains a 2500-cent demo default when tenant-scoped order lookup fails, then creates a configured Stripe intent | Reject missing/paid/voided orders; validate authoritative amount/currency/tips and merchant scope, or quarantine until verified | [terminal intent](../apps/server/src/routes/payments.ts); A06; immediate containment with P2a |

Muse's [transition design](POSTGRES_TRANSITION_DESIGN.md) and [independent review](audits/muse-pilot-plan-review-2026-09-30.md) are preserved. The [Codex disposition](audits/codex-muse-design-disposition-2026-09-30.md) adds full-service scope corrections and required identity/RLS/realtime/local-authority clarifications. P4a must include checkout per-delta acknowledgement and malformed-queue recovery; P4b includes broker dedupe. Excluded purchasing/recipe/dietary surfaces require an owned gate/disable plan before release.

## 6. Fault-injection acceptance matrix

All rows are NOT RUN in this assessment. BLOCKED is reserved for a documented missing prerequisite; source-confirmed defects are tracked above rather than represented as executed test failures.

| Test ID | Scenario | Observable pass condition | Invariants |
| --- | --- | --- | --- |
| A01 | Anonymous, foreign tenant, forged location header, revoked device, non-manager override | Rejected without data leak or mutation; attributable denial | I01,I09,I11 |
| A02 | Storage quota/write exception, malformed queue, crash immediately after acceptance | Failed commit never acknowledged; committed intent survives restart; corruption visible | I02,I11 |
| A03 | Same operation concurrently submitted twice; same ID with altered amount | One effect; prior result returned or payload conflict | I03,I04 |
| A04 | WAN disconnected for two hours; restart POS; local KDS/printer still reachable | Orders/cash and local production continue; backlog reconciles exactly after reconnect | I02,I03,I07,I10 |
| A05 | Kill process at each order/ticket/items/outbox write boundary; drop acknowledgements | Recovery produces one complete ticket set and one stock effect; delivery faults visible | I03,I07,I08 |
| A06 | Card callback timeout; retry Pay; capture/webhook race; wrong account/amount/currency | Original attempt reconciled; no duplicate charge or false settlement; mismatches rejected | I03,I05 |
| A07 | Forged offline-card flag; provider decline after offline forwarding | No client-authorized settlement; pending exposure and actual decline visible | I05,I10 |
| A08 | Partial refund twice, concurrent excess refunds, crash after processor success | One refund per operation; cumulative cap holds; recovery preserves remaining captured balance | I03,I06,I09 |
| A09 | Price/tax menu changes while check open; modifier and discount edge cases | Historical snapshot stable; configured rounding fixtures reconcile in cents | I04,I09 |
| A10 | Two devices edit/send/pay/void the same order; stale queue replay | Explicit conflict or serialized valid effects; no stale overwrite or duplicate kitchen work | I03,I07,I08 |
| A11 | Printer paper/network loss, KDS reboot, operator reroute/reprint | Durable job retained; station fault visible; reroute attributable; reprint marked and audited | I07,I09 |
| A12 | Cash change, no-sale opening, paid-out, tip close, offline terminal at day cutoff | Drawer math reconciles; unresolved work prevents final close or remains visibly provisional | I09,I10 |
| A13 | Demo credentials/data and AI flags during service | Demo cannot create live charges; AI off makes no provider calls; financial authority remains deterministic | I12 |
| A14 | Integrated Friday-night run combining outage, device crash, unavailable item, refund and close | Every accepted order/tender/ticket/audit entry accounted for; zero unexplained reconciliation difference | All |

A14 must use the selected full-service scope, including A15/A16 below. Delivery ingestion is excluded unless separately selected; do not simulate unavailable capabilities as real success.

| Test ID | Required full-service scenario | Observable pass condition | Invariants |
| --- | --- | --- | --- |
| A15 | Split four ways by seat/items and equal amount; allocate indivisible cents, taxes, discounts, service charges and tips; mixed cash/card, one declined/unknown attempt, duplicate pay, refund one allocation | Child allocations sum exactly to the original authoritative balance; no line/tax/tender counted twice; paid portions locked against unsafe reassignment; remaining balances visible; one processor effect per attempt; final reports reconcile | I03,I04,I05,I06,I08,I10 |
| A16 | Hold course 2 while sending course 1; concurrent repeated Fire; add/void a sent item; KDS reconnect/recall; split check during production | Course fires once and retains original line identity; financial split never duplicates or removes production instructions; corrections attributable; reconnect reconstructs held/fired/bumped states | I03,I07,I08,I09 |

For each run save: commit, environment/configuration without secrets, schema version, exact hardware/firmware/interface/SDK, fixture IDs, injected fault, expected/actual result, correlated operation/provider/event IDs, logs and reconciliation report. Use PASS/FAIL/NOT RUN/BLOCKED honestly. Local mocks are useful regression checks but cannot certify DB isolation, reader behavior or physical delivery.

## 7. Implementation stages and PR boundaries

Estimates are planning ranges in agent tokens, not budgets or calendar commitments. Each row is one feature/decision PR; if scope would exceed the row, stop and propose a split. Follow project conventional commits. No implementation is authorized by this document alone.

| Stage | Requirement / scope candidates | Est. tokens | Exit evidence | Rollback |
| --- | --- | --- | --- | --- |
| P0 Contract freeze | This document, endpoint/CLI inventory, shared ledger; operator confirms pilot scope | 5–10k | Scope and unsupported flows explicit; source findings mapped to owners | Revert documentation only |
| P1 Backend transition design | New design under `docs/`; inspect server middleware/auth, Supabase consumers, schema/event bus | 10–20k | Fresh PostgreSQL identity/RLS/query/realtime/function plan; deployment baseline refreshed; isolated vertical slice specified | Revert design; no environment change |
| P2a Immediate card replay containment | `routes/pos-sync.ts`, POS offline messaging, CLI replay caller if present, relevant tests | 10–20k | A03/A07; no client flag can create completed card settlement | Keep card replay disabled; do not roll back to false settlement |
| P2b Device identity boundary | Auth/RBAC/device registration, CLI credentials, isolation tests | 15–30k | A01 with real two-tenant DB proof where DB access is involved | Revoke affected devices; disable unsafe access, preserve staff auth |
| P3 Fresh backend vertical slice | Server adapter/auth, incremental migrations, event delivery, one order workflow, tests; exact files set by P1 | 25–45k per slice | Authenticated two-tenant create/read/send proof and DB readiness; extend in separate PRs until all pilot consumers covered | Switch only a tested compatible environment back; no DB reset or legacy import |
| P4a Durable local acceptance | Shared offline persistence, POS feedback, CLI replay visibility, storage/restart tests | 15–30k | A02/A03; partitioning and failure semantics verified | Preserve pending records/export; disable offline acceptance if integrity uncertain |
| P4b Kitchen delivery recovery | Order send, event-bus handler/broker, KDS acknowledgement, CLI KDS commands | 20–40k | A05/A10/A11, one effect under retries and interrupted writes | Pause new sends; drain/reconcile durable intent; retain stable event contract |
| P5a Provider-backed settlement | Payment/webhook services, POS checkout, CLI payment commands, migrations/tests | 25–45k | A06/A08 plus real Stripe test-mode account/reader traces; disabled flows stay disabled | Disable new card collection; reconcile in-flight attempts; retain ledger |
| P5b Full-service split checks | Check allocation/rounding service, order/payment contracts, POS seat/split UX, CLI parity and migrations/tests | 25–45k | A15; mixed-tender and partial outcomes reconcile; original kitchen identities retained | Disable new splits; preserve and reconcile existing child allocations/tenders |
| P5c Coursing integrity | Course-fire service/event/KDS contracts, POS course controls, CLI fire/hold/recall parity and tests | 15–30k | A16; repeated fire and split-during-production cause no duplicate/lost ticket | Stop new fires if integrity uncertain; reconcile held/fired intent without erasing history |
| P6 Cash/day close | Drawer/business-day service, POS shift, manager reporting, CLI close commands/tests | 20–35k | A09/A12 and deterministic financial fixtures | Pause final close; retain provisional reports and append corrections |
| P7 Hardware and pilot rehearsal | Device adapter, diagnostics, CLI hardware doctor, docs and failure harness | 15–30k | A04/A11/A13/A14; certified model matrix; restore drill and operational response evidence | Suspend pilot; use approved fallback operations; preserve all financial evidence |

P2a is a containment candidate that can precede migration after code authorization. P2b and P3 must share the P1 identity contract to avoid building two incompatible auth systems. P4/P5/P6 build on the target backend; do not expand Supabase-dependent services that will immediately be replaced. Exact PR file lists and ownership must be recorded before editing.

Every new GUI business feature includes its CLI operation in the same PR. For changes to existing flows, inventory and verify the corresponding CLI/API behavior. Existing doctor commands must not return PASS without executable evidence. Declare any new pipeline task in `turbo.json`.

## 8. Release gates and handoff

1. Preserve selected full-service split-check/coursing scope; confirm jurisdiction/devices and remaining restricted workflows. Pass A15/A16 before release.
2. Refresh deployed commit/readiness evidence and target backend plan; process health alone is insufficient.
3. Close E01–E03 and revalidate all historically reported isolation/payment blockers for exposed routes.
4. Pass applicable acceptance rows against the target backend and exact hardware, with recorded evidence. Define LAN latency measurements; a proposed p95 under one second is a target, not a verified claim.
5. Demonstrate backup restore, pending-operation reconciliation and deployment rollback; establish support owner and visible device/queue faults.
6. Review customer-facing claims against the certified support matrix. Operator authorizes the consequential release after reviewing exact commits and results.

DONE: research converted to a proposed pilot contract, invariants, current source matrix, failure scenarios and bounded implementation plan.

VERIFIED: targeted source inspection only at `64e56ab`; documentation links/format checked during authoring. No runtime readiness established.

DECISIONS: existing architecture/security constraints retained. Operator selected full service with split checks and coursing. Geography/devices, local store authority and native offline-card integration remain proposals.

ISSUES: E01–E03 source blockers, backend transition, missing runtime/hardware evidence, and business scope confirmation.

NEXT: review/freeze P0, then P1 backend transition design. Code work needs a separate explicit instruction; production push/settings remain subject to existing release approval.
