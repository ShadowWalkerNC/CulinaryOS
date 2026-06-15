# 📣 Go-to-Market Strategy

This document outlines the ideal customer targets, rollout roadmap, customer acquisition strategies, and pilot success metrics for CulinaryOS.

---

## 🎯 Ideal Customer Profiles (ICPs)

The dual-track architecture allows CulinaryOS to target different segments simultaneously, eventually consolidating them into an all-in-one product.

### 1. The Artisan Baker (Track A Focus)
* **Description:** Small bakeries and independent pastry chefs.
* **Pain Point:** Standard recipe calculators don't use baker's percentages (ratios). They scale flour, yeast, and hydration by hand on paper.
* **Value Prop:** The Ratio Blueprint system allows them to instantly scale formula cards based on daily flour yields, reducing math errors and raw ingredient waste.

### 2. The High-Velocity Food Truck (Track B Focus)
* **Pilot Partner:** *Alley Katz*
* **Description:** Fast-paced outdoor food operations.
* **Pain Point:** Spotty Wi-Fi causes card reader downtime, losing dinner rushes. KDS screens are too small to read at a distance.
* **Value Prop:** Mobile POS with Stripe offline card tokenization, combined with high-contrast, large-format KDS screen configurations.

### 3. The Neighborhood Cafe (Track B Focus)
* **Pilot Partner:** *Half Baked Cafe*
* **Description:** Multi-functional breakfast and coffee hubs.
* **Pain Point:** High staff turnover makes scheduling painful. Thin margins require strict inventory tracking.
* **Value Prop:** Built-in team rosters with shift scheduling conflicts checking, combined with physical inventory tracking and CRM loyalty programs to drive repeat business.

### 4. Institutional Care (Track B + API Focus)
* **Pilot Partner:** *Ross Manor*
* **Description:** Assisted living and healthcare dining operations.
* **Pain Point:** Heavy regulation around dietary restrictions and allergen management. Menu plans must change based on resident health charts.
* **Value Prop:** Smart allergen flagging using the Claude API, paired with portion scaling templates matching patient rosters.

---

## 📅 Rollout Timeline (Phase 1 → Phase 4)

```
2026 Q3                   2026 Q4                   2027 Q1+
  ├── Track A Alpha         ├── Track B Pilot         ├── Phase 3 Integration
  │   (Local-first Room)    │   (Northern Fixin's)    │   (Supabase Sync Layer)
  └── Local Baking Demos    └── Cafe & Truck Runs     └── Public API Launch
```

### Phase 1: Local Alpha (Q3 2026)
* Launch Track A Android Alpha for local bakers.
* Core metric: User retention on the recipe scaling screen.

### Phase 2: Live Pilot Runs (Q4 2026)
* Deploy Track B POS/KDS systems to *Half Baked Cafe* and *Alley Katz*.
* Core metric: System uptime, offline transaction capture success rate, and order ticket fulfillment speeds.

### Phase 3: Unified Sync Ecosystem (Q1 2027)
* Ship the bi-directional Supabase Sync module. Mobile recipe adjustments sync directly to the POS menu.
* Core metric: Data synchronization reliability (percentage of sync runs completed without manual intervention).

### Phase 4: API & Enterprise Expansion (Q2 2027+)
* Publish the CulinaryOS REST API. Open up the platform to *Ross Manor* electronic health record (EHR) integrations.
* Core metric: Monthly Recurring Revenue (MRR) and developer ecosystem API key activations.

---

## 📈 Pilot Success Metrics & KPIs

To evaluate pilot readiness before scaling up customer acquisition, the platform must hit the following targets at our pilot locations:

| Metric Category | Target KPI | Measurement Method |
| :--- | :--- | :--- |
| **System Reliability** | 99.9% POS/KDS Uptime | Automated logging via Supabase DB health alerts |
| **Kitchen Efficiency** | -15% Ticket Fulfillment Time | KDS timestamps comparing pre-deployment to post-deployment |
| **Inventory Waste** | -8% Cost of Goods Sold (COGS) | Inventory variance audit sheets tracking waste levels |
| **Loyalty Engagement** | >30% Customer Loyalty Enrollment | Sign-up ratios tracked at check-out in the CRM module |
| **Sync Accuracy** | Zero Data Duplication Conflicts | Verification check of local SQLite rows against Supabase tables |
