# CulinaryOS product reassessment and guided review

Assessment date: 2026-09-10. Status: proposed implementation roadmap; guided review in progress. This assessment supersedes the earlier proposal to expose a universal app launcher on operational devices. No application implementation was changed during this review.

## Executive assessment

CulinaryOS is already a TypeScript monorepo, but its applications still behave like separate products. Navigation exposes implementation boundaries rather than restaurant jobs. Recipes, preparation, pantry, vendors, settings, authentication, and visual styling have competing owners. Consolidation must address these contracts, not merely place all links in one launcher.

The target is **one codebase, one business API, one shared design system, and separate job-specific experiences**. A POS terminal stays a POS terminal. A KDS stays a kitchen display. A guest never sees staff navigation. A separately authenticated manager hub owns restaurant-wide administration.

Confirmed operator decisions:

- Dedicated devices do not offer cross-workspace switching, including when a manager signs into that device.
- Managers use a separate management hub.
- Admin, CulinaryOps, KitchenKit, and RecipeOS become one management experience organized by function. Unique capabilities must be preserved before old frontends are retired.
- Visual direction is utility-first: neutral surfaces, restrained CulinaryOS accents, large readable controls, and appropriate light/dark modes.
- Every page and function receives an operator review checkpoint; an engineering pass and operator approval are different states.

The assessment is based on three parallel code reviews, local source verification, selected official documentation, and inspection of the current POS PIN screen. It is not a live database audit, payment certification, or completed browser test matrix. Earlier passing test-file counts do not establish production readiness. No defensible current 95/100 score is available.

## 1. Findings in release-risk order

| Severity | Finding | Evidence | Required response |
| --- | --- | --- | --- |
| BLOCKER | The global device key accepts caller-selected tenant context; API-key callers also pass the manager gate. | `apps/server/src/middleware/auth.ts`, `apps/server/src/lib/rbac.ts` | Separate device and service identities; bind devices to tenant and capabilities; require staff authorization for elevated operations. |
| BLOCKER | Split payments manufacture completed results and mark the order paid without provider capture in that handler. | `apps/server/src/routes/payments.ts`, POST `/split` | Fail closed for unsupported live tenders; validate integer cents and split totals; reconcile provider outcomes and idempotent ledger writes before paid status. |
| BLOCKER | Existing test names imply stronger evidence than their implementation supplies. Tenant tests mock Supabase; payment tests define their own helpers; some rush tests import other test helpers. | `tests/server/tenant-isolation.test.ts`, `tests/payments/stripe.test.ts`, `tests/e2e/tier4-scenarios/scenario_1_saturday_rush.test.ts` | Add real database-policy tests and production-handler/browser tests. Classify simulations honestly. |
| RISK | Offline queue storage is not partitioned by tenant/device; storage failure still returns an apparently enqueued delta. | `packages/shared/src/offline-sync.ts` | Partition durable state, surface failed persistence, prove replay under tenant changes and interrupted commits. |
| RISK | Customer display has independent tax calculation and accepts payment-success messages without an origin check. | `apps/pos/src/views/CFDView.tsx` | Dedicated paired display, authoritative order totals/status, validated sender and pairing. Never accept a browser message as payment settlement. |
| RISK | Admin lacks an entry authentication boundary; Desktop uses a hardcoded employee and unrestricted iframe/hotkey switching. | `apps/admin/src/main.tsx`, `apps/admin/src/App.tsx`, `apps/desktop/src/App.tsx` | Authenticated management shell; Desktop becomes device packaging with an assigned profile. |
| RISK | KitchenKit and RecipeOS use different prep models; client apps directly query Supabase with different ownership assumptions. | KitchenKit hooks; RecipeOS queries; Ops hooks | Map data ownership and establish tenant-scoped service contracts before merging screens or schemas. |
| RISK | Shared styles mix HSL, hex, and OKLCH systems; dark mode does not cover all tokens. Several default button sizes are below the project minimum. | `packages/ui/src/culinary-theme.css`, `packages/ui/tailwind.preset.js`, shared Button | One semantic token contract; accessible states and 48px target defaults; measured contrast, not color-space assumptions. |
| RISK | KitchenKit has unresolved CSS variables and a mobile header placed in a horizontal layout; Ops/RecipeOS retain desktop-width sidebars. | Respective layout/sidebar components | Shared responsive shell with correct mobile stacking, accessible drawers, and constrained content widths. |
| RISK | UI doctor reports hardcoded successes without measuring the interface. | `cli/src/commands/system.ts` | Consume actual audit results and distinguish pass/fail/not-run; missing evidence must not pass CI. |
| RISK | Deployment ownership conflicts: Marketing-only workflow, Render services, Railway job, and SPA rewrites without a cross-app route map. | `.github/workflows`, `render.yaml`, application Vercel configs | One explicit deployment contract per environment; retire obsolete workflows only after replacement verification. |
| RISK | POS/KDS production builds encounter an esbuild temporary-file removal error on Windows. | Prior standalone reproduction under Node 24 and 26 | Reproduce in a clean environment; fix or isolate the toolchain cause; require successful release builds. |

