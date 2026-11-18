# CulinaryOS — Developer, REST API, TypeScript SDK & Resilience Reference

> **Canonical Repository:** `ShadowWalkerNC/CulinaryOS`
> **Architecture:** Single-Port Native Rust Workstation (`127.0.0.1:3000`) + TypeScript Turborepo Monorepo + Optional Cloud Bridge SaaS

---

## 1. Mission & Identity

**CulinaryOS** is an industrial, open-source, local-first restaurant operating system built to compete directly with **Toast POS** and **Square for Restaurants** without predatory per-terminal fees, proprietary hardware lock-in, or cloud-outage downtime.

- **One Installed Application:** `culinaryos-desktop.exe` binds a single unified port (`http://127.0.0.1:3000`) serving the Native Rust REST API Gateway (`embedded-local-db`) and all 7 operational SPAs (`/pos/`, `/kds/`, `/admin/`, `/kitchenkit/`, `/menu/`, `/ops/`, `/display/`).
- **One Marketing & Cloud Bridge Platform:** `apps/marketing` (`@culinaryos/app-marketing`) and `packages/cloud-bridge-server` (`@culinaryos/cloud-bridge-server`) live inside the same monorepo.
- **121 Absorbed Chef's Intelligence Skills:** `packages/intelligence` (`@culinaryos/intelligence`) bundles the entire 121-skill Chef's Intelligence & Open Kitchen Toolkit library across 8 operational packs (`home`, `bakery`, `food-truck`, `bar-foh`, `shops`, `operations`, `people`, `care`), with **100% deterministic local math fallbacks** (72% GP dish costing, 14-regulated-allergen FIR/Natasha's Law + FDA Top-9 matrix, WTR Reg 10 11-hour rota rest compliance, and Baker's percentage scaling).

---

## 2. Out-of-the-Box Quickstart

### A. 1-Click Windows Restaurant Workstation (Zero Dependencies)
1. Run `Install-CulinaryOS.bat` from the repository root (or extract `dist-installer/CulinaryOS-v1.3.1-Windows-x64.zip` and double-click `Install-CulinaryOS.cmd`).
2. Installs to `%LOCALAPPDATA%\CulinaryOS\culinaryos-desktop.exe` (no Administrator privileges required) and creates the `CulinaryOS Workstation` Desktop and Start Menu shortcuts.
3. Opens `http://127.0.0.1:3000/setup` on first launch for the 5-step onboarding wizard (Venue profile, Business preset `Full-Service` / `Joe's Street Tacos` / `Benjamin's Gastropub`, Tax rate, Floor plan, and Demo data seeding).

### B. Developer Monorepo Quickstart
```powershell
# 1. Install workspace dependencies
pnpm install

# 2. Run all 202 monorepo test suites (Node, TypeScript, Postgres static audit &Chef's Intelligence)
node ./scripts/run-all-tests.cjs

# 3. Run Native Rust unit tests & standalone self-test
cargo test -p culinaryos-native
cargo run --release --manifest-path apps/desktop/src-tauri/Cargo.toml -- --self-test

# 4. Run full monorepo static typecheck
pnpm run typecheck

# 5. Build the 1-click Windows release installer package
powershell -ExecutionPolicy Bypass -File scripts/build-windows-installer.ps1
```

---

## 3. Application Pages, Unified Port 3000 Routes & Keyboard Shortcuts

| Route / URL | Hotkey | Surface Name | Source Package | Purpose |
|---|---|---|---|---|
| `http://127.0.0.1:3000/` | — | **Master Workstation Shell** | `packages/native` | Unified header rail, surface switcher, drawer kick, Z-Report modal, QR pairing |
| `http://127.0.0.1:3000/setup` | — | **5-Step First-Run Wizard** | `packages/native` | Venue config, business preset seeder, tax bps, floor tables & optional SaaS token |
| `http://127.0.0.1:3000/pos/` | `F1` | **Point of Sale (POS)** | `apps/pos` | Order entry, 2D floor map, seat/course hold & fire, split checks, bar tabs, cash/card checkout |
| `http://127.0.0.1:3000/kds/` | `F2` | **Kitchen Display (KDS)** | `apps/kds` | Station rails (`hot`, `cold`, `grill`, `fry`, `pastry`, `bar`, `expo`), timers, bump bar, 86 board |
| `http://127.0.0.1:3000/admin/` | `F3` | **Back-Office Admin** | `apps/admin` | Menu editor, OCR Menu Import (`sylvia-menu`), Staff PINs, FLSA Tip Pools, Campaign Studio (`Post-Pilot`) |
| `http://127.0.0.1:3000/kitchenkit/` | `F4` | **KitchenKit & Prep** | `apps/kitchenkit` | Baker's % scaling, density conversions, 14-allergen/Top-9 badges, shift prep plans, adhesive labels |
| `http://127.0.0.1:3000/menu/` | `F5` | **Digital Menu & Storefront** | `apps/web` | Guest-facing QR table ordering, public restaurant templates (`Plated`), live 86 filtering |
| `http://127.0.0.1:3000/ops/` | `F6` | **CulinaryOps & MRP** | `apps/ops` | Pantry par inventory, Purchase Orders, Vendor catalogs (Sysco/US Foods/Dennis), Waste logs, Talent ATS |
| `http://127.0.0.1:3000/display/` | — | **Customer & TV Display** | `apps/display` | D-Pad Android TV / CleanMyTV kiosk views (Pickup board, Promo wallboard, Staff briefing) |
| Action: **Kick Cash Drawer** | `F8` | **ESC/POS Pin 2 Pulse** | `packages/native` | Fires `ESC p 0 25 250` (`POST /v1/hardware/kick-drawer`) to open RJ11/RJ12 printer-driven drawer |
| Action: **EOD Z-Report** | `F9` | **Z-Report Closeout Modal** | `packages/native` | Displays gross/net sales, tax, cash expected vs. actual variance, voids, and tip pool summary |
| Action: **Mobile QR Pairing** | `F10` | **LAN Companion Pairing** | `packages/native` | Generates single-use 5-minute LAN pairing code for iOS/Android handhelds & TV displays |
| Action: **Fullscreen Kiosk** | `F11` | **Kiosk Mode Toggle** | `packages/native` | Toggles distraction-free fullscreen terminal mode |

