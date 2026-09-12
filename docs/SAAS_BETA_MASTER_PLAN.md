# CulinaryOS SaaS beta master plan

Status: PROPOSED FOR OPERATOR REVIEW. Assessment: 2026-09-10. This document contains no implementation authorization beyond the separately approved stage. No application code, database, hardware configuration, or deployment was changed during this assessment.

This plan supersedes conflicting product-boundary recommendations in APP_CONSOLIDATION_PLAN.md, APP_SURFACE_OWNERSHIP.md and PRODUCT_REASSESSMENT_AND_REVIEW.md. In particular, **Marketing remains separate; Web is the restaurant-specific guest storefront; the demo is an isolated sandbox.** Previous passing test counts and navigation changes are not evidence of release readiness.

## Implementation checkpoint: 2026-09-11

Stage F containment approved in the subsequent conversation: the legacy payment
routes `/v1/payments/terminal/process`, `/v1/payments/split`, and
`/v1/payments/tabs/preauth` return `503 PAYMENT_FLOW_UNAVAILABLE` before their
placeholder handlers execute. They cannot report paid/authorized state or write
fabricated payments through these paths. This applies with or without Stripe
configuration. Clients must treat the response as unavailable, preserving checks.

Evidence: six route regression cases cover repeated submissions and zero database
access; the existing demo payment guard also passes (7 tests total, 59 assertions).
Server typecheck passes. No processor or physical hardware was exercised.

These flows remain disabled until processor verification, tenant/account/order
binding, integer-cent validation and idempotent atomic settlement are implemented.
Terminal intent creation, capture/refund correctness, billing webhook hardening
and POS hardware capability UI remain open. Rollback is limited to this route
guard and its regression file, but restoring fabricated settlement is unsafe.

## 1. Product and launch decisions

CulinaryOS will be one TypeScript codebase with one authoritative restaurant domain model, one authenticated API and one design system. It will have different entrypoints for different jobs, not a universal screen that exposes all applications everywhere.

The first release is an **invite-only SaaS beta using Vercel and Supabase**. Self-hosted packaging and public open-source distribution follow after the SaaS workflows are reliable. Preserve portable domain packages and migrations now; do not build a second self-hosted implementation. No public launch or actual hardware support is claimed until the gates below pass.

Confirmed decisions: a separate authenticated manager hub; POS and KDS devices remain within their assigned workspace; consolidated management functions instead of separately branded KitchenKit/Ops/RecipeOS experiences; utility-first restaurant UI; all-page/all-function operator review. Standard, documented hardware families are preferred over proprietary one-off integrations.

### Target experience map

| Experience | Default destinations | What must not appear |
| --- | --- | --- |
| POS, phone/tablet/desktop | Sell, Tables, Checks, Shift | KDS, customer display, recipes administration, app marketplace, business settings for ordinary staff |
| KDS, tablet/PC | Tickets, All Day, Recall; assigned station | POS sales screens, payment tools, business administration |
| Manager hub | Overview, Catalog & Recipes, Inventory, Purchasing, People, Reports, Settings | Duplicate KitchenKit/Ops/RecipeOS app shells and generic Tools junk drawer |
| Guest storefront | Restaurant menu, item customization, bag, checkout, order tracking | Platform demo data, staff navigation, internal inventory or costs |
| Customer display | Paired check, gratuity, verified payment status | Staff session, independent totals, manager controls |
| Marketing | Product, pricing, documentation, beta request | Restaurant operational tools |
| Demo | Clearly labelled sandbox of selected workflows | Production tenant records, real payment credentials, live hardware actions |
| Desktop packaging | Assigned device profile and local diagnostics | Universal iframe/F-key app switching |

The manager hub has a clean tile launcher for authorized **management modules**, with icons, short descriptions and consistent ordering. It does not reintroduce every legacy app as a destination. Device enrollment links live under Devices; changing a device profile requires an authorized manager and audit record.

Production URLs are configured by entrypoint, not derived from localhost port numbers. Development ports remain temporarily compatible. The existing Web project hosts tenant storefront routes; Marketing retains its own deployment; the demo uses a separate environment/data boundary. The existing Admin project becomes the management hub rather than adding yet another frontend.

## 2. Evidence-backed assessment

This is a source review, not proof of deployed exposure or a complete runtime audit. Three focused developer reviews covered POS/permissions, kitchen/realtime, and inventory/consolidation. Critical findings were cross-checked against source. No production data was inspected.

