# CulinaryOS — Architecture & Platform Specification

> **Version:** 2.1 — September 2026  
> **Status:** Active Multi-Venue Food Service OS Production Architecture  
> **Clean Baseline:** All legacy Dart/Flutter and Kotlin/Compose Multiplatform artifacts purged. Pure TypeScript/Node monorepo.

---

## 1. Architectural Baseline & Cleanup Note

A strict audit of the repository identified leftover legacy Flutter/Dart and Compose Multiplatform artifacts that violated the platform standard:
* `apps/pos/lib/` (Dart POS extension and UI drafts) — **DELETED**
* `apps/pos/test/` (Dart integration tests) — **DELETED**
* `apps/pos/build.gradle.kts` (Compose Multiplatform / Android build script) — **DELETED**
* `extensions/voice_ordering/lib/` (Dart voice ordering entrypoint) — **DELETED**

**Confirmation:** Zero `.dart` files, zero `pubspec.yaml` files, and zero Flutter/Android build tooling remain anywhere in the tree. CulinaryOS is 100% TypeScript, Hono, React, and Next.js.

---

## 2. Multi-Tenant Architecture & Multi-Venue Model

CulinaryOS solves the fragmentation of kitchen and restaurant operations by generalizing across venue types (restaurants, food trucks, catering kitchens, institutional kitchens, commissaries).

### 2.1 Entity Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                 Organization (`organizations`)              │
│       Top-level tenant account (Parent brand / group)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1 : N
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Venues (`restaurants` / `venues`)           │
│   Each venue has its own inventory, menus, staff, schedules │
│   Venue types: restaurant, food_truck, commissary, catering │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
┌──────────────────────┐ ┌───────────────┐ ┌──────────────────┐
│   Venue Inventory    │ │  Venue Menus  │ │   Venue Staff    │
│  Par levels, stock,  │ │ Daily specials│ │ Roles, schedules │
│  Purchase orders     │ │ Cycle menus   │ │ Timecards, tips  │
└──────────────────────┘ └───────────────┘ └──────────────────┘
```

### 2.2 Data Isolation & Row Level Security (RLS)
* Every data table (`ingredients`, `recipes`, `menus`, `pos_orders`, `purchase_orders`, `staff_shifts`) contains both `tenant_id` (venue-scoped) and links back to the parent `organization_id`.
* All 47 Supabase PostgreSQL tables strictly enforce Row Level Security (RLS). Cross-tenant queries are blocked at the database engine level via `tenant_id = my_tenant_id()`.
* Multi-venue corporate administrators can query aggregated reports across all venues owned by their organization (`organization_id = my_organization_id()`), while individual venue staff are locked strictly to their venue.

---

## 3. Swappable Vendor-Adapter Interface

Frustration with monolithic distributor lock-in (such as Sysco IMPAC) is a core driver for CulinaryOS. The inventory and purchasing layer is architected around a swappable, extensible **Vendor Adapter Interface**:

```
┌─────────────────────────────────────────────────────────────┐
│                  Purchasing & Inventory Engine              │
│            Auto-PO generation · Par level monitoring        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     `VendorAdapter` Contract                │
│   searchCatalog() · getLivePricing() · submitOrder()        │
│   getOrderStatus() · parseElectronicInvoice()               │
└───────┬──────────────┬──────────────┬──────────────┬────────┘
        ▼              ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│ Sysco Punch  ││   US Foods   ││  Gordon GFS  ││ Local Farm / │
│ Out / EDI850 ││  REST / EDI  ││ Direct Feed  ││ Generic CSV  │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

### 3.1 Interface Contract (`packages/shared/src/vendor-adapter.ts`)
```typescript
export interface VendorItem {
  vendorSku: string;
  name: string;
  packSize: string;
  unitPriceCents: number;
  category: string;
  leadTimeDays: number;
  inStock: boolean;
}

export interface VendorAdapter {
  readonly vendorId: string;
  readonly vendorName: string;
  searchCatalog(query: string, category?: string): Promise<VendorItem[]>;
  getLivePricing(vendorSkus: string[]): Promise<Map<string, number>>;
  submitPurchaseOrder(po: PurchaseOrderPayload): Promise<VendorOrderConfirmation>;
  trackShipment(vendorOrderRef: string): Promise<ShipmentStatus>;
  parseInvoice(rawInvoiceData: string | Buffer): Promise<ParsedInvoice>;
}
```

---

## 4. Required Feature Engine Matrix

| Feature | Engine / Layer | Database Models | Core Capability |
|---|---|---|---|
| **1. Multi-Venue Management** | `apps/server` + `packages/shared` | `organizations`, `restaurants`, `venue_settings` | Multi-venue switching under single org, distinct menus & inventory per venue. |
| **2. Recipe & Menu Management** | `packages/ratio-engine` + `apps/server` | `recipes`, `recipe_ingredients`, `menus`, `menu_items` | Yield scaling, Baker's %, ingredient cost roll-up, daily specials, seasonal/cycle menus. |
| **3. Inventory & Purchasing** | `apps/server` + `VendorAdapter` | `ingredients`, `pantry_status`, `purchase_orders`, `vendors` | Per-venue par levels, auto-PO generation, swappable vendor adapter catalog. |
| **4. Food Cost & Margins** | `packages/ratio-engine` + `apps/server` | `plate_economics`, `pos_order_line_items`, `waste_events` | Recipe cost roll-up, theoretical vs actual food cost variance, live gross margins. |
| **5. Staff & Labor** | `packages/labor-engine` | `staff_pins`, `shifts`, `tip_pools`, `timecards` | Roles, scheduling, FLSA tip engine (4 methods), Gusto/ADP CSV, labor % of sales. |
| **6. Multi-Tenant Isolation** | PostgreSQL RLS + `apps/server` middleware | V1–V17 migrations + pgTAP isolation suite | Cryptographic tenant separation, zero cross-tenant data leakage. |

---

## 5. Technology Stack & Verification Pipeline

* **Monorepo:** pnpm workspaces + Turborepo
* **Backend:** Hono REST API on Node.js 20 (`apps/server`)
* **Web Surfaces:** React 18, Vite, Next.js, Tailwind CSS, shadcn/ui
* **Database:** PostgreSQL (Supabase V1–V17 migrations) with 100% RLS coverage
* **Testing:** Node.js native test runner + `tsx` test harness (`scripts/run-all-tests.cjs`), Vitest, and pgTAP regression suites.
