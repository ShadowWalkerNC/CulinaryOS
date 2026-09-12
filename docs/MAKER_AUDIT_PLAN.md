# CulinaryOS Maker Audit Plan

Status: PROPOSED FOR OPERATOR REVIEW. Advisory only — no code changed.
Supersedes conflicting boundaries in earlier docs where noted.
Goal: one repo, one hub, SaaS beta now (Vercel + Supabase), self-host later.

## 0. How to read this plan

- Each item: observed behavior → desired behavior → acceptance test.
- Ratings: BLOCKER (beta cannot ship), RISK (ship only with guard), NIT (polish).
- ToastPOS/Square are workflow inspiration, never verbatim clones.
- Rule: unsupported/unconfigured = hidden or greyed with reason. Never fake success.

## 1. POS

### 1.1 Ticket summary close-out — BLOCKER
Observed: summary won't close out.
Desired: one controller owns ticket + checkout overlays; navigation closes
overlays, restores focus, preserves the check; cancel returns to origin.
Accept: open check → ticket → checkout → back → check intact, twice in a row.

### 1.2 Payment-method gating — BLOCKER
Observed: methods shown without checking hardware/config state.
Desired states per tender: unsupported / not-configured / disconnected /
checking / ready / busy / error. Hide policy-disabled or device-unsupported.
Grey configured-but-unavailable with reason + troubleshooting path. Stale ≠ ready.
Accept: no reader → card-present greyed with reason; pre-use recheck shown.

### 1.3 QR pay — BLOCKER
Observed: QR is icon/fabricated URL (per POS + KDS auditor confirmation).
Desired: server-issued expiring tenant/check-scoped URL, real QR encoder,
scan-decodes, refresh on expiry/change. No manual "Confirm QR Paid".
Accept: phone scan decodes live session URL; expired session rejected.

### 1.4 Comp — BLOCKER
Observed: comp path exists but under-gated (no manager PIN per POS auditor).
Desired: server-verified single-use approval for check/version/amount/reason,
fast expiry, audited adjustment (not captured funds).
Accept: comp without approval fails closed; approval replays rejected.

### 1.5 Home layout — RISK
Remove informational left panel from Home. Compact task start: New Sale,
Tables, Open Checks. Live ticket pane only during active check, collapsible.
Accept: two-tap path Home → Sell and Home → Tables on phone widths.

### 1.6 Item sheet (Square-like) — RISK
Every item opens one detail sheet: description, price, variant,
required/optional modifier groups, addons, qty, notes, seat. Quick-add allowed
only with zero required choices; never silently default required options.
Accept: required-choice item cannot quick-add; defaults explicit + priced.

### 1.7 Modifiers/addons — BLOCKER (missing system)
Groups need min/max, defaults, price deltas, availability, kitchen names.
Validate client + server; snapshot prices/modifiers on order lines.
Accept: min/max enforced both layers; receipt shows chosen modifiers + deltas.

### 1.8 Seats — RISK
Seat 1 default; seats follow cover count; tabs while space permits else
labelled selector; shared items explicit; seat survives page/item edits.
Accept: new check starts Seat 1; mid-order seat switch sticks.

### 1.9 Grid pagination — RISK
Page within usable space (2 cols phones → 5 wide desktop; density drops with
large text). Swipe + visible prev/next + page count; no gesture-only access.
Search/category/resize never omit/duplicate items.
Accept: overflow crossed on 375/390/768/1024/1440 with buttons alone.

### 1.10 Drawers/shifts/day-close (Toast-style) — BLOCKER
Move drawer controls out of Home/Ticket into Shift: opening count, no-sale
open, paid-in/out, blind count, expected-visibility, reconciliation, Z-close.
Separate permissions; clock-in ≠ drawer open; business-day close with
restaurant timezone/cutoff; Z snapshots never erase history.
Z reports snapshot finalized accounting and never erase transaction history.

## 2. Roles, settings, clock-in

### 2.1 Settings gating — BLOCKER
Settings/routes denied to ordinary staff; manager approval on POS authorizes
one action, never unlocks a hub. Templates: Owner, Administrator, Manager,
Cashier, Server, Expo, Cook, Inventory Clerk. Custom groups grant only
delegable capabilities; no self-escalation, no last-owner removal.
Accept: staff token on settings route returns 403; escalation attempts fail.

