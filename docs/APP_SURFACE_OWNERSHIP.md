# Application Surface Ownership Ledger

*Status: Production Monorepo v1.3.1 — Synchronized 2026-10-28*

This document records the authoritative owner, runtime port/target, and operational status for every application surface in the CulinaryOS monorepo.

| Surface | Path | Port / Target | Owner | Build / Verification | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `server` | `apps/server` | `:3000` | Core | `pnpm --filter @culinaryos/server build` | **Active** — Unified Hono API Gateway (23 routes, RLS, Stripe, Display, Interagency) |
| `pos` | `apps/pos` | `:5172` | Core | `pnpm --filter @culinaryos/app-pos build` | **Active** — FOH Terminal (2D/3D Floor Map, ESC/POS, Offline Event Bus) |
| `kds` | `apps/kds` | `:5173` | Core | `pnpm --filter @culinaryos/app-kds build` | **Active** — Kitchen Display System (Station routing, course hold/fire, OLED contrast) |
| `admin` | `apps/admin` | `:5174` | Core | `pnpm --filter @culinaryos/admin build` | **Active** — Back-Office Workstation (Menu builder, PINs, HACCP, Pantry POs) |
| `kitchenkit` | `apps/kitchenkit` | `:5175` | Prep | `pnpm --filter @culinaryos/app-kitchenkit build` | **Active** — Station Prep Planner, FIFO Labels & Par Management |
| `web` | `apps/web` | `:5176` | Web | `pnpm --filter @culinaryos/app-web build` | **Active** — Public Storefront, Tableside QR Pay, Storefront Studio (`/studio`), Team Guild (`/team`) |
| `ops` | `apps/ops` | `:5177` | Ops | `pnpm --filter @culinaryos/app-ops build` | **Active** — Prime Cost, AvT Food Cost Variance, FLSA Tip Pool & Waste Ledger |
| `recipeos` | `apps/recipeos` | `:5178` | Prep | `pnpm --filter @culinaryos/app-recipeos build` | **Active** — Next.js 15 Recipe Vault, Baker's % Ratio Engine & Costing |
| `marketing` | `apps/marketing` | `:5179` | Marketing | `pnpm --filter @culinaryos/app-marketing build` | **Active** — Next.js 15 Autonomous Campaign Studio & Brand Guardrails |
| `desktop` | `apps/desktop` | `:5180` | Core | `pnpm --filter @culinaryos/app-desktop build` | **Active** — Unified Desktop Workstation Hub (F1–F7 hotkeys, split-pane kiosk) |
| `display` | `apps/display` | `:5181` | Display | `pnpm --filter @culinaryos/app-display build` | **Active** — 7-in-1 Android TV & Web Display Platform (KDS, Manager, Staff, Menu, Pickup, Promo, Cheezies) |
| `android-tv` | `apps/android-tv` | Android TV APK (`com.culinaryos.display`) | Display | `powershell -File ./scripts/build-android-tv.ps1` | **Active** — Native Kotlin Android TV Kiosk Shell (`BootReceiver`, D-Pad bridge, CleanMyTV ADB staging) |
| `CulinaryOSHandheld` | `apps/CulinaryOSHandheld` | iOS 17+ (`com.shadowwalker.culinaryos.handheld`) | Core / Mobile | `xtool dev` / `swift build` | **Active** — Native Swift 6.1 + SwiftUI Tableside POS & Ticket Runner (Offline Outbox + Seat/Course Pacing) |
| `mobile` | `mobile/` | Android / iOS (`com.shadowwalker.culinaryos`) | Core / Mobile | `pnpm --dir mobile typecheck` | **Active** — Universal Expo SDK 52 Manager & Server Companion (Shift Telemetry, ADR-0011 Barcode Scan, 86 Toggles, TV Pairing Hub) |

---

## Foundation Boundary Markers (`tests/foundation/`)

The following paths contain lightweight `foundation.boundary.json` metadata markers asserted by `tests/foundation/` against `docs/architecture/culinary-foundation.json`:

* `apps/mobile/foundation.boundary.json` — Architectural target marker referencing the live `mobile/` Expo SDK 52 workspace.
* `apps/customer-web/foundation.boundary.json` — Architectural target marker referencing `apps/web/package.json`.
* Top-level domain/module contract markers (`api/`, `domain/`, `modules/`, `services/`, `integrations/`, `shared/`, `extensions/`) — Preserved for `culinary-foundation.json` schema verification.
