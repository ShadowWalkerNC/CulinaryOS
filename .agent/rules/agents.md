# CulinaryOS — Antigravity Rules & Research Dossier (v2)

> **Extends:** `ShadowWalkerNC/.github/AGENTS.md` — all global rules apply unconditionally.
> **Auto-loaded by:** Google Antigravity (`.agent/rules/`) · Claude Code · GitHub Copilot · OpenAI Codex · Cursor · Windsurf
> **Canonical global system:** [ShadowWalkerNC/.github](https://github.com/ShadowWalkerNC/.github)
> **Operator:** Nathaniel (ShadowWalkerNC) — CEO, developer, marketer, security lead
> **Status:** Active development — core platform build (v1.2.1 @ `dcc5aa3` audit)

---

## PART 1 — AGENT RULES (binding)

### Identity
You are the principal engineer, security officer, and product strategist for
CulinaryOS — a multi-tenant restaurant OS (POS + KDS + back-office + talent/HR +
commissary + marketplace). The operator (Nathaniel, ShadowWalkerNC) is CEO,
developer, marketer, and security lead. AI features are ACCESSORIES, never the
core driver. Security and money-accuracy outrank shipping speed.

### Repo Facts (verify against main before acting)
- Monorepo: pnpm workspaces + Turborepo, TypeScript. Apps: `pos`, `kds`, `admin`, `desktop`,
  `web`, `marketing`, `ops`, `recipeos`, `kitchenkit`, `server` (Hono).
- DB: Supabase Postgres, migrations V1–V17 (tenants, RLS, event bus, realtime,
  Stripe, public-menu RLS, audit hardening, staff PINs, reservations,
  multi-unit commissary).
- 23 API routes in `apps/server/src/routes/`. CLI in `cli/src/commands/`
  (10 groups). MCP server in `mcp/`.
- Tests in `tests/` (adversarial, empirical stress, payments, hardware, e2e).
  Never weaken a test to make CI pass.

### Non-Negotiable Rules
1. **RLS on every tenant-scoped table.** Any new table migration MUST include
   RLS policies or be flagged BLOCKER. Enable RLS on every public-schema table —
   no exceptions.
2. **`service_role` key never leaves the server.** It bypasses RLS entirely;
   exposing it to any client app makes RLS nonexistent. Client apps use
   anon key + RLS + user JWT (with tenant claim) only.
3. **Money in integer cents.** Stripe webhook handlers must verify signatures.
   Idempotency keys on every payment write; a double-charged tab is a fired agent.
4. **No card data ever.** No PAN storage, no CVV ever, card data never in logs,
   TLS 1.2+ everywhere. All card-present flow via Stripe Terminal SDK only.
5. **One feature per PR.** Conventional commits (`feat(scope): ...`). Never
   bundle features — past mega-commits are the anti-pattern.
6. **AI ships behind flags, off by default.** Every AI call logged to
   `ai_prompt_log` with token counts.
7. **Offline-first:** order flows degrade gracefully and reconcile via the event
   bus with idempotency keys. Offline behavior must be testable headless.
8. **CLI parity:** every new GUI feature ships with its CLI command in the same
   PR. Target: 100% of the 23 routes operable from terminal.
9. **Tip engine legality gates (FLSA, enforced in code):**
   - Owners, managers, and supervisors (anyone with hiring/firing authority or
     who directs work) are EXCLUDED from every pool — hard-coded, not configurable.
   - FOH+BOH pools are only offered when the restaurant pays full minimum wage
     (no tip credit). FOH-only pools are legal in all 50 states.
   - Support the four distribution methods: keep-your-own, hours-weighted,
     points/role-weight (e.g. server 1.0 / busser 0.5), percentage-of-sales tip-out.
   - Flag the 80/20 rule (tip credit invalid for >20% non-tipped duties) in
     operator-facing docs; tipped employee = regularly receives $30+/month tips.
10. **When auditing:** check in order — (1) tenant isolation/RLS, (2) payment
    integrity, (3) offline sync conflicts, (4) CLI parity, (5) test coverage,
    (6) docs drift. Report as BLOCKER / RISK / NIT with file paths.
11. **When planning:** stage work into PR-sized chunks, each with files touched,
    estimated agent tokens, and rollback plan. Ask before exceeding stage scope.
12. **Before writing code,** restate which requirement this answers from the
    backlog in `docs/` or the assessment.
13. **Jakob's Law for Mobile & Touch Surfaces.** Users spend most of their time on other mobile apps and expect interfaces to work familiarly. All mobile viewports and touch surfaces (Storefront, Handheld POS, KDS, Mobile app) must strictly adhere to mobile platform conventions:
    - **Thumb-Zone Optimization:** Primary actions (View Bag, Checkout, Send to Kitchen, Bump) must sit in the bottom ergonomic thumb zone (`fixed bottom-0` sticky action bar or bottom sheet).
    - **Standard Navigation Patterns:** Bottom navigation bars, standard hamburger/drawer sheets, swipe-down modals, and sticky top search/filter headers. No non-standard gesture requirements.
    - **Physical Touch Target Minimums:** Interactive elements must have a minimum touch target of 48×48px (Apple HIG & Material 3 guidelines) with at least 8px spacing between tap targets.
    - **Standard E-Commerce & Ordering Flow:** Search & Filter at top → Scrollable menu categories → Item Modal with standard radio/checkbox modifier selection → Sticky Bottom Cart Bar → Swipeable Bottom Sheet / Drawer for Checkout → Clear Order Status Timeline.
    - **Instant Familiar Feedback:** Haptic-style visual active states (`active:scale-95`), loading skeletons, standard back navigation buttons in top-left, and explicit error states with clear recovery actions.
14. **Monorepo discipline & Turborepo compliance.** All new code belongs in the correct package. Do not create files at the root level. Shared types go in `packages/` or `shared/`. All pipeline tasks must be declared in `turbo.json`.
15. **Realtime contracts are stable.** POS/KDS rely on `pos:order:created` -> `kitchen_tickets`. Do not bypass `PATCH /v1/orders/:id/send` from clients.

---

## PART 2 — RESEARCH-BACKED DECISIONS (cite these, don't re-derive)

### 2.1 Payments Architecture (DECIDED recommendation)
**Model: Restaurants bring their own Stripe accounts (Connect "standard" connected accounts) + application fee for SaaS revenue.**
- Rationale: as a SaaS platform on Connect, you're responsible for negative
  balances if you act as marketplace; standard accounts put each restaurant in
  their own Stripe relationship, minimizing your KYC/AML and payout-liability
  burden while still letting you collect a platform fee per transaction.
- PCI scope: keep everything fully outsourced (card data never touches your
  servers, payment UI/terminal hosted by the processor) so merchants qualify
  for the lightest SAQ (SAQ-A class). If you ever touch PANs, you inherit the
  heaviest SAQ — never do this.
- Card-present: Stripe Terminal. WisePOS E / S700 / S710 readers are the
  supported lineup. Offline card collection EXISTS in Stripe Terminal but must
  be explicitly enabled and handled (offline PaymentIntent → forward on
  reconnect → optional capture). Note: some third-party integrations report
  Wi-Fi readers needing connectivity — offline mode is a first-party Terminal
  SDK feature, so implement and test it in the POS app yourself, don't assume.
- Sources: docs.stripe.com (SaaS platforms & marketplaces; Terminal offline
  card payments), Stripe Terminal hardware docs.

### 2.2 Hardware Bill of Materials (verified compatibility targets)
| Role | Device class | Notes |
|---|---|---|
| Receipt printer (FOH) | Epson TM-m30 / TM-T20 class thermal (~$290–310) OR Star TSP100IV / TSP143IV | Both speak ESC/POS. Star TSP100IV/TSP143IV X4 offer USB-C + LAN + WLAN + BT + CloudPRNT in one unit (announced Jan 2026). |
| Kitchen printer (BOH) | Impact/dot-matrix, e.g. Star SP742 (now with LAN ESC/POS emulation) or Epson TM-U220 class (~$225–350) | Impact survives heat/grease; thermal receipts blacken near a line. |
| Cash drawer | Any printer-driven drawer with RJ11/RJ12 kick port | Drawer plugs into the PRINTER's DK port, not the tablet. Match voltage (often 24V) and use POS-grade cables — phone cables are NOT wired the same. |
| Payments | Stripe WisePOS E (countertop) / S700 | First-party Stripe Terminal; offline mode must be enabled + tested. |
| Tablet/terminal | iPad or Android tablet w/ browser (CloudPRNT/Wi-Fi printers) or the Desktop Workstation | Web-based POS means no hardware lock-in; ESC/POS over LAN/BT/Cloud is the universal layer. |

**Blessed kit v1 (ship one, certify later):** tablet + Star TSP143IV (or Epson
TM-m30) + printer-driven cash drawer + Stripe WisePOS E. Total hardware cost
lands well under Toast's $799–999 per terminal, which is your undercut story.

### 2.3 Tip Engine Spec (legal constraints → code)
- Pool membership rules and manager/supervisor exclusion are LEGAL gates, not
  preferences — encode them as validations that cannot be disabled by tenants.
- Offer the four distribution methods (keep-your-own, hours, points/role-weight,
  percentage tip-out) as tenant-selectable policies per location. v1 defaults to **hours-weighted pool**.
- Daily cash-out drawer flow pairs with the tip pool close-out: drawer count →
  variance → tips recorded → pool distribution report exportable to payroll.

### 2.4 Competitive Pricing Benchmark (for `financial_model_pricing.md` review)
- Toast (the incumbent to beat): ~$69/month per terminal for POS software;
  card-present ~2.49% + $0.15 (hardware paid upfront) to ~2.99% + $0.15;
  hardware $799–$999 for a primary terminal; real monthly totals land far above
  sticker after add-ons.
- CulinaryOS positioning: flat per-location SaaS under Toast's per-terminal
  math for multi-terminal rooms + bring-your-own-Stripe (processors' rates stay
  between the restaurant and Stripe) + no hardware lock-in.

### 2.5 Supabase Security & Multi-Unit Architecture (implementation standard)
- **Multi-Unit Enterprise Isolation:** Organization entity (`organizations`) owns multiple unit tenants (`restaurants.organization_id`), preserving per-location RLS isolation while enabling brand-wide rollups and commissary transfers (`V17__multi_unit_commissary.sql`).
- Enable RLS on every public table; inline policies for simple ownership,
  security-definer functions when 3+ tables are involved or queries exceed
  ~100ms; wrap reused logic in functions.
- Cross-tenant leak verification: pgTAP-style regression tests that prove
  isolation per migration — "we wrote policies" is not evidence, "tests fail
  when a policy is dropped" is.
- Rotate `service_role` periodically; store only in server env/secret vault.

---

## PART 3 — STAGE PLAN v1.3 (token-budgeted)

| Stage | Work | Exit criteria | Est. agent tokens |
|---|---|---|---|
| 0 | Triage 14 `cursor/*` branches (merge/rebase/delete), tag v1.2.1, protect main, gitignore `test_output.log` + `tsconfig.tsbuildinfo`, secret scan `.env.example` | Clean main, first git tag, zero branches >30 days stale | ~150k |
| 1 | Tenant-isolation pgTAP suite (cross-tenant leak proof) + Stripe webhook signature verification proof + `culinary doctor security` CLI command | Dropping any RLS policy turns CI red; doctor command ships | ~250k |
| 2 | Tip engine v1: manager-exclusion gates + hours-weighted pool + keep-your-own; daily cash-out drawer flow | Legal gates untestable-to-disable; payroll export CSV | ~300k |
| 3 | CLI parity: reservations, talent, billing, pantry, tabs/tables commands | Every route has a CLI verb; smoke test in CI | ~250k |
| 4 | Business templates: food-truck preset + full-service preset as toggle bundles (never forked schemas) | New tenant bootstraps from template in <5 min | ~200k |
| 5 | Offline depth: order queue + idempotent reconcile + Stripe Terminal offline enablement + conflict harness | 2-hour offline dinner-rush simulation passes | ~350k |
| 6 | ONE AI accessory behind flag (autopilot suggestions) + per-tenant token dashboard from `ai_prompt_log` | AI off = zero AI spend; dashboard live | ~200k |
| 7 | Hardware matrix + blessed-kit BOM doc + ESC/POS test page + drawer-kick verification script | One printer + drawer + terminal combo certified end-to-end | ~150k |

**Total: ~1.85M agent tokens.** Run stages sequentially; each PR should consume
≤50k tokens so failures are cheap and reviews stay human-checkable.

---

## PART 4 — DECISIONS LOG & ROADMAP GATES
1. **Alley Katz Posture:** Pilot deployment. Close engineering monitoring, rapid rollback readiness, priority focus on stability before commercial SLA scaling.
2. **Tip Engine v1:** Hours-weighted pool with hardcoded FLSA manager exclusion + daily cash-out drawer flow.
3. **Stripe Model:** Bring-your-own-account (Stripe Connect Standard) + platform application fee. Outsources KYC/disputes to qualify for SAQ-A.
4. **Multi-Unit Enterprise:** `organizations` parent entity owning `restaurants.organization_id` unit tenants. Strict per-unit RLS boundaries with controlled commissary transfer orders (`V17`).
5. **AI Accessory:** Autopilot suggestions (predictive 86-ing, dynamic prep adjustments, pantry restock alerts) behind an off-by-default feature flag.

---

## PART 5 — OPERATIONAL RUNBOOK & ENVIRONMENT REFERENCE

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Service role — never expose client-side |
| `ANTHROPIC_API_KEY` | AI layer | Claude API key — AI layer only |
| `RECIPEOS_MCP_URL` | Phase 5 | RecipeOS MCP server endpoint |
| `RECIPEOS_JWT_SECRET` | Phase 5 | JWT bridge secret for RecipeOS auth |
| `CULINARYOS_URL` | Yes | Canonical API base for service callbacks |
| `DATABASE_URL` | Yes (migrate/seed) | Direct PostgreSQL connection string |
| `VITE_API_URL` | Yes (clients) | Browser -> API base URL |
| `VITE_TENANT_ID` | Yes (clients) | Demo / device tenant UUID |

Never commit values. Always use `.env.example`.

### Running Services for Development

- Core end-to-end loop = 3 services: `apps/server` (API, `:3000`), `apps/pos` (`:5172`), `apps/kds` (`:5173`). `apps/admin` (`:5174`) and `apps/web` (`:5176`) are optional.
  - `pnpm --filter @culinaryos/server dev` (Hono API via `tsx watch`)
  - `pnpm --filter @culinaryos/app-pos dev`
  - `pnpm --filter @culinaryos/app-kds dev`
  - `pnpm dev` (root) runs `turbo run dev` for everything in parallel.

### Degraded / Offline Demo Mode (No External Services)

- The apps boot with NO Supabase/Postgres/Stripe when `SUPABASE_URL` or `VITE_SUPABASE_URL` contains placeholders.
- Server logs `[Realtime] Skip starting realtime bridge (Supabase offline)` and auth relaxes (send `X-Tenant-Id: 00000000-0000-0000-0000-000000000001`).
- POS serves hardcoded `MOCK_MENU` and localStorage order store. KDS shows built-in demo tickets with live timers.
- POS login uses `POST /v1/auth/pin-login` (demo PINs `1234` / `5678`). Live mode uses `staff_pins` + Supabase Auth (`V14`).

### Lint / Test / Typecheck Caveats

- `pnpm run typecheck` is the reliable static check across all packages.
- Test suite: `bun test tests/server/` or tsx runner `node ./scripts/run-all-tests.cjs`.
- Seed data: `pnpm seed` (`scripts/seed.ts`). Local stack: `pnpm local:supabase`.

---

## Agent Confirmation for CulinaryOS

After loading this file, add to `DISPATCH CONFIRMED`:

```
Project AGENTS.md: loaded — CulinaryOS (v2 Rules Dossier)
Stack: TypeScript · pnpm monorepo · Turborepo · Supabase (V1-V17) · Docker · Hono
Surfaces: web · desktop · mobile · kds · pos · admin · ops · kitchenkit · recipeos · mcp · cli
Project rules active: 15 non-negotiable binding rules
Multi-tenant: active — organizations parent + unit tenant isolation (V17)
Payments: Bring-Your-Own-Stripe Connect Standard + Application Fee (SAQ-A)
Tip Engine: Hours-weighted pool v1 + hardcoded FLSA manager exclusions
AI accessory: Autopilot suggestions behind off-by-default feature flag
Known issues noted: yes
```

---

*Version: 2.0 | Extends: ShadowWalkerNC/.github/AGENTS.md | Project: CulinaryOS*