### 2.2 Settings that actually verify — BLOCKER
Each setting: type, validation, scope (user/device/location), persistence,
effective-state readback, permission, test. Draft/saved/applied/error shown
separately. Test print, reader probe, scan test are real ops with timestamps;
unsupported sensors report unknown, never success. Drawer-kick needs explicit
action. Fix shrunk nav (full labels, drawer/stacking), 16px body minimum,
48px targets, 200% zoom; themes persist and visibly apply.
Accept: every setting shows draft vs applied; fake-sensor success impossible.

### 2.3 Clock-in on login — RISK
Clock In is a time event, not a login timestamp. No duplicate punches on
reauth; unresolved cash never falsifies time. Reload keeps shift state.
Accept: reauth creates zero duplicate punches across two devices.

## 3. KDS / kitchen

### 3.1 Receive/bump — BLOCKER (confirmed)
Client sends POST bump/hold/fire (Station.tsx:131-199); server registers
PATCH (routes/kds.ts:105,138,171). Demo catches mask failures in live mode.
Desired: align methods; keep PATCH /v1/orders/:id/send + pos:order:created;
test real handlers with the actual client.
Accept: live POS to KDS to bump/Recall round-trip with network on.

### 3.2 Ticket layout + actions — RISK
Device-aware grid; header tap opens details; three-dot menu exposes ops
(long-press optional only); line-complete vs bump are distinct targets.
Accept: no accidental bump during line completion; keyboard reachable.

### 3.3 All Day + Recall — RISK
All Day replaces canvas with grouped quantities (item/modifier/state) plus
source-ticket drill-down, not a thin strip. Recall has durable history and
permission-checked restore.
Accept: service trial runs All Day as the main view for a rush period.

### 3.4 Customization — NIT
Density compact/standard/large; configurable header fields within required
identifiers (table/check, server, course, age, station); age cues use
label/icon plus color.
Accept: 48px targets hold at large-text scale; saved prefs persist.

### 3.5 Coordinated firing — RISK
Course target T, item duration d: fire at T minus d; longest item sets the
initial target; modifier adjustments explicit; unknown durations warn, never
invent. Durable schedules survive restart; bounded due-runner is idempotent;
Expo can fire-now/hold/replan unfired with reason. Example: burger 10 plus
salad 3 means burger fires 00:00, salad due 07:00, ready 10:00.
Accept: clock-controlled 10/3 and 12/3 tests plus restart/duplicate-worker.

### 3.6 86 board linkage — BLOCKER
Modes: unlimited / limited portions / recipe-derived stock; manual 86 always
wins; restore never invents counts. One availability projection feeds POS,
KDS, catalog, storefront with versioned tenant-scoped updates; server
rechecks on submit. Expo/admin-only changes by default.
Accept: 86 from KDS hides the item on POS plus storefront within refresh SLA.

## 4. Catalog / inventory / purchasing

### 4.1 Catalog editing — BLOCKER
Item/category/variant/modifier CRUD with channel visibility, prices, station
routing, prep times must persist and reflect in POS plus storefront.
Accept: create/edit/publish visible on POS and storefront same session.

### 4.2 Stock model — BLOCKER
Tenant SKU, barcode aliases (strings, keep leading zeros), base unit, on-hand
ledger, locations/lots/expiry, min/max par. Decimal qty; integer-cent totals.
Explicit conversions (density per ingredient; case per pack def). One
append-only movement service (receipt/transfer/waste/count/prep/order) with
tenant/location/item, qty/unit snapshot, actor, source, idempotency key.
Accept: concurrent receipts plus retries never double stock.

### 4.3 Receiving + counts — RISK
PO/supplier upload goes to private signed upload (not giant API body), then
extraction draft, human match, atomic receipt. Partial stays partial; dupes
detected. Counts run as scheduled sessions with cutoff/version so
sales-during-count stay correct; camera plus HID plus manual fallback.
Accept: partial receipt, retry, count-during-sales, double-post-count tests.