| Priority | Confirmed source finding | Evidence | Consequence |
| --- | --- | --- | --- |
| BLOCKER | Global device credentials accept a caller-selected tenant; API-key identity passes manager authorization. | `apps/server/src/middleware/auth.ts`, `lib/rbac.ts` | Hidden tabs alone cannot protect tenants or restricted functions. |
| BLOCKER | V15 contains anonymous-friendly and unconditional recipe/inventory policies; V7/V15 define incompatible recipe composition tables. | `supabase/migrations/V15__kitchenkit_schema.sql`, V7 | Fresh migration and live policy audits are required before beta data. Actual deployed policy/grant state remains unverified. |
| BLOCKER | Terminal completion writes a hardcoded 2500 amount and paid state without verifying provider settlement; split payment fabricates completion. | `apps/server/src/routes/payments.ts` | Payment methods must remain unavailable for live use until server settlement is repaired. |
| BLOCKER | SaaS billing webhook accepts unsigned JSON when its signing secret is missing, even if a live DB client exists. | `apps/server/src/routes/billing.ts` | Fix separately from the previously hardened restaurant-payment webhook. Missing live secrets must fail closed. |
| RISK | Signup auto-confirms email but tells the customer to verify; tenant membership/subscription errors are not reliably checked. | `apps/server/src/routes/signup.ts` | Invitation, verification, atomic/recoverable provisioning and entitlement checks need real implementation. |
| RISK | KDS sends POST for bump/hold/fire while routes register PATCH. Demo catches can mask failures. | `apps/kds/src/pages/Station.tsx`, server `routes/kds.ts` | Direct explanation for failed actions; test real handlers with the actual client. |
| RISK | Kitchen ticket state defaults and client filtering disagree; realtime ticket insert may arrive before its items; item completion is local React state. | Event-bus order handler, V8, KDS realtime/TicketCard | Tickets can be absent, incomplete or inconsistent between stations. |
| BLOCKER | Send changes order state before all dependent writes finish, and bump does not emit the event used by downstream readiness handling. | Server order/KDS routes and event-bus handlers | A partial send may not recover with normal retry; kitchen completion may never reach POS. |
| RISK | Ticket drawer stays open because page changes and overlay state have different owners. | POS `App.tsx`, `OrderView.tsx` | Fix transitions without discarding the check. |
| RISK | Payment choices are static; reader pairing is a name selection; QR is an icon/fabricated URL. | POS checkout and settings | Configuration is not connectivity or readiness. UI cannot certify payment. |
| RISK | Clock-in timestamps/drawer actions and custom role endpoints include local or process-memory behavior. | POS Staff/Dashboard, server Admin roles | Reloads, multiple devices and tenants do not have reliable shared state. |
| RISK | Null Supabase client is exported with a TypeScript non-null assertion then dereferenced by recipe hooks. | KitchenKit Supabase module/useRecipes | Missing configuration causes the reported auth error; not a valid empty state. |
| RISK | PO receiving is nontransactional/retry-unsafe; waste logging does not consistently post inventory movement. | Server pantry receiving, KitchenKit shelf-life hooks | Stock, receipts, waste and availability can disagree. |
| RISK | Shared style tokens, dimensions and dark mode conflict; several layouts retain desktop sidebars on small screens. | Shared UI; KitchenKit/Ops/RecipeOS layouts | Importing a shared stylesheet has not unified the product. |
| RISK | UI doctor emits hardcoded success; mocked/simulation tests are presented as stronger evidence than they provide. | CLI system doctor; tests | Existing green counts cannot certify the beta. |

Missing modifier functionality is partly a discoverability/wiring issue: modifier UI already exists, but only some items open it, required choices can be silently defaulted, and catalog authoring is incomplete. Reuse and repair those primitives instead of writing a disconnected second addon system.

## 3. Operational user flows

### POS sale and payment

```text
Approved device → staff authentication → active time record check
  → if not clocked in: explicit Clock In step → POS
  → Sell / Tables / Checks / Shift

Sell or selected table → create/resume check → Seat 1 selected initially
  → item card → item details/modifiers/addons → validate → Add to check
  → Send → durable order/kitchen commit → acknowledged kitchen status
  → Pay → available tender → pending/authorized/completed or failed
  → verified paid/comp balance → receipt → next sale
```

- Home becomes a compact task start, emphasizing New Sale, Tables and Open Checks. Remove the informational left panel there. The live ticket pane appears only while working on a check and can collapse without losing the order.
- Primary destinations are stable; Pay/Send/Comp/Void/Transfer operate on a selected check. One controller owns ticket and checkout overlays. Navigation closes overlays, restores focus and preserves the check; cancellation returns to the originating context.
- Every item opens a consistent detail sheet: description, price, variant, required/optional modifier groups, addons, quantity, notes and seat. An explicit secondary quick-add control may be enabled only for items with no required choices. Do not silently choose the first required option.
- Modifier groups have minimum/maximum selections, defaults, price adjustments, availability and kitchen naming. Validate on client and server, with price/modifier snapshots on order lines.
- Seat 1 is the default for a new check. Seats reflect cover count, with tabs while space permits and a labelled selector otherwise. Shared items are explicit. Switching pages or editing an item preserves seat selection.
- Menu grids page within usable screen space. Start with 2 columns on phones, 3 on portrait tablets, 4 on landscape tablets and 5 on wide desktops, reducing columns when larger text requires it. Use swipe plus visible previous/next controls and page count; no gesture-only access. Search/category/resize must not omit or duplicate items. Page swipes never hijack an open editor, text selection or form scrolling.

### Tender readiness and manager approval

