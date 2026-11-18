# Original User Request

## 2026-09-01T19:59:42Z

Implement the complete suite of high-priority modular restaurant operations engines and the zero-dependency turnkey installer for CulinaryOS across all frontends, backend APIs, and shared packages.

Working directory: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS
Integrity mode: development

## Requirements

### R1. Front-of-House Dining & Service Engines
Implement the hierarchical modifier engine (min/max rules, nested choices, free vs upcharge limits), dynamic 2D/3D floor map operations (drag-and-drop table merging, splitting, server shift transfers), automated daypart/happy hour scheduled pricing, and 3-mode tableside QR experience (Server-Only, QR Pay-at-Table, Full Self-Ordering).

### R2. Back-of-House Kitchen & Prep Engines
Implement live 86 inventory countdowns with real-time multi-terminal decrement, multi-course hold/fire pacing timers, per-station dual-language translation (English FOH ➔ Spanish/French KDS and thermal chits), 1-click kitchen waste logging linked to actual-vs-theoretical food cost variance, and batch prep recipe scaling with adhesive expiration date label formatting.

### R3. Security, Void Governance, & Accounting Ledger
Implement configurable manager PIN authorization gates for post-send voids, comps, and drawer opens with mandatory reason codes, auto-waste debiting, and automated End-of-Day Z-Report generation (multi-rate sales/alcohol taxes and tip pooling).

### R4. Turnkey Zero-Tech Installer & System Tray Engine
Provide a self-contained Windows installation package and background tray manager (with silent boot, 1-click diagnostics, port self-healing, and local QR / mDNS network discovery).

## Acceptance Criteria

### Automated Typecheck & Build Verification
- [ ] Workspace-wide `pnpm run typecheck` passes across all packages and apps with 0 errors.
- [ ] `node ./scripts/run-all-tests.cjs` passes all integration and unit test suites.
- [ ] All frontends (`apps/pos`, `apps/kds`, `apps/admin`, `apps/web`, `apps/kitchenkit`, `apps/ops`, `apps/desktop`) build successfully into `dist/`.

### Functional Verification
- [ ] Modifiers enforce min/max constraints and calculate nested upcharges correctly.
- [ ] Table merge combines orders into a single master ticket and table transfer shifts server ownership.
- [ ] Setting an 86 countdown decrements live on order fire and disables the item at count 0.
- [ ] Holding Course 2 keeps items off the active grill line until FIRE is triggered.
- [ ] Waste events record dollar loss and update the food cost variance report.
- [ ] Daily closeout computes multi-tier tax and generates a complete Z-Report summary.

## 2026-09-09T00:44:31Z

Simulate a full commercial restaurant company in daily operations, performing end-to-end multi-seat ordering, KDS station pacing, cash & Stripe tender with physical drawer pulse, and double-entry accounting reconciliation while logging any errors, benchmarking API & build latency, and updating marketing materials.

Working directory: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS
Integrity mode: development

## Requirements

### R1. Full Day-in-the-Life System Simulation
- Execute hiring on `/v1/talent`, audit 40-hr FLSA overtime on `/v1/talent/labor/audit-overtime`, open drawer with float, fire multi-seat orders from POS to KDS, bump tickets, and complete cash & card checkouts.

### R2. Bug & Error Capture Engine
- Systematically capture, categorize, and log any runtime exceptions, unhandled Promise rejections, schema mismatches, or layout shifts across all 18 operational subsystems into `docs/audits/error_log.md`.

### R3. Performance Benchmarks
- Measure API latency (p50, p95) on core endpoints (`/v1/orders`, `/v1/kds/tickets`, `/v1/menu/public`, `/health`) and Turborepo cold/hot build times, recording results against SLA targets in `docs/benchmarks/perf_baseline.md`.

### R4. Council Tradeoff Evaluation
- Conduct a 4-voice Council review (Architect, Skeptic, Pragmatist, Critic) evaluating commercial pilot launch readiness, offline edge sync boundary risks, and marketing positioning against Toast/Square.

## Acceptance Criteria

### Simulation & Feature Coverage
- [ ] 100% of the simulated daily workflow passes without unhandled exceptions or data loss.
- [ ] All 110 automated tests remain green (`node ./scripts/run-all-tests.cjs`).
- [ ] Full Turborepo typecheck across 47 packages passes with 0 errors.

### Performance & Latency
- [ ] Core API response latency p95 is under 150ms for local endpoints.
- [ ] Turborepo incremental build takes less than 30s.

### Audit & Documentation
- [ ] `docs/audits/error_log.md` contains exact reproduction steps for any discovered bugs.
- [ ] `docs/benchmarks/perf_baseline.md` is populated with empirical benchmark timings.