### 4.4 Waste — RISK
Reason plus qty plus stock/recipe basis plus optional evidence; posts exactly
once to inventory plus availability.
Accept: waste reduces availability once; audit shows a single movement.

### 4.5 CulinaryOps / KitchenKit triage — BLOCKER
Confirmed: KitchenKit null-auth crash; Ops reads broken/scaffolded;
duplicated functions across KitchenKit/admin/Ops. Absorb unique functions
into hub domains (Catalog / Inventory / Purchasing / People / Reports) via
adapters plus ID maps; remove duplicate shells only after parity; distinct
empty / unconfigured / expired-auth / offline states, never crash or fake data.
Accept: each legacy function mapped; fresh tenant sees guided empty states.

### 4.6 Shared starter data — RISK
Platform-curated versioned reference (UOMs, pack metadata, starter recipes)
browsable by all; copy-in as draft with ingredient/cost review before
publish. Tenant costs/vendors/staff/stock private by default; public
contribution is deferred opt-in moderation. Template updates never silently
overwrite tenant adaptations.
Accept: new tenant bootstraps a menu from starters in under 5 minutes.

## 5. Platform, apps, SaaS

### 5.1 One hub, app launcher — BLOCKER
Admin becomes the management hub with a clean tile launcher for authorized
management modules only. No duplicate KitchenKit/Ops/RecipeOS shells, no
generic Tools junk drawer. Device enrollment lives under Devices; profile
changes need an authorized manager plus audit record.
Accept: every legacy function mapped; duplicate shells removed after parity.

### 5.2 Device pairing — BLOCKER
Owner/admin creates short-lived single-use enrollment; device scans; manager
confirms location/profile; server issues revocable scoped identity. PIN is
staff auth on approved devices, not a public credential. No secrets in QR,
logs, screenshots, history. Revocation and role change invalidate access.
Accept: unknown phone cannot self-enroll; revocation locks it out.

### 5.3 Diagnostics — RISK
Each check is a real operation with timestamped evidence (test print, reader
probe, scan test, port/daemon/health). Unknown reported as unknown.
Accept: unplugged printer reports unknown/fail, never success.

### 5.4 Entry-point separation — RISK
Marketing separate deployment; Web hosts tenant storefront routes (guest
menu, customize, bag, checkout, tracking — no staff nav, no demo data);
demo is an isolated sandbox with its own data boundary; desktop ships an
assigned device profile, never universal iframe/F-key switching.
Accept: storefront shows only that restaurant; demo writes touch no tenant.

### 5.5 SaaS now, self-host later — RISK
Invite-only beta on Vercel plus Supabase; portable domain packages and
migrations preserved; no second self-host implementation yet. Separate
dev/sandbox/staging/prod projects. Missing prod credentials fail readiness,
never demo-fallback. SaaS billing and restaurant payments are distinct
webhook families; both verify signatures, deduplicate, fail closed.
Accept: staging and prod configs proven separate; unsigned webhook rejected.

### 5.6 Security foundation — BLOCKER
Fresh migrations plus live RLS/grant/storage/realtime audit with two tenants
and anonymous/user/device/manager identities; tests detect deliberately
weakened isolation; no service secret in browser builds. Device-key manager
pass-through (auth.ts plus rbac.ts) repaired per section 2.1. Concrete V15
evidence: anonymous-friendly OR auth.uid() IS NULL clauses (e.g. lines
32, 39, 89, 96, 120) and unconditional USING (true) policies (e.g. lines
60, 63, 140) in supabase/migrations/V15__kitchenkit_schema.sql.
Accept: dropping any RLS policy turns CI red.

## 6. Delivery sequence