Payment choices have separate states: **unsupported, not configured, disconnected, checking, ready, busy, error**. Hide methods disabled by restaurant policy or not supported by the device. Show configured-but-unavailable methods disabled with a short reason and an authorized troubleshooting path. Unknown/stale status is not ready. Recheck immediately before use and show errors without losing the check.

Card-present uses the certified Terminal integration only; embedded online card forms are not a substitute. Real processor state must match tenant, connected account, currency, order version and outstanding amount. A successful reader interaction is not necessarily captured payment. Each payment/refund/write has idempotency, integer-cent validation and reconciliation.

QR payment creates a server-issued, expiring, tenant/check-scoped checkout URL rendered with a real QR encoder. Scan tests decode it. An expired or changed check must obtain a refreshed session. No manual Confirm QR Paid action and no browser message may mark payment complete.

Comp requires a server-verified manager approval for that check/version/amount/reason, expires quickly and is single-use. It cannot be simulated by entering a name or flipping client state. Comp records an audited adjustment, not captured processor funds. Role templates cannot disable mandatory security or tip-engine exclusion rules.

Cash readiness depends on the configured cash workflow and an open drawer session, not a payment reader. Manual drawers may be supported only as an explicit owner-configured workflow; UI must not claim electronic drawer-state detection where the hardware has no sensor.

### Staff time and Shift

```text
Clock In → optionally assume/open assigned drawer with opening count
  → service: sales + approved cash movements
  → Shift review: checks/tips/count → variance → approval/reconciliation
  → close drawer session → immutable close report
Clock Out is a separate time event, not a local login timestamp.
```

Reauthentication does not create duplicate clock-ins. Preserve actual worked-time records even if cash reconciliation is unresolved; flag exceptions for review rather than falsifying or silently extending time records. Business day boundaries use the restaurant's timezone and configured cutoff, including daylight-saving changes.

Move drawer controls out of Home/Ticket into Shift. Opening count, no-sale opening, paid-in/out, blind count, expected amount visibility, reconciliation and Z-close have separate permissions. Closeout checks outstanding/unverified tickets; approved overrides carry reason and audit evidence. Z reports snapshot finalized accounting and never erase transaction history. Separate employee shift, drawer session and business-day close.

Toast's documented shift/cash permission distinctions support this structure; CulinaryOS should implement its own role contract rather than duplicate Toast's UI verbatim. [1]

## 4. Kitchen workflow, pacing and shared availability

### Reliable kitchen state

Preserve `PATCH /v1/orders/:id/send` and the `pos:order:created` contract. Send must atomically persist order changes, routed ticket items and event/outbox state, or report a clear pending/failed state. Retries must not duplicate kitchen work or stock deductions. Realtime is notification, not the source of truth: refetch canonical snapshots after reconnect and detect stale versions.

Use one typed state contract for held, scheduled, fired, in-progress, ready, bumped, recalled and cancelled behavior. Map old values explicitly; do not make filtering depend on inconsistent spellings. Persist item completion, ticket actions and Expo handoff. A station completion does not mean the whole course is ready. POS receives acknowledged readiness through the same domain events.

Catch-up uses an ordered durable event sequence and per-device cursors, not random UUID ordering or a single shared delivered flag. One KDS must not acknowledge away another device's work. Authorized private-channel access and REST access must use compatible authenticated identities; tenant names in channel strings are not security boundaries.

### KDS layout

- Tickets view uses a device-size-aware grid with readable table/check, server, course, age and station information. Allow compact/standard/large density and configurable header fields within required identifiers.
- Clicking/tapping the ticket header opens details; a visible three-dot action menu exposes allowed operations. Long-press is optional equivalence, never the only way to act. Line completion and ticket bump have distinct targets to avoid accidental dispatch.
- All Day replaces the main canvas with grouped quantities by item, modifier and relevant state; it is not a small extra horizontal strip. Each aggregate can reveal source tickets. Recall has durable history and permission-checked restore semantics.
- Age/overdue cues use labels/icons as well as colors. Held time, active cook time and total ticket age remain distinct. Adjustable warning thresholds are saved and validated, not decorative settings.

### Deterministic coordinated firing

For a course with a shared target-ready time T and item duration d, planned fire time is T minus d. The initial target is the start of the longest known-duration item plus that duration. Effective cook duration is the saved base time plus explicit modifier adjustments; unknown durations require a visible warning/manual policy rather than invented estimates. Saved times are operational estimates, not food-safety measurements.

```text
Course: burger 10 minutes + salad 3 minutes
00:00  Burger fires; salad remains scheduled
07:00  Salad becomes due and fires to salad station
10:00  Target ready together; actual completion still requires staff action

Well-done burger 12 minutes + salad 3 minutes → salad due at 09:00
```

Durable database schedules survive API/KDS restart. A bounded due-job runner claims/version-checks work and processes each transition idempotently. Expo can fire now, hold or replan unfired items with a reason; already-fired work is never silently reset. Delays cannot guarantee simultaneous completion: show deviations, allow Expo intervention, and preserve actual timestamps. Toast documents prep-time and modifier-aware firing; this proposal uses the same established workflow category without requiring AI. [2]

