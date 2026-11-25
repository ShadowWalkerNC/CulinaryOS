# CulinaryOS SaaS Tiers & Turnkey Packaging Specification

> Internal proposal. Tier names, prices and entitlements below are design assumptions. See [product status](PRODUCT_STATUS.md) for hosted-service readiness.

This document details the functional boundary between the **Free & Open-Source Core ($0 Forever, MIT License)** and the **Paid SaaS Subscriptions** (**Cloud Pro $49/mo** & **Enterprise Multi-Unit $149/mo**), enforced in code via [packages/shared/src/saasTiers.ts](../packages/shared/src/saasTiers.ts) and HMAC-SHA256 signed grants in [packages/native/src/cloud_bridge.rs](../packages/native/src/cloud_bridge.rs).

For complete REST API, TypeScript SDK (`@culinaryos/sdk`), Role/PIN mappings, and Failure-Mode Fallbacks, see [docs/DEVELOPER_AND_API_SDK_GUIDE.md](DEVELOPER_AND_API_SDK_GUIDE.md).

---

## 1. Architecture Split: Open-Source Core vs. Paid SaaS

CulinaryOS is built on an **Open-Core, Local-First** architecture. The standalone Native Rust Workstation (`culinaryos-desktop.exe` on Port 3000) is 100% functional offline and self-hostable forever with zero licensing fees and zero per-terminal charges.

Optional SaaS subscriptions connect the local workstation to encrypted offsite cloud storage, commission-free public online ordering relay, Beta AI Autopilot (off-by-default per Rule 6), and multi-unit central commissary orchestration.

```text
+------------------------------------------------------------------------+
|                ENTERPRISE & COMMISSARY ($149/mo per location)          |
|   multi_unit_commissary · V17 Organization Hierarchy & RLS Rollups     |
|   Central Commissary Production Quotas & Inter-Store Transfer Orders   |
|   Multi-Distributor MRP Split-Order Optimizer (Sysco/US Foods/Dennis)  |
+------------------------------------------------------------------------+
|                CLOUD PRO & AI AUTOPILOT ($49/mo flat per location)     |
|   cloud_storage: Encrypted SHA-256 Offsite Backup & Remote Web Admin   |
|   online_ordering: Hosted Commission-Free Storefront & QR Table Relay  |
|   ai_autopilot (Beta): 121-Skill Generative Workflows & Predictive 86  |
|   Campaign Studio (Post-Pilot) & Per-Tenant Token Cost Dashboard       |
+------------------------------------------------------------------------+
|                OPEN-SOURCE CORE ($0 Forever — MIT License)             |
|   Standalone Native Rust Workstation on Port 3000 (embedded-local-db)  |
|   Unlimited POS Terminals, 2D Floor Map, Split Checks & Bar Tabs       |
|   Unlimited KDS Station Screens, Course Pacing, Bilingual Chits & 86   |
|   Direct TCP :9100 / USB ESC/POS Printing + Auto Backup Printer Route  |
|   Hardcoded FLSA Tip Pool Engine, Payroll CSV Export & EOD Z-Reports   |
|   39 Deterministic Chef's Intelligence Calculators (72% GP, 14-Allerg) |
+------------------------------------------------------------------------+
```

---

## 2. Detailed Feature & Entitlement Matrix

| Feature Domain | Open-Source Core ($0) | Cloud Pro ($49/mo) | Enterprise ($149/mo) |
| :--- | :---: | :---: | :---: |
| **Per-Terminal / Per-Screen Fee** | **$0.00 (Unlimited)** | **$0.00 (Unlimited)** | **$0.00 (Unlimited)** |
| **POS Order Entry, Split Checks, Bar Tabs, 2D Floor Map** | Included | Included | Included |
| **KDS Multi-Station Rails, Course Hold/Fire & 86 Sync** | Included | Included | Included |
| **ESC/POS Printing (LAN `:9100` / USB) + Auto Backup Failover** | Included | Included | Included |
| **RJ11/RJ12 24V Cash Drawer Kick (`F8`)** | Included | Included | Included |
| **Card Payments (Bring-Your-Own Stripe Connect Standard)** | Included (0% Markup) | Included (SAQ-A) | Included (SAQ-A) |
| **Hardcoded FLSA Tip Pooling (29 U.S.C. 203(m)(2)(B)) & CSV** | Included | Included | Included |
| **Automated End-of-Day Z-Report & Cash Variance Audit (`F9`)** | Included | Included + Cloud Vault | Included + Org Rollup |
| **39 Deterministic Chef's Intelligence Calculators** | Included (72% GP, 14-Allergens, WTR 11h Rota, Baker's %) | Included | Included |
| **Full CLI (`culinary`) & TypeScript SDK (`@culinaryos/sdk`)** | Included | Included | Included |
| **Encrypted Offsite Cloud Storage & Remote Owner Dashboard** | Local LAN Only | **`cloud_storage` Included** | **`cloud_storage` Included** |
| **Hosted Commission-Free Online Storefront & QR Relay** | Local LAN `/menu/` | **`online_ordering` Included** | **`online_ordering` Included** |
| **Beta 121-Skill Generative AI Autopilot & Campaign Studio** | Deterministic Local Fallback | **`ai_autopilot` Included** | **`ai_autopilot` Included** |
| **Multi-Unit Organization Rollups & V17 Commissary Transfers** | Single Location | Single Location | **`multi_unit_commissary` Included** |
| **Multi-Distributor Lowest-Cost Split MRP (Sysco/US Foods/Dennis)** | Standard Par POs | Standard Par POs | **Included + IPV Audit** |

---

## 3. Absorbed Chef's Intelligence Library (121 Skills Across 8 Packs)

All 121 skills absorbed into `packages/intelligence/skills/` (`@culinaryos/intelligence`) are organized across 8 operational packs (`home`, `bakery`, `food-truck`, `bar-foh`, `shops`, `operations`, `people`, `care`):

1. **Free Core Deterministic Skills (39 Core Workflows — Always Unlocked Offline):**
   - `dish-costing-calculator`: 72% Gross Profit / 28% Food Cost target calculator with AP/EP butcher trim yield and >40% dominant ingredient volatility alerts.
   - `allergen-matrix-builder` & `allergen-management-system`: 14-regulated-allergen FIR/Natasha's Law + FDA FASTER Act Top-9 matrix builder.
   - `daily-brief-generator` & `foh-service-brief`: Structured 2-minute pre-shift kitchen and FOH line briefing generator.
   - `recipe-compliance-checker`: Station portion, substitution, and HACCP CCP compliance auditor.
   - `bakers-percentage-formula` & `preferment-flour-accounting`: Flour-anchored hydration and levain scaling math.
   - Plus all 32 canonical pack core workflows (`PACK_CORE_IDS`).
2. **SaaS Pro & Enterprise Generative Autopilot Skills (82 Advanced Workflows — Unlocked via `ai_autopilot`, with Deterministic Local Fallback):**
   - Predictive 86 countdowns, weather/daypart prep demand forecasting, multilingual service briefs, social campaign attribution, catering quotations, banquet event orders (BEO), and product recall trace drills.
   - When `AI_ENABLED` is off (the default per Rule 6) or the restaurant is on the Free Open-Source tier, every skill executes its deterministic local template/math fallback with zero LLM token spend.
