import { calculateModifierGroupPrices } from './packages/shared/src/modifiers.ts';
import { calculateMultiRateTax } from './packages/shared/src/tax.ts';

let failures = 0;
function check(label, actual, expected) {
  const ok = Object.is(actual, expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${actual}, want ${expected}`);
  if (!ok) failures++;
}

// --- A2: snake_case legacy payload (mirrors tests/shared/modifiers.test.ts 4b) ---
const legacyGroup = {
  id: 'grp-legacy', name: 'Legacy Add-Ons', required: false,
  min_selections: 0, max_selections: 3, free_quantity: 1,
  modifiers: [
    { id: 'mod-a', name: 'Bacon', price_adjustment: 250 },
    { id: 'mod-b', name: 'Egg', price_adjustment_cents: 200 },
  ],
};
const legacy = calculateModifierGroupPrices(legacyGroup, ['mod-a', 'mod-b']);
check('legacy[0].isFree', legacy[0].isFree, true);
check('legacy[0].effectivePriceCents', legacy[0].effectivePriceCents, 0);
check('legacy[1].isFree', legacy[1].isFree, false);
check('legacy[1].effectivePriceCents', legacy[1].effectivePriceCents, 200);

// --- A2 regression guard: camelCase first-N-free still works ---
const modernGroup = {
  id: 'grp-toppings', name: 'Toppings', required: false,
  minSelections: 0, maxSelections: 4, freeQuantity: 2,
  modifiers: [
    { id: 't1', name: 'Pepperoni', priceAdjustmentCents: 200 },
    { id: 't2', name: 'Mushrooms', priceAdjustmentCents: 150 },
    { id: 't3', name: 'Truffle', priceAdjustmentCents: 400 },
  ],
};
const modern = calculateModifierGroupPrices(modernGroup, ['t1', 't2', 't3']);
check('modern[0].effectivePriceCents', modern[0].effectivePriceCents, 0);
check('modern[1].effectivePriceCents', modern[1].effectivePriceCents, 0);
check('modern[2].effectivePriceCents', modern[2].effectivePriceCents, 400);

// --- A1: checkout tax parity (formula copied from edited CheckoutView) ---
function checkoutTotals(items, discountPercent, discountFlat) {
  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100)) + discountFlat;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxResult = calculateMultiRateTax(items.map((i) => ({
    name: i.name, station: i.station, category: i.category,
    lineTotalCents: i.line_total || (i.unit_price * (i.quantity || 1)),
  })));
  const ratio = subtotal > 0 ? taxableSubtotal / subtotal : 1;
  return { subtotal, taxableSubtotal, tax: Math.round(taxResult.totalTaxCents * ratio) };
}
function orderViewTotals(items, discountPercent, discountFlat) {
  const active = items.filter((i) => !i.is_voided);
  const taxResult = calculateMultiRateTax(active.map((i) => ({
    name: i.name, station: i.station, category: i.category,
    lineTotalCents: i.line_total || (i.unit_price * (i.quantity || 1)),
  })));
  const subtotal = taxResult.subtotalCents;
  const discountAmount = Math.round(subtotal * (discountPercent / 100)) + discountFlat;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const ratio = subtotal > 0 ? taxableSubtotal / subtotal : 1;
  return { subtotal, taxableSubtotal, tax: Math.round(taxResult.totalTaxCents * ratio) };
}

const basket = [
  { name: 'Prime Smash Cheeseburger', station: 'grill', category: undefined, line_total: 1650, unit_price: 1650, quantity: 1 },
  { name: 'Masons Brewing Local IPA (16oz)', station: 'bar', category: undefined, line_total: 800, unit_price: 800, quantity: 1 },
];
const co = checkoutTotals(basket, 10, 0);
const ov = orderViewTotals(basket, 10, 0);
check('parity subtotal', co.subtotal, ov.subtotal);
check('parity taxable', co.taxableSubtotal, ov.taxableSubtotal);
check('parity tax', co.tax, ov.tax);
const oldFlat = Math.round(co.taxableSubtotal * 0.1);
console.log(`INFO basket taxable=${co.taxableSubtotal} oldFlat10pct=${oldFlat} multiRate=${co.tax}`);
if (co.tax === oldFlat) { console.log('WARN multi-rate equals flat 10% on this basket (unexpected)'); failures++; }
check('multiRate tax value', co.tax, 194);

if (failures > 0) { console.log(`${failures} FAILURE(S)`); process.exit(1); }
console.log('ALL PROBE CHECKS PASSED');
