---
name: dish-costing-calculator
description: Calculate dish costings targeting 72% Gross Profit (28% food cost), ex-VAT net pricing, VAT inclusion, and margin sensitivity analysis.
---

# Dish Costing Calculator (72% GP Standard)

Calculates complete dish costings based on post-trim, post-prep gram weights and bulk ingredient purchase costs.

## Formula Standards
- **Food Cost %:** `(Total Ingredient Cost / Net Selling Price) * 100` (Target: 28%)
- **Gross Profit %:** `((Net Selling Price - Food Cost) / Net Selling Price) * 100` (Target: 72%)
- **Minimum Net Price (72% GP):** `Total Ingredient Cost / 0.28`
- **Minimum Menu Price (inc VAT):** `Minimum Net Price * 1.20` (assuming 20% VAT)
- **High-Cost Flag:** Alert if any single ingredient exceeds 40% of total dish food cost.
