# CulinaryOS — Go-to-Market Strategy

> Updated August 2026 — reflects v1.0.0 release and current web-first, MIT open-source positioning.

---

## Product Positioning

**CulinaryOS is the MIT-licensed, self-hostable restaurant operating system.**

The core proposition: operators own their stack, their data, and their economics. No per-terminal licensing fees. No vendor lock-in. No black-box AI that fails mid-service. Every piece of the system is open, forkable, and deployable on any infrastructure.

This is not a feature race against Toast, Square, or Lightspeed. It is a **platform play** — CulinaryOS is to restaurant tech what Linux is to servers: the open foundation that everything else builds on.

---

## Target Customer Segments

### 1. The Independent Restaurant Operator

**Profile:** 1–3 location cafes, full-service restaurants, and fast-casual concepts.
**Pain Points:**
- Paying \$150–300/month per POS terminal in licensing fees.
- Vendor lock-in prevents switching when providers raise prices.
- Separate, siloed software for POS, inventory, and online ordering.
- No visibility into food cost or waste — margins erode invisibly.

**Value Proposition:**
- Zero per-terminal licensing. Infrastructure costs only.
- Owned PostgreSQL data — no vendor can hold it hostage.
- Closed-loop economics: every fired order automatically decrements pantry stock and logs `plate_economics`, making food cost transparent without manual effort.
- Unified system: POS + KDS + Admin + Online Ordering on one Supabase backend.

---

### 2. The Food Truck & Mobile Food Vendor

**Profile:** Fast-paced outdoor and event operations with unreliable connectivity.
**Pain Points:**
- Spotty Wi-Fi causes card reader downtime and lost sales.
- KDS screens are hard to read at a distance in bright outdoor light.
- No offline capability — POS locks up when internet drops.

**Value Proposition:**
- **Offline-first POS** with localStorage delta queue — PIN login, order entry, and tendering all work without internet.
- On reconnect, orders sync automatically through the `/v1/orders/:id/send` replay path — zero duplicate orders.
- High-contrast KDS with configurable station filters and large aging timers.

---

### 3. The High-Volume Full-Service Restaurant

**Profile:** 80–200 cover dining rooms with complex multi-course service.
**Pain Points:**
- Multi-course ordering requires precise course hold/fire coordination.
- FDA allergen compliance is a legal and operational burden.
- Waste and food cost analysis requires expensive consultant time.

**Value Proposition:**
- **Multi-course engine** — Course 1 fires immediately on order send; Course 2+ are held and released via bump-bar or explicit `POST /v1/orders/:id/fire-course`.
- **FDA FASTER Act Top 9 allergen engine** — automatic dietary classification, cross-contact matrix, and substitution recommendations built into every menu item.
- **AI Operations Manager** (`pnpm ops:audit`) — daily automated audit of speed-of-service, waste trends, and KDS pacing. No consultant required.

---

### 4. The Developer & Restaurant Tech Builder

**Profile:** Independent developers, SaaS builders, and integrators building tools for the restaurant industry.
**Pain Points:**
- Building on closed, proprietary POS APIs is expensive and fragile.
- No standard open protocol for restaurant operations.
- No reference implementation to fork or extend.

**Value Proposition:**
- **Open MIT license** — fork it, white-label it, build on it.
- **`extension_template/`** — a stable, versioned public contract for building extensions. The extension marketplace (`/v1/marketplace`) handles discovery and installation.
- **9 MCP servers** — build AI agents that can read tickets, fire orders, check inventory, and analyze waste using the standard Model Context Protocol.
- **Standard event contracts** — `pos:order:created`, `kds:ticket:bumped`, `pos:menu:item-sold` are documented, stable interfaces.

---

### 5. Institutional & Healthcare Dining

**Profile:** Assisted living, school cafeterias, hospital dining operations with strict allergen and dietary requirements.
**Pain Points:**
- Heavy regulatory burden around dietary restrictions and allergen management.
- Resident/patient menus must adapt to health changes dynamically.
- Standard POS systems have no concept of dietary safety.

**Value Proposition:**
- FDA Top 9 allergen engine with cross-contact matrix (shared fryers, shared griddles).
- Safe substitution pathway suggestions (e.g., Oat Milk, Gluten-Free Buns, Tamari).
- Full dietary classification per item (`isVegan`, `isGlutenFree`, `isDairyFree`, `isNutFree`, `isPescatarian`).
- MCP agent tools can be used to query dietary profiles in EHR integrations.

---

## Distribution Strategy

### Phase 1 — Open Source Community Flywheel (Current)

CulinaryOS v1.0.0 is published under MIT. The goal is developer adoption and ecosystem building:

1. **GitHub as the storefront** — README, screenshots, and one-command demo (`pnpm quickstart`) make the product immediately tangible.
2. **Zero-friction demo mode** — no API keys, no accounts, no payment info required to run the full system.
3. **Developer tooling** — extension template, MCP servers, and API documentation attract builders who create integrations.
4. **Community contributions** — issues, PRs, and discussions build the feedback loop for product refinement.

### Phase 2 — Self-Hosted Operator Adoption (Q4 2026)

Targeting independent operators who can self-host on a \$5/month VPS or a NUC inside their restaurant:

- Publish a **one-click Fly.io / Railway deploy button** in README.
- Publish a **Docker Compose quickstart** guide for on-premise servers.
- Build a simple **operator onboarding wizard** (initial tenant, menu import, staff PIN setup).
- Partner with **restaurant tech influencers** for YouTube setup walkthroughs.

### Phase 3 — Extension Marketplace SaaS (Q1 2027)

The extension marketplace at `/v1/marketplace` becomes the monetization layer:

- **Free core** — all core POS/KDS/Admin/Web functionality remains MIT.
- **Paid extensions** — premium partner extensions (loyalty programs, advanced analytics, hardware drivers) available through the marketplace.
- **Partner revenue share** — extension developers earn a percentage of marketplace revenue.
- **Cloud-hosted option** — managed Supabase + hosted API for operators who don't want to self-host.

---

## Pilot Success Metrics

To evaluate readiness before scaling customer acquisition:

| Metric | Target KPI | Measurement |
|---|---|---|
| **System Reliability** | 99.9% POS/KDS uptime | API health checks + Supabase uptime monitoring |
| **Setup Time** | < 30 minutes from `git clone` to first order fired | Quickstart walkthrough timing |
| **Kitchen Efficiency** | −15% ticket fulfillment time vs. baseline | KDS timestamps: pre vs. post deployment |
| **Inventory Waste** | −8% Cost of Goods Sold (COGS) | `GET /v1/ops/waste/summary` weekly comparison |
| **Allergen Safety** | Zero allergen incidents at pilot locations | Incident log review |
| **Developer Adoption** | 100+ GitHub stars in first 90 days | GitHub metrics |

---

## Competitive Positioning

| | CulinaryOS | Toast | Square for Restaurants | Lightspeed |
|---|---|---|---|---|
| **License** | MIT (open source) | Proprietary | Proprietary | Proprietary |
| **Per-terminal fee** | \$0 | \$110–165/mo | \$60–110/mo | \$69–399/mo |
| **Data ownership** | Full (your Postgres) | Vendor-held | Vendor-held | Vendor-held |
| **Offline mode** | Native (delta queue) | Limited | Limited | Limited |
| **AI agent tools** | 9 MCP servers | None | None | None |
| **Dietary engine** | FDA Top 9 built-in | Manual tags | Manual tags | Manual tags |
| **Source code** | 100% open | Closed | Closed | Closed |
| **Extension API** | Public `extension_template/` | Closed | Developer API | Developer API |