| Stage | Work | Exit evidence | Rollback |
| --- | --- | --- | --- |
| A truthful baseline | Route/action inventory, test classification, honest doctor, fresh migration reproduction | Every feature marked working/broken/scaffolded/unverified | Docs/test-only revert |
| B security | RLS repair, device/service auth, custom groups, webhook fail-closed | Isolation + denial + replay tests | Additive migrations; quarantine, not permissive auth |
| C catalog | Item/modifier editor, recipe/UOM/availability contracts | POS + storefront reflect edits | Versioned catalogs + ID adapters |
| D POS order flow | Overlay fix, Sell/Home/tables, editor/seats, pagination | Full unpaid journey, no dead controls | Route flag; preserve checks |
| E kitchen | Method/state fixes, atomic send, line actions/Expo/86 | Real POS-KDS-Expo-POS + restart tests | Keep stable send/event contract |
| F payments | Settlement first, then gating, real QR, comp approval, printer/reader adapter | No spoofed paid state; exact-once money | Disable tender; preserve ledger |
| G shifts/cash | Punches, drawer sessions, reconciliation, Z | Two-device day-close + audit | Append corrections, never rewrite |
| H inventory | Ledger, receiving, counts, waste, recipe consumption | Concurrent/idempotent movements | Dual-read adapters, no drops |
| I assistance | Barcode, PO OCR review, count templates, starter library | Scan/unknown/OCR-error isolation proof | Disable assist; manual remains |
| J pacing/UX | All Day/Recall/layout, durable firing, Expo overrides | Clock-controlled timing + live trial | Manual-fire fallback |
| K hub | Absorb Ops/KitchenKit/RecipeOS, remove dup shells after parity | Function map complete | Read-only legacy refs |
| L beta ops | Env adapters, CI, observability, backup/restore, runbooks | Section 7 gates + pilot signoff | Prior deploy + restore + kill switches |

Each stage splits into PRs at roughly 20-50k estimated tokens, one feature per PR. No security fix rolls back to an
unsafe live path; disable the operation instead.

## 7. Beta gates (deployable = all pass)

1. Isolation, 2. Money, 3. Service POS-KDS loop, 4. Pacing 10/3 + 12/3,
5. Inventory, 6. Usability (375-1440, 200% zoom, 48px targets, keyboard),
7. Hardware qualification record, 8. SaaS (invite/provision/billing/export/
delete/backup-restore), 9. Delivery (clean CI, no demo fallback, rollback
rehearsed), 10. Operator review of every page/function. Unsupported stays
hidden/disabled and listed, never silently counted.

## 8. Guided review order (for your walkthrough)

POS access/clock-in, Home/Sell, Tables, item editor/modifiers/seats,
ticket/send, checks, payment/QR/comp, Shift/drawers, settings; KDS receive,
completion/Expo, All Day/Recall, 86, timing; hub catalog, recipes,
inventory, receiving/OCR, counts/waste, people/permissions, devices,
reports; storefront, paired display, marketing/demo separation, SaaS
billing/diagnostics. Record per item: stable ID, current vs desired
behavior, role/device, acceptance test, evidence, disposition. No bulk
resets; preserve uncommitted work.

## 9. Tools, APIs and SDKs (researched 2026-09-10)

Status key: HAVE (in repo now), ADD (recommend), HOLD (after beta).
Rule: every addition needs a named stage, an exit test, and a kill switch.

### 9.1 API safety — kills the POST/PATCH bug class
- `hc` from `hono/client` (HAVE: ships inside the `hono@^4.4.0` dep) plus
  `@hono/zod-validator` + `zod` (ADD, Stage D/E): zero-codegen typed client
  inferred from route defs; method/path/body mismatches become compile
  errors. This is the structural fix for §3.1, not just a patch.
  Accept: deleting a route breaks the client build; no raw fetch strings
  for versioned routes.
- Keep Zod schemas as the single contract: server validation, inferred
  client types, and CLI arg validation all read the same schema.

### 9.2 Server state on POS/KDS — stops silent divergence
- TanStack Query (ADD, Stage E): canonical snapshots, background refetch
  after reconnect, stale-version detection. Replaces ad-hoc fetch +
  local-state completion that loses item state.
  Accept: reconnect converges without duplicate work; versions visible.

### 9.3 Payments — online-only browser path confirmed
- Verified 2026-09-10 in Stripe docs: offline mode integrations are iOS
  SDK, Android SDK, React Native SDK only — the JavaScript SDK is not
  listed. So the browser POS path is online-only, period; offline card
  collection needs a native wrapper or server-driven cellular reader
  (S710) later. Beta ships online-only with explicit pending states.
