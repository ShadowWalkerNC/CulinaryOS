# CulinaryOS Monorepo Consolidation — Migration Matrix

> **Document Version:** 1.0.0
> **Status:** Active Execution Baseline
> **Authority:** CulinaryOS Principal Architect & Lead Operator

This document tracks every component, repository, package, and service involved in consolidating the restaurant technology ecosystem into the primary **CulinaryOS** monorepo.

---

## 1. Executive Migration Matrix

| Source Repository / Component | Source Path / Origin | Target CulinaryOS Domain / Location | Migration Action | Status | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KitchenKit** | `C:/Users/white/OneDrive/Documents/GitHub/KitchenKit` | `apps/prep` (Web UI) & `packages/prep` (Engine) | Migrate & Absorb into CulinaryOS Prep | Seeded (`apps/kitchenkit`, `packages/prep-engine`) → Unify | Low |
| **RecipeOS** | `C:/Users/white/OneDrive/Documents/GitHub/RecipeOS` | `apps/prep` (Recipe Vault) & `packages/recipes` | Absorb into CulinaryOS Prep | Seeded (`apps/recipeos`) → Merge Vault into Prep | Low |
| **CulinaryOps** | `C:/Users/white/OneDrive/Documents/GitHub/CulinaryOps` | `apps/ops` & `packages/ops` (`food-cost`, `labor`, `waste`) | Migrate into CulinaryOS Ops | Seeded (`apps/ops`, domain packages) → Complete | Low |
| **Post-Pilot** | `C:/Users/white/Documents/GitHub/Post-Pilot` | `apps/marketing`, `services/marketing-python`, `packages/marketing` | Migrate into CulinaryOS Marketing | Seeded (`apps/marketing`, `services/marketing-python`) → Port Skills | Medium |
| **Plated** | `C:/Users/white/OneDrive/Documents/GitHub/Plated` | `apps/web` (Public & Commerce) & `packages/template-engine`, `asset-tools`, `pdf-tools`, `seo-tools` | Migrate into CulinaryOS Web | Packages Seeded → Port Templates & Generator | Medium |
| **RestRevive-AI** | `C:/Users/white/OneDrive/Documents/GitHub/RestRevive-AI` | `modules/intelligence`, `intelligence/`, `packages/intelligence` | Selective Absorption into CulinaryOS Intelligence | Seeded (`culinaryos-intelligence`) → Merge Algorithms | Low |
| **CulinaryOS Intelligence Addon** | `C:/Users/white/Desktop/CulinaryOS Addons/culinaryos-intelligence` | `intelligence/` (Agents, Skills, Router, MCP) | Canonical Absorption | Ready to integrate directly | Low |
| **ShorelineOps** | `C:/Users/white/OneDrive/Documents/GitHub/ShorelineOps` | **DO NOT ABSORB** (External Vertical Partner) | Integrate via API / SDK / Events / MCP only | Boundary Formally Declared | **CRITICAL (Isolation)** |
| **MuseLab / Muse Experiments** | `C:/Users/white/Documents/GitHub/MuseAiBots`, `muse-code-sdk` | **DO NOT ABSORB** (Isolated Incubation Lab) | Strict R&D separation; no core dependency | Boundary Formally Declared | **CRITICAL (Isolation)** |
| **ForgeSatchel** | `C:/Users/white/Desktop/ForgeSatchel` | External Ecosystem Tooling | Decoupled; consumable via standard protocols | Boundary Formally Declared | Low |
| **JOSH** | `C:/Users/white/Desktop/Josh` | External System 1 Gateway / Router | Decoupled adapter (`integrations/josh`) | Planned Adapter | Low |

---

## 2. Detailed Component Breakdown

