# CulinaryOS — System Architecture

> **v4.0 — Canonical TypeScript Monorepo Architecture**

---

## 1. Governing Constraint

Restaurant software runs in hostile environments: unstable Wi-Fi, grease and steam, rushed kitchen staff, mid-service dinner rushes, and zero tolerance for downtime.

**The Sovereign Requirement:**
A cashier or server must be able to ring up orders, capture payments, hold/fire courses, and print receipts even during total Internet outages, while kitchen cooks view live ticket timers and bump stations seamlessly.

---

## 2. Client Surface & Package Map

```
CulinaryOS/
├── apps/
│   ├── server/          ← Unified Hono API (:3000) — Auth, Orders, KDS, Pantry, Ops, Payments
│   ├── pos/             ← POS Terminal (:5172) — 2D/3D Floor Map, Contactless Tap/Scan/Card, Offline Queue
│   ├── kds/             ← Kitchen Display (:5173) — Station Routing, Course Holding/Firing, Aging Timers
│   ├── admin/           ← Admin Portal (:5174) — Menu Catalog & 86ing, Staff PINs, Pantry Par Levels, POs
│   └── web/             ← Online Ordering (:5176) — Dietary Filtering, Modifier Selection, Cart & Checkout
├── packages/
│   ├── ratio-engine/    ← Pure culinary mathematical engine (yield scaling, baker's %, food cost, prep)
│   ├── db/              ← Supabase client & TypeScript database schema types (V1–V14)
│   ├── event-bus/       ← Domain event broker, binary protocol, handlers (pos:order:created, kds:ticket:bumped)
│   ├── shared/          ← Cross-cutting models, offline-sync delta engine, FDA Top 9 dietary engine
│   ├── ui/              ← Canonical shadcn/ui design system, Radix UI primitives, Three.js 3D floor map
│   ├── auth/            ← PIN auth, JWT verification, managerGate RBAC
│   └── config/          ← Monorepo environment variable validation & constants
├── mcp/                 ← 8 MCP tool servers for AI agent operations
├── extensions/          ← First-party extension manifests
├── extension_template/  ← Public contract for third-party extensions
├── tests/               ← 32 integration & E2E test suites (110+ tests)
└── scripts/
    ├── run-all-tests.cjs       ← Canonical test runner
    ├── daily-ops-consultant.ts ← Daily operations audit & inquiry generator
    └── doctor.ts               ← Preflight production readiness diagnostics
```

---

## 3. The Core Event-Driven Spine

```
[POS / Web / MCP] ──> PATCH /v1/orders/:id/send
                           │
                           ▼
                    pos:order:created (Event Bus)
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 [kitchen_tickets]   [pantry_deduct]   [plate_economics]
   (Course 1 Fired,    (Ingredient       (Theoretical
    Course 2 Held)     Stock Grams)       Food Cost)
```

1. **Order Creation & Fire:**
   - POS or Web client sends an order snapshot via `PATCH /v1/orders/:id/send`.
   - The unified API emits `pos:order:created` on `@culinaryos/event-bus`.
2. **Back-of-House Station Fan-Out:**
   - Course 1 items are immediately marked `firing` and routed to assigned stations (`grill`, `cold`, `fry`, `bar`, `pass`).
   - Course 2+ items start in `held` status with automated aging/firing timers.
3. **Pantry Inventory Decrement:**
   - Ingredients are resolved from recipe blueprints and decremented from pantry stock in real time.
   - Low-stock alerts fire automatically when quantity falls below `reorder_at`.
4. **Plate Economics & Cost Tracking:**
   - Theoretical food cost vs sales revenue is logged to `plate_economics` for real-time gross margin analytics.

---

## 4. Design System & 3D Spatial Technology (`@culinaryos/ui`)

1. **Canonical shadcn/ui Foundation:**
   - Accessible Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`, `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-checkbox`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`).
   - Standard `components.json` configuration with full HSL color tokens in `culinary-theme.css`.
2. **Three.js 3D Dining Room Floor Map (`FloorMap3D.tsx`):**
   - WebGL 3D spatial floor map featuring custom table geometries (`square`, `round`, `rectangle`, `booth`, `bar`, `oval` VIP).
   - Real-time status glow halos:
     - 🟢 **Available (`#10b981`)**
     - 🟠 **Occupied (`#f59e0b`)** with live bill total
     - 🟣 **Reserved (`#6366f1`)**
     - 🔴 **Dirty / Bus (`#f43f5e`)**
   - Camera orbit controls (drag rotate, zoom, perspective reset) and raycasted hover tooltips.

---

## 5. Dietary & Allergen Safety Engine (`@culinaryos/shared/dietary`)

- Complete **FDA FASTER Act Top 9** allergen coverage (`milk`, `eggs`, `fish`, `shellfish`, `tree_nuts`, `peanuts`, `wheat`, `soybeans`, `sesame`).
- Automatic lifestyle classification (`isVegan`, `isVegetarian`, `isPescatarian`, `isGlutenFree`, `isDairyFree`, `isNutFree`).
- Cross-contact risk matrix alerting for shared deep fryers, shared griddles, and bread toasters.
- Pre-mapped culinary substitution pathways.

---

## 6. AI Operations Manager & Consultant Framework

- Subagent `operations_consultant` with dual **Executive Chef & General Manager** perspective.
- Daily audit runner (`pnpm ops:audit`) generating [`docs/DAILY_OPERATIONS_REPORT.md`](DAILY_OPERATIONS_REPORT.md).
- Automated daily background daemon task scheduled via `schedule` tool (`0 9 * * *`).
- Strict adherence to **Rule 9**: AI is 100% additive; core service runs fully offline and sovereign.

---

## 7. Multi-Tenant Security & Isolation

- **PostgreSQL Row Level Security (RLS)** on all tables, scoped by `tenant_id`.
- `requireTenant` middleware on all API routes enforcing valid UUID tenant headers.
- `managerGate` RBAC enforcing strict role separation between `owner`, `manager`, `server`, `chef`, and `viewer`.
