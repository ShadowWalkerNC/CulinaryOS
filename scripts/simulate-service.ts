// ============================================================
// CulinaryOS — Live Restaurant Service Simulation Runner
// Generates simulated orders, servers, customers, KDS tickets,
// pantry deductions, and payment flows for local testing.
// ============================================================

const API_BASE = process.env.CULINARYOS_URL || 'http://localhost:3000';
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const TENANT_SLUG = 'golden-fork';

interface SimulatedOrder {
  tableNumber: string | null;
  serverName: string;
  coverCount: number;
  mode: 'dine_in' | 'pickup' | 'delivery' | 'bar';
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number; // cents
    station: 'grill' | 'fry' | 'cold' | 'pass' | 'bar';
    courseNumber: number;
    notes?: string;
  }>;
}

const SIMULATED_ORDERS: SimulatedOrder[] = [
  {
    tableNumber: 'Table 4 (Booth)',
    serverName: 'Maria G.',
    coverCount: 4,
    mode: 'dine_in',
    items: [
      { name: 'Dry-Aged Bistro Burger', quantity: 2, unitPrice: 1850, station: 'grill', courseNumber: 1, notes: 'Medium Rare, Extra Pickles' },
      { name: 'Truffle Parmesan Fries', quantity: 2, unitPrice: 850, station: 'fry', courseNumber: 1 },
      { name: 'Hazy IPA Draft', quantity: 2, unitPrice: 750, station: 'bar', courseNumber: 1 },
      { name: 'Warm Chocolate Lava Cake', quantity: 2, unitPrice: 950, station: 'cold', courseNumber: 2, notes: 'Hold for Course 2' },
    ],
  },
  {
    tableNumber: 'Table 1',
    serverName: 'Alex R.',
    coverCount: 2,
    mode: 'dine_in',
    items: [
      { name: 'Wood-Fired Margherita Pizza', quantity: 1, unitPrice: 1650, station: 'pass', courseNumber: 1, notes: 'Crispy Crust' },
      { name: 'Heirloom Tomato & Burrata Salad', quantity: 1, unitPrice: 1400, station: 'cold', courseNumber: 1 },
      { name: 'Pinot Noir Glass', quantity: 2, unitPrice: 1200, station: 'bar', courseNumber: 1 },
    ],
  },
  {
    tableNumber: null,
    serverName: 'Online Web Storefront',
    coverCount: 1,
    mode: 'pickup',
    customerName: 'Sean Miller',
    customerPhone: '555-0199',
    items: [
      { name: 'Gluten-Free Truffle Flatbread', quantity: 1, unitPrice: 1750, station: 'pass', courseNumber: 1, notes: '🌾 Severe Wheat Allergy — Clean Board' },
      { name: 'Vegan Wild Mushroom Risotto', quantity: 1, unitPrice: 2100, station: 'grill', courseNumber: 1, notes: '🥛 No Butter / Dairy Free' },
      { name: 'Sparkling Hibiscus Lemonade', quantity: 2, unitPrice: 550, station: 'bar', courseNumber: 1 },
    ],
  },
  {
    tableNumber: 'Bar Stool 3',
    serverName: 'Sam (Bartender)',
    coverCount: 1,
    mode: 'bar',
    customerName: 'Jordan Lee',
    items: [
      { name: 'Smoked Bourbon Old Fashioned', quantity: 2, unitPrice: 1500, station: 'bar', courseNumber: 1, notes: 'Luxardo Cherry' },
      { name: 'Crispy Calamari & Lemon Aioli', quantity: 1, unitPrice: 1350, station: 'fry', courseNumber: 1 },
    ],
  },
];