- Same page confirms on-reader tipping on smart readers (S700/S710,
  WisePOS E) — use it for the tip-engine v1 reader flow, not a custom
  tip screen that can disagree with the captured amount.
- Future path (HOLD): custom POS app on S700, Tap to Pay evaluation.
  Neither enters beta.

### 9.4 Printing — no change, confirm exact firmware
- Star CloudPRNT on TSP143IV stays the first qualification target;
  Epson ePOS on TM-m30III stays the documented alternative. Only
  addition: record exact model/firmware/browser in the §7 hardware gate
  and test paper-out/cover/timeout/reprint with no double-charge.

### 9.5 Scanning and QR — mostly HAVE
- HID scanners (Zebra DS2208) need no SDK: keyboard-wedge plus
  leading-zero/terminator handling in the count flow (§4.3).
- Camera fallback (ADD, Stage I): `html5-qrcode` or `@zxing/browser`
  for phones without paired scanners; manual entry always remains.
- Real QR rendering (HAVE: `qrcode@^1.5.3` in `packages/pdf-tools`):
  reuse it for server-issued expiring checkout URLs (§1.3). No new QR
  library; the failing `pdf-tools/qr.test.ts` (9/2 log) gets fixed or
  quarantined in Stage A classification.

### 9.6 PO OCR — privacy-first default
- Default (ADD, Stage I): Tesseract.js on-device. Supplier docs never
  leave the device, no vendor DPA, no per-page cost; accuracy is weaker
  on line items, which is acceptable because OCR is assisted entry with
  mandatory human match (§4.3), never auto-accept.
- Opt-in per location (HOLD): structured cloud OCR (Mindee, Veryfi, or
  Textract/Document Intelligence) only with data-processing terms and
  retention limits recorded; tenant opts in explicitly, default stays
  on-device. Never send staff, cost, or vendor-contract data to train
  a third-party model.

### 9.7 Manager approvals — WebAuthn where it counts
- `@simplewebauthn/server` + `@simplewebauthn/browser` (ADD, Stage F):
  comp approval (§1.4) and sensitive overrides get phishing-resistant
  approval on enrolled terminals instead of typed names or shared PINs
  alone. Caveat: platform passkeys bind to the terminal that enrolled
  them — fine for fixed-terminal manager approval, not roaming staff;
  keep server-verified PIN as fallback, never client-state approval.

### 9.8 Observability and safety nets
- Sentry (ADD, Stage L): browser + server error tracking with tenant
  scrubbing (no card data, no secrets in events). Covers the "silent
  failure" class across POS/KDS/hub.
- `pnpm audit` in CI (ADD, Stage A) plus gitleaks (HAVE in devkit) plus
  secret-scanning on the repo: supply-chain and credential hygiene
  before pilot data exists.

### 9.9 Testing that proves the gates
- Playwright (ADD, Stage A/L): headless E2E for the §7 usability matrix
  and the POS→KDS→Expo→POS loop; replaces eyeball verification.
- pgTAP-style DB tests (ADD, Stage B): the "tests fail when a policy is
  dropped" requirement for RLS (§5.6). pgTAP or equivalent SQL harness
  running two-tenant isolation probes per migration.
- Keep `vitest` (HAVE in packages) for engine unit tests; keep the
  mock-kitchen harness labeled simulation, never release evidence.

### 9.10 Future-dev paths (kept open, none built now)
- Supabase Cron + Queues + Broadcast (HAVE as platform): durable firing
  scheduler, retryable OCR/integration jobs, private realtime updates.
- Stripe Connect Standard + application fee (HAVE: `stripe@^15.12.0`
  server-side): unchanged BYO-Stripe posture, SAQ-A scope.
- S700 on-device app, Tap to Pay, cloud OCR vendors, self-hosted
  packaging: all HOLD past beta; portable domain packages and
  migrations are the only self-host work done now.
- Agent productivity: before agent-heavy stages, search the open skills
  ecosystem (`npx skills find react performance`, `playwright e2e`,
  `pr review`) and verify installs/reputation before adopting —
  tooling for the builders, never a product dependency.
