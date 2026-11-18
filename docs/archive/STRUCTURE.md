# CulinaryOS Monorepo Structure & Domain Ownership

> **Document Version:** 1.0.0
> **Architecture Standard:** Strict Domain Boundaries, Unified Monorepo, Local-First Hospitality

---

## 1. High-Level Directory Overview

```text
CulinaryOS/
├── apps/                         # Frontline & Management User Surfaces
│   ├── admin/                    # Back-Office Manager Workstation (PIN Gated, Operations HUD)
│   ├── pos/                      # Point of Sale Terminal (FOH, Offline-First, Split Billing)
│   ├── kds/                      # Kitchen Display System (BOH Line Rails, Station Routing)
│   ├── prep/                     # CulinaryOS Prep (KitchenKit + RecipeOS unified production)
│   ├── ops/                      # CulinaryOS Ops (Labor Scheduling, Food Cost, Waste)
│   ├── marketing/                # CulinaryOS Marketing (Post-Pilot Campaign Studio)
│   ├── web/                      # CulinaryOS Web (Plated Engine, Public Site, Online Ordering)
│   └── desktop/                  # Workstation Desktop Shell (Local network runner)
│
├── packages/                     # Core Domain & Shared TypeScript Packages
│   ├── core/                     # Shared kernel & domain primitives
│   ├── database/                 # Supabase / PostgreSQL schema, RLS, migrations
│   ├── auth/                     # PIN authentication, session management, RBAC
│   ├── ui/                       # Design tokens (OKLCH), 6-state buttons, Table, Keypad
│   ├── menu/                     # Master menu, categories, modifiers, pricing
│   ├── orders/                   # Order lifecycles, tickets, coursings, split billing
│   ├── payments/                 # Stripe Connect, Terminal SDK, cash drawer, tip engine
│   ├── inventory/                # Stock counts, depletion, vendor items, units
│   ├── prep/                     # Ratio blueprint engine, prep pars, mise en place
│   ├── recipes/                  # Recipe scaling, costing, allergens, nutrition
│   ├── ops/                      # Labor shifts, actual vs theoretical food cost, waste
│   ├── marketing/                # Campaign models, brand guidelines, social scheduling
│   ├── customers/                # Guest profiles, dining history, loyalty points
│   ├── reservations/             # Floor layout, table booking, turn pacing
│   ├── reporting/                # Daily gross, COGS margins, labor percentage, audit reports
│   ├── intelligence/             # Diagnostic algorithms, anomaly detection, forecasting
│   ├── integrations/             # External connectors (Stripe, Mercury, Shoreline client)
│   ├── events/                   # Canonical domain event definitions and bus
│   ├── sdk/                      # Public/first-party CulinaryOS TypeScript SDK
│   ├── shared/                   # Cross-cutting utilities, durable offline queue
│   ├── template-engine/          # Plated Astro/JSON template renderer
│   ├── asset-tools/              # Sharp/Satori OG/favicon generator
│   ├── pdf-tools/                # jsPDF menu & QR code exports
│   └── seo-tools/                # Schema.org, sitemap, robots.txt generators
│
├── platform/                     # Runtime Infrastructure & Backend Engines
│   ├── api/                      # Hono REST / SSE server (23 routes, tenant isolation)
│   ├── workers/                  # Background jobs (inventory depletion, email, reports)
│   ├── realtime/                 # SSE & Supabase Realtime broadcast bridge
│   ├── sync/                     # Offline-to-cloud idempotent event sync daemon
│   └── edge/                     # Local edge runtime controller (Node / Rust)
│
├── hardware/                     # Edge Hardware & Device Layer
│   ├── devices/                  # Device manager & peripheral discovery
│   ├── drivers/                  # ESC/POS thermal printer driver, RJ11 drawer kick
│   ├── protocols/                # USB, LAN, Bluetooth, Serial, GPIO
│   └── raspberry-pi/             # Pi 5 / CM5 local edge runner (Rust + Node)
│
├── intelligence/                 # Restaurant AI & Automation Layer
│   ├── agents/                   # 6 role agents (Executive Chef, GM, Sommelier, etc.)
│   ├── skills/                   # 12 operational skills (costing, margins, pars, HACCP)
│   ├── mcp/                      # CulinaryOS MCP server (stdio / SSE)
│   ├── automation/               # Automated triggers (auto 86-ing, par restock alerts)
│   └── providers/                # Vendor-neutral LLM adapter (Claude, Gemini, Local)
│
├── docs/                         # Canonical Architecture & Migration Documentation
├── tooling/                      # Devkit, scripts, build configuration
└── tests/                        # Comprehensive test suites (E2E, adversarial, RLS)
```

---

## 2. Domain Ownership & Boundaries

| Domain | Primary Packages | Primary Surface | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Core & Platform** | `@culinaryos/shared`, `@culinaryos/auth`, `@culinaryos/db` | `apps/server` | Multi-tenant auth, session tokens, PostgreSQL RLS, offline event bus, API routes |
| **POS & Floor** | `@culinaryos/orders`, `@culinaryos/payments`, `@culinaryos/shared` | `apps/pos` | Table management, order entry, split checks, cash/card payment settlement, offline queue |
| **KDS & Kitchen** | `@culinaryos/orders`, `@culinaryos/events` | `apps/kds` | Station routing, cook times, course firing, expeditor pass, bump bar actions |
| **Admin & Governance**| `@culinaryos/reporting`, `@culinaryos/auth` | `apps/admin` | Staff RBAC, location management, HACCP compliance logs, operations HUD, audit exports |
| **Prep & Recipes** | `@culinaryos/prep`, `@culinaryos/recipes` | `apps/prep` | Recipe vault, ratio blueprints, batch multipliers, par levels, mise en place, shelf-life |
| **Operations** | `@culinaryos/ops`, `food-cost`, `labor`, `waste` | `apps/ops` | Prime cost, actual vs theoretical food cost, FLSA tip pools, waste tracking, purchase orders |
| **Marketing** | `@culinaryos/marketing` | `apps/marketing`, `services/marketing-python` | Brand guardrails, social campaign generation, review responses, special dish promotions |
| **Public Web** | `@culinaryos/template-engine`, `asset-tools`, `seo-tools` | `apps/web` | Public restaurant website, 8 Astro themes, guest online ordering, tableside mobile PWA |
| **Intelligence** | `@culinaryos/intelligence` | `intelligence/`, `modules/intelligence` | 12 operational skills, 6 role agents, anomaly detection, vendor-neutral provider adapters |
| **Hardware & Edge** | `@culinaryos/hardware` | `hardware/` | Raspberry Pi 5 node, ESC/POS printers, cash drawers, scales, BLE temperature probes |

---

## 3. Strict Inter-Package Rules

1. **Downward Dependency Flow Only:** High-level applications (`apps/*`) depend on domain packages (`packages/*`). Domain packages must NEVER import from application folders.
2. **No Circular Package Imports:** If Package A imports from Package B, Package B must never import from Package A. Extract common types to `@culinaryos/shared` or `@culinaryos/core`.
3. **Database Access Encapsulation:** Only `@culinaryos/db` and domain service repositories execute SQL/Supabase mutations. Client apps interact solely via typed API client or `@culinaryos/sdk`.
4. **Isolated AI Dependencies:** No machine learning or LLM SDK imports inside core operational packages. AI capabilities belong solely within `intelligence/` and consume operational services through standardized interfaces.
