# 🔌 Square to CulinaryOS Integration & Developer Migration Guide

> **Yes! You can connect your website to CulinaryOS just like you do with Square's developer system** — but with zero platform fees, open PostgreSQL contracts, real-time KDS kitchen routing, and closed-loop recipe inventory deduction.

---

## 1. Square API vs. CulinaryOS API Mapping

If your developers or website are already accustomed to Square's Developer API, CulinaryOS provides drop-in equivalents across every major domain:

| Square Developer Capability | Square Endpoint | CulinaryOS Equivalent Endpoint | CulinaryOS Advantage |
|---|---|---|---|
| **Public Menu / Catalog Fetch** | `GET /v2/catalog/list` | `GET /v1/menu/:tenantSlug` | Faster edge-cached response; includes kitchen stations & FDA Top 9 allergens. |
| **Menu Item & Modifiers** | `GET /v2/catalog/object/:id` | `GET /v1/menu/:tenantSlug/item/:itemId` | Single-call modifier groups with default selections and dietary flags. |
| **Order Placement & Firing** | `POST /v2/orders` | `POST /v1/online-orders` | **Instant kitchen ticket creation** on KDS + automated recipe pantry deduction. |
| **Payment Processing** | `POST /v2/payments` (Web Payments SDK) | `POST /v1/payments/create-intent` | Wholesale Stripe rates (no Square markup); Apple Pay, Google Pay, Tap-to-Pay. |
| **Realtime Webhooks / Stream** | Square Webhook Subscriptions | Supabase Realtime + `@culinaryos/event-bus` | Sub-50ms push updates for `pos:order:created`, `kds:ticket:bumped`, and `pantry:low_stock`. |
| **Inventory & Par Tracking** | `POST /v2/inventory/changes` | `GET /v1/pantry/stock` & `/v1/pantry/alerts` | Automatic recipe formula deduction (grams/oz) rather than manual bulk item decrements. |

---

## 2. Connecting Your Existing Website to CulinaryOS (Code Examples)

Connecting any custom website (Next.js, React, WordPress, Webflow, Shopify, or plain HTML/JavaScript) to CulinaryOS takes under 15 lines of code.

### Step 1: Fetching Your Menu & Displaying Dishes
```javascript
// Replace with your CulinaryOS server URL and restaurant slug
const CULINARYOS_API = 'http://localhost:3000'; // Or https://api.yourrestaurant.com
const RESTAURANT_SLUG = 'golden-fork';

async function fetchRestaurantMenu() {
  const response = await fetch(`${CULINARYOS_API}/v1/menu/${RESTAURANT_SLUG}`);
  const result = await response.json();
  
  if (result.ok) {
    console.log('Restaurant Name:', result.data.restaurant.name);
    console.log('Menu Sections:', result.data.sections);
    return result.data.sections;
  }
}
```

### Step 2: Submitting an Online Order to the Kitchen
When a customer clicks "Place Order" on your website:

```javascript
async function placeOnlineOrder(cartItems, customerInfo) {
  const payload = {
    tenantSlug: 'golden-fork',
    mode: 'pickup', // or 'delivery'
    customer: {
      name: customerInfo.name,
      phone: customerInfo.phone,
    },
    subtotal: 3500, // cents ($35.00)
    tax: 280,       // cents ($2.80)
    total: 3780,     // cents ($37.80)
    items: cartItems.map((item) => ({
      menu_item_id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.priceCents,
      station: item.station || 'pass', // Auto-routes to Grill, Fry, Cold, or Pass on KDS!
      course_number: 1,
      notes: item.customerNotes || '',
    })),
  };

  const response = await fetch(`${CULINARYOS_API}/v1/online-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const orderResult = await response.json();
  console.log('Order Fired to KDS Rail:', orderResult);
  return orderResult;
}
```

---

## 3. Importing Your Current Square Menu into CulinaryOS (1-Click)

You don't need to rebuild your menu from scratch. CulinaryOS includes an automated converter script:

### Step 1: Export your Square Catalog
- In Square Developer Dashboard: Call `GET https://connect.squareup.com/v2/catalog/list` and save as `square_export.json`.
- *(Or export catalog items via Square Dashboard as JSON/CSV)*.

### Step 2: Run the CulinaryOS Converter
```bash
npx tsx scripts/import-square-catalog.ts square_export.json
```

This automatically maps your Square categories to `menu_sections`, items & pricing to `menu_items`, modifier lists to `modifier_groups`, and auto-assigns kitchen stations (`grill`, `fry`, `cold`, `pass`, `bar`).

---

## 4. Why Transition from Square Dev to CulinaryOS?

| Factor | Square Developer System | CulinaryOS Developer System |
|---|---|---|
| **Software Platform Fees** | 2.6% + 10¢ to 3.3% + 30¢ per transaction + monthly SaaS fees | **0% platform fee** (MIT licensed — you only pay direct wholesale processor fees) |
| **Kitchen Display (KDS)** | Requires Square for Restaurants Plus subscription ($40/mo per device) | **Built-in real-time KDS** with 1s aging timers, station routing, and bump bar support |
| **3D Spatial Floor Plan** | Basic 2D table layout | **Interactive Three.js 3D dining room** with live status halos |
| **Inventory & Food Costing** | Simple inventory quantity subtractor | **Recipe Ratio Formula Engine** with automatic ingredient deduction & food waste logging |
| **Data Ownership** | Locked into Square's cloud | **Your own PostgreSQL database** (Supabase or self-hosted) |
| **Offline Resilience** | Limited offline mode with risk of declination | **Cryptographic UUIDv4 offline delta queue** that resyncs automatically on reconnect |
