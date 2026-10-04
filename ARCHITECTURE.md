# CulinaryOS System Architecture

> **Document Version:** 2.0.0
> **Status:** Canonical Architecture Baseline
> **Ecosystem:** Unified Restaurant Technology Monorepo

---

## 1. System Overview

CulinaryOS is the single primary restaurant technology operating system. It consolidates the complete hospitality lifecycle — from front-of-house table service and payment processing to kitchen line execution, batch prep management, recipe engineering, prime cost accounting, and customer marketing.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CulinaryOS Global Shell                         │
├────────────────────────────────────────────────────────────────────────┤
│  Frontline Applications (apps/):                                       │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐            │
│  │    POS    │  │    KDS    │  │   Admin   │  │   Prep    │            │
│  │ (Terminal)│  │ (Kitchen) │  │(Back-Off.)│  │(KitchenKit)│            │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘            │
│  ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐            │
│  │    Ops    │  │ Marketing │  │    Web    │  │  Desktop  │            │
│  │(Analytics)│  │(Campaigns)│  │ (Plated)  │  │(Terminal) │            │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘            │
├────────────────────────────────────────────────────────────────────────┤
│  Unified Services & SDK Layer (packages/sdk/ & packages/shared/):       │
│  - culinary.menu.get()             - culinary.orders.create()          │
│  - culinary.inventory.adjust()     - culinary.prep.tasks.list()        │
│  - culinary.marketing.schedule()   - culinary.analytics.query()        │
├────────────────────────────────────────────────────────────────────────┤
│  Platform Engine (platform/ & apps/server/):                           │
│  - Hono REST / SSE Server (23 routes)                                  │
│  - Canonical Domain Event Bus (V1 Strict Contracts)                    │
│  - Multi-Tenant RLS Database Layer (Supabase / Postgres)               │
│  - Idempotent Sync Daemon (Durable Offline-to-Cloud Queue)             │
├────────────────────────────────────────────────────────────────────────┤
│  Edge Node & Hardware Layer (hardware/):                               │
│  - Raspberry Pi 5 / Compute Module 5 Appliance                         │
│  - Low-Level Rust Hardware Daemons (ESC/POS Spooler, USB/BLE/GPIO)     │
│  - Certified Peripherals: Star/Epson Printers, APG Drawers, BLE Probes │
├────────────────────────────────────────────────────────────────────────┤
│  Intelligence & Model Context Protocol (intelligence/ & mcp/):         │
│  - Vendor-Neutral Provider Adapter (Anthropic, Gemini, OpenAI, Local)   │
│  - 12 Operational Restaurant Skills & 6 Role Agents                    │
│  - Human-in-the-Loop Policy & Approval Engine                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Pillars

### 2.1 Local-First & Offline Resilience
- Hospitality operations cannot halt during internet disruptions.
- Front-of-House (POS) and Back-of-House (KDS) maintain local state in IndexedDB and SQLite.
- Transactions are signed with unique `idempotency_key`s and queued in durable storage.
- When WAN connectivity is restored, the sync daemon replays queued domain events sequentially with guaranteed at-least-once delivery and exactly-once execution.

### 2.2 Industrial Ergonomics & Accessibility
- Minimum physical touch target of **48×48px** across all touch surfaces.
- **6-State Button Engine:** `Idle`, `Hover`, `Focus-Visible` (2px solid ring), `Active` (tactile `scale-[0.97]` spring physics), `Loading` (fixed bounds to eliminate layout shifts), and `Disabled` (50% opacity).
- Perceptually uniform color palette based on **OKLCH** tokens, guaranteeing $\ge 4.5:1$ WCAG AA contrast in both bright dining rooms and high-glare kitchen rails.

### 2.3 Strict Multi-Tenant Security & SAQ-A PCI Compliance
- Every tenant-scoped table enforces PostgreSQL Row Level Security (RLS).
- The `service_role` key never leaves the secure server environment.
- All monetary amounts are handled strictly in **integer cents**.
- Zero cardholder data (PAN, CVV) touches CulinaryOS servers. Card-present transactions use first-party Stripe Terminal SDK readers (WisePOS E / S700), qualifying merchants for lightweight SAQ-A PCI compliance.

---

## 3. Product Family & Consolidation Boundaries

