# CulinaryOS Subsystem Error & Audit Log

**Audit Timestamp:** 2026-09-08T20:51:00Z
**Scope:** 18 Operational Subsystems across POS, KDS, Admin, Storefront, Ops, API, and CLI

---

## 1. Executive Summary & Defect Ledger

| ID | Subsystem | Severity | Finding & Defect Description | User Impact | Exact Reproduction Steps | Target Resolution |
|---|---|---|---|---|---|---|
| **BUG-01** | POS / Web Cart | **CRITICAL** | Modifier upcharges (e.g. Fried Farm Egg +$2.00) do not add to line item total or order subtotal | Financial loss / incorrect customer bill | 1. Open POS Table 4<br>2. Select Burger<br>3. Select Add-on +$2.00<br>4. Check order subtotal (remains base price) | Update line item calculation in `OrderView.tsx`, `queries.ts`, and `GuestStorefront.tsx` to sum `selectedModifiers.reduce((acc, m) => acc + m.price_adjustment, 0)` |
| **BUG-02** | POS Cart / Check | **HIGH** | Removing an item or updating a check from the order pane fails to update or delete item | Order check stuck with incorrect items | 1. Add item to Table 4<br>2. Tap delete / minus icon on item<br>3. Item persists in check | Wire `useVoidLineItem` / remove item state handler with optimistic cache invalidation in `OrderView.tsx` |
| **BUG-03** | KDS Rail | **BLOCKER** | Order fired from POS does not appear on KDS rail; Bumping ticket triggers full page reload | Line cook never receives order; UI breaks on bump | 1. Fire Table 4 on POS<br>2. Check `/station/expo` on KDS (no ticket)<br>3. Tap Bump on existing ticket (page reloads) | Ensure `POST /v1/orders/:id/items` and `PATCH /send` route through server proxy; add `type="button"` and `e.preventDefault()` to `BumpButton.tsx` |
| **BUG-04** | POS Ergonomics | **HIGH** | "Pay" button located in top navigation bar instead of bottom thumb-zone; violates Jakob's Law | Hard to reach on handhelds / servers miss pay action | 1. Open active order on POS<br>2. Look for Pay action<br>3. Located in small top nav button | Move primary "Pay / Checkout" action to a permanent `fixed bottom-0` sticky thumb bar with high-contrast emerald styling |
| **BUG-05** | POS UI Polish | **MEDIUM** | "Add Item to Seat" button turns pitch black on hover/click with black text (unreadable); lacks defined border | Illegible UI; staff tap blindly | 1. Open Order View on POS<br>2. Hover / tap "Add Item to Seat"<br>3. Background turns #000 with black text | Style button with `border-2 border-slate-300 rounded-full min-h-[44px] hover:bg-slate-100 active:scale-[0.97]` |
| **BUG-06** | POS Checkout | **MEDIUM** | Cash return / change due text is too small; Finalize Payment button is too short (<48px) | Slow cashier handoffs during rush; missed tap targets | 1. Go to Checkout<br>2. Tender $50 cash<br>3. Observe tiny change due text | Increase change due typography to `text-3xl font-black font-mono text-emerald-700`; set Finalize button to `min-h-[56px]` |
| **BUG-07** | Admin RBAC | **HIGH** | Server role has unrestricted access to manager pages; staff IDs display raw UUIDs | Security breach: staff can view payroll / admin without manager PIN | 1. Log in with server PIN `1234`<br>2. Open Admin portal (`5174`)<br>3. Full manager settings accessible | Enforce `role === 'manager' \|\| role === 'admin'` check and require Manager PIN challenge before granting access to Admin settings; format staff IDs as `#101` |
| **BUG-08** | Admin Navigation | **MEDIUM** | Admin top navigation bar overflows horizontally requiring horizontal scrolling | Degraded desktop / tablet UX | 1. Open Admin portal at standard resolution<br>2. Top navigation requires horizontal scrolling | Refactor nav to responsive dropdown / clean icon bar with standard breakpoints |
| **BUG-09** | Onboarding Flow | **BLOCKER** | No dedicated self-service Onboarding Wizard found in Admin/POS for new restaurants | New tenants cannot self-provision | 1. Open Admin settings<br>2. Look for initial setup wizard<br>3. Screen missing or incomplete | Build a 4-step Onboarding Wizard: 1. Business Profile, 2. Taxes & Rates, 3. Quick Floor Plan, 4. Staff PIN provisioning |
| **BUG-10** | Hardware Settings | **HIGH** | POS Hardware settings view is missing or throws an error on load | Operators cannot test printers, cash drawer, or card reader | 1. In POS click Settings → Hardware<br>2. Error thrown or view missing | Create unified Hardware Diagnostics modal with Test Print (ESC/POS), Drawer Pulse, and Stripe Terminal test |
| **BUG-11** | Guest Storefront | **MEDIUM** | Root path (`localhost:5176`) loads marketing landing instead of immediate customer menu | Confusing guest ordering journey | 1. Visit `http://localhost:5176`<br>2. Lands on marketing overview rather than menu | Redirect root to `/menu` or provide prominent "Order Now" customer CTA; fix modifier upcharge math |
| **BUG-12** | CFD / Kiosk | **MEDIUM** | Customer-Facing Display is unpolished, lacks guest order lookup QR, and lacks quick self-ordering kiosk mode | Missed fast-casual kiosk revenue | 1. Open POS → CFD<br>2. Plain unstyled dual pane displayed | Redesign CFD with split-screen branding, guest lookup PIN/QR, and toggle for "Kiosk Self-Ordering Mode" |
| **BUG-13** | KitchenKit & Ops | **HIGH** | KitchenKit (`5175`) has disparate styling and lacks demo data; CulinaryOps (`5177`) blocked by magic link login | Ecosystem MCPs disconnected from demo | 1. Open `5175` (broken actions, no demo items)<br>2. Open `5177` (magic link wall) | Harmonize KitchenKit with CulinaryOS design tokens and seed demo prep items; add local demo bypass for CulinaryOps |
| **BUG-14** | Shift Closeout | **MEDIUM** | Reports view lacks completed drawer float variance entry and Z-Report EOD generation | Unaudited daily cash drawers | 1. POS → Reports<br>2. Attempt EOD drawer count<br>3. Variance closeout incomplete | Connect EOD closeout to cash drawer variance engine and exportable Z-Report receipt |