### 86, quantities and inventory

Keep manual stop-sale separate from stock tracking. Modes are unlimited, explicitly limited portions, and recipe-derived stock. Manual 86 wins even when tracking is unlimited. Restoring availability must not invent a count such as 10. Only Expo and authorized administration can change availability by default; other users can report a problem.

POS, KDS, catalog and storefront read one availability projection and receive tenant-scoped versioned changes. Server submission rechecks availability to handle simultaneous orders. Distinguish draft demand, committed reservations and consumed/wasted stock. Consume or reserve each quantity once at the defined order transition; void/refund does not automatically restore already-prepared food.

## 5. Catalog, inventory, purchasing and reusable recipes

### Canonical ownership

| Domain | Canonical data and operations | Main UI |
| --- | --- | --- |
| Catalog | Menu/category/item/variant/modifier CRUD, channel visibility, prices, station routing, prep times | Catalog & Recipes |
| Stock | Tenant SKU, barcode aliases, base unit, on-hand ledger, locations/lots/expiry, min/max pars | Inventory |
| Purchasing | Vendors, supplier item/pack offers, PO, receipts, credits, costs | Purchasing |
| Recipes/prep | Versioned recipes/subrecipes, ingredient links, yield/scaling, prep production | Catalog & Recipes and Inventory |
| Audit | Counts, variance approval, waste, costs and movement history | Inventory and Reports |

Stock quantities use precise decimal arithmetic; transaction totals remain integer cents. Unit conversions are explicit: mass/volume need ingredient-specific density, and a case needs an item-specific pack definition. Supplier cost per pack and normalized base-unit cost are distinct. Barcodes remain strings with leading zeros and identify a product/pack, not an assumed universal tenant SKU.

One append-only movement service handles receipt, transfer, waste, count adjustment, preparation consumption/output and committed order consumption/reservation. Every movement has tenant/location/item, quantity/unit snapshot, actor, source and idempotency key. Reconcile existing balances before migration; do not simply add several existing stock counters together.

### Receiving and counts

```text
PO or supplier document → private upload → extraction draft
  → human matches items/packs/prices/tax → receive actual quantities
  → atomic receipt + movements + PO status → updated stock/availability

Scheduled count → scan barcode → confirm pack/unit + quantity
  → counted lines → variance review → authorized post once → audit report
```

Partial receipts stay partial, duplicate uploads/receipts are detected, and retries cannot double stock. OCR is assisted entry, never automatic acceptance. Unknown items and ambiguous units require review. Use signed private storage uploads rather than pushing large scans through the API request body; Vercel documents a request-size limit. [3]

Weekly/monthly counts are schedules over one count-session implementation. Record cutoff/version and intervening movements so sales during counting do not corrupt variances. A bottle scan resolves the pack, then the operator enters bottles/cases/fractional quantity as applicable. Camera and HID scanner paths both have manual entry fallback. Waste captures reason, quantity, stock/recipe basis and optional evidence, then posts exactly once to inventory and availability.

### Shared reference library

Publish only platform-curated, licensed/provenanced reference items, UOM definitions, barcode/pack metadata and basic recipe templates. Maintain these as versioned reference data with a controlled publication path, not a shared writable folder of tenant records. All tenants can browse starter recipes and copy selected templates into their own catalog; imported recipes remain drafts until ingredient mapping and costs are reviewed.

Tenant costs, vendor contracts, receipts, staff, recipes/adaptations and stock balances remain private by default. Public contribution is a separate explicit opt-in moderation workflow, deferred from beta. Global template changes must not silently overwrite tenant adaptations.

KitchenKit, Ops and RecipeOS unique functions move into these domains through adapters and ID mappings. Empty data, unavailable configuration, expired authentication and network error are different states, each with an actionable message. No crash or fake operational data when a restaurant has not configured recipes or inventory.

## 6. Permissions, devices, settings and design foundation

### Authorization and enrollment

Supply editable permission-group templates: Owner, Administrator, Manager, Cashier, Server, Expo, Cook and Inventory Clerk. Server enforcement evaluates tenant/location membership, device profile, assigned capability and action context. Custom groups can grant only delegable capabilities within the grantor's authority; no self-escalation, removal of the last owner, or elevation through a device key. Platform administration is not a restaurant role.

Owner/authorized admin creates a short-lived, single-use enrollment request; phone/tablet scans it; manager confirms device/location/profile; server issues revocable scoped identity. PIN authenticates staff on an approved device—it is not a public internet credential for arbitrary tenants. Enrollment QR is separate from guest checkout QR. No sensitive credentials in a QR URL, logs, screenshots or browser history. Revocation and role changes invalidate access and cached sensitive state; tenant switch partitions/refetches data.

Manager approval on POS authorizes a specific action; it never turns the terminal into a cross-app manager hub. Settings are hidden from ordinary staff and denied by routes/API. Staff may retain narrowly scoped preferences such as text size if authorized, without granting business settings access.