Additional payment review must cover partial refunds and Connect routing. Demo checkout protections do not prove either. No production payment or tenant data was changed for this assessment.

## 2. Target page and function map

Navigation vocabulary is fixed: a **destination** is a stable page; an **action** operates on a selected object; a **filter** narrows a page; a **workspace** is a different operational job. These are not interchangeable tabs.

```text
CulinaryOS shared platform
  Shared UI + authenticated API + tenant-scoped domain services
  |
  +-- POS device: Sell / Floor / Checks / Shift
  +-- KDS device: Tickets / All Day / Recall
  +-- Customer display: paired check / gratuity / payment status
  +-- Guest web: menu / bag / order status
  +-- Manager hub
  |     Overview / Menu & Recipes / Kitchen & Inventory
  |     Purchasing / People / Reports / Settings
  +-- Public site: product / pricing / signup / jobs / content

CLI and MCP call the same authorized business services.
Desktop hosts an assigned device experience; it is not a second app hub.
```

| Current entrypoint | Target navigation and ownership | Functions that are not top-level tabs |
| --- | --- | --- |
| POS `:5172` | Sell, Floor, Checks, Shift; persistent Lock and device settings | Ticket editing belongs to Sell/selected Check. Pay, Send, Void, Discount, Fire and Transfer are contextual actions. Open tabs and historical recall live under Checks. |
| KDS `:5173` | Tickets, All Day, Recall; local station settings | Station is an assigned device/filter, not an application. Complete Item, Bump, Fire and Recall are ticket actions. Recall destination is proposed, not verified as implemented. |
| Admin `:5174` | Becomes the manager hub | Restaurant policy, catalog authoring, roles, reporting and integrations live here. No employee-facing junk-drawer Tools page. |
| KitchenKit `:5175` | Recipes/prep/pars/history/shelf life become Menu & Recipes and Kitchen & Inventory modules | Recipe detail, scaling, ingredient edits and prep completion stay contextual. Preserve existing unique capabilities during migration. |
| Ops `:5177` | Dashboard, labor, food cost, vendors and waste distributed into Overview, People, Reports, Purchasing and Kitchen & Inventory | Reporting filters are not separate applications. |
| RecipeOS `:5178` | Vault, pantry, prep and scaling merge into the corresponding management modules | No separate brand/auth/theme after feature and data parity. Preserve unique recipe functionality first. |
| Desktop `:5180` | Assigned POS or KDS profile, with local diagnostics | Remove universal F-key switching and nested shell headers. Profile reassignment is separately authenticated and audited. |
| Web `:5176` | Public-site shell and guest-commerce shell kept distinct | Menu search/categories are filters; Bag/Checkout are contextual guest steps; no employee launcher. Preserve menu/table/order-status URLs. |
| Marketing `:5179` | Migrate unique public content to Web, then retire this entrypoint | Pricing, signup, blog and feature content need a route/content parity checklist and redirects. |
| Customer display, currently inside POS | Dedicated paired route/profile, no POS chrome | Display only paired order information and verified terminal/payment state. No staff credentials or independent pricing calculations. |

