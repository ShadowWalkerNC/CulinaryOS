# 💸 Financial Model & Pricing

This document details the subscription monetization tiers, Stripe API integration paths, offline payment risk profiles, and unit economics for CulinaryOS.

---

## 💰 Monetization Tier Matrix

| Tier | Price | Target Audience | Key Included Features | Limitations |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | $0 | Home hobbyists, culinary students | Recipe CRUD, basic scaling, local storage | Max 25 recipes, 1 user, no sync, no AI |
| **Home Chef** | $4.99/mo | Advanced home bakers, food bloggers | Unlimited recipes, local pantry, AI Chef Assistant | 1 user, mobile only, no team collaboration |
| **Pro Kitchen** | $14.99/mo | Independent cafes, food trucks | Full POS/KDS suite, cost calculator, team accounts | Up to 5 users, 1 location |
| **Enterprise** | Custom | Multi-location restaurant chains | Custom API integrations, white-label, Unlimited | Unlimited locations, priority support |

---

## 💳 Stripe Integration Architecture

CulinaryOS utilizes Stripe for both online subscription billing (SaaS) and in-person POS transactions (via Stripe Terminal).

```
[Customer Web Portal] ──> Stripe Billing ──> Webhook Event ──> [Supabase Auth & Roles]
                                                                     │
[POS Hardware Terminal] ──> Stripe SDK ──> Payment Intent ───────────┘
```

### 1. SaaS Subscription Webhook Handler
Subscriptions are managed via Stripe Billing. Supabase listens for Stripe webhook events to update user access tokens.

Key webhooks to capture:
* `customer.subscription.created`: Provision access based on metadata `tier` attribute.
* `customer.subscription.updated`: Modify role (e.g. upgrading from Home Chef to Pro).
* `customer.subscription.deleted`: Revoke premium access, downgrade account to Free, and apply the 25-recipe view limit.

### 2. POS Stripe Terminal Offline Payment Specs
In kitchen operations, internet drops frequently. Stripe Terminal supports offline transaction storage under strict operational parameters.

* **Offline Capture Limit:** Maximum transaction value allowed offline is **$150.00**.
* **Risk & Liability Policy:**
  * Offline card captures store card tokens securely inside the local DB.
  * Tokens must be synchronized and finalized within **24 hours**.
  * The tenant/operator assumes 100% liability for any transaction that declines once internet is restored.
  * In the UI, offline transactions are displayed as **"Pending Sync"** with an amber alert tag.

---

## 📊 Unit Economics & Margin Analysis

To ensure profitability when offering generative AI features (which incur per-token API costs on Claude), we analyze the margins of the subscription tiers.

### 1. Estimated Cost Breakdown (Per User / Month)
* **Hosting & Database:** $0.10 (Supabase Postgres + edge caching)
* **Stripe Processing Fees:** $0.30 (approx 2.9% + 30¢ for subscription payment)
* **Anthropic API Token Usage:**
  * Average Home Chef / Pro user makes ~50 AI queries per month.
  * Average query length: 500 input tokens, 300 output tokens.
  * Claude 3.5 Sonnet cost (June 2026 rates): $3.00/million input, $15.00/million output.
  * Cost per query: $(500 \times 0.000003) + (300 \times 0.000015) = 0.0015 + 0.0045 = \$0.006$.
  * Total monthly AI cost per user: $50 \times \$0.006 = \$0.30$.

### 2. Gross Margin Calculations

$$\text{Gross Margin \%} = \frac{\text{Tier Price} - \text{Variable Costs}}{\text{Tier Price}} \times 100$$

* **Home Chef Tier ($4.99/mo):**
  * Variable Costs: $0.10 (host) + $0.44 (Stripe fee) + $0.30 (AI tokens) = $0.84
  * Monthly Net Revenue: $4.99 - $0.84 = $4.15
  * **Gross Margin: 83.1%**

* **Pro Kitchen Tier ($14.99/mo):**
  * Variable Costs: $0.20 (higher database use) + $0.73 (Stripe fee) + $0.60 (2 users active with AI) = $1.53
  * Monthly Net Revenue: $14.99 - $1.53 = $13.46
  * **Gross Margin: 89.8%**