### Settings and diagnostics

Each setting needs a declared type, validation, scope (user/device/location), persistence, effective-state readback, permission and test. Display draft/saved/applied/error states separately. Device setup reports configured, detected, connected and verified independently. Test print, paper/cover state where reported, reader probe and scan test are actual operations with timestamps; an unsupported sensor reports unknown, not success. Cash-drawer kick tests require an explicit operator action.

Settings use grouped navigation with full readable labels and responsive drawer/stacking. Shared semantic tokens govern every module; remove undefined aliases, conflicting global palettes and fixed desktop sidebars. Default body text starts at 16px with larger POS/KDS item text and adjustable scale; important transaction text is not 10–12px. Verify at 200% zoom. Touch targets are at least 48px, with 8px separation, visible focus and fixed loading bounds. Large text reduces grid density instead of clipping labels.

Use light high-contrast POS and dark high-contrast KDS defaults with the same brand, icon family, spacing and state language. Theme/text controls must persist and visibly apply. No ornamental colors that conflict with availability/urgency meanings.

## 7. SaaS architecture and hardware pilot

### Hosting and runtime

Retain React/Vite, shared TypeScript packages and Hono. Deploy purpose-specific frontends and request-oriented Hono API on Vercel; Supabase owns Postgres, Auth, private Storage and Realtime. Extract application construction from process startup. Never depend on a boot-time realtime subscription, module-local queue, or in-memory role/tenant store surviving function lifecycle.

Persist transaction/outbox changes in Postgres. Use private authorized Realtime for updates plus snapshot/version catch-up. Use Supabase Cron for bounded database due transitions and Supabase Queues with bounded consumers for retryable OCR/integration work. Application idempotency is still required: queue visibility guarantees do not mean exactly-once business effects. Current Supabase documentation supports second-level Cron; measure scheduling latency under load before enabling automatic pacing. [4][5]

Vercel now documents WebSocket support with maximum-duration disconnects; the reason not to retain the immortal bridge is lifecycle/recovery correctness, not a blanket assertion that WebSockets are impossible. [6] Keep event contracts transport-independent for later self-hosting.

Separate development, sandbox demo, staging and production Supabase projects/configuration. Production missing credentials is a failed readiness check, never a demo fallback. Invite acceptance must verify identity and reliably provision organization/location/membership; retries and partial failure require recoverable state. Distinguish SaaS subscription billing from restaurant customer payments. Both webhook families verify signatures, deduplicate events, check DB errors and retry failed processing rather than acknowledge lost work.

Owner billing/plan changes are permission-checked. Beta invitations and feature entitlements are server-enforced. Do not interrupt an active paid service workflow because a transient subscription lookup fails; define a logged grace/read-only escalation policy before paid commercial rollout. No pricing, paid plan purchase or production migration is performed by this plan.

### Pilot hardware candidates, not certified support

| Role | First qualification target | Integration and evidence |
| --- | --- | --- |
| Card-present | Stripe Reader S700; WisePOS E as secondary target | Official Terminal integration and Connect account binding. Choose exact reader/firmware and online integration before certification; no browser-offline payment promise. [7] |
| Receipt | Star TSP143IVUE Ethernet/CloudPRNT | Vendor-supported cloud printing, official sample SDK/protocol and status callbacks. Confirm exact firmware/model capabilities. [8] |
| Drawer | Printer-compatible drawer connected to the printer's designated drawer port | Validate voltage/cable/pulse and available sensors for the exact printer/drawer pair; do not infer compatibility from connector shape. |
| Scanner | Zebra DS2208 USB HID on PC/tablet with supported USB host | Documented keyboard-HID path, leading-zero and terminator handling. Phones use camera/manual fallback unless a scanner pairing is qualified. [9] |
| POS/KDS | Current supported Chrome/Edge PC and qualified tablet browsers | Responsive app usable broadly; hardware features enabled only for the certified browser/device path. No arbitrary USB driver installation from a webpage. |

Star provides published SDK samples; Epson TM-m30III/ePOS is a documented alternative for a later qualification pass. Prefer official downloads and reproducible setup recipes, using community reports as leads rather than compatibility proof. [8][10]

Cloud services cannot directly probe a restaurant's private USB/LAN equipment. Use the printer's supported outbound cloud protocol, supported reader APIs, or a separately signed and enrolled local adapter where needed. Do not expose a restaurant LAN port to the internet. Cloud printing/card processing require connectivity for this beta; pending print/payment states must remain explicit. Full offline hardware service is a later certified feature, while offline order drafts/recovery remain a beta requirement.

## 8. Delivery sequence and review checkpoints

Stages are dependency ordered, not a promise to implement the whole backlog in one change. Each implementation PR covers one feature or defect and stays within 20–50k estimated agent tokens; listed multi-PR stages are subdivided before work. Estimates are planning effort, not an approved token budget. No security fix is rolled back to an unsafe live path; disable the affected operation instead.