Management section detail:

- **Overview:** service summary, actionable alerts and selected location; no invented demo figures in live mode.
- **Menu & Recipes:** sellable catalog, modifiers, recipes, yields, scaling and costing. Recipe math tools move here.
- **Kitchen & Inventory:** prep planner/history, stock, pars, shelf life and waste. One inventory ownership model.
- **Purchasing:** vendor directory and purchasing-related capabilities; reconcile duplicate vendor records before cutover.
- **People:** staff records, roles, scheduling/labor, applicants and job posts.
- **Reports:** restaurant-wide sales, labor, food-cost and waste analysis. POS retains its own shift/register-close responsibilities.
- **Settings:** restaurant policy, device enrollment, integrations, receipts, online-ordering configuration and theme. Platform-developer functions require a separate capability, not ordinary manager access.

Local ports remain development details during migration. A port is not an authorization mechanism. Initial production URLs must be explicitly configured per workspace; do not assume `/pos/` works because a helper returns it.

## 3. Layout and stack decisions

Keep TypeScript, pnpm workspaces, Turborepo, the Hono API, Supabase Postgres/Auth, React and shared Tailwind/Radix components. A wholesale framework rewrite is not the first remedy. Operational and management views use the existing React/Vite stack. Next.js legacy frontends remain only during feature migration; do not port their independent backends into more client code.

One semantic token set covers background, surface, text, muted text, border, accent, success, warning, danger and focus. Use OKLCH values with measured contrast in light and dark modes. The color space itself does not guarantee accessibility. Shared primitives must have 48px targets, 8px separation, visible focus, deterministic disabled/loading behavior, stable loading dimensions and reduced-motion support.

POS defaults to a light high-contrast workspace. KDS defaults to a dark high-contrast workspace. Both share typography, icons, status meanings and component states. Manager pages use a responsive grouped sidebar/drawer; compact dedicated devices use a small bottom destination bar and an adjacent contextual action area. Do not overlap Pay/Send with bottom navigation or the on-screen keyboard. At wide widths POS has menu and ticket panes; checkout obscures the menu and returns to the same check when cancelled.

Replace scattered hardcoded brand strings and fake Online badges with configured restaurant/device identity and separate service-connectivity/demo indicators. Demo mode must be explicit. Public marketing copy does not belong on staff workstations.

The selected OpenAI integration is not a reason to replace the current AI provider or expand AI features. MCP remains an optional, scoped API client; allowed tools and approval requirements should be narrow. This is consistent with OpenAI's connector/MCP controls. [OpenAI MCP documentation](https://developers.openai.com/api/docs/guides/tools-connectors-mcp).

Supabase browser queries can be safe with correctly enforced RLS; direct browser use alone is not proof of a leak. The project's single-business-API policy is the reason to consolidate business writes. Service credentials must stay server-side, and device capabilities do not replace RLS. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

