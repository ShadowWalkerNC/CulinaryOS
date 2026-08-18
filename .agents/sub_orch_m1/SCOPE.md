# Scope: Milestone 1 (M1: Ratio Engine Consolidation & Database Types)

## Architecture & Scope
Milestone 1 establishes the mathematical foundation and database type definitions for CulinaryOS:
1. `packages/ratio-engine/src/index.ts`: Zero-dependency, pure culinary mathematical functions:
   - Sub-recipe tree scaling & flattening
   - Portion scaling & baker's percentages & total formula weight
   - Density-based unit conversions (grams <-> cups for flour, sugar, butter, salt, rice, oats)
   - Decimal portion formatting
   - Recipe food costing & target cost %
   - Actual vs Theoretical cost variance calculation
   - Waste summarization & top offenders
   - Shift prep & mise en place planning & batch requirement projection
2. `packages/ratio-engine/src/index.test.ts`: Complete unit test coverage for all ratio-engine functions, edge cases, zero-values, negative inputs, invalid unit conversions, etc.
3. `packages/db/src/types.ts`: Comprehensive TypeScript database types matching all migrations V1–V14 (tenants, orders, tickets, pantry, waste_events, plate_economics, staff_pins, etc.).

## Feature Inventory (Milestone 1)
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Sub-Recipe Tree Scaling | Recursive formula scaling for nested doughs, sauces, bases | M1 | RecipeOS/KitchenKit |
| 2 | Tree Flattening & Aggregation | Flattens hierarchical scaled recipe tree into consolidated raw ingredients | M1 | KitchenKit ratio-engine |
| 3 | Baker's Percentages & Total Weight | Calculates baker's percentage (base = 100%) and scales from total weight | M1 | KitchenKit/CulinaryOS |
| 4 | Density-Based Unit Conversions | Bidirectional grams <-> cups for flour, sugar, butter, salt, rice, oats | M1 | RecipeOS ratio-engine |
| 5 | Smart Decimal Portion Formatting | Formats scaled quantities (integers -> whole, >=1 -> 1dp, <1 -> 2dp) | M1 | RecipeOS ratio-engine |
| 6 | Recipe Food Costing & Target % | Computes cost per serving, total cost, food cost % and status (good/watch/high) | M1 | CulinaryOps food-cost-engine |
| 7 | Actual vs Theoretical Cost Variance | Computes dollar and percentage variance with ok (<2%), warn (2-5%), alert (>=5%) | M1 | CulinaryOps food-cost-engine |
| 8 | Waste Summarization & Top Offenders | Aggregates waste weight, dollar loss, reason breakdown, top wasted items | M1 | CulinaryOps waste-engine |
| 9 | Shift Prep & Mise en Place Planning | Evaluates par shortfall by shift and generates station prep task lists | M1 | KitchenKit prep-engine |
| 10 | Batch Requirement Projection | Calculates total batch weight needed for target covers with buffer factor | M1 | KitchenKit prep-engine |
| 11 | V1–V14 Database TypeScript Types | Complete schema types for tenants, orders, tickets, pantry, waste, economics | M1 | Database migrations |

## Interface Contracts (packages/ratio-engine)
- `scaleRecipeTree(recipe: RecipeBlueprint, targetYield: number): ScaledRecipeTreeResult`
- `flattenScaledTree(tree: ScaledRecipeTreeResult): Record<string, ScaledIngredientSummary>`
- `scaleByServings<T extends { amount: number }>(items: T[], baseServings: number, targetServings: number): T[]`
- `calculateRatio(ingredientWeight: number, baseWeight: number): number`
- `totalFormulaWeight(recipe: RecipeBlueprint, targetBaseWeight: number): number`
- `formatAmount(value: number): string`
- `gramsToCups(grams: number, ingredient: string): number | null`
- `cupsToGrams(cups: number, ingredient: string): number | null`
- `computeRecipeCost(ingredients: Array<{ id: string; name: string; quantity: number; unitCost: number }>, servings: number, menuPrice: number): RecipeCostAnalysis`
- `calculateCostVariance(theoretical: number, actual: number): CostVarianceResult`
- `summarizeWaste(entries: WasteLogEntry[]): WasteSummaryReport`
- `calculateWastePercentage(totalWasteCost: number, totalFoodCost: number): number`
- `generateShiftPrepPlan(items: InventoryStockItem[], shift: 'morning' | 'evening' | 'prep', date: string): ShiftPrepPlan`
- `projectBatchRequirement(portionWeight: number, covers: number, wasteFactor?: number): number`

## Mandatory Write Boundaries
- `packages/ratio-engine/*`
- `packages/db/src/types.ts`
