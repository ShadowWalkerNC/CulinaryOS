# CulinaryOS Product Roadmap & Consolidation Milestones

> **Document Version:** 2.0.0
> **Status:** Active Master Roadmap
> **Strategy:** Phased Consolidation, Zero-Downtime Migration, Edge Acceleration

---

## 1. High-Level Portfolio Phases

```text
[P01-P04: Incubation & Foundation]
   │
   ▼
[P05: Architecture & Boundary Definition] (COMPLETED)
   │ - Inventory & audit of all repositories
   │ - Migration matrix & consolidation master plan
   │ - Event contracts & foundation boundaries
   ▼
[P06: Monorepo Consolidation Slices] (ACTIVE)
   │ - Slice 1: Domain Package Standardization
   │ - Slice 2: CulinaryOS Prep (KitchenKit + RecipeOS)
   │ - Slice 3: CulinaryOS Ops (CulinaryOps Prime Cost & Labor)
   │ - Slice 4: CulinaryOS Web (Plated Astro Themes & Ordering)
   │ - Slice 5: CulinaryOS Marketing (Post-Pilot Campaigns & Skills)
   │ - Slice 6: CulinaryOS Intelligence (RestRevive & 12 AI Skills)
   ▼
[P07: Edge Hardware & Local Continuity]
   │ - Raspberry Pi 5 / CM5 Edge Node Appliance
   │ - Low-level Rust peripheral daemons
   │ - Local offline queue & bidirectional sync daemon
   ▼
[P08: Unified SDK, MCP Suite & Enterprise Multi-Unit]
   │ - Public & first-party @culinaryos/sdk
   │ - Comprehensive Restaurant MCP Server
   │ - Multi-unit commissary & franchise royalty ledger
   ▼
[P09: Deprecation & Archival Handshake]
   │ - External repositories marked Read-Only
   │ - ShorelineOps partner SDK bridge verified
```

---

## 2. Detailed Consolidation Milestones (P06)

### Milestone 6.1: Domain Package Standardization
- Standardize package boundaries for `@culinaryos/prep`, `@culinaryos/recipes`, `@culinaryos/ops`, `@culinaryos/marketing`, `@culinaryos/template-engine`, `@culinaryos/asset-tools`, `@culinaryos/pdf-tools`, `@culinaryos/seo-tools`.
- Ensure strict ESM builds, TypeScript declaration generation, and zero circular dependencies.

### Milestone 6.2: CulinaryOS Prep (KitchenKit + RecipeOS)
- Merge RecipeOS recipe vault and allergen database into `@culinaryos/recipes`.
- Consolidate KitchenKit shift prep list planning and ratio calculations into `@culinaryos/prep`.
- Unify front-end interface in `apps/prep`.
- Wire `prep.task.completed` event to automatically decrement raw ingredient inventory.

### Milestone 6.3: CulinaryOS Ops (CulinaryOps)
- Unify food cost, labor scheduling, and waste tracking inside `apps/ops`.
- Link POS order item sales to recipe batch depletion for real-time theoretical vs. actual food cost variance.
- Encode FLSA tip pool compliance validations into `@culinaryos/labor-engine`.

### Milestone 6.4: CulinaryOS Web (Plated)
- Port Plated's 8 restaurant themes (`bakery`, `bar`, `cafe`, `catering`, `food-stand`, `food-truck`, `ghost-kitchen`, `restaurant`) into `@culinaryos/template-engine`.
- Integrate Sharp/Satori image generation, Schema.org SEO generator, and jsPDF menu builder into `apps/web`.
- Wire guest online checkout directly into the Hono API order pipeline.

### Milestone 6.5: CulinaryOS Marketing (Post-Pilot)
- Migrate Post-Pilot Python core into `services/marketing-python`.
- Port 5 operational marketing skills: `brand_guard`, `event_campaign`, `review_reply`, `special_post`, `weekly_plan`.
- Provide campaign scheduling studio in `apps/marketing`.

### Milestone 6.6: CulinaryOS Intelligence (RestRevive + Addon)
- Migrate 12 operational restaurant skills and 6 role agents into `intelligence/`.
- Port RestRevive's diagnostic financial revival algorithms.
- Establish vendor-neutral `ProviderAdapter` abstraction supporting Claude, Gemini, OpenAI, and local models.

---

## 3. Hardware & Edge Milestone (P07)

- **Raspberry Pi 5 Early Prototype Kit:** Standalone DIN-rail enclosure with PoE+ power hat.
- **Rust Peripheral Spooler:** High-reliability, sub-millisecond print spooler for ESC/POS thermal printers and 24V RJ11 cash drawers.
- **Durable Local Transaction Cache:** Crash-resilient SQLite outbox guaranteeing zero order loss during total WAN disconnects.

---

## 4. Release Criteria & Exit Checks

1. Every consolidated module has passing TypeScript typechecks (`pnpm run typecheck`).
2. Core services (POS, KDS, Admin, Server) retain 100% test pass rate with zero regression.
3. Front-of-House and Back-of-House applications run in offline demo mode with zero cloud credentials.
4. All non-absorbed external projects (ShorelineOps, MuseLab, ForgeSatchel) maintain clean, decoupled interface boundaries.
