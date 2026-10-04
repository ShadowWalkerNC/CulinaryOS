# Codex disposition of Muse design and Intelligence research

Date: 2026-09-30. Baseline: `64e56ab`. Documentation only. Muse CLI 1.4.1 completed the delegated source inventory/design/review. Preserve its original [transition design](../POSTGRES_TRANSITION_DESIGN.md) and [pilot review](muse-pilot-plan-review-2026-09-30.md); this addendum records review corrections rather than overwriting those artifacts.

## Accepted source findings and pilot correction

- Verified G1 directly: `apps/server/src/routes/payments.ts:80` initializes 2500 cents; missing order leaves that amount intact and the configured Stripe branch creates a PaymentIntent. This is a confirmed source defect, not evidence of a charge or deployed exposure. Add to immediate payment containment alongside offline replay; do not defer it solely to broad migration.
- Verified broker insert result is ignored before handler execution (`packages/event-bus/src/broker.ts:74`). Duplicate handler execution is a source-supported risk; actual duplicate tickets/stock effects require failure tests. Muse's wording “redelivery double-fires” is stronger than the runtime evidence collected.
- Verified checkout fallback checks HTTP success without inspecting the submitted delta acknowledgement (`apps/pos/src/views/CheckoutView.tsx:188`). Require a confirmed operation ID, not bare HTTP 200.
- Operator selected **full service with split checks and coursing** after Muse dispatch. The current [correctness spec](../POS_PILOT_CORRECTNESS_SPEC.md) adds A15/A16 and P5b/P5c. Muse's 14-test/10-evidence counts and split-excluded language describe the earlier snapshot, not the current acceptance scope.
- Current order splitting recalculates tax at fixed 10% (`apps/server/src/routes/orders.ts:1040`), moves original line items through separate writes, and writes `split` outside canonical `OrderStatus`. Preserve check allocation and kitchen identity; full-service release requires A15/A16.

## Design corrections before implementation

1. **Reuse package ownership.** Prefer extending `packages/db` over introducing `packages/db-pg` unless an explicit compatibility/ownership reason emerges. Root `pg` dependency does not automatically satisfy package dependency declarations. Use bounded typed repositories; adopt a temporary query-builder shim only after inventory demonstrates a smaller safe port, with explicit supported operations and removal plan.
2. **Tenant transaction lifecycle.** Context initialization and all business statements must share the same checked-out connection and explicit transaction. Use parameterized `set_config(..., true)`, guaranteed rollback/release, non-owner/no-BYPASSRLS runtime roles and least privilege. Test missing/malformed context, cross-tenant inserts/updates/deletes, pool reuse after failure and concurrent tenants. A setting is a backstop against query mistakes, not a boundary against a compromised server that can set arbitrary context.
3. **Identity completeness.** Opaque sessions are a proposal, not a locked choice. Specify membership/role changes invalidating or refreshing sessions; PIN hashing, lockout/rate limits, device pairing, bootstrap expiry/single-use protection, owner/admin authentication and recovery, CSRF/cookie/token storage, and offline authority windows. Nullable staff email does not remove strong owner/admin authentication needs.
4. **Realtime completeness.** SSE is an engineering choice, not a necessary operator question. Define browser authentication (native EventSource cannot attach arbitrary bearer headers), expiry/revocation, authorization on replay/ack, per-device delivery cursors, event versions and duplicate application. Never put durable bearer credentials in stream URLs. An in-memory stream is a notification optimization; durable catch-up remains authoritative.
5. **Local service continuity.** Cloud PostgreSQL plus SSE does not satisfy the two-hour WAN-outage/local-KDS contract. A separate decision must identify the store-side durable authority/transport, conflict policy and device lifecycle. Do not certify offline service using only a browser queue and cloud transport.
6. **Bound migration slices.** S1 requires tenancy/identity dependencies to exist before referencing them. S6 currently bundles settlement, refunds, receipt, drawer and day close: split it into feature PRs consistent with P5a/P5b/P5c/P6. Six slices are a sequencing outline, not a proven token/time estimate. No measured token usage supports Muse's assertion that P1 estimates proved accurate.
7. **Retirement is gated.** Keep historic migrations/artifacts; archival/removal needs consumer completeness evidence. Do not assume table constraints and outbox shapes are portable unchanged or that no real DB tests exist anywhere from a targeted inspection. Enumerate inspected tests and identify missing execution evidence instead.
8. **Exclude by enforcement.** Proposed pilot exclusion of purchasing/recipe/dietary modules requires route/UI access enforcement and honest claims. Do not delete these applications or assume full-service operators need none of their data. Existing manager exclusions and tip-pool legality remain mandatory wherever pooling ships.