---

## 2. Verified Operational Wins
- **PIN Authentication:** 100% reliable instantaneous lockscreen login (`1234` / `5678`).
- **Floor Map Lifecycle:** Table selection and post-payment reset to vacant/available status operates seamlessly.
- **Cash Tender Math:** Cash tender calculation and tip engine (15%, 18%, 20%, Custom) functional.
- **Top Nav Layout Stability:** Eliminated width jitter when active orders are initiated.

---

## 3. Recommended Remediation Roadmap (PR-Sized Stages)
1. **Stage A (Critical Cart & KDS Fix):** Fix modifier upcharges, line item deletion, and KDS ticket transmission & bump button `type="button"`.
2. **Stage B (Industrial Ergonomics):** Move Pay button to sticky bottom thumb-zone, fix "Add Item to Seat" styling, enlarge cash return & finalize buttons.
3. **Stage C (Admin & RBAC Hardening):** Add Manager PIN gate to Admin portal, clean staff ID formatting (`#101`), eliminate nav scroll.
4. **Stage D (Onboarding & Hardware Diagnostics):** Build the 4-step Onboarding Wizard and POS Hardware Test panel (printers, drawer kick, Stripe reader).
5. **Stage E (CFD & Kiosk / Ecosystem Unification):** Add Kiosk ordering mode to CFD, seed KitchenKit demo data, and enable local demo bypass for CulinaryOps.
