# 🤖 AI Features Spec (Both Tracks)

This document specifies the architecture, system prompts, API payload structures, and recovery flows for all Claude (Anthropic API) features in the CulinaryOS ecosystem.

---

## 🛠️ Unified AI System Architecture

To manage API latency and token costs, all AI actions use a hybrid architecture:

```
User Action ──> Cache Layer ──> [If Miss] ──> edge function (Vercel/Supabase) ──> Anthropic Claude
                    │
                    └─> [If Offline] ──> Local Rule Engine (Kotlin/React)
```

1. **Caching Layer:** Frequently requested operations (e.g. standard ingredient allergen tags) are cached locally or in Supabase Redis.
2. **Offline Fallback:** If the network is unavailable or the API times out (>4000ms), the app drops back to a deterministic, rule-based local engine (e.g., standard linear weight scaling instead of smart AI yield adjustments).

---

## 📱 Track A — Mobile AI Chef Assistant

### 1. Interactive Recipe Modification & Ratio Adjustment
The AI Assistant acts as a culinary expert that rewires recipe ratios when requested (e.g., swapping flour types, adjusting hydration, or applying dietary restrictions).

* **Model:** Claude 3.5 Sonnet / Haiku
* **Payload Type:** JSON Structured Output

#### System Prompt:
```
You are a master baker and culinary AI chemist. The user will provide a recipe schema consisting of ingredients, current weights (g), current baker's percentages (%), and a modification request.
Your job is to recalculate the recipe weights and percentages while maintaining structural baking integrity.

Rules:
1. If swapping flour types (e.g., wheat to gluten-free), adjust water hydration ratios (GF flour typically requires 8-12% higher hydration).
2. If reducing sugar, note if it impacts yeast activation, and suggest custom adjustments if necessary.
3. The sum of all flours MUST equal 100.0% (Baker's Percentage Base).
4. Output must be valid JSON in the requested schema. Do not write markdown wrapping outside of the JSON block.
```

#### JSON Response Schema:
```json
{
  "modifications_applied": "Substituted Bread Flour for Cup-to-Cup Gluten-Free Flour, increased hydration by 10% to prevent dryness, and adjusted xanthan gum levels.",
  "adjusted_ingredients": [
    {
      "ingredient_name": "Gluten-Free Flour Blend",
      "new_weight_grams": 1000.0,
      "new_ratio_percentage": 100.0,
      "is_base_flour": true
    },
    {
      "ingredient_name": "Water",
      "new_weight_grams": 880.0,
      "new_ratio_percentage": 88.0,
      "is_base_flour": false
    }
  ],
  "culinary_notes": "Gluten-free dough will be stickier. Do not over-knead as there is no gluten structure to build. Adjust bake time by +5 minutes."
}
```

---

## 🌐 Track B — ERP Intelligence Layer

### 1. AI KDS Ticket Prioritization
Sorts the kitchen queue dynamically based on active line loads and prep times rather than just simple FIFO (First In, First Out).

* **Trigger:** New POS order placed.
* **Input Parameters:** Active tickets, stations occupied, average prep times per item, table order mix.
* **Logic:** Calculate a numeric `priority_score` (0-100) using a background edge function.

#### Priority Scoring Model:
$$\text{Priority Score} = w_1 \cdot T_{\text{wait}} + w_2 \cdot T_{\text{prep}} + w_3 \cdot S_{\text{overload}}$$
* Where:
  * \(T_{\text{wait}}\) = minutes ticket has been waiting.
  * \(T_{\text{prep}}\) = total estimated cooking time of the longest item on the ticket.
  * \(S_{\text{overload}}\) = station congestion factor (e.g., if the Grill station currently has 8 active steaks, new grill tickets gain immediate priority).
  * \(w_1, w_2, w_3\) = weights (0.4, 0.4, 0.2 respectively).

---

### 2. Smart 86'd Detection
Predicts when items will run out and automatically toggles POS availability *before* a cook has to tell a server.

* **Trigger:** Physical inventory decrement or sales transaction check.
* **Algorithm:** Simple linear regression on ingredient depletion velocity:

$$\text{Time to depletion} = \frac{\text{Current Inventory Qty}}{\text{Depletion Rate per Hour}}$$

* **AI action:** If \(\text{Time to depletion} < 0.5\text{ hours}\), Claude pushes a WebSocket notification to the POS screen: `"Warning: Bread Flour is depleting rapidly. Sourdough loaves will auto-86 in approx. 12 minutes based on current order volume."`
* When inventory hits exactly zero, the database RLS trigger auto-sets `is_available = false` on POS menus.

---

### 3. AI Catering Quote Generator
Allows sales managers to input event descriptions and receive structured menu and cost proposals.

#### Prompt Template:
```
Input: Event Type: {{event_type}}, Guest Count: {{guests}}, Budget per Guest: {{budget}}, Dietary Profile: {{dietary}}.
Task: Analyze our current recipe cost database and propose a multi-course catering menu that secures a 65% gross margin.

Format Output:
- Proposed Menu (Items + Cost breakdown)
- Total Ingredient Cost
- Recommended Contract Price
- Preparation Risk Assessment
```

---

### 4. Labor Optimizer
Scans historical sales trends, local weather forecasts, and holiday calendars to recommend staffing levels, preventing over-staffing and labor cost spikes.

* **Input Data:** Weather API forecast, historical sales matching calendar week, current staff schedule.
* **Response Example:**
  ```json
  {
    "forecasted_sales_variance": "+18% (Sunny weather + outdoor farmers market event nearby)",
    "recommendations": [
      {
        "action": "ADD_SHIFT",
        "role": "Line Cook",
        "suggested_hours": "11:00 AM - 4:00 PM",
        "reason": "Grill station velocity expected to exceed peak threshold from 12:30 PM - 2:00 PM."
      }
    ]
  }
  ```