## Intelligence brief assessment

The second supplied research document describes an additional product: read-only restaurant diagnostics with CSV/mock connectors, deterministic metrics/rules, evidence-backed findings and optional grounded narrative. Its evidence-first pipeline is compatible with the POS reliability direction; it must consume certified transactions or explicitly label imported-data limitations.

The embedded build prompt is not yet reconciled with the existing codebase:

- Existing Hono/TypeScript, `packages/forecast-engine`, report routes and PDF tools are reuse candidates. Proposed Next/Python/FastAPI/Redis/MinIO deployment and `/apps/web` naming would conflict with existing ownership if copied verbatim. Decide integrated module versus separately bounded service before code.
- MVP scope disagrees internally: 30–50 rules in the roadmap versus at least 15 in build acceptance; initial rule pack contains 17 IDs. Freeze one enumerated pack with supported datasets, versions, expected triggers and skip reasons.
- Distinguish rule execution status (triggered/not-triggered/insufficient-data/error) from finding lifecycle. Missing/stale inputs must not produce a clean bill of health, zero-valued metrics or an invented profitability result.
- Separate data completeness/freshness scores, evidence strength and calibrated statistical probability. Example `0.94` confidence has no demonstrated calibration. Use transparent components and labels until validation exists.
- Freeze metric definitions: net-sales/tax/tip/refund accounting, actual versus theoretical food cost, burdened labor, prime-cost denominator, timezone/business day, comparison windows, currency and integer-cent rounding. P&L and inventory-derived cost require their own coverage/reconciliation gates.
- Rule definitions need a bounded validated DSL: no arbitrary SQL/code/expression execution, bounded nesting/runtime, versioned formulas, author authorization, audit and resource limits.
- Preserve financial evidence independently of model output. Schema validation alone cannot prove narrative numbers/claims are faithful; render authoritative values from typed evidence, validate cited evidence IDs/claims, and fall back to deterministic narration.
- Impact ranges need assumptions and formula provenance; do not sum overlapping opportunities or claim causal/guaranteed savings. Safety/permission gates cannot be overridden by confidence or weighted priority.
- Raw data preservation must mean permitted, minimized, classified retention; exclude PAN/CVV and unnecessary PII before raw archival. Cross-location/investor views require explicit scoped membership, not organization ID alone.
- Synthetic scenarios and 100k-record benchmarks prove bounded functionality, not real-world diagnostic accuracy. Validate with consented operator data and measured false positives before commercial claims. Current vendor pricing/API access references in the pasted document are not reproducible source URLs and remain unverified.

Recommended first Intelligence slice after scope authorization: CSV import with provenance and tenant isolation -> defined sales/data-quality metrics -> a small versioned deterministic rule pack -> finding evidence view and printable owner report. Mock/template narrative first; live providers remain flagged off with actual prompt/token logging. Forecasting, broader connectors, health-score aggregation and chat follow when metric quality is demonstrated.

## Verification and next work

No application code, schema, tests, dependencies, database or hosting changed. Source spot checks above performed; document link/line checks performed by Codex. No application tests or production certification claimed.

Pending human decision: the user was asked whether the Intelligence brief remains planning, authorizes an integrated build, or authorizes a separate service/repository. No answer yet; code implementation remains pending. Continue the accepted POS design with full-service split/coursing gates. Technical choices such as SSE versus WebSockets and test harness selection should be resolved by engineering evidence without requiring the operator to orchestrate them.