### Marketing Site Pages (`apps/marketing`)
- `/` — Product overview, interactive demo video, Toast/Square cost comparison
- `/features` — Deep dive into POS, KDS, Hardware, FLSA Compliance, and Chef's Intelligence
- `/pricing` — Free Open-Source Core ($0) vs. Cloud Pro ($49/mo) vs. Enterprise Commissary ($149/mo) + interactive Savings Calculator
- `/download` — 1-Click Windows x64 installer download, SHA-256 verification & hardware BOM guide
- `/recipeos` — Recipe vault, Baker's percentage math, and allergen intelligence showcase
- `/studio` & `/campaigns` — Campaign Studio (`Post-Pilot`) social media automation showcase
- `/signup` — Fail-closed Cloud Bridge tenant registration & entitlement provisioning

---

## 4. Roles, Default Demo PINs & FLSA Compliance Boundaries

| Role | Default PIN | Hiring/Firing Authority | Tip Pool Eligible (FLSA) | Permitted Surfaces & Actions |
|---|---|---|---|---|
| **Owner** | `1234` (Native) / `5678` (Demo) | **Yes** | **EXCLUDED (`$0.00` hardcoded)** | All surfaces, Z-Report closeout, void/comp override, staff & PIN admin, SaaS billing |
| **General Manager** | `5678` | **Yes** | **EXCLUDED (`$0.00` hardcoded)** | All surfaces, Z-Report closeout, void/comp override, PO approval, rota & talent hiring |
| **Executive / Sous Chef** | Custom PIN | **Yes** | **EXCLUDED (`$0.00` hardcoded)** | KDS, KitchenKit, Recipe Vault, 72% GP Dish Costing, 86 Board, Pantry & Purchase Orders |
| **Server / Bartender** | `1234` | **No** | **ELIGIBLE (FOH Pool)** | POS order entry, table transfer/merge, bar tabs, split checks, cash/card settlement |
| **Line Cook / Expo** | Station Token | **No** | **ELIGIBLE (Only if full minimum wage)** | KDS station ticket viewing, course firing, ticket bump, quick waste logging |
| **Host / Cashier** | Custom PIN | **No** | **ELIGIBLE** | Floor plan seating, reservation check-in, takeout/counter orders, pickup display |

> **FLSA Legal Gate (29 U.S.C. § 203(m)(2)(B)):** Hardcoded in both `packages/native/src/local_store.rs` and `packages/labor-engine`. Any participant with `role IN ('owner', 'manager')` or `hasHiringFiringAuthority === true` is unconditionally excluded from every tip pool (`allocatedCents = 0`).

---

## 5. Free Open-Source Core vs. Paid SaaS Tier Matrix

| Capability | Open-Source Core ($0 / Forever, MIT) | Cloud Pro SaaS ($49/mo flat/location) | Enterprise & Commissary ($149/mo/location) |
|---|---|---|---|
| **POS, 2D Floor Map, Split Checks, Bar Tabs** | Included (Unlimited Terminals) | Included | Included |
| **KDS Multi-Station Rails, Pacing & 86 Sync** | Included (Unlimited Screens) | Included | Included |
| **Direct LAN `:9100` / USB ESC/POS & Drawer Kick** | Included (+ Auto Backup Printer Failover) | Included | Included |
| **FLSA Tip Pools, Payroll CSV & EOD Z-Reports** | Included | Included | Included |
| **Bring-Your-Own Stripe Connect Standard** | Included (0% CulinaryOS markup) | Included | Included |
| **39 Deterministic Chef's Intelligence Calculators** | Included (72% GP, 14-Allergens, WTR Rota, Baker's %) | Included | Included |
| **Encrypted Offsite Cloud Storage & Remote Web Admin** | Local LAN DB (`culinaryos.db` / Postgres) | **`cloud_storage` Add-On Included** | **`cloud_storage` Add-On Included** |
| **Hosted Commission-Free Online Ordering & QR Relay** | Local LAN `/menu/` Storefront | **`online_ordering` Add-On Included** | **`online_ordering` Add-On Included** |
| **Beta 121-Skill Generative AI Autopilot & Campaign Studio** | Deterministic Local Template Fallback | **`ai_autopilot` Add-On Included** (Off-by-default flag) | **`ai_autopilot` Add-On Included** |
| **Multi-Unit Organization Rollups & Central Commissary** | Single-Location Mode | Single-Location Mode | **`multi_unit_commissary` Add-On Included** |
| **Multi-Distributor MRP Split-Order Optimizer (Sysco/US Foods/Dennis)** | Standard Par-Level POs | Standard Par-Level POs | **Included + Invoice Price Variance (IPV)** |