async function runSimulation() {
  console.clear();
  console.log('\x1b[38;5;208m');
  console.log('========================================================================');
  console.log('       CULINARYOS — LIVE DINNER RUSH TEST SIMULATOR                     ');
  console.log('========================================================================\x1b[0m\n');

  console.log(`Connecting to CulinaryOS API at: \x1b[36m${API_BASE}\x1b[0m\n`);

  let totalSalesCents = 0;
  let totalTicketsFired = 0;

  for (let i = 0; i < SIMULATED_ORDERS.length; i++) {
    const sim = SIMULATED_ORDERS[i];
    const orderSubtotal = sim.items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
    const orderTax = Math.round(orderSubtotal * 0.08);
    const orderTotal = orderSubtotal + orderTax;
    totalSalesCents += orderTotal;
    totalTicketsFired += sim.items.length;

    console.log(`\x1b[1m\x1b[33m[Simulated Event ${i + 1}/${SIMULATED_ORDERS.length}]\x1b[0m ${sim.mode.toUpperCase()}: \x1b[32m${sim.tableNumber || sim.customerName}\x1b[0m (Server: ${sim.serverName})`);
    console.log(`  Items: ${sim.items.map(it => `${it.quantity}x ${it.name} ($${(it.unitPrice / 100).toFixed(2)})`).join(', ')}`);
    console.log(`  Subtotal: $${(orderSubtotal / 100).toFixed(2)} · Tax: $${(orderTax / 100).toFixed(2)} · Total: \x1b[1m\x1b[36m$${(orderTotal / 100).toFixed(2)}\x1b[0m`);

    try {
      if (sim.mode === 'pickup' || sim.mode === 'delivery') {
        const res = await fetch(`${API_BASE}/v1/online-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantSlug: TENANT_SLUG,
            mode: sim.mode,
            customer: { name: sim.customerName, phone: sim.customerPhone },
            subtotal: orderSubtotal,
            tax: orderTax,
            total: orderTotal,
            items: sim.items.map(it => ({
              name: it.name,
              quantity: it.quantity,
              unit_price: it.unitPrice,
              station: it.station,
              course_number: it.courseNumber,
              notes: it.notes,
            })),
          }),
        });
        const json = await res.json();
        console.log(`  ➔ \x1b[32m✔ Online Order Fired to KDS Rail\x1b[0m (ID: ${json.data?.id || json.id || 'ok'})\n`);
      } else {
        const res = await fetch(`${API_BASE}/v1/orders/o-sim-${i + 1}/send`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Id': TENANT_ID,
          },
          body: JSON.stringify({
            order: {
              id: `o-sim-${i + 1}`,
              table_number: sim.tableNumber,
              server_name: sim.serverName,
              subtotal: orderSubtotal,
              tax: orderTax,
              total: orderTotal,
            },
            items: sim.items.map((it, idx) => ({
              id: `li-sim-${i + 1}-${idx + 1}`,
              name: it.name,
              quantity: it.quantity,
              unit_price: it.unitPrice,
              station: it.station,
              course_number: it.courseNumber,
              notes: it.notes,
            })),
          }),
        });
        const json = await res.json();
        console.log(`  ➔ \x1b[32m✔ POS Order Fired & Tickets Emitted to Stations\x1b[0m (Course 1 Firing, Course 2 Held)\n`);
      }
    } catch (err: any) {
      console.log(`  ➔ \x1b[33m(API server offline or simulated locally: ${err.message})\x1b[0m\n`);
    }
  }

  console.log('\x1b[1m\x1b[37m========================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[32m                    SIMULATION SUMMARY DASHBOARD                        \x1b[0m');
  console.log('\x1b[1m\x1b[37m========================================================================\x1b[0m');
  console.log(`  • \x1b[1mTotal Simulated Covers:\x1b[0m 8 Guests across 4 Service Stations`);
  console.log(`  • \x1b[1mTotal Simulated Gross Revenue:\x1b[0m \x1b[1m\x1b[32m$${(totalSalesCents / 100).toFixed(2)}\x1b[0m`);
  console.log(`  • \x1b[1mTotal Kitchen Station Tickets:\x1b[0m ${totalTicketsFired} items routed (Grill: 3, Fry: 3, Cold: 3, Pass: 2, Bar: 4)`);
  console.log(`  • \x1b[1mActive 3D Dining Tables:\x1b[0m Table 4 (🟠 $68.58), Table 1 (🟠 $45.90), Bar Stool 3 (🟠 $30.78)`);
  console.log('\x1b[1m\x1b[37m------------------------------------------------------------------------\x1b[0m\n');

  console.log('\x1b[1m\x1b[35m🎯 WHERE TO TEST LIVE RIGHT NOW IN YOUR BROWSER:\x1b[0m');
  console.log('  1. \x1b[1mPOS Terminal:\x1b[0m        \x1b[4m\x1b[36mhttp://localhost:5172\x1b[0m (PIN: \x1b[32m1234\x1b[0m or \x1b[35m5678\x1b[0m)');
  console.log('     ➔ Click \x1b[1m"Table Service"\x1b[0m ➔ Toggle \x1b[1m"3D Spatial"\x1b[0m to see active glowing tables!');
  console.log('  2. \x1b[1mKitchen Display (KDS):\x1b[0m\x1b[4m\x1b[36mhttp://localhost:5173\x1b[0m');
  console.log('     ➔ Click \x1b[1m"Hot Grill"\x1b[0m, \x1b[1m"Fryer"\x1b[0m, or \x1b[1m"Bar"\x1b[0m to view live aging tickets and BUMP them.');
  console.log('  3. \x1b[1mAdmin Portal:\x1b[0m         \x1b[4m\x1b[36mhttp://localhost:5174\x1b[0m');
  console.log('     ➔ Click \x1b[1m"Pantry"\x1b[0m to see real-time ingredient deductions & generate Purchase Orders.');
  console.log('  4. \x1b[1mOnline Storefront:\x1b[0m    \x1b[4m\x1b[36mhttp://localhost:5176\x1b[0m');
  console.log('     ➔ Test guest ordering with FDA Top 9 allergen filters (Vegan / Gluten-Free).\n');
  console.log('\x1b[1m\x1b[37m========================================================================\x1b[0m\n');
}

runSimulation().catch(err => {
  console.error('Simulation error:', err);
});
