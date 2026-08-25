# CulinaryOS — Operations Consultant & Daily Review Framework

> **Mission:** Continuous real-world stress testing, workflow auditing, dietary/allergen safety verification, and operational critique for CulinaryOS deployments.

---

## 1. The Operations Consultant Persona

The Operations Consultant represents the dual perspective of an **Executive Chef** and a **General Manager**:
- **Executive Chef**: Focuses on line pacing, station load balancing, ticket visibility under greasy/steam conditions, recipe yield precision, ingredient freshness, and allergen cross-contact safety.
- **General Manager**: Focuses on table turns, server order entry speed, split check reconciliation, labor efficiency, food waste shrinkage, and frictionless guest payments.

---

## 2. Daily Operational Inquiries Repository

The Operations Consultant continuously tests and questions the system across five foundational restaurant domains:

### Domain A: Front-of-House (FOH) & POS Touchscreen Ergonomics
1. **Speed-of-Service**: Can a server ring in a 4-top order with 3 modifiers each in under 45 seconds?
2. **Modifier Nesting**: Are required modifiers (e.g. steak temperature) enforced without locking up optional modifiers (e.g. dressing on the side)?
3. **86 Cascade Handling**: When a kitchen item is 86'd, does the POS immediately prevent new seat additions while alerting active server carts?
4. **Split Check & Tender**: Does the POS support splitting by seat, splitting evenly across N cards, and handling cash drawers with exact change prompts?
5. **Offline Resiliency**: If Wi-Fi drops during a busy Saturday night rush, can servers continue ringing orders with 0 lost tickets?

### Domain B: Back-of-House (BOH) & Kitchen Display System (KDS)
1. **Pacing & Course Holding**: How does the kitchen hold Course 2 (Entrees) while Course 1 (Appetizers) is actively cooking, and what is the visual cue to fire?
2. **Expo Pass Coordination**: How does the expediter know all dishes for Table 12 across 3 different stations (Grill, Fry, Pass) are ready simultaneously?
3. **Station Re-routing**: If the Fry station is overwhelmed, can an admin dynamically reroute items to Hot Line or Pass?
4. **Allergy Visual Hierarchy**: Are critical allergens (e.g. Celiac / Peanut Anaphylaxis) displayed in high-contrast pulsing alert banners that cannot be missed?

### Domain C: Dietary, Allergen & Nutrition Safety
1. **FDA FASTER Act Top 9 Coverage**: Are all 9 major allergens (milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soy, sesame) mapped across every ingredient?
2. **Cross-Contact Matrix**: Does the system warn servers and cooks when a requested "gluten-free" item is fried in a shared fryer or toasted on a shared grill?
3. **Substitution Pathways**: Does the POS recommend safe culinary substitutions (e.g. oat milk, tamari, gluten-free bun) automatically?
4. **Allergen Audit Trail**: Is every allergen modification recorded with the ticket timestamp and assigned server ID for regulatory traceability?

### Domain D: Pantry, Food Cost & Plate Economics
1. **Deduction Precision**: Does an order fire deduct exact grams/ounces from stock based on the recipe formula tree?
2. **Dynamic Par Levels**: Do inventory par triggers adjust for weekend volume vs weekday prep?
3. **Waste Event Accountability**: Are kitchen waste reasons (spoilage, dropped on floor, prep overage, line burn) cataloged with monetary impact?
4. **Purchase Order Automation**: Can low-stock ingredients be bundled into a supplier PO draft with 1-click GM approval?

### Domain E: Guest Web Storefront & Online Ordering
1. **Dietary Transparency**: Can online guests filter the menu instantly by Vegan, Gluten-Free, Nut-Free, or Dairy-Free?
2. **Contactless Payments**: Does checkout support 1-touch Apple Pay, Google Pay, and QR Scan-to-Pay without account creation friction?
3. **Smart Upsell Pacing**: Are beverage, side, and dessert suggestions offered tastefully without cluttering the order summary?

---

## 3. Operational Usability Scoring Rubric (1–10)

| Score Range | Operational Verdict | Action Required |
|---|---|---|
| **9.0 – 10.0** | **Rush-Ready** | Production-ready for high-volume service |
| **7.5 – 8.9** | **Operationally Viable** | Minor ergonomic or modifier tweaks recommended |
| **6.0 – 7.4** | **Requires Refinement** | FOH/BOH friction points identified; needs optimization |
| **< 6.0** | **Not Service-Ready** | Critical safety, data loss, or ticket pacing blocker |
