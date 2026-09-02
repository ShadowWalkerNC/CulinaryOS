# Project: CulinaryOS Complete Engine Implementation & Zero-Tech Packaging

## Architecture
CulinaryOS is an AI-native, multi-tenant restaurant operating system monorepo orchestrated via pnpm workspaces and Turborepo. It powers Front-of-House (POS, Storefront, Tableside QR), Back-of-House (KDS, KitchenKit Prep Planner, Shelf-Life Manager), Operations (CulinaryOps food costing, waste logging, labor/tips), Security & Ledger (Manager PIN gatekeeper, Multi-Rate Tax, EOD Z-Report), and a Turnkey Zero-Tech System Tray & Network Discovery Engine.

```
                    ┌──────────────────────────────────────────────┐
                    │               CulinaryOS API                 │
                    │         (apps/server - Hono HTTP/WS)         │
                    └──────┬───────────────┬────────────────┬──────┘
                           │               │                │
             ┌─────────────┴──┐    ┌───────┴──────┐   ┌─────┴───────────────┐
             │ FOH Interfaces │    │ BOH Systems  │   │ Ops, Sec & Ledger   │
             │  • apps/pos    │    │  • apps/kds  │   │  • apps/ops         │
             │  • apps/web    │    │  • kitchenkit│   │  • apps/admin       │
             └────────────────┘    └──────────────┘   └─────────────────────┘
                           │               │                │
  ┌────────────────────────┴───────────────┴────────────────┴───────────────────────┐
  │ Shared Core Engines (packages/)                                                 │
  │ • shared (pricing, modifier, translation, contracts, printer ESC/POS)           │
  │ • prep-engine (batch scaling, 2"x1" / 2"x2" adhesive thermal expiration labels) │
  │ • food-cost-engine (actual-vs-theoretical cost variance analysis)               │
  │ • waste-engine (1-click scrap & auto-void debiting)                             │
  │ • labor-engine (role-weighted & hours-based tip pooling)                        │
  │ • pdf-tools (QR pairing, printable table tents, thermal chits)                  │
  └─────────────────────────────────────────────────────────────────────────────────┘
                                   │
  ┌────────────────────────────────┴────────────────────────────────────────────────┐
  │ Turnkey Zero-Tech Runtime & Installer (scripts/ & apps/desktop)                 │
  │ • install-windows-turnkey.ps1, Install-CulinaryOS.bat                           │
  │ • scripts/tray-manager.ts (System Tray Daemon, Silent Boot, Port Self-Heal)     │
  │ • scripts/mdns-qr-discovery.ts (mDNS culinaryos.local, LAN Pairing QR)          │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1.1 | Hierarchical Modifiers | Multi-level nested modifier selection with min/max rules and included/free allowances | M1 | ORIGINAL_REQUEST §R1 |
| F1.2 | 2D/3D Floor Map Operations | Drag-and-drop table merging, seat/bill splitting, server shift reassignment | M1 | ORIGINAL_REQUEST §R1 |
| F1.3 | Daypart & Happy Hour Pricing | Automated time/day-scheduled price adjustments with time-range validation | M1 | ORIGINAL_REQUEST §R1 |
| F1.4 | 3-Mode Tableside QR | View-only, Pay-at-Table with split bill, and Self-Ordering with Assistance Buzzer | M1 | ORIGINAL_REQUEST §R1 |
| F2.1 | Live 86 Countdowns | Real-time portion decrementing on order send and automatic 86 status lock at 0 | M2 | ORIGINAL_REQUEST §R2 |
| F2.2 | Multi-Course Hold/Fire Pacing | Course staging with pacing countdown timers, warning alerts, and 1-click fire | M2 | ORIGINAL_REQUEST §R2 |
| F2.3 | Per-Station Dual Translation | Bilingual kitchen ticket and ESC/POS thermal chit translation (EN/ES/FR) | M2 | ORIGINAL_REQUEST §R2 |
| F2.4 | 1-Click Waste & Variance | Quick-tap scrap logging linked directly to actual-vs-theoretical food cost variance | M2 | ORIGINAL_REQUEST §R2 |
| F2.5 | Batch Prep Scaling & Labels | Baker's percentage prep scaling with 2"x1" & 2"x2" adhesive thermal expiration labels | M2 | ORIGINAL_REQUEST §R2 |
| F3.1 | Manager PIN Gatekeeper | Authorization gate for post-send voids, comps, drawer opens with reason tracking | M3 | ORIGINAL_REQUEST §R3 |
| F3.2 | Post-Send Void Auto-Waste | Automatic inventory reduction and waste event generation on post-send item voids | M3 | ORIGINAL_REQUEST §R3 |
| F3.3 | Multi-Rate Tax Engine | Categorized tax calculations for prepared food, alcoholic beverages, and exemptions | M3 | ORIGINAL_REQUEST §R3 |
| F3.4 | Role-Weighted Tip Pooling | Tip distribution calculations supporting hours-worked and role percentage splits | M3 | ORIGINAL_REQUEST §R3 |
| F3.5 | Automated EOD Z-Report | Shift reconciliation, cash float audit (over/short), and immutable daily closeout | M3 | ORIGINAL_REQUEST §R3 |
| F4.1 | Turnkey Windows Installer | Zero-tech 1-click setup script provisioning Node, dependencies, firewall, shortcuts | M4 | ORIGINAL_REQUEST §R4 |
| F4.2 | System Tray Background Daemon | Silent background supervisor managing API, POS, KDS, Desktop with tray controls | M4 | ORIGINAL_REQUEST §R4 |
| F4.3 | Automated Diagnostics Preflight | 1-click system health check verifying Node, ports, disk, DB, and network reachability | M4 | ORIGINAL_REQUEST §R4 |
| F4.4 | Port Conflict Self-Healing | Automated detection and termination of zombie processes locking ports 3000/5172-5180 | M4 | ORIGINAL_REQUEST §R4 |
| F4.5 | Local QR & mDNS Discovery | mDNS broadcasting (`culinaryos.local`) and terminal LAN QR pairing generation | M4 | ORIGINAL_REQUEST §R4 |
| F5.1 | Full 4-Tier E2E Test Suite | Automated test verification across all 26 feature definitions (Tiers 1-4) | M5 / Test Track | ORIGINAL_REQUEST Acceptance |
| F5.2 | Adversarial Hardening | White-box stress testing, boundary fuzzing, race-condition and audit verification | M5 | System Prompt |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Front-of-House Dining & Service Engines | F1.1 (Hierarchical Modifiers), F1.2 (Floor Operations), F1.3 (Daypart Pricing), F1.4 (3-Mode Tableside QR) | None | IN_PROGRESS |
| M2 | Back-of-House Kitchen & Prep Engines | F2.1 (Live 86 Decrement), F2.2 (Course Pacing Timers), F2.3 (Dual Translation), F2.4 (1-Click Waste & Variance), F2.5 (Batch Prep & Adhesive Labels) | None | IN_PROGRESS |
| M3 | Security, Void Governance & Accounting Ledger | F3.1 (Manager PIN Gates), F3.2 (Void Auto-Waste), F3.3 (Multi-Rate Tax), F3.4 (Tip Pooling), F3.5 (Automated EOD Z-Report) | None | IN_PROGRESS |
| M4 | Turnkey Zero-Tech Installer & System Tray Engine | F4.1 (Turnkey Installer), F4.2 (Tray Daemon), F4.3 (Diagnostics Preflight), F4.4 (Port Self-Healing), F4.5 (mDNS & Local QR Discovery) | None | IN_PROGRESS |
| M5 | Full E2E Integration & Adversarial Verification | F5.1 (Tiers 1-4 Test Pass), F5.2 (Adversarial Coverage Hardening, Static Typecheck & Build Gate) | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. Hierarchical Modifiers (`packages/shared/src/types/menu.ts` & `apps/server/src/routes/orders.ts`)
- **Schema Extension**:
  - `ModifierGroup`: `{ id: string, menuItemId?: string, parentModifierId?: string, name: string, minSelections: number, maxSelections: number, freeQuantity: number, required: boolean, nestedGroups?: ModifierGroup[] }`
  - `SelectedModifier`: `{ id: string, modifierGroupId: string, parentModifierId?: string, name: string, priceAdjustmentCents: number, effectivePriceCents: number, subModifiers?: SelectedModifier[] }`
- **Pricing Calculation**: First `freeQuantity` selections in a group cost $0; remaining selections incur `priceAdjustmentCents`.

### 2. Table Operations (`apps/server/src/routes/tables.ts`)
- `POST /v1/tables/merge`: `{ sourceTableIds: string[], targetTableId: string, managerPin?: string }` ➔ `{ success: true, targetTableId: string, mergedOrderId: string }`
- `POST /v1/orders/:id/split`: `{ splitType: 'seat' | 'items' | 'custom', partitions: { seatNumber?: number, itemIds: string[] }[] }` ➔ `{ newOrderIds: string[] }`
- `POST /v1/tables/transfer`: `{ tableId: string, fromServerId: string, toServerId: string, managerPin: string }` ➔ `{ success: true }`
- `POST /v1/tables/:id/assistance`: `{ tableId: string, type: 'server' | 'water' | 'bill', note?: string }` ➔ `{ notificationId: string, timestamp: string }`

### 3. Daypart Pricing (`packages/shared/src/pricing.ts` & `apps/server/src/routes/dayparts.ts`)
- `DaypartSchedule`: `{ id: string, name: string, daysOfWeek: number[], startTime: string, endTime: string, adjustmentType: 'percent' | 'fixed_cents' | 'override_cents', value: number }`
- `resolveEffectivePrice(basePriceCents: number, schedules: DaypartSchedule[], atTime?: Date): number`

### 4. Back-of-House 86 & Course Pacing (`apps/server/src/routes/orders.ts` & `apps/server/src/routes/kds.ts`)
- `PATCH /v1/orders/:id/send`: Atomically decrements `menu_items.count_remaining`. If `count_remaining <= 0`, sets `status = '86d'` and broadcasts real-time 86 alert.
- `CoursePacing`: `{ courseNumber: number, holdStatus: 'held' | 'firing' | 'fired', targetFireTime?: string, pacingDurationMinutes: number }`
- `PATCH /v1/kds/tickets/:id/fire-course`: `{ courseNumber: number }` ➔ sets `holdStatus = 'fired'`, updates `fired_at = now()`.

### 5. Dual Translation (`packages/shared/src/translation.ts`)
- `translateTicket(ticket: KitchenTicket, targetLanguage: 'es' | 'fr' | 'en'): TranslatedKitchenTicket`
- Formats KDS cards and ESC/POS thermal printer chits with primary translated name + original subtitle.

### 6. 1-Click Waste & Food Cost Variance (`apps/server/src/routes/ops.ts`)
- `POST /v1/ops/waste/quick`: `{ ingredientId?: string, menuItemId?: string, quantity: number, unit: string, reason: 'dropped' | 'burned' | 'spoiled' | 'overportion' | 'void_cooked', staffPin: string }`
- `GET /v1/ops/food-cost/variance`: Returns theoretical food cost vs actual ingredient depletion + waste loss percentage.

### 7. Adhesive Expiration Labels (`packages/prep-engine/src/labels.ts`)
- `formatAdhesiveLabel(batch: PrepBatch, format: '2x1' | '2x2'): AdhesiveLabelPayload`
- Returns printable thermal bitmap / ESC/POS commands with item name, prep date/time, use-by date/time, cook initials, batch #, allergen warnings, QR code.

### 8. Manager PIN Security & Void Waste Ledger (`apps/server/src/routes/auth.ts` & `orders.ts`)
- `POST /v1/auth/verify-manager-pin`: `{ pin: string }` ➔ `{ authorized: boolean, managerId?: string, role: string }`
- `PATCH /v1/orders/:id/items/:itemId/void`: `{ managerPin: string, reasonCode: 'customer_change' | 'kitchen_error' | 'damaged' | 'spill', isCooked: boolean }` ➔ Voids line item, records audit trail, and if `isCooked === true`, auto-creates `waste_events` record.

### 9. Multi-Rate Tax & Tip Pooling EOD Z-Report (`packages/labor-engine` & `apps/server/src/routes/reports.ts`)
- `TaxRates`: `{ preparedFoodRate: number, alcoholRate: number, taxExemptRate: 0 }`
- `TipPoolDistribution`: `{ method: 'hours_worked' | 'role_weighted', poolTotalCents: number, roles: { role: string, weight: number }[], staffHours: { staffId: string, role: string, hours: number }[] }`
- `GET /v1/reports/z-report`: Full end-of-day reconciliation: total gross sales, category breakdown, tax summary, tip distribution, cash drawer over/short.
- `POST /v1/reports/z-report/close`: Atomically seals the shift and writes immutable Z-Report ledger record.

### 10. Turnkey Installer & Tray Daemon (`scripts/` & `apps/desktop`)
- `scripts/install-windows-turnkey.ps1` / `Install-CulinaryOS.bat`: One-click setup.
- `scripts/tray-manager.ts`: Runs background tray daemon, handles port self-healing, launches `apps/desktop` workstation, displays LAN pairing QR.
- `scripts/mdns-qr-discovery.ts`: mDNS broadcast on `culinaryos.local` and terminal QR display.

## Code Layout
```
apps/
  server/src/
    routes/
      auth.ts          # Manager PIN verification & staff authentication
      orders.ts        # Order lifecycles, nested modifiers, atomic 86 decrement, post-send void auto-waste
      tables.ts        # Table merge, split, server transfer, assistance buzzer
      dayparts.ts      # Scheduled daypart/happy hour pricing
      kds.ts           # Course pacing, dual-language ticket formatting, station routing
      ops.ts           # Quick-tap waste logging, theoretical vs actual food cost variance
      reports.ts       # Multi-rate tax, tip pool distribution, immutable EOD Z-Report
    lib/
      pin.ts           # Scrypt / timing-safe PIN verification
      mock-kitchen.ts  # Offline demo state for kitchen tickets & inventory
  pos/src/
    views/
      TablesView.tsx   # 2D/3D floor map with table merge, split, and transfer modals
      MenuView.tsx     # Nested hierarchical modifier selection modal
      OrderView.tsx    # Manager PIN protected void & comp modal with reason capture
      ReportsView.tsx  # Interactive EOD Z-Report view with cash reconciliation
  kds/src/
    components/
      TicketCard.tsx   # Multi-course pacing timers, dual-language card rendering, 1-tap waste
  web/src/
    pages/
      TablesidePage.tsx# 3-Mode Tableside QR experience (/table/:slug/:tableNumber)
  kitchenkit/src/
    pages/
      PrepPlannerPage.tsx # Batch prep scaling & 2"x1" / 2"x2" adhesive expiration label generator
  ops/src/
    pages/
      FoodCostPage.tsx # Actual-vs-Theoretical food cost variance dashboard
packages/
  shared/src/
    types/             # Hierarchical modifiers, table operations, pricing schedules, Z-Reports
    pricing.ts         # Daypart pricing engine
    modifiers.ts       # Nested modifier tree & free quantity calculator
    translation.ts     # Culinary translation dictionary (EN/ES/FR)
    printer.ts         # ESC/POS adhesive label & Z-Report thermal printing
  prep-engine/src/     # Prep batch scaling & adhesive label formatting
  waste-engine/src/    # Scrap aggregation & auto-waste debiting
  food-cost-engine/src/# Actual-vs-theoretical variance formulas
  labor-engine/src/    # Role-weighted & hours-worked tip pooling
scripts/
  install-windows-turnkey.ps1 # Turnkey Windows installer script
  Install-CulinaryOS.bat      # 1-click batch launcher
  tray-manager.ts             # System tray background supervisor & port self-healer
  mdns-qr-discovery.ts        # mDNS culinaryos.local advertising & LAN QR pairing
  run-all-tests.cjs           # Universal test suite runner
tests/
  e2e/                        # Comprehensive Tiers 1-4 Opaque-Box Test Suites