## 2026-09-26T19:08:21Z

Elevate CulinaryOS frontend UI/UX and micro-interactions into a high-end, modern industrial hospitality operating system (Linear meets Toast aesthetic) characterized by deep charcoal zinc surfaces, warm amber/ember accents, tactile spring physics, and thumb-zone ergonomics across POS, KDS, Admin, and Operations.

Working directory: c:\Users\white\Documents\GitHub\CulinaryOS
Integrity mode: development

## Requirements

### R1. Modern Tactile & Industrial Design Language
Establish a unified design system aesthetic across all surfaces:
- Dark mode foundation using deep charcoal zinc (`#090d16` / `#121824`) and light mode warm stone (`#f8f9fa` / `#ffffff`).
- Sophisticated accent hierarchy: Warm Amber (`#f59e0b`) and Culinary Ember (`#ff6b35`) for primary focus, emerald (`#10b981`) for live status/success, crimson (`#ef4444`) for critical 86/alerts.
- Crisp 1px subtle borders (`border-white/10` in dark, `border-slate-200` in light) with subtle glassmorphic backdrop blurs (`backdrop-blur-md`).
- Mathematical nested radius standard: $R_{\text{inner}} = R_{\text{outer}} - \text{padding}$, standardizing on `rounded-2xl` for dialogs/cards and `rounded-xl` for interactive elements.

### R2. POS Terminal & Handheld Order Flow Ergonomics
Refine the active order taking and checkout experience:
- Tactile item selection with micro-spring feedback (`active:scale-[0.97] transition-transform duration-75 ease-out`).
- Sticky bottom thumb-zone cart & checkout summary drawer on mobile/tablet viewports (<1024px) preventing unreachable top-screen interactions.
- Instant dual-pricing toggle (Cash Discount vs. Card Tender) with immediate visual total reconciliation.
- Split-check and tip-entry modal interactions with 48px keypad buttons and quick-preset percentage chips.

### R3. KDS Kitchen Rail & Pacing Visual Engine
Elevate the kitchen rail for high-intensity, high-glare restaurant lines:
- High-contrast OKLCH status tokens guaranteeing $\ge 5:1$ contrast against stainless steel kitchen reflections.
- Oversized tactile bump triggers ($64\text{px}$ – $80\text{px}$ height) engineered for gloved and greasy hands.
- Visual aging indicators with color-shifting border pulses: green (<10m), amber (10-20m), flashing crimson (>20m).
- Course pacing alert bar with prominent course fire actions and elapsed wait-time counters.

### R4. Admin Back-Office & Floor Management Workspaces
Transform the management and 3D floor map surfaces:
- Dense, readable data tables with sticky headers, zebra hover layers, and keyboard shortcut focus.
- Interactive 3D floor map with smooth camera zoom/orbit controls, clean status pill tags, and table property drawers.
- Mobile floor manager mode utilizing native swipe-down bottom sheets (`vaul`) with drag handles and quick operational triggers (86 toggle, manager alert, drawer kick).

### R5. 6-State Interactive Engine & Visual Quality Standards
Enforce deterministic interaction states across every interactive trigger:
- All buttons, chips, and inputs strictly implement: `Idle`, `Hover`, `Focus-Visible` (2px solid ring with 2px offset), `Active` (haptic press physics), `Loading` (fixed layout bounds with centered spinner), and `Disabled` (50% opacity, pointer-events-none).
- Complete elimination of emoji icons in production UI, replacing with Lucide SVG line icons with semantic color attribution.
- Guaranteed 48px physical touch target safety on all interactive components on touch surfaces.

## Acceptance Criteria

### Touch & Ergonomics
- [ ] Every interactive button, selector, and input on handheld and tablet viewports meets or exceeds the physical 48×48px tap target boundary.
- [ ] On mobile (<768px), primary actions (Send to Kitchen, Bump Ticket, Checkout, Fire Course) are anchored in the bottom 40% thumb zone.
- [ ] Modal dialogs on mobile render as swipeable bottom sheets with touch drag handles.

### Visual Quality & Design Consistency
- [ ] Zero layout shifts (CLS = 0) during button loading states and data fetching transitions.
- [ ] WCAG 2.2 AA contrast ($\ge 4.5:1$ for normal text, $\ge 3:1$ for large text and UI components) verified across all light and dark themes.
- [ ] Cohesive radius and border hierarchy implemented across `packages/ui`, `apps/pos`, `apps/kds`, `apps/admin`, and `apps/ops`.
- [ ] Zero emoji icons used in core navigation, status bars, or action triggers.

### System Verification
- [ ] `pnpm run typecheck` passes with 47/47 tasks successful and 0 TypeScript errors.
- [ ] Existing automated test suites pass without regression.
