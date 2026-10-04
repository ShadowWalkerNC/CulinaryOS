# Architecture resilience implementation plan

Date: 2026-09-30. User authorized implementation and Muse CLI task splitting.
This extends [the pilot correctness specification](POS_PILOT_CORRECTNESS_SPEC.md)
and [the PostgreSQL transition design](POSTGRES_TRANSITION_DESIGN.md); it does
not replace their order, payment, full-service split-check or coursing contracts.

## Decisions and execution boundaries

- Retain TypeScript/Hono and a modular server. Fresh Railway PostgreSQL remains
  the target; no legacy Supabase data import. A DATABASE_URL-only configuration
  cannot replace current Supabase auth/data/realtime.
- No Rust application rewrite. The user-requested Pi reference appliance and
  bounded Rust hardware bridge are planned in
  [the hardware/software integration plan](HARDWARE_SOFTWARE_INTEGRATION_PLAN.md).
  That plan extends deployment topology to a local operational writer plus cloud
  synchronization; it does not claim implementation or hardware acceptance.
  Compute workers still require profiling and a measured benefit.
- Each implementation stage is a separate reviewable change. Preserve existing
  payment containment and Muse/UI work. Ownership is recorded in the shared ledger.
- Implement and test locally. Pushes, production database operations, hosting
  changes and release require review of exact commits and evidence by the operator.
- Estimates below are planning ranges, not requested token budgets or promises.

## Stages

| Stage | Severity / requirement | File scope | Est. agent tokens | Exit evidence | Rollback / containment |
| --- | --- | --- | --- | --- | --- |
| R1 Authentication containment | Critical: production demo fallback and caller-selected key tenant; pilot E03/P2b partial | Server secrets, entrypoint, auth route/middleware/RBAC, auth tests, env example, plan/ledger | 10-20k | Invalid production boot refuses listener; direct demo PIN/header access denied; legacy keys bound to one tenant; keys cannot satisfy manager gate; valid JWT membership retained | Revoke/disable affected keys; retain fail-closed behavior; use verified staff JWTs. Do not restore cross-tenant or demo bypasses |
| R2 PostgreSQL identity and tenancy | Critical: trustworthy identity and restricted database access; P3/S1 | packages/db adapter, owned migration directory/runner, server identity/session/device services, CLI credentials/doctor, integration tests, turbo tasks | 25-45k | Disposable DB: real two-tenant allow/deny; pooled connection isolation; revoked/expired devices/sessions; policy negative control; readiness distinct from liveness | No production cutover until passed; no resets; retain previous compatible deployment |
| R3 Order authority and kitchen delivery | High: price authority, committed order with lost/duplicate kitchen effects; P3/S2-S4 and P4b | Order/menu routes, event-bus outbox/consumer, kitchen tickets, KDS catch-up/ack, CLI send/bump, SQL/tests | 25-45k per S2/S3/S4 slice | Server-priced order, transactional outbox, deduplicated side effects; crash-at-write-boundary recovery; reconnect catches up from durable state | Pause unsafe sends; retain/reconcile durable intents and accepted orders |
| R4 Durable offline commands | High: persistence loss and conflicting device replay; P3/S5/P4a | Shared offline store, POS queue/feedback, sync routes, replay diagnostics/CLI and tests | 15-30k per persistence/replay slice | Restart, quota failure and two-device reconnect; same operation ID/different payload rejects; financial conflicts visible; no queued-card settlement | Preserve/export pending commands; disable offline acceptance on integrity fault |
| R5 Payment ledger and reconciliation | Critical: duplicate financial effects; P3/S6/P5a | Payment/webhook/receipt services, transaction constraints, POS/CLI tender operations, provider tests | 25-45k per slice | Durable webhook inbox before ack, duplicate/reordered events, capture/refund caps, timeout recovery, Stripe test account traces | Disable new collection; reconcile in-flight intents; append corrections rather than erase financial history |
| R6 Full-service integrity | High: splits, coursing, cash/business-day close; P5b/P5c/P6 | Existing split/course/drawer services and POS/KDS/CLI contracts, migrations/tests | 15-45k per existing stage | A15/A16 allocations and course dedupe; deterministic close/reopen/cash fixtures | Disable new affected operations; preserve existing allocations, tenders and kitchen history |
| R7 Capacity, fairness and observability | High: report/query/worker pressure, noisy tenants, duplicated workers | Query plans/indexes, bounded job workers, tenant quotas, metrics, load harness, CLI diagnostics | 15-30k per measured bottleneck | Representative rush with reporting + reconnect storms; p95/p99 timings, pool waits, event lag, queue age; two-instance worker claim proof | Reduce worker/report concurrency; preserve order/payment capacity; revert only isolated tuning |
| R8 Recovery and device rehearsal | High: untested restore, old clients, ambiguous hardware delivery; P7 | Backup/restore and rollback runbooks, compatibility tests, device adapter/doctor, rehearsal evidence | 15-30k per rehearsal slice | Restore DB/media/config into isolated environment; prior-client command compatibility; exact printer/reader model and firmware traces; operator support response | Suspend pilot and use approved fallback; preserve all financial and queued-operation evidence |

Dependencies: R1 precedes exposure. R2 precedes new database-backed workflows.
R3-R6 follow the six slices already defined in the transition design. Instrument
latency and lag during implementation; R7 tuning follows measurements. R8 gates
release. Do not add a new queue/cache/service until existing durable PostgreSQL
primitives have been evaluated against observed needs.

## R1 task split and intentional compatibility changes

Codex: production/demo predicates, startup assertion, direct PIN-route guard,
regression tests, environment documentation and coordination.
Muse CLI: legacy key tenant bindings, manager-gate containment, adversarial
middleware/key tests and review. Codex reviews the combined change and reruns
relevant checks before handoff.

Local demos require CULINARYOS_DEMO_MODE=true or AUTH_RELAXED=true and no live
backend/database configuration. Ordinary NODE_ENV=test tests remain isolated
from live services. Production requires usable current Supabase URL/service/anon
configuration and rejects demo flags. This is configuration validation, not a
live authentication/database readiness check.

Legacy device/internal keys on tenant routes require server-side DEVICE_TENANT_ID
and INTERNAL_API_TENANT_ID respectively, outside demo. The keys must differ.
This is temporary single-tenant containment, not a multi-device registry, human
identity, key revocation, or route-capability model. Keys no longer qualify as a
manager. Human manager operations require the verified owner/manager JWT path.
The existing internal service endpoints remain service-key protected and must
receive their own least-privilege/event-envelope audit before exposure expands.

## Evidence and unresolved gates

Record actual commands/results in [the shared ledger](AI_SHARED_LEDGER.md).
Mocked auth/route tests cannot certify real RLS, deployed security, payment-reader
behavior or durable delivery. R1 does not complete P2b's database acceptance gate.

The PostgreSQL design's remaining product choices (PIN-first user model,
non-pilot app disposition, device bootstrap UX) are resolved before their
implementation slices. Safe local containment does not depend on those choices.