### 2.1 KitchenKit & RecipeOS → CulinaryOS Prep
- **Product Identity:** **CulinaryOS Prep** — The kitchen batch production, recipe management, and shift prep intelligence center.
- **Components to Absorb:**
  - `packages/prep-engine`: Shift prep list calculation, mise en place generation, batch multiplier.
  - `packages/ratio-engine`: Baker's percentage / ratio blueprint calculations (`bread_flour: 100%`).
  - `mcp/prep-mcp` & `mcp/recipe-mcp`: Tool definitions for prep list and recipe scaling.
  - `apps/kitchenkit` UI: Prep planner, par-level tracking, below-par alerts.
  - `apps/recipeos` UI: Next.js recipe vault, allergen flags, yield calculation, nutritional breakdown.
- **Consolidation Target:**
  - Unified app surface: `apps/prep` (aliased during transition as `apps/kitchenkit`).
  - Unified packages: `packages/prep`, `packages/recipes`.
  - Shared domain models: Recipe, Ingredient, Ratio, PrepTask, ParLevel, BatchYield.

### 2.2 CulinaryOps → CulinaryOS Ops
- **Product Identity:** **CulinaryOS Ops** — Back-office operations, prime cost intelligence, and inventory variance.
- **Components to Absorb:**
  - `packages/food-cost-engine`: Theoretical vs. actual food cost, recipe margin calculation, plate cost tracking.
  - `packages/labor-engine`: Shift scheduling, labor percentage targets, overtime gates, FLSA compliance rules.
  - `packages/waste-engine`: Shift waste logging, reason tracking (spoilage, over-prep, drop), disposal logs.
  - `mcp/culinaryops-mcp`: Operational query and reporting tools.
  - `apps/ops` UI: Comprehensive Ops dashboard connecting food cost, labor, waste, and vendor invoices.
- **Consolidation Target:**
  - App surface: `apps/ops`.
  - Packages: `packages/ops`, `packages/food-cost-engine`, `packages/labor-engine`, `packages/waste-engine`.

### 2.3 Post-Pilot → CulinaryOS Marketing
- **Product Identity:** **CulinaryOS Marketing** — Restaurant growth engine, automated social campaigns, review responses, and brand guardrails.
- **Components to Absorb:**
  - `core/business_brain`: Restaurant context engine (menu highlights, vibe, specials, audience persona).
  - `core/content`: Multi-channel social content generator and schedule planner.
  - `skills/`:
    - `brand_guard`: Enforces voice, forbidden words, tone consistency.
    - `event_campaign`: Automated 3-stage event announcements (Announce, Reminder, Last Call).
    - `review_reply`: Respectful, brand-aligned responses for Yelp, Google, TripAdvisor.
    - `special_post`: Daily special hype generation from POS 86/special tags.
    - `weekly_plan`: 7-day social editorial calendar.
  - `integrations/culinaryos/client.py`: Normalized client extracting menu, events, and hours directly from CulinaryOS REST API.
- **Consolidation Target:**
  - App surface: `apps/marketing` (Next.js web studio).
  - Microservice: `services/marketing-python` (FastAPI + SQLAlchemy/Alembic content pipeline).
  - Packages: `packages/marketing` (Shared TypeScript campaign types & event contracts).

### 2.4 Plated → CulinaryOS Web
- **Product Identity:** **CulinaryOS Web** — Public restaurant experience, Astro theme engine, online guest ordering, tableside mobile ordering, and brand assets.
- **Components to Absorb:**
  - `packages/template-engine`: Reads `plated.template.json` and renders semantic restaurant layouts.
  - `packages/asset-tools`: Automated Sharp & Satori asset pipelines (favicons, WebP conversion, social OpenGraph banners).
  - `packages/seo-tools`: Automated Schema.org `Restaurant` markup, XML sitemaps, robots.txt.
  - `packages/pdf-tools`: jsPDF physical menu generator with embedded QR ordering codes.
  - `templates/*`: 8 production restaurant themes (`bakery`, `bar`, `cafe`, `catering`, `food-stand`, `food-truck`, `ghost-kitchen`, `restaurant`).
