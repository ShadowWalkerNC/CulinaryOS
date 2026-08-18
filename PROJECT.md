# Project: CulinaryOS Consolidation

## Architecture
CulinaryOS is an AI-native, modular, forkable restaurant operating system ("the Linux of restaurant tech") consolidating POS, KDS, inventory, recipe scaling, operational analytics, automated loyalty marketing, and AI agent tools under an MIT open-source license.

### Monorepo Workspaces & Package Boundaries
- `apps/server`: Unified Hono API (POS orders, KDS queue, pantry inventory, ops/waste, plate economics, PIN auth, demo mock kitchen hub).
- `apps/pos`: Fast touch-screen POS terminal (React + Vite + Tailwind + `@culinaryos/ui`).
- `apps/kds`: Real-time Kitchen Display System (React + Vite + Station Routing + Multi-Course Holding/Firing + Aging Timers).
- `apps/admin`: Back-office management portal (React + Vite + Menu management, Staff PINs, Pantry stock, Waste analytics, Recipe viewing).
- `apps/web`: Public online ordering storefront (React + Vite + Menu browsing, Cart, Checkout).
- `packages/ratio-engine`: Pure, zero-dependency culinary mathematical engine (sub-recipe trees, portion scaling, baker's percentages, density unit conversions, food costing, variance analysis, waste summarization, shift prep planning).
- `packages/db`: Supabase client and TypeScript database schema definitions matching migrations V1–V14.
- `packages/event-bus`: Domain event broker, binary protocol, realtime bridge, and event handlers (`pos:order:created`, `pos:menu:item-sold`, `kds:ticket:bumped`, `kds:course:fired`).
- `packages/shared`: Cross-cutting domain models, course engine, station routing matrix, offline transaction queue, and types.
- `packages/ui`: Corporate Modern design tokens (`culinary-theme.css`) and reusable React primitives (`CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge`).
- `packages/auth`: JWT verification, PIN auth logic, role-based access control (`managerGate`).
- `packages/config`: Shared environment variable validation and constants.
- `mcp/`: MCP tool servers (`culinaryos-mcp`, `culinaryops-hub-live`, `recipe-server`, `inventory-server`, `kds-server`, `pos-server`, `post-pilot-server`, `prep-server`).
- `extensions/`: First-party extension manifests for modular platform extensibility.

---

## Feature Inventory

Every feature discovered in the Survey phase is mapped to an implementation milestone below:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Sub-Recipe Tree Scaling | Recursive formula scaling for nested doughs, sauces, bases | M1 | RecipeOS/KitchenKit |
| 2 | Tree Flattening & Aggregation | Flattens hierarchical scaled recipe tree into consolidated raw ingredients | M1 | KitchenKit ratio-engine |
| 3 | Baker's Percentages & Total Weight | Calculates baker's percentage (base = 100%) and scales from total weight | M1 | KitchenKit/CulinaryOS |
| 4 | Density-Based Unit Conversions | Bidirectional grams <-> cups for flour, sugar, butter, salt, rice, oats | M1 | RecipeOS ratio-engine |
| 5 | Smart Decimal Portion Formatting | Formats scaled quantities (integers -> whole, >=1 -> 1dp, <1 -> 2dp) | M1 | RecipeOS ratio-engine |
| 6 | Recipe Food Costing & Target % | Computes cost per serving, total cost, food cost % and status (good/watch/high) | M1 | CulinaryOps food-cost-engine |
| 7 | Actual vs Theoretical Cost Variance | Computes dollar and percentage variance with ok (<2%), warn (2-5%), alert (>=5%) | M1 | CulinaryOps food-cost-engine |
| 8 | Waste Summarization & Top Offenders | Aggregates waste weight, dollar loss, reason breakdown, top wasted items | M1 | CulinaryOps waste-engine |
| 9 | Shift Prep & Mise en Place Planning | Evaluates par shortfall by shift and generates station prep task lists | M1 | KitchenKit prep-engine |
| 10 | Batch Requirement Projection | Calculates total batch weight needed for target covers with buffer factor | M1 | KitchenKit prep-engine |
| 11 | V1–V14 Database TypeScript Types | Complete schema types for tenants, orders, tickets, pantry, waste, economics | M1 | Database migrations |
| 12 | Closed-Loop POS Order Deduction | Resolves menu_item_recipes to constituent ingredients and decrements pantry stock | M2 | Event spine & pantry.ts |
| 13 | Demo Mode In-Memory Pantry Decrement | Firing orders in mock mode decrements mockPantry and logs plate economics | M2 | apps/server orders & pantry |
| 14 | Dynamic Par Level Alerts | Identifies low-stock and out-of-stock items in live and demo mode | M2 | /v1/pantry/alerts |
| 15 | Automated Purchase Order Generation | Automatically generates draft POs with calculated reorder quantities | M2 | /v1/pantry/purchase-orders/auto-generate |
| 16 | Supplier PO Lifecycle | Approval, dispatch (send), and stock receiving with pantry ledger logging | M2 | /v1/pantry/purchase-orders/* |
| 17 | Food Waste Logging Endpoint | POST /v1/ops/waste logs waste events, costs, and auto-records ledger adjustments | M2 | apps/server ops.ts |
| 18 | Waste Analytics Summary API | GET /v1/ops/waste/summary aggregates waste trends and top financial loss items | M2 | apps/server ops.ts |
| 19 | Plate Economics API | GET /v1/ops/plate-economics retrieves theoretical food cost vs sale price history | M2 | apps/server ops.ts |
| 20 | Loyalty & Marketing API | /v1/ops/loyalty points balance adjustment and postcard coupon generation | M2 | apps/server ops.ts |
| 21 | Multi-Course Holding Engine | Holds Course 2+ upon order send while immediately firing Course 1 | M2 | shared course-engine |
| 22 | Manual & Direct Course Firing | POST /v1/orders/:id/fire-course and PATCH /v1/kds/tickets/:id/fire | M2 | apps/server orders & kds |
| 23 | KDS Station Routing & Expo Pass | Line station filtering (grill, cold, fry, bar) vs full Expo Pass view | M2 | apps/kds & stations.ts |
| 24 | Ticket Aging Alerts & Bump Workflows | Real-time aging color transitions (<5m green, 5-10m amber, >10m red) and auto-advance | M2 | apps/kds & kds-ticket-bumped |
| 25 | Terminal PIN Authentication | Instant demo PIN login (1234/5678) and live salted scrypt staff authentication | M2 | /v1/auth/pin-login |
| 26 | Offline LocalStorage Sync Queue | Client queueing of POS transaction deltas and sync replay on reconnect | M2 | shared offline-sync.ts |
| 27 | Admin Tailwind & PostCSS Config | Enables utility styling and unified theme compilation in apps/admin | M3 | apps/admin build setup |
| 28 | Admin CulinaryHeader Integration | Standardizes Universal Header across Menu, Staff, and Pantry admin pages | M3 | apps/admin pages |
| 29 | POS & Admin Theme Token Standardization | Refactors hardcoded arbitrary hex classes to @culinaryos/ui design tokens | M3 | apps/pos & apps/admin |
| 30 | Cross-Surface Visual Harmony | Cohesive branding across POS (:5172), KDS (:5173), Admin (:5174), Web (:5176) | M3 | @culinaryos/ui |
| 31 | Consolidated MCP Tool Suite | 8 MCP servers operating against consolidated ratio engine and /v1/ops/* routes | M4 | mcp/ |
| 32 | Open-Source MIT Licensing | Standardizes "license": "MIT" in all package.json manifests and SPDX headers | M4 | monorepo packaging |
| 33 | Turborepo Pipeline & Script Polish | Cleans up recursive test script and ensures clean build & typecheck | M4 | turbo.json & package.json |
| 34 | Comprehensive 4-Tier E2E Test Suite | Requirement-driven test suite covering all features, boundaries, combinations | E2E Track | ORIGINAL_REQUEST |
| 35 | Adversarial Coverage Hardening | White-box stress testing and edge-case bug hunting | M5 (Phase 2) | Quality Assurance |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven 4-tier opaque-box test suite publishing TEST_READY.md | none | COMPLETE |
| M1 | Ratio Engine & DB Types | Consolidate mathematical models into @culinaryos/ratio-engine & sync @culinaryos/db types | none | COMPLETE |
| M2 | Closed-Loop Event Spine & Ops | Closed-loop recipe pantry deduction (live + demo), ops endpoints, loyalty & par alerts | M1 | COMPLETE |
| M3 | UI Design Tokens & Admin Portal | Configure Tailwind in admin, mount CulinaryHeader on all pages, standardize tokens | none | COMPLETE |
| M4 | MCP Servers, Licensing & Build | Unify MCP tool suite with ratio engine, standardize MIT licenses, clean build pipelines | M1, M2 | COMPLETE |
| M5 | Final Milestone: E2E Pass & Hardening | Phase 1: 100% Pass of Tiers 1-4 E2E tests. Phase 2: Adversarial coverage hardening (Tier 5) | E2E, M1, M2, M3, M4 | COMPLETE |

---

## Interface Contracts

### 1. `@culinaryos/ratio-engine`
- `scaleRecipeTree(recipe: RecipeBlueprint, targetYield: number): ScaledRecipeTreeResult`
- `flattenScaledTree(tree: ScaledRecipeTreeResult): Record<string, ScaledIngredientSummary>`
- `scaleByServings<T extends { amount: number }>(items: T[], baseServings: number, targetServings: number): T[]`
- `calculateRatio(ingredientWeight: number, baseWeight: number): number`
- `totalFormulaWeight(recipe: RecipeBlueprint, targetBaseWeight: number): number`
- `formatAmount(value: number): string`
- `gramsToCups(grams: number, ingredient: string): number | null`
- `cupsToGrams(cups: number, ingredient: string): number | null`
- `computeRecipeCost(ingredients: Array<{ id: string; name: string; quantity: number; unitCost: number }>, servings: number, menuPrice: number): RecipeCostAnalysis`
- `calculateCostVariance(theoretical: number, actual: number): CostVarianceResult`
- `summarizeWaste(entries: WasteLogEntry[]): WasteSummaryReport`
- `calculateWastePercentage(totalWasteCost: number, totalFoodCost: number): number`
- `generateShiftPrepPlan(items: InventoryStockItem[], shift: 'morning' | 'evening' | 'prep', date: string): ShiftPrepPlan`
- `projectBatchRequirement(portionWeight: number, covers: number, wasteFactor?: number): number`

### 2. POS Order Fire -> Recipe Resolution -> Pantry Deduction
- Route: `POST /v1/pantry/deduct-order`
- In: `{ orderId: string, items: Array<{ menuItemId: string, recipeId?: string, quantity: number }> }`
- Out: `{ success: true, deductedIngredients: Array<{ id: string, name: string, quantity: number, unit: string }>, plateEconomicsLogged: boolean }`

### 3. Ops & Loyalty API
- Route: `POST /v1/ops/loyalty/adjust-points` -> In: `{ customerId: string, pointsDelta: number, reason: string }` -> Out: `{ customerId, newBalance }`
- Route: `POST /v1/ops/loyalty/postcard` -> In: `{ customerName: string, address: string, discountPercent: number, couponMessage?: string }` -> Out: `{ postcardId, couponCode, status: 'queued' }`

---

## Code Layout

```
CulinaryOS/
├── apps/
│   ├── server/          ← Unified Hono API (orders, KDS, pantry, ops, payments, mock-kitchen)
│   ├── pos/             ← POS terminal (React / Vite / Tailwind)
│   ├── kds/             ← Kitchen Display client (React / Vite / Station routing)
│   ├── admin/           ← Admin / pantry portal (React / Vite / Tailwind)
│   └── web/             ← Online ordering storefront (React / Vite)
├── packages/
│   ├── ratio-engine/    ← Pure culinary mathematical engine & models
│   ├── db/              ← Database schema types (V1–V14) & Supabase client
│   ├── event-bus/       ← Event broker, binary protocol, handlers
│   ├── shared/          ← Cross-cutting types, stations, course-engine, offline-sync
│   ├── ui/              ← Corporate Modern theme CSS & React components
│   ├── auth/            ← PIN auth, JWT verification, managerGate
│   └── config/          ← Monorepo configuration constants
├── mcp/                 ← 8 MCP tool servers for AI agent operations
├── extensions/          ← First-party extension manifests
├── extension_template/  ← Public contract for third-party extensions
├── tests/               ← Integration & E2E test suites
└── scripts/
    └── run-all-tests.cjs ← Canonical test runner executing all suites
```
