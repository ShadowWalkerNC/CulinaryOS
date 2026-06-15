# 📐 Track A — UI/UX Design Specs

This document defines the interface design tokens, core user flows, and wireframe specifications for the **CulinaryOS Android application** (RecipeOS).

---

## 🎨 Styling Tokens & Jetpack Compose Theme

The application uses a dark-themed, premium interface designed for high-contrast legibility in intense kitchen lighting.

### Color Palette

| Token | HSL / Hex Value | Role | Usage |
| :--- | :--- | :--- | :--- |
| `DarkBg` | `#121416` (Deep Charcoal) | Primary Background | App-wide screen container |
| `SurfaceBg` | `#1C1F22` (Warm Gray-Black) | Secondary Surface | Cards, sheets, dialogs |
| `Accent` | `#FF8A00` (Safety Orange) | Brand Accent | Active tabs, key CTAs, primary buttons |
| `Success` | `#10B981` (Emerald) | Status Positive | In-stock, prep complete, verified |
| `Warning` | `#F59E0B` (Amber) | Status Warning | Running low, pending sync, near par |
| `Danger` | `#EF4444` (Crimson) | Status Critical | 86'd / out of stock, overdue task |
| `TextMain` | `#F3F4F6` (Cool Gray 100) | Primary Text | Headings, main readable text |
| `TextMuted` | `#9CA3AF` (Cool Gray 400) | Secondary Text | Labels, metadata, helper text |

### Typography (Outfit Font Family)
* **TitleLarge:** 32sp / LineHeight 40sp / Bold (For recipe names, section headings)
* **BodyLarge:** 16sp / LineHeight 24sp / Regular (For instructions, recipe lists)
* **DetailMuted:** 12sp / LineHeight 16sp / SemiBold (For ratios, weights, warnings)

### Kitchen Accessibility Rules
* **Minimum Touch Target:** 72 x 72 dp for all active elements to support damp or gloved fingers.
* **Layout Padding:** Minimum 16dp spacing between interactive elements to prevent accidental clicks.
* **Screen Lock Override:** Keep the screen active during active baking/prep flows automatically via `KeepScreenOn` window flag.

---

## 📐 Core UI Flows & Screen Layouts

### 1. The Ratio Blueprint Scaling Screen
Bakers work in formulas (percentages relative to the flour weight). The Ratio Blueprint screen lets them toggle between absolute weights and percentage ratios seamlessly.

#### Wireframe Outline:
```
+--------------------------------------------------------------+
| [<- Back]              Cinnamon Sourdough        [Save] [•••]|
+--------------------------------------------------------------+
| Total Weight Input: [ 1000g ]   Scale Factor: [ 1.00x ]      |
| Quick Scaling Presets:  ( 0.5x ) ( 1.0x ) ( 2.0x ) ( 5.0x )  |
+--------------------------------------------------------------+
| [ Ratios (%) ]                                 (x) Abs (g)   |
|                                                              |
| FLOUR (Base 100%) .................................. 100.0%  |
|   - Bread Flour (80%) .............................  800.0g  |
|   - Whole Wheat (20%) .............................  200.0g  |
| WATER ..............................................  78.0%  |
|   - Temp Target: 76°F .............................  780.0g  |
| LEAVEN (Sourdough Starter) .........................  20.0%  |
|   - Active/Bubbling ...............................  200.0g  |
| SALT ...............................................   2.2%  |
|   - Fine Sea Salt .................................   22.0g  |
+--------------------------------------------------------------+
| Yield Estimation: 2 Loaves @ 1000g each                      |
+--------------------------------------------------------------+
```

#### UI Logic & Interaction:
1. **Interactive Scale Slider:** Tapping a preset changes the total output weight immediately. Dragging the slider scales all ingredients dynamically in real-time.
2. **Formula Mode Toggle:** Tapping the `[ Ratios (%) ]` pill reveals the percentage sliders. Tapping any percentage lets the user edit it. Adjusting a percentage automatically recalculates weights for the entire grid without altering the base flour scale logic.
3. **Weight/Volume Units:** Easily switch between `g` (Grams), `oz` (Ounces), and `kg` (Kilograms). Unit scaling is performed inline.

---

### 2. Prep List Consolidation Screen
Allows chefs to select multiple recipes and consolidate ingredients into a unified prep checklist, preventing duplicate tasks.

#### Wireframe Outline:
```
+--------------------------------------------------------------+
| [<- Home]             Consolidated Prep List     [Export PDF]|
+--------------------------------------------------------------+
| Selected Recipes:                                            |
|  [x] Cinnamon Sourdough (5x)   [x] Chocolate Babka (2x)      |
+--------------------------------------------------------------+
|  PREP STEPS                                                  |
|                                                              |
|  [ ] Autolyse Flour + Water (Sourdough) ....... (Est. 45m)  |
|  [ ] Scale dry spices (Babka + Sourdough) ...... (Est. 10m)  |
|  [ ] Prepare egg wash (Babka) .................. (Est.  5m)  |
|                                                              |
|  CONSOLIDATED INGREDIENTS TO WEIGH                           |
|                                                              |
|  [ ] Bread Flour (Sourdough + Babka) ...........  4,800.0g  |
|  [ ] Water (Warm, 76°F) ........................  3,900.0g  |
|  [ ] Fine Sea Salt .............................    118.0g  |
+--------------------------------------------------------------+
```

---

### 3. Pantry & Stock Level Indicators
Provides a quick glance at pantry health. Out-of-stock items trigger warnings.

```
+--------------------------------------------------------------+
| PANTRY STOCK                                   [Update Stock]|
+--------------------------------------------------------------+
| [!] 3 Items Below Par                                        |
|                                                              |
| * Unbleached Bread Flour: 12kg / Par 50kg   [ CRITICAL RED ] |
| * Sourdough Starter: 2.5kg / Par 5.0kg     [ WARNING YEL  ] |
| * Fine Sea Salt: 8.2kg / Par 10.0kg         [ WARNING YEL  ] |
| * Unsalted Butter: 25.0kg / Par 20.0kg      [ OPTIMAL GRN  ] |
+--------------------------------------------------------------+
```
* Tapping a item expands inline to show past usage and logs.
* Direct action buttons allow one-tap stock overrides.