- **Consolidation Target:**
  - App surface: `apps/web` (React/Vite guest ordering + tableside PWA + public website).
  - Packages: `packages/template-engine`, `packages/asset-tools`, `packages/seo-tools`, `packages/pdf-tools`.

### 2.5 RestRevive-AI & CulinaryOS Intelligence Addon → CulinaryOS Intelligence
- **Product Identity:** **CulinaryOS Intelligence** — Vendor-neutral restaurant AI runtime, diagnostic anomaly detection, and autonomous operational skills.
- **Components to Absorb:**
  - `RestRevive-AI` algorithms: Food waste anomaly detection, labor cost variance warnings, menu margin optimization.
  - `culinaryos-intelligence` extension:
    - 12 Production Skills: `recipe-costing`, `menu-margin`, `prep-list`, `inventory-par`, `production-forecast`, `waste-analysis`, `schedule-analysis`, `ordering-suggestions`, `event-planning`, `haccp-sop`, `temps-review`, `shift-handoff`.
    - 6 Role Agents: Executive Chef, General Manager, Expeditor, Line Cook, Beverage Director, Operations Auditor.
    - Policy Engine: Human-in-the-loop approvals (`approval.list`, `approval.decide`), permission checks, sensitive data redaction.
    - Intent Router: Natural language router triaging queries to skills or external tools.
    - MCP Server: Standard stdio/SSE server exposing restaurant capabilities.
- **Consolidation Target:**
  - Layer: `intelligence/` and `modules/intelligence`.
  - Packages: `packages/intelligence`.
  - AI Contract: Replace vendor hardcoding with `ProviderAdapter` (supporting Anthropic, Google Gemini, OpenAI, and local offline models).

---

## 3. Explicit Non-Absorption Boundaries

### 3.1 ShorelineOps
- **Classification:** External Vertical Product (Healthcare / Senior Living Hospitality).
- **Rule:** **STRICT SEPARATION.** ShorelineOps maintains its own repository, database, HIPAA compliance perimeter, and independent release cycles.
- **Permitted Integration Points:**
  1. `CulinaryOS REST API` (`GET /v1/menu`, `POST /v1/orders`).
  2. `CulinaryOS TypeScript SDK` (`@culinaryos/sdk`).
  3. Domain Event Bus (subscribing to `inventory.depleted`, `order.completed`).
  4. MCP Server (`culinaryos-mcp` tools).

### 3.2 MuseLab
- **Classification:** Meta Muse / Experimental R&D Incubator.
- **Rule:** **ZERO PRODUCTION DEPENDENCY.** CulinaryOS must never import unstable experimental code from MuseLab. Reusable hardware abstractions or algorithms must be stabilized, typed, and formally ported into CulinaryOS with independent tests.

### 3.3 ForgeSatchel
- **Classification:** General-purpose AI agent and developer tool framework.
- **Rule:** Decoupled. CulinaryOS provides restaurant domain logic; ForgeSatchel provides optional developer infrastructure.

### 3.4 JOSH
- **Classification:** Deterministic System 1 classifier and local terminal router.
- **Rule:** Integration via clean adapter (`integrations/josh`). Core restaurant business rules must function 100% offline without JOSH.

---

## 4. Repository Deprecation & Archival Checklist

For every absorbed repository:
1. [ ] **Audit:** Source code inventoried, unique features identified, dependencies scanned.
2. [ ] **Port:** Code, schemas, and tests migrated into target CulinaryOS package/module.
3. [ ] **Verify:** Static typechecks (`tsc --noEmit`), unit tests, and production builds passing inside CulinaryOS.
4. [ ] **Deprecate:** Add deprecation notice to source repository `README.md` pointing to `ShadowWalkerNC/CulinaryOS`.
5. [ ] **Freeze:** Set source repository to Read-Only on GitHub.
6. [ ] **Archive:** Archive repository once 30 days of clean production operation have completed.