| Stage | PR-sized work and affected areas | Exit evidence | Rollback |
| --- | --- | --- | --- |
| A — truthful baseline | Route/action inventory, test classification, honest doctor, fresh migration/build reproduction; docs/tests/CLI | Every feature marked working/broken/scaffolded/unverified; no fabricated pass | Documentation/test-only revert |
| B — security foundation | Separate PRs for RLS/schema forward repair, device/service auth, custom groups, invitation/billing webhook safety; server/auth/db/migrations | Real DB isolation, role/device denial and signed/replayed webhook tests | Additive migrations; feature quarantine, not permissive auth |
| C — canonical catalog | Item/category/modifier editor, recipe composition/UOM/availability contracts; Admin/server/shared | Create/edit/publish actually reflected in POS and storefront; tenant proof | Versioned published catalogs and ID adapters |
| D — POS order workflow | Separate PRs for overlay fix, Sell/Home/tables, editor/seats, responsive pagination; POS/shared UI | Complete unpaid order journey with saved modifiers/seats, no inaccessible controls | Route-level rollout flag; preserve checks |
| E — kitchen reliability | Method/state fixes, atomic send, persisted line actions/Expo/86 updates; KDS/event-bus/server | Real POS→KDS→Expo→POS flow, restart/retry/cross-station tests | Disable new pacing; keep stable send/event contract |
| F — payments/hardware | Settlement repair first, then capability gating, real QR, comp approval, certified printer/reader adapter; POS/payments/devices | No spoofed paid state; exact-once money; physical reader/print evidence | Unsupported tender disabled; preserve ledger |
| G — shifts and cash | Time punches, drawer sessions, cash movement, reconciliation/Z report; People/POS/reports | Two-device persistent shift/day-close walkthrough and audit | Append correction entries; never rewrite money/time history |
| H — inventory core | Stock/UOM/ledger, partial receiving, counts, waste and recipe consumption; server/db/hub | Concurrent/idempotent movements and correct variance/cost reports | Reconciled dual-read adapters; no destructive drops |
| I — inventory assistance | Barcode counting, PO OCR review, scheduled count templates, curated recipe starter library | Scan/unknown-code/unit/OCR-error cases; private/public isolation | Disable assistive feature; manual entry remains |
| J — pacing and KDS UX | Full All Day/Recall/layout controls, durable coordinated firing and Expo overrides | Clock-controlled timing tests plus real-device service trial | Manual fire fallback with visible pending work |
| K — unified management | Absorb remaining Ops/KitchenKit/RecipeOS functions, remove duplicate shells only after parity; shared UI/hub | Every old function mapped, missing-data states safe, roles/themes work | Read-only legacy references until migration verified |
| L — beta operations | Vercel/Supabase adapters, environments, CI, observability, backup/restore, support/runbooks | All beta gates below; invited pilot restaurant signoff | Previous deploy + restore rehearsal + feature kill switches |

Shared UI/token repairs start in C/D and accompany each migrated module. They are not deferred until all functionality is built. Marketing/guest/demo separation and authenticated hub navigation are implemented with the relevant entrypoint stages, not a late cosmetic cleanup.

Each stage requires: requirement restatement, exact changed-file list, scoped estimate, rollback, regression test, operator walkthrough and decision. New business API operations ship matching CLI commands. Backend changes also cover MCP capability restrictions where exposed.

## 9. Acceptance and definition of deployable beta

No percentage can guarantee defect-free software. "Deployable" here means the agreed invite-only feature set passes explicit release gates, with unsupported capabilities visibly unavailable and documented.

1. **Isolation:** fresh migrations succeed; actual RLS/grants/storage/realtime policies tested with two tenants, anonymous/user/device/manager identities. Tests detect deliberately weakened isolation; no service secret in browser builds. Credential revocation and custom-role escalation tests pass.
2. **Money:** test-mode processor integration, split conservation, partial refunds, stale totals, mismatched tenant/account/order/currency, duplicate submits/webhooks and pending capture. No failed/pending operation marks a check paid. Comp is approved/audited. Both SaaS and restaurant payment webhook paths fail closed.
3. **Service:** real separate POS/KDS contexts create, modify, send, receive, complete, bump, recall and update 86/counts. Reconnect and dropped notifications converge without duplicate work. Suggested connected-beta target: p95 acknowledged UI update within 2 seconds under the documented pilot load, measured rather than assumed.
4. **Pacing:** 10/3 and 12/3 minute examples; modifier change before/after fire, manual hold, delay, duplicate worker, server restart, clock drift and station disconnect. Automatic firing stays off if measured due-dispatch lag exceeds the agreed 2-second beta target.
5. **Inventory:** fractional UOM, case conversions, unknown density/barcode, concurrent receipt, partial receipt, retry, failed ledger write, count during sales, double-post count and waste affecting availability once. Starter-library copies never publish private data.
6. **Usability:** 375/390/768/1024/1440 widths, portrait/landscape, 200% text zoom, light/dark, keyboard/focus, screen-reader labels, 48px targets. Every allowed destination/action reachable without horizontal navigation scrolling. Swipes have button alternatives.
7. **Hardware:** exact model/firmware/browser qualification record; disconnect, paper-out/cover state if exposed, network outage, timeout, receipt reprint and no double-charge on retry. Devices without feedback report unknown rather than verified.
8. **SaaS:** invite/verify/provision/recover, location switching, billing/entitlement events, rate limits, safe logs, private uploads, tenant export/deletion procedure and tested backup restore. Monitoring covers API errors, outbox age, stale KDS, payment reconciliation and failed jobs.
9. **Delivery:** clean reproducible builds on supported CI; no production demo fallback, no placeholder buttons presenting success, secret/dependency checks, preview environment isolation and documented rollback. Physical hardware and legal/privacy/terms review remain explicit release prerequisites, not automated claims.
10. **Operator review:** every page, modal and function has separate engineering status and operator approval. A visually approved page can still be blocked technically. Deferred features are listed and hidden/disabled honestly, not silently counted as complete.