| Target Product Name | Origin / Predecessor | Bounded Context | Status |
| :--- | :--- | :--- | :--- |
| **CulinaryOS Core** | Monorepo Core | Platform, Auth, PostgreSQL RLS, Server | Canonical Active |
| **CulinaryOS POS** | `apps/pos` | Front-of-House Order Entry, Split Billing, Tenders | Canonical Active |
| **CulinaryOS KDS** | `apps/kds` | Station Routing, Cook Times, Course Pacing, Bump Bar | Canonical Active |
| **CulinaryOS Admin** | `apps/admin` | Manager Workstation, HACCP CCP Hub, Roster | Canonical Active |
| **CulinaryOS Prep** | KitchenKit + RecipeOS | Recipe Vault, Scaling, Ratios, Shift Prep Lists | Consolidated |
| **CulinaryOS Ops** | CulinaryOps | Food Cost, Labor %, FLSA Tip Engine, Waste Logs | Consolidated |
| **CulinaryOS Marketing** | Post-Pilot | Brand Guard, Social Campaigns, Review Replies | Consolidated |
| **CulinaryOS Web** | Plated | Restaurant Public Site, 8 Astro Themes, Online Orders | Consolidated |
| **CulinaryOS Intelligence**| RestRevive + Addon | 12 Skills, 6 Agents, Anomaly Detection, MCP | Consolidated |
| **CulinaryOS Edge** | Hardware Architecture | Raspberry Pi 5 / CM5, Rust Peripherals, Offline Cache| Architecture Spec |

---

## 4. Explicit Ecosystem Non-Absorption Boundaries

```text
┌─────────────────────────────────────────────────────────────┐
│                    CulinaryOS Monorepo                      │
│                                                             │
│  [Core] [POS] [KDS] [Admin] [Prep] [Ops] [Web] [Marketing]  │
└──────┬──────────────────────┬──────────────────────┬────────┘
       │                      │                      │
       │ API / SDK / Events   │ Decoupled Adapter    │ Isolated
       ▼                      ▼                      ▼
┌──────────────┐      ┌───────────────┐      ┌──────────────┐
│ ShorelineOps │      │     JOSH      │      │   MuseLab    │
│ (Healthcare  │      │  (System 1    │      │  (Meta / XR  │
│  Vertical)   │      │   Classifier) │      │  Incubation) │
└──────────────┘      └───────────────┘      └──────────────┘
```

1. **ShorelineOps:** Specialized healthcare & assisted-living clinical nutrition platform. Stays an independent repository; integrates via `@culinaryos/sdk`, REST API, and domain events.
2. **MuseLab:** Experimental incubation environment for Meta Muse / XR prototypes. Strict isolation; zero production dependencies in CulinaryOS.
3. **ForgeSatchel & JOSH:** ForgeSatchel provides generic developer tooling; JOSH provides deterministic System 1 routing. Connected via clean adapters.

---

## 5. Domain Event Model

CulinaryOS operates an asynchronous, event-driven architecture powered by strict V1 event contracts (`packages/shared/src/types/event-contracts.ts`):

- `order.created` / `order.sent` / `order.completed`
- `payment.completed` / `payment.refunded`
- `inventory.adjusted` / `inventory.depleted` / `inventory.low`
- `prep.task.created` / `prep.task.completed`
- `recipe.updated` / `waste.recorded`
- `marketing.post.published` / `reservation.created`

Events power background inventory depletion, real-time KDS dispatch, analytics aggregation, and edge node synchronization.

---

## 6. Stable SDK & MCP Interface

### CulinaryOS SDK
```typescript
import { createCulinaryClient } from '@culinaryos/sdk';

const culinary = createCulinaryClient({ apiKey: '...', tenantId: '...' });

await culinary.menu.get();
await culinary.orders.create({ tableNumber: 4, covers: 2, items: [...] });
await culinary.inventory.adjust({ itemId: 'ing-beef', changeGrams: -500, reason: 'prep' });
await culinary.prep.tasks.list({ shift: 'dinner' });
await culinary.analytics.query({ metric: 'prime_cost_variance' });
```

### Model Context Protocol (MCP)
CulinaryOS exposes restaurant capabilities to AI coding assistants and automation agents over standard MCP tools (`menu.get`, `orders.list`, `inventory.adjust`, `prep.list`, `marketing.generate`, `analytics.get`) through strict tenant authorization and audit logging.
