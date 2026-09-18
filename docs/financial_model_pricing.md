# 💸 CulinaryOS Financial Model & SaaS Pricing Benchmark

This document establishes the commercial economics, competitive benchmarking against legacy incumbents (Toast, Square, Clover), Stripe Connect Standard monetization architecture, and unit economics for CulinaryOS.

---

## 🏛️ Strategic Positioning: Toast Disruption

The modern restaurant operating market is dominated by legacy incumbents that employ predatory pricing and forced vendor lock-in:

* **Toast Incumbent Trap:**
  * **Software Licensing:** \$69 to \$130+/month **per terminal**. A modest 4-terminal restaurant (2 POS, 1 Bar, 1 KDS) pays \$300–\$500/month in baseline SaaS.
  * **Proprietary Hardware:** \$799 to \$999 per terminal with forced hardware refresh cycles.
  * **Payment Markup:** Bundled, non-negotiable payment processing at 2.49%–2.99% + \$0.15.
  * **Total Year 1 TCO (4 terminals):** \$7,500 – \$11,000+.
* **CulinaryOS Positioning:**
  * **Open Core:** Free, self-hosted community edition for single-station and offline operations.
  * **Flat Per-Location SaaS:** \$49/month flat per location with **unlimited terminals** (no per-terminal tax).
  * **Zero Hardware Lock-In:** Runs on any standard iPad, Android tablet, touchscreen PC, or existing Star/Epson thermal/impact printers (Star TSP143IV, Epson TM-m30).
  * **Bring Your Own Stripe (Connect Standard):** Merchant retains direct relationship with Stripe, qualifying for lightest SAQ-A PCI compliance.

---

## 💰 Monetization Tier Matrix

| Tier | Price | Target Customer | Core Capabilities | Deployment / Support |
| :--- | :--- | :--- | :--- | :--- |
| **Community (Open Core)** | **\$0 (Free / Open Source)** | Food trucks, single-station cafes, pop-ups, hobbyists | Full local POS & KDS, floor plan, order-to-kitchen firing, offline order queue, local receipt printing, unlimited tables/menu items. | Self-hosted, local SQLite/Postgres, community GitHub discussions |
| **Pro Cloud** | **\$49 / mo per location** | Independent restaurants, busy bars, high-volume casual | Multi-device cloud sync, remote back-office dashboard, Gusto/ADP tip payroll export, real-time inventory 86ing, online ordering portal, multi-station KDS routing. | Managed Supabase Cloud, daily encrypted backups, email & Discord support |
| **Multi-Unit Enterprise** | **\$149 / mo per location** | Multi-unit groups (2–20 locations), commissaries, franchises | Multi-unit commissary order transfers (`V17`), centralized menu syndication, cross-location reporting rollups, role-based multi-tier RBAC, custom ERP webhooks. | Dedicated infrastructure, SLA guarantee, 24/7 emergency dispatch |

---

## 💳 Payments Architecture (Stripe Connect Standard)

CulinaryOS operates as a SaaS platform utilizing **Stripe Connect Standard** accounts with an optional platform application fee.

```
┌─────────────────────────────────────────────────────────────┐
│                 Restaurant Merchant (Owner)                 │
│         Direct Stripe Account (KYC / AML / Disputes)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Connect OAuth
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     CulinaryOS Platform                     │
│   Creates PaymentIntent via Stripe SDK with application_fee │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│  Stripe Terminal (Card-Pres) │       │  Online Ordering (Checkout)  │
│  WisePOS E / S700 Countertop │       │  Apple Pay / Google Pay / CC │
└──────────────────────────────┘       └──────────────────────────────┘
```

### Why Connect Standard over Custom/Express?
1. **Zero Negative Balance Liability:** In Connect Standard, the connected account (restaurant) is liable for chargebacks, refunds, and negative balances. The platform carries zero payout liability.
2. **SAQ-A PCI Compliance:** Credit card data never touches CulinaryOS servers. In-person transactions use Stripe Terminal hardware tokens; online transactions use Stripe Payment Element.
3. **Platform Fee Revenue:** CulinaryOS monetizes card volume via `application_fee_amount` (0.15% to 0.35% on GMV), converting software into a dual SaaS + fintech revenue engine.

---

## 📊 Unit Economics & Margin Profile

### 1. Per-Location Cost Breakdown (Pro Cloud — \$49/mo)
* **Cloud Infrastructure (Supabase Postgres + Edge):** \$3.50 / location / mo.
* **SaaS Subscription Billing (Stripe 2.9% + \$0.30):** \$1.72 / mo.
* **Telemetry & Monitoring:** \$0.50 / mo.
* **Total Cost of Service (COGS):** **\$5.72 / mo**.
* **Net Software Margin:** **88.3% Gross Margin** (\$43.28 / mo).

### 2. Fintech Expansion (Application Fee on GMV)
An average casual dining restaurant processes \$50,000 / month in card-present sales:
* **Platform Application Fee (0.20%):** \$50,000 × 0.0020 = **\$100.00 / mo**.
* **Total Revenue per Location:** \$49.00 (SaaS) + \$100.00 (Fintech) = **\$149.00 / mo**.
* **Net Revenue Margin:** **95.8%**.

---

## ⚖️ Legal & Regulatory Guardrails

1. **FLSA Tip Engine Compliance:** Tip pool rules strictly hardcode the exclusion of owners, managers, and supervisors (29 U.S.C. § 203(m)(2)(B)). Back-of-house inclusion is gated by minimum wage payment proof (`paysTipCredit: false`).
2. **Zero PAN Storage:** Cardholder Primary Account Numbers (PAN) and CVV codes are never logged, stored, or transmitted through the application layer.
3. **Audit Ledger:** All daily Z-reports, comps, voids, and cash drawer reconciliations are cryptographically sealed with manager PIN verification.
