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
