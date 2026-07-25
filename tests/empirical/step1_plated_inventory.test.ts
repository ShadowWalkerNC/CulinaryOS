import { describe, it, expect } from 'bun:test';
import { scaleBlueprint, RatioBlueprint } from '../../packages/ratio-engine/src/index';

// -------------------------------------------------------------------
// Step 1 Empirical Verification: Plated Inventory & Low-Stock Alerts
// -------------------------------------------------------------------

interface PantryItem {
  id: string;
  name: string;
  unit: string;
  current_qty: number;
  reorder_at: number;
  stock_status: 'ok' | 'low_stock' | 'out_of_stock';
}

function deriveStockStatus(currentQty: number, reorderAt: number): 'ok' | 'low_stock' | 'out_of_stock' {
  if (currentQty <= 0) return 'out_of_stock';
  if (currentQty <= reorderAt) return 'low_stock';
  return 'ok';
}

function computeAdminAlerts(items: PantryItem[]): PantryItem[] {
  return items.filter((item) => item.stock_status !== 'ok');
}

describe('Step 1: Plated Inventory Deduction Engine & Low-Stock Alerts', () => {
  const sourdoughBlueprint: RatioBlueprint = {
    id: 'r-1',
    name: 'Sourdough Boule',
    baseYield: 1,
    yieldUnit: 'loaf',
    ingredients: [
      { id: 'ing-flour', name: 'Unbleached Bread Flour', ratioWeight: 500, unit: 'g' },
      { id: 'ing-water', name: 'Filtered Water', ratioWeight: 375, unit: 'ml' },
      { id: 'ing-starter', name: 'Active Starter Culture', ratioWeight: 100, unit: 'g' },
      { id: 'ing-salt', name: 'Fine Sea Salt', ratioWeight: 10, unit: 'g' },
    ],
  };

  it('calculates ingredient stock decrement via ratio-engine on POS order completion', () => {
    const quantitySold = 4; // 4 loaves sold
    const scaledIngredients = scaleBlueprint(sourdoughBlueprint, quantitySold);

    expect(scaledIngredients.length).toBe(4);
    expect(scaledIngredients.find((i) => i.id === 'ing-flour')?.ratioWeight).toBe(2000); // 500g * 4 = 2000g = 2.0kg
    expect(scaledIngredients.find((i) => i.id === 'ing-water')?.ratioWeight).toBe(1500); // 375ml * 4 = 1500ml
    expect(scaledIngredients.find((i) => i.id === 'ing-starter')?.ratioWeight).toBe(400); // 100g * 4 = 400g
    expect(scaledIngredients.find((i) => i.id === 'ing-salt')?.ratioWeight).toBe(40); // 10g * 4 = 40g
  });

  it('updates pantry stock levels and triggers low-stock alert when stock falls below par threshold', () => {
    let pantry: PantryItem[] = [
      { id: 'ing-flour', name: 'Unbleached Bread Flour', unit: 'kg', current_qty: 12.5, reorder_at: 11.0, stock_status: 'ok' },
      { id: 'ing-starter', name: 'Active Starter Culture', unit: 'kg', current_qty: 2.2, reorder_at: 2.0, stock_status: 'ok' },
    ];

    // Initial alert status check
    let initialAlerts = computeAdminAlerts(pantry);
    expect(initialAlerts.length).toBe(0);

    // Simulate POS sale of 3 sourdough loaves
    const quantitySold = 3;
    const scaled = scaleBlueprint(sourdoughBlueprint, quantitySold);

    // Convert grams to kg for pantry deduction
    const flourDeductionKg = (scaled.find((i) => i.id === 'ing-flour')?.ratioWeight ?? 0) / 1000; // 1.5kg
    const starterDeductionKg = (scaled.find((i) => i.id === 'ing-starter')?.ratioWeight ?? 0) / 1000; // 0.3kg

    // Decrement pantry stock
    pantry = pantry.map((item) => {
      let deduction = 0;
      if (item.id === 'ing-flour') deduction = flourDeductionKg;
      if (item.id === 'ing-starter') deduction = starterDeductionKg;

      const newQty = Math.max(0, item.current_qty - deduction);
      return {
        ...item,
        current_qty: newQty,
        stock_status: deriveStockStatus(newQty, item.reorder_at),
      };
    });

    // Check updated values:
    // Flour: 12.5 - 1.5 = 11.0kg. Equal to reorder_at (11.0kg) -> low_stock!
    // Starter: 2.2 - 0.3 = 1.9kg. Below reorder_at (2.0kg) -> low_stock!
    const flour = pantry.find((i) => i.id === 'ing-flour')!;
    const starter = pantry.find((i) => i.id === 'ing-starter')!;

    expect(flour.current_qty).toBe(11.0);
    expect(flour.stock_status).toBe('low_stock');

    expect(starter.current_qty).toBeCloseTo(1.9);
    expect(starter.stock_status).toBe('low_stock');

    // Admin alerts should now trigger warning banner for 2 items needing restocking
    const activeAlerts = computeAdminAlerts(pantry);
    expect(activeAlerts.length).toBe(2);
    expect(activeAlerts.map((a) => a.name)).toContain('Unbleached Bread Flour');
    expect(activeAlerts.map((a) => a.name)).toContain('Active Starter Culture');
  });

  it('triggers out_of_stock status when inventory reaches 0 after sale', () => {
    let item: PantryItem = {
      id: 'ing-flour',
      name: 'Unbleached Bread Flour',
      unit: 'kg',
      current_qty: 1.0,
      reorder_at: 5.0,
      stock_status: 'low_stock',
    };

    // Sale requires 2.0kg flour
    const newQty = Math.max(0, item.current_qty - 2.0);
    item.stock_status = deriveStockStatus(newQty, item.reorder_at);

    expect(newQty).toBe(0);
    expect(item.stock_status).toBe('out_of_stock');
  });
});