The first beta must support the core sale→kitchen→payment→shift loop plus secure basic catalog/inventory administration. OCR, advanced pacing, broad hardware coverage and self-hosted distribution may only enter beta after their individual gates pass; they are not required to expose an unsafe placeholder early. All remain in this master backlog.

## 10. Guided review order

Resume after master-plan review, one page/function group at a time: POS access/clock-in → Home/Sell → Tables → item editor/modifiers/seats → ticket/send → checks → payment/readiness/QR/comp → Shift/drawers → authorized settings; KDS receive → completion/Expo → full All Day/Recall → 86 → timing/customization; hub catalog → recipes → inventory → receiving/OCR → counts/waste → people/permissions → devices/settings → reports; guest storefront → paired display → marketing/demo separation → SaaS invitations/billing/diagnostics.

For each record: stable ID, current behavior, desired behavior, role/device, acceptance test, current evidence, operator feedback and disposition. Record every issue from the current review as a requirement, not as an already-fixed item. Preserve existing uncommitted work; do not bulk reset or merge unrelated repositories during implementation.

## Sources

1. Toast, [Shift review permissions](https://doc.toasttab.com/doc/platformguide/platformShiftReviewPermissions.html) and [Cash management permissions](https://doc.toasttab.com/doc/platformguide/adminUserPermissionsCashMgmt.html): separation of shift, drawer and close-day privileges.
2. Toast, [Firing by item prep time](https://doc.toasttab.com/doc/platformguide/adminFireByPrepTime.html): preparation-time scheduling and modifier adjustments. Square, [Manage seats](https://squareup.com/help/us/en/article/8583-manage-seats-in-your-restaurant) and [Create/edit modifiers](https://squareup.com/help/us/en/article/5119-create-and-manage-item-modifiers): seat organization and item-customization patterns.
3. Vercel, [Function limits](https://vercel.com/docs/functions/limitations): upload/request constraints.
4. Supabase, [Cron](https://supabase.com/docs/guides/cron): durable database scheduling options.
5. Supabase, [Queues](https://supabase.com/docs/guides/queues), [Realtime Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): queue semantics, notifications and access boundaries.
6. Vercel, [Hono](https://vercel.com/docs/frameworks/backend/hono), [WebSockets](https://vercel.com/docs/functions/websockets): hosting adapters and duration/reconnect constraints.
7. Stripe, [Terminal collection](https://docs.stripe.com/terminal/payments/collect-card-payment?terminal-sdk-platform=js), [JavaScript reader state API](https://docs.stripe.com/terminal/references/api/js-sdk), [Connect](https://docs.stripe.com/terminal/features/connect): integration and verified readiness. SDK/reader-specific offline claims require separate qualification.
8. Star Micronics, [TSP143IV](https://starmicronics.com/product/tsp143iv-thermal-receipt-printer/), [CloudPRNT setup](https://starmicronics.com/help-center/knowledge-base/how-to-configure-a-url-for-cloudprnt/), [Protocol and sample source](https://star-m.jp/products/s_print/sdk/StarCloudPRNT/manual/en/cputil.html): exact-model configuration and published implementation material.
9. Zebra, [DS2200 support](https://www.zebra.com/ap/en/support-downloads/scanners/general-purpose-scanners/ds2200-series.html), [DS2208 reference guide](https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/product/ds2208-prg-en.pdf): USB/HID setup.
10. Epson, [TM-m30III technical reference](https://files.support.epson.com/pdf/pos/bulk/tm-m30iii_trg_en_revf.pdf): alternative printer integration reference.

## 11. Addendum — independent audit thoughts (2026-09-10, advisory only)

Four parallel read-only audits (POS, KDS/kitchen, inventory/catalog,
platform/SaaS) plus source spot-checks corroborate the §2 table. No code
was changed. Detail per function lives in `MAKER_AUDIT_PLAN.md`; this
section records only what is new or load-bearing for the beta decision.

### 11.1 Fresh line evidence for §2 BLOCKERs
- Device-key manager pass-through is by construction, not accident:
  `middleware/auth.ts:87-88` yields `authMode='api_key'` for a global
  `DEVICE_API_KEY` plus caller-chosen `X-Tenant-Id`, and
  `lib/rbac.ts:19` returns `'ok'` for `api_key`/`relaxed`. Hidden tabs
  cannot fix this; Stage B must ship per-device scoped identity.
- Fabricated settlement confirmed: `routes/payments.ts:73`
  (`let orderTotal = 2500; // default for demo`) and `:157-159`
  (`amount: 2500, status: 'completed'`). Card-present stays disabled
  for live use until server-verified settlement lands.
- KDS method mismatch confirmed live: `Station.tsx:131-199` sends POST
  bump/hold/fire while `routes/kds.ts:105,138,171` registers PATCH,
  with demo catches masking failures in live mode.
- V15 open policies confirmed: `OR auth.uid() IS NULL` (lines 32, 39,
  89, 96, 120) and `USING (true)` (lines 60, 63, 140) in
  `V15__kitchenkit_schema.sql`. Fresh migration plus live two-tenant
  policy audit remains a beta gate.
- Billing webhook fail-closed (missing secret must hard-fail) is still
  asserted, not yet proven — keep it a Stage B exit test alongside the
  restaurant-payment webhook.

### 11.2 Test research — counts are not certification
- 106 `.test.ts` files: e2e 45, server 14, shared 14, empirical 12,
  api 4, event-bus 3, inventory 3, kds 2, hardware 2, and 1 each in
  adversarial, course-firing, installer, payments, reports, ui, web.
- Fresh execution remains blocked from this session: repo-root workdir
  is out of bounds and escalation is unavailable in this permission
  profile, so no new pass/fail was observed. To reproduce, run
  unsandboxed from the repo root: `node ./scripts/run-all-tests.cjs`.
- Static classification, observed 2026-09-10 over all 106 `tests/`
  files: 13 use `mock-kitchen` / `mock_sec_` / `Mock*` fixtures; 8
  reference demo placeholders (`your-project`, placeholder secrets); 9
  reference `service_role`; 1 constructs a Supabase client. Fixture
  coverage is concentrated in pacing, payments-demo, and e2e tiers.
- Prior-run logs (history, not verification — re-run before release):
  `test_output.log` (8/2) ends `TEST SUMMARY: 12 passed, 11 failed`,
  exit 1; `test_results.log` (9/2) ends `TEST SUMMARY: 84 passed,
  12 failed`. Failing files in the 9/2 run: `tests/shared/modifiers`,
  `tests/shared/pricing`, `tests/server/tables`, `tests/server/dayparts`,
  `tests/server/m3_security_ledger`, plus peripheral packages
  (`pdf-tools` incl. `qr.test.ts`, `template-engine`, `seo-tools`).
- Two nuances from the 9/2 log: (a) tip-distribution, shift-close
  Manager-PIN, and Z-report tests show passing lines, so shift-close
  gating has coverage — the ungated path is specifically comp approval;
  (b) e2e tableside-QR tests show passing lines while
  `pdf-tools/qr.test.ts` FAILED — mixed QR evidence, adjudicate by
  re-run, and the POS QR UI remains static regardless.
- Simulation-grade exhibits found by inspection:
  `tests/server/demo-payment-guard.test.ts:38` asserts a `mock_sec_`
  client secret (certifies mock shape, not a live processor), and
  pacing tests run on `lib/mock-kitchen`. Keep these; stop citing
  them as release evidence.

### 11.3 Gaps against the standing dossier
- Tip engine has no stage (FLSA manager-exclusion gates,
  hours-weighted pool, cash-out flow). Either add it or record the
  deferral explicitly — silence will be read as coverage.
- CLI parity is asserted ("new ops ship matching CLI") but has no
  route-to-verb exit proof. Stage A should publish the 23-route map.
- AI flags plus `ai_prompt_log` accounting are absent. Fine to defer
  past beta, but say so.

### 11.4 Recommendation
Approve direction; authorize Stage A (truthful baseline) only. Use
`MAKER_AUDIT_PLAN.md` §8 as the guided review order and §6 as the
stage sequence. No B+ implementation until A lands.

### 11.5 Tooling research (2026-09-10, plan only — nothing installed)
Full matrix lives in `MAKER_AUDIT_PLAN.md` §9 (HAVE/ADD/HOLD per tool
with stage, exit test, kill switch). Two load-bearing results: (a) Hono
RPC (`hono/client` + Zod) is the structural fix for the KDS method
mismatch — mismatches become compile errors; (b) Stripe docs confirm
offline mode is iOS/Android/React-Native SDK only, so the browser POS
path is online-only and beta ships online-only with explicit pending
states. Everything else (Sentry, Playwright, pgTAP-style DB tests,
Tesseract.js default with cloud OCR opt-in, WebAuthn manager approvals,
TanStack Query) is staged, never bundled.

External sources establish available patterns and constraints, not proof that CulinaryOS implements them. Local evidence reflects the working tree at assessment time; deployed resources and hardware have not been certified.
