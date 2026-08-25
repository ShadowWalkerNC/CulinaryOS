# 🤖 AI Features Spec & Operations Consultant Architecture

This document specifies the architecture, system prompts, API payload structures, token budget guardrails, and deterministic offline fallbacks for all AI features in the CulinaryOS ecosystem.

---

## 🛠️ Unified AI System Architecture & Rule 9 Compliance

> **Rule 9 — AI is Additive, Never Required:**
> Core restaurant operations (POS PIN login, order fire, KDS bump, recipe ratio math, pantry deduction, and payment capture) are 100% deterministic and execute with zero external API dependencies. All Claude AI capabilities enhance workflows without ever gating live service.

```
User / System Action ──> Local Rule Engine (@culinaryos/ratio-engine)
                             │
                             └─> [Optional AI Layer (Anthropic)] ──> Operations Consultant / Claude
```

---

## 👨‍🍳 Operations Consultant Agent Architecture (`operations_consultant`)

The **Operations Consultant** is an autonomous subagent registered to evaluate live restaurant ergonomics, Back-of-House kitchen pacing, and Dietary/Allergen safety:

### System Persona
- **Role:** Executive Chef & General Manager dual perspective.
- **Capabilities:** Touchscreen ergonomic analysis, modifier nesting review, KDS course hold/fire sync, dietary safety cross-contact matrix, and plate cost shrinkage analysis.
- **Daily Budget Directive:** ~20% of daily exploration token allocation, combining deterministic empirical audits with targeted AI deep-dive inquiries.

### Daily Audit Runner (`pnpm ops:audit`)
The runner script ([`scripts/daily-ops-consultant.ts`](../scripts/daily-ops-consultant.ts)) outputs:
1. Operational Health Score (1–10).
2. FDA Top 9 Allergen coverage & shared fryer/grill cross-contact warnings.
3. 4 sharp daily operational inquiries challenging the current build.
4. Generated report published to [`docs/DAILY_OPERATIONS_REPORT.md`](DAILY_OPERATIONS_REPORT.md).

---

## 🌾 FDA FASTER Act Top 9 Dietary & Allergen Prompts

When evaluating new recipe formulas or menu items, the AI prompt enforces strict FDA allergen safety:

```
You are the CulinaryOS Dietary & Allergen Safety Officer.
Evaluate the provided recipe ingredients against the FDA FASTER Act Top 9 allergens:
1. Milk / Dairy
2. Eggs
3. Fish
4. Crustacean Shellfish
5. Tree Nuts
6. Peanuts
7. Wheat / Gluten
8. Soybeans / Soy
9. Sesame

Identify:
- Explicit allergens declared in ingredients.
- Hidden allergen aliases (e.g. whey, casein, albumin, lysozyme, worcestershire, tahini).
- Cross-contact vectors (shared deep fryers, shared grill surfaces, unwashed mixers).
- Safe culinary substitution recommendations (e.g. oat milk, tamari, gluten-free buns).
```

---

## 📊 Extension Marketplace AI Routes (`/v1/marketplace/ai/*`)

| Endpoint | Method | Input Payload | Claude Functionality | Deterministic Fallback |
|---|---|---|---|---|
| `/v1/marketplace/ai/ops-insight` | `POST` | Shift sales, labor cost, waste logs | Qualitative executive GM shift brief | Metric sum table |
| `/v1/marketplace/ai/prep-plan` | `POST` | Projected covers, pantry shortfalls | Chef prep sheet with station assignments | Covers-scaled prep items |
| `/v1/marketplace/ai/loyalty-message` | `POST` | Customer visit count & lifetime spend | Personalized postcard promotional copy | Standard $5/$10 coupon template |
