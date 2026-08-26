# Settings & Customization Guide — CulinaryOS

CulinaryOS provides an enterprise-grade, multi-surface Settings and Customization engine across Back-Office Admin (`:5174`), POS Terminal (`:5172`), and Kitchen Display (`:5173`).

---

## 1. Store Identity & Company Settings

Manage legal entity information, contact details, automated sales tax calculations, and guest receipt headers/footers.

| Field | Description | Target Surface |
|---|---|---|
| **Restaurant Name** | Public brand display name | Storefront, POS, KDS, Receipts |
| **Legal Entity** | Registered corporate LLC/Inc name | Invoices, Tax Audits, Legal Checks |
| **Tax ID / EIN** | Federal or regional employer ID | Formal Guest Invoices & Reports |
| **Currency Symbol** | `$`, `€`, `£`, `¥`, `kr` | Currency formatting across all UI |
| **Sales Tax Rate (%)** | Automatic tax addition at checkout | POS, Web Storefront, Receipts |
| **Gratuity Presets** | Default tip chips (e.g. 15%, 18%, 20%, 25%) | POS Checkout & Guest Payment |
| **Auto-Gratuity** | Auto-apply threshold for parties (e.g. 6+ guests) | POS Multi-Seat Checkout |
| **Receipt Top Banner** | Welcome message / tagline | 80mm & 58mm Thermal Printers |
| **Receipt Footer** | Social handles, feedback surveys | 80mm & 58mm Thermal Printers |
| **Guest Wi-Fi** | SSID & Wi-Fi Password | Auto-printed on guest receipt tape |

---

## 2. Kitchen Prep Stations & Menu Item Routing

Define preparation nodes, course firing delays, and printer destinations.

### Default Prep Stations

| Station ID | Name | Code | Default Route |
|---|---|---|---|
| `pass` | Expo Master Pass | `EXPO` | Aggregates all completed tickets |
| `grill` | Hot Grill Station | `GRILL` | Steaks, burgers, wood-fired proteins |
| `fry` | Fryer & Sauté Station | `FRY` | Calamari, fries, pasta pan sauces |
| `cold` | Cold Prep & Raw Bar | `COLD` | Salads, hummus, oysters, carpaccio |
| `pizza` | Wood-Fired Pizza Oven | `PIZZA` | Neapolitan pizzas, flatbreads, calzones |
| `bar` | Cocktail & Beverage Bar | `BAR` | Cocktails, draft beer, wine, coffee |
| `pastry` | Pastry & Dessert Station | `PASTRY` | Cakes, tiramisu, sorbets |

### Item Routing Matrix

Each menu item or category can be configured with:
1. **Primary Station**: KDS screen that displays the ticket row.
2. **Backup Station**: Failover station if a node is offline or during high volume.
3. **Course Assignment**:
   - `drinks`: Immediate dispatch to Bar.
   - `starters`: Course 1 (Appetizers/Soups/Salads).
   - `mains`: Course 2 (Held until Course 1 is cleared or 12-min auto-fire).
   - `desserts`: Course 3 (Held until fired by server).
4. **Target Cook Time**: Benchmark preparation window (minutes).
5. **Kitchen Printer Routing**: Stream ESC/POS duplicate tickets to station receipt printers.

---

## 3. Terminal Ergonomics, Text Sizing & Accessibility

CulinaryOS adapts to varied hardware environments—from handheld 7-inch tablets to wall-mounted 43-inch 4K kitchen displays.

### Text Sizing Scale

| Mode | Scale | Optimal Environment |
|---|---|---|
| **Compact** | `100%` | Desktop back-office manager monitors (1080p/1440p) |
| **Standard** | `110%` | 13-inch POS counter terminals (iPads, Surface Pro) |
| **Large (POS)** | `125%` | High-pace touch ordering on 10-inch tablets (Sunmi, Clover) |
| **X-Large (KDS)** | `140%` | Wall-mounted kitchen TVs viewed from 6–10 feet away |

### Visual & Hardware Customization

- **Touch Target Padding**: `Compact (40px)`, `Standard (48px)`, `Expanded (56px)` to avoid mis-taps during dinner rushes.
- **High-Contrast OLED Mode**: Pure black backgrounds with high-luminance borders for low-glare visibility under hot kitchen heat lamps.
- **3D Table Halo Glows**: Spatial status halos (green for seated, yellow for ordering, red for overdue) on dining room floor maps.
- **Audio Chimes**: Audible bell chime upon ticket receipt; warning tone when aging exceeds 10 minutes; critical tone at 20 minutes.
- **Thermal Receipt Width**: Switch dynamically between `80mm (48 column)` and `58mm (32 column)` formats.

---

## 4. MCP Agent Settings Tools

AI agents interacting via Model Context Protocol (MCP) can inspect and update settings programmatically:

```json
// Example: Get restaurant settings
{
  "name": "get_restaurant_settings"
}

// Example: Route a new dish
{
  "name": "update_item_routing",
  "arguments": {
    "itemName": "Wagyu Ribeye 16oz",
    "primaryStation": "grill",
    "course": "mains",
    "targetPrepMinutes": 18
  }
}
```