---

## 6. Failure-Mode & Fallback Architecture (Solved Reddit `r/restaurateur` Pain Points)

| Real-World Failure Scenario | Why Toast / Square Fails (Reddit Operator Reports) | CulinaryOS Deterministic Fallback | Verification Endpoint / Test |
|---|---|---|---|
| **1. WAN / ISP Fiber Cut During Friday Rush** | Toast offline mode fails to sync separate handhelds/terminals locally; Square auth screens spin and lock out. | `culinaryos-desktop.exe` runs a local Rust API & event bus on `127.0.0.1:3000` (and LAN IP `:3000`). All tablets, KDS screens, and printers on the local router stay 100% synced without internet. | `GET /health` & `GET /v1/system/resilience` |
| **2. Primary Kitchen Printer Jammed / Offline** | Cloud print webhooks drop chits or require manual category re-routing in admin settings mid-rush. | Bounded TCP `:9100` socket timeout automatically reroutes the ESC/POS byte stream to `fallbackPrinterIp` with a `*** REROUTED FROM STATION ***` header and mirrors an alert on the KDS rail. | `POST /v1/hardware/print` (`simulatePrimaryOffline: true`) |
| **3. Wi-Fi Drop or Double-Tap on Payment** | Duplicate card charges or checks stuck in half-paid state during EOD closeout. | Client-generated UUID `operationId` idempotency key is recorded in the persistent `applied_operations` ledger. Retries return the original receipt with zero double-charge. | `POST /v1/payments/cash` & `POST /v1/pos/sync-deltas` |
| **4. SaaS Subscription Token Expires Offline** | Cloud-tethered POS terminals lock out staff until billing server is contacted. | 72-hour HMAC-SHA256 offline grace window (`OFFLINE_GRACE_SECONDS`). Even after grace expiry, **only cloud add-ons pause** — local POS, KDS, drawer kick, and Z-Reports never lock out. | `GET /v1/cloud/status` & `packages/native/src/cloud_bridge.rs` |
| **5. LLM API Outage or AI Flag Disabled** | AI-wrapper tools crash with HTTP 500 or hallucinate recipe food cost math. | AI is off-by-default (Rule 6). All 121 Chef's Intelligence skills execute deterministic local math (`calculateDishCost72GP`, `build14AllergenMatrix`, `auditRotaComplianceWTR`) with zero LLM dependency. | `POST /v1/intelligence/chefs-intelligence/cost-dish` |

---

## 7. TypeScript SDK (`@culinaryos/sdk`) & REST API Usage

```typescript
import {
  createCulinaryClient,
  listChefIntelligenceCatalog,
  loadChefSkillMarkdown,
  calculateDishCost72GP,
  auditRotaComplianceWTR,
  build14AllergenMatrix,
} from '@culinaryos/sdk';

// 1. Connect to local Native Rust Workstation (or Cloud Hono API)
const client = createCulinaryClient({
  baseUrl: 'http://127.0.0.1:3000',
  tenantId: '00000000-0000-0000-0000-000000000001',
});

// 2. Create & fire a multi-course POS order to KDS station rails
const order = await client.orders.create({
  table_number: 'Table 12',
  items: [
    { menu_item_id: 'item-burrata', quantity: 1, seat: 1, course: 1 },
    { menu_item_id: 'item-ribeye', quantity: 2, seat: 1, course: 2 },
  ],
});
await client.orders.sendToKitchen(order.id);

// 3. Deterministic 72% GP Dish Costing (works 100% offline with zero AI tokens)
const costing = calculateDishCost72GP({
  name: 'Pan-Roasted Alaskan Halibut',
  targetGpPct: 72,
  isVatRegistered: false,
  ingredients: [
    { name: 'Alaskan Halibut Fillet', weightGrams: 180, bulkPricePerKg: 28.0, trimYieldPct: 55 },
    { name: 'Brown Shrimp Butter', weightGrams: 45, bulkPricePerKg: 14.5, trimYieldPct: 100 },
  ],
});

// 4. Inspect Free Open-Source vs. Paid SaaS Tiers & Active Resilience Fallbacks
const tiers = await client.intelligence.getTiers();
const resilience = await client.intelligence.resilience();
```