One monorepo can deploy multiple purpose-specific frontend projects; this does not require one universal user interface. Retain existing hosting while validating an explicit mapping, rather than silently moving production to another provider. [Vercel monorepo documentation](https://vercel.com/docs/monorepos).

Terminal payment completion must follow verified payment state, not an optimistic UI event. Preserve the intended Connect model while proving account routing and fee behavior in test mode. Offline ordering and offline card acceptance are separate capabilities; certify only the tested SDK/reader path. [Stripe Terminal documentation](https://docs.stripe.com/terminal), [Terminal Connect](https://docs.stripe.com/terminal/features/connect).

## 4. Implementation stages for approval

Estimates are planning ranges, not token limits or spending authorization. Each implementation PR stays at or below 50k estimated agent tokens; split a stage when it exceeds that size. No bulk deletion or schema migration is authorized merely by this report.

| Stage | Deliverable and affected areas | Exit test | Estimate | Rollback |
| --- | --- | --- | --- | --- |
| 0 | Review ledger and route/action/permission inventory in docs and tests | Every discovered route/control assigned a stable review ID; unknowns remain visible | 10–15k | Documentation-only revert |
| 1a | Device identity/capabilities in server auth, shared types and migrations if required | Foreign tenant, unauthorized role/device and revoked credentials denied | 35–50k | Versioned credential cutover; never restore broad live device access |
| 1b | Payment correctness in payment routes/shared money contracts | Provider failure cannot mark paid; split conservation, retries and partial refunds proved | 35–50k per payment concern | Keep affected live operation disabled if rollback is needed |
| 1c | Genuine DB/RLS tests, offline isolation and honest doctor output in tests/shared/CLI | Production regressions fail their tests; no fabricated PASS | 25–45k per concern | Preserve added tests; gate unsupported features |
| 2 | Device-scoped page registry and shells in shared UI, POS, KDS, Admin and Desktop | Allowed pages reachable; forbidden destinations/actions denied; no universal device launcher | 30–45k | Retain old view adapters behind scoped routing, not unrestricted switching |
| 3 | Shared token/primitive repairs and responsive layouts in UI and app style adapters | Four viewport sizes, light/dark, focus, target size and overflow checks pass | 30–45k per shell group | Token aliases during migration; revert individual adapters |
| 4 | Manager hub integration of Admin/Ops, then recipe/prep/vendor services and KitchenKit/RecipeOS features | Route, feature and data parity with tenant proof; no duplicate business writes | 35–50k per domain | Read-only legacy views and reversible mappings; no destructive early schema drops |
| 5 | Public Web/Marketing content migration and dedicated paired customer display, in separate PRs | Public URL/metadata parity; paired-display isolation and authoritative totals | 25–45k each | Retain old content deployment and redirects until verified |
| 6 | Canonical local/deployment manifest, CI build matrix, retirement of proven duplicates | Clean Windows/Linux builds, deep links, service-worker isolation and rollback smoke | 25–40k | Previous deployment retained; archive only after dependency checks |

New interfaces: a shared page descriptor containing stable ID, workspace, route, destination/action/filter kind, required capability, nav group and test ID; a server-resolved device context bound to tenant/profile/capabilities; and a review-result schema with engineering status separate from operator approval. Routes and menus consume the same descriptors, but the server remains the authorization authority. Manager capabilities cannot widen a POS device's workspace.

Preserve `PATCH /v1/orders/:id/send` and the existing order-created kitchen-ticket event contract. Any new business operation needs matching CLI coverage. For recipe/prep migration, first produce a field/ownership/ID mapping against the real tables; unresolved semantic differences block migration rather than being guessed.

## 5. Guided page/function review ledger

Each group below is expanded to individual controls when opened. This is an initial code-derived inventory, not a claim that every control has already been discovered or tested. Add hidden routes, dialogs and error states as found; never silently omit them.

For each checkpoint record: current behavior, intended job, retain/move/remove decision, specific requested changes, role/device/tenant, viewport, engineering evidence, and operator decision. Engineering states: NOT RUN / PASS / FAIL / BLOCKED. Operator states: PENDING / APPROVED / CHANGES REQUESTED / DEFERRED. Approval of one page does not approve the next.

| Review IDs | Pages/functions to review, in order | Current status |
| --- | --- | --- |
| POS-01 | PIN screen: identity, mode/connectivity indicators, digits, clear/backspace, submit, demo shortcuts, invalid PIN, loading, keyboard | IN REVIEW; layout observed, login functions not run this session |
| POS-02 | Home/current dashboard: service information, quick actions, relevance to server/cashier | Pending |
| POS-03 | Floor: rooms, table states, filters, dimensions, assignment, availability, reservations, transfer | Pending |
| POS-04 | Sell/menu: search, categories, item detail, modifiers, quantities, seats, notes, unavailable items | Pending |
| POS-05 | Ticket: edit, remove/void, discounts, taxes/totals, course fire, send, unsent changes, failure/retry | Pending |
| POS-06 | Checks/tabs: create/open/search/filter/transfer, historical recall, reprint | Pending |
| POS-07 | Checkout: open/cancel modal, tenders, splits, gratuity, receipt, failed/duplicate requests, refunds | Pending; live payment release blocked |
| POS-08 | Shift: employee state, tips, register count, variance, ticket verification, closeout approval | Pending |
| POS-09 | Local settings, hardware, display, lock/logout/session recovery, offline/reconnect | Pending |
| KDS-01–05 | Station identity/pairing; ticket feed/filter; line completion/course fire/bump; all-day/recall/log; 86/settings/health/offline | Pending |
| HUB-01–08 | Login/tenant access; Overview; Menu & Recipes; Kitchen & Inventory; Purchasing; People/ATS; Reports; Settings/integrations/devices | Pending |
| LEGACY-01–03 | Ops, KitchenKit, RecipeOS: visit every existing page and record unique functions against hub destination | Pending; required before retirement |
| GUEST-01–04 | Public menu/search; bag/tableside checkout; order status; paired display/tip/status | Pending |
| PUBLIC-01–03 | Product/demo; pricing/signup/content; public jobs/application | Pending |
| SYSTEM-01–04 | Desktop profile/diagnostics; setup wizard; CLI/API operation parity; MCP/tool permissions and feature flags | Pending |

Within each page, review the visible happy path first, then empty/loading/error/disabled states and role restrictions. Use disposable seeded data for mutations. Do not send real orders to printers, change live staff records, send notifications, or run real charges as part of an ordinary walkthrough.

### First checkpoint: POS-01

Observed: PIN screen at localhost:5172 contains restaurant/station heading, Register Online and LIVE labels, server/manager demo shortcuts, numeric keypad, Clear and disabled Unlock. Source auto-submits on the fourth digit while also exposing Unlock. Demo shortcut rendering is not conditional on demo mode. The current screenshot is not a complete responsive/contrast test.

Recommended: identify tenant/register from configuration; separate demo mode from actual API/reader connectivity; show shortcuts only in explicit demo mode; use a single clear submission model; communicate invalid/locked-out/offline states accessibly. Operator decision on submission model is pending.

## 6. Custom test and release standard

- Browser matrix: 375, 768, 1024 and 1440 CSS pixels; portrait/landscape where relevant, light/dark, keyboard and touch. Verify all allowed destinations without horizontal navigation scrolling. Data tables may use deliberate contained scrolling, not whole-page clipping.
- Role/device/tenant matrix: staff, manager, anonymous and revoked identity; POS/KDS/manager/customer profiles; two tenants. Check hidden UI, direct URLs and API requests separately.
- Money: integer-cent boundaries, split sum conservation, zero/negative/overflow inputs, partial/full refunds, retries, concurrent submissions, provider failures and signed/replayed webhooks using production code paths.
- RLS: apply migrations in disposable local Supabase, execute actual reads/writes under relevant identities, and prove the suite detects deliberately weakened isolation policies.
- Offline: two clients, empty queue followed by new work, storage failure, restart, tenant switch, duplicate and partial acknowledgements, network failure before/after server commit. No simulated queue test is labeled Terminal hardware certification.
- Review completeness: every registered route and discovered action has a review ID and automated test or explicit manual-test reason. Missing evidence remains NOT RUN/BLOCKED.
- Quality target: 25 points isolation/authorization, 25 workflow/money correctness, 15 offline reliability, 15 navigation/accessibility, 10 visual consistency and 10 build/operations evidence. A 95/100 target requires zero release blockers and verified critical workflows; a numeric score never overrides a blocker. Scores are assigned only after evidence, not from test counts.

## Sources and limitations

Primary evidence is the local working tree named in the findings table, including uncommitted work. Source state may differ from GitHub main. The prior Antigravity export is requirements context, not proof that its example paths or functions exist. Three parallel reviews supplied independently scoped navigation, design, and architecture findings.

Official references consulted: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Stripe Terminal](https://docs.stripe.com/terminal), [Stripe Terminal Connect](https://docs.stripe.com/terminal/features/connect), [Vercel monorepos](https://vercel.com/docs/monorepos), [OpenAI MCP controls](https://developers.openai.com/api/docs/guides/tools-connectors-mcp). GitHub was used to read the referenced global project guidance. No claim is made that production Supabase policies, Stripe settings, Vercel deployments, physical readers or printers were inspected or certified.
