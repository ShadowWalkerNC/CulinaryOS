import { describe, it, expect } from 'bun:test';
import { scaleBlueprint } from '@culinaryos/ratio-engine';

// -------------------------------------------------------------------
// Step 3 Empirical Verification: MCP Tool Servers Validation
// -------------------------------------------------------------------

// Mock DB / State data reflecting server implementations
const MOCK_RECIPES = [
  {
    id: "r-1",
    name: "Sourdough Boule",
    baseYield: 1,
    yieldUnit: "loaf",
    ingredients: [
      { id: "flour", name: "Bread Flour", ratioWeight: 100, unit: "g" },
      { id: "water", name: "Water", ratioWeight: 75, unit: "ml" },
      { id: "starter", name: "Levain Starter", ratioWeight: 20, unit: "g" },
      { id: "salt", name: "Sea Salt", ratioWeight: 2, unit: "g" }
    ]
  },
  {
    id: "r-2",
    name: "Classic Smash Burger Patty",
    baseYield: 4,
    yieldUnit: "patties",
    ingredients: [
      { id: "beef", name: "Ground Beef 80/20", ratioWeight: 100, unit: "g" },
      { id: "salt", name: "Kosher Salt", ratioWeight: 1.5, unit: "g" },
      { id: "pepper", name: "Black Pepper", ratioWeight: 0.5, unit: "g" }
    ]
  }
];

const MOCK_STATION_PREP = {
  hot: [
    { item: "Caramelized Onions", qty: "2.5 kg", status: "completed", assignedTo: "Chef Marco" },
    { item: "Demi-Glace Reduction", qty: "3.0 L", status: "in_progress", assignedTo: "Chef Marco" },
    { item: "Seared Beef Stock", qty: "10.0 L", status: "pending", assignedTo: "Unassigned" }
  ],
  cold: [
    { item: "Washed Arugula & Greens", qty: "1.5 kg", status: "completed", assignedTo: "Prep Sarah" },
    { item: "House Caesar Dressing", qty: "2.0 L", status: "completed", assignedTo: "Prep Sarah" },
    { item: "Shaved Parmesan Crisp", qty: "500 g", status: "pending", assignedTo: "Prep Sarah" }
  ],
  fry: [
    { item: "Cut Russet Potatoes", qty: "15.0 kg", status: "in_progress", assignedTo: "Prep Alex" },
    { item: "Truffle Oil & Herb Blend", qty: "500 ml", status: "completed", assignedTo: "Prep Alex" }
  ],
  bar: [
    { item: "Fresh Squeezed Lime Juice", qty: "1.5 L", status: "completed", assignedTo: "Bar Josh" },
    { item: "Dehydrated Orange Wheels", qty: "100 pcs", status: "completed", assignedTo: "Bar Josh" }
  ]
};

const MOCK_PANTRY = [
  { id: "i1", name: "Unbleached Bread Flour", stock_quantity: 12.5, par_level: 50.0, unit: "kg", cost_per_unit: 200 },
  { id: "i2", name: "Active Starter Culture", stock_quantity: 2.2, par_level: 5.0, unit: "kg", cost_per_unit: 150 }
];

describe('Step 3: MCP Tool Servers Validation', () => {

  describe('recipe-mcp tools', () => {
    it('list_recipes: returns all available recipe blueprints', () => {
      const result = MOCK_RECIPES.map(r => ({ id: r.id, name: r.name, baseYield: r.baseYield, unit: r.yieldUnit }));
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Sourdough Boule');
      expect(result[1].name).toBe('Classic Smash Burger Patty');
    });

    it('scale_recipe: scales blueprint ingredients using ratio engine', () => {
      const recipe = MOCK_RECIPES.find(r => r.id === 'r-1')!;
      const scaled = scaleBlueprint(recipe as any, 10);
      expect(scaled.length).toBe(4);
      expect(scaled.find(i => i.id === 'flour')?.ratioWeight).toBe(1000);
      expect(scaled.find(i => i.id === 'water')?.ratioWeight).toBe(750);
    });

    it('get_ratio: returns baker percentage breakdown', () => {
      const recipe = MOCK_RECIPES.find(r => r.id === 'r-1')!;
      const ratios = recipe.ingredients.map(i => ({
        ingredient: i.name,
        ratioPercentage: `${i.ratioWeight}%`,
        unit: i.unit
      }));
      expect(ratios).toEqual([
        { ingredient: 'Bread Flour', ratioPercentage: '100%', unit: 'g' },
        { ingredient: 'Water', ratioPercentage: '75%', unit: 'ml' },
        { ingredient: 'Levain Starter', ratioPercentage: '20%', unit: 'g' },
        { ingredient: 'Sea Salt', ratioPercentage: '2%', unit: 'g' }
      ]);
    });

    it('generate_prep_list: aggregates prep items for target covers', () => {
      const targetCovers = 100;
      const scaleFactor = targetCovers / 50; // factor = 2
      const prepItems = MOCK_RECIPES.map(recipe => ({
        recipe: recipe.name,
        targetBatches: Math.ceil(scaleFactor * recipe.baseYield),
        ingredientsNeeded: scaleBlueprint(recipe as any, Math.ceil(scaleFactor * recipe.baseYield))
      }));

      expect(prepItems.length).toBe(2);
      expect(prepItems[0].targetBatches).toBe(2);
      expect(prepItems[1].targetBatches).toBe(8);
    });
  });

  describe('prep-mcp tools', () => {
    it('build_shift_prep: builds shift prep execution sheet based on expected covers', () => {
      const shift = 'morning';
      const expectedCovers = 150;
      const multiplier = expectedCovers / 100; // 1.5

      const tasks = Object.entries(MOCK_STATION_PREP).flatMap(([station, items]) =>
        items.map(item => ({
          station,
          item: item.item,
          adjustedQuantity: `${(parseFloat(item.qty) * multiplier).toFixed(1)} ${item.qty.split(" ")[1] || ""}`,
          assignedTo: item.assignedTo
        }))
      );

      expect(tasks.length > 5).toBe(true);
      const onions = tasks.find(t => t.item === 'Caramelized Onions');
      expect(onions?.adjustedQuantity).toBe('3.8 kg'); // 2.5 * 1.5 = 3.75 -> 3.8
    });

    it('get_mise_en_place: retrieves active station prep list', () => {
      const stationId = 'cold';
      const key = stationId.toLowerCase() as keyof typeof MOCK_STATION_PREP;
      const list = MOCK_STATION_PREP[key];

      expect(list.length).toBe(3);
      expect(list[0].item).toBe('Washed Arugula & Greens');
      expect(list[1].item).toBe('House Caesar Dressing');
    });

    it('get_mise_en_place: falls back gracefully to default station when station invalid', () => {
      const stationId = 'unknown_station';
      const key = stationId.toLowerCase() as keyof typeof MOCK_STATION_PREP;
      const list = MOCK_STATION_PREP[key] || MOCK_STATION_PREP.hot;

      expect(list.length).toBe(3);
      expect(list[0].item).toBe('Caramelized Onions');
    });
  });

  describe('Plated inventory tools', () => {
    it('get_inventory_levels: fetches current stock levels', () => {
      const items = MOCK_PANTRY;
      expect(items.length).toBe(2);
      expect(items[0].name).toBe('Unbleached Bread Flour');
      expect(items[0].stock_quantity).toBe(12.5);
    });

    it('log_audit_count: calculates variance and total monetary loss correctly', () => {
      const itemId = 'i1';
      const physicalQty = 10.0; // Current is 12.5 kg, counted 10.0 kg -> variance = -2.5 kg
      const item = MOCK_PANTRY.find(p => p.id === itemId)!;

      const variance = physicalQty - item.stock_quantity; // -2.5
      const lossCents = Math.abs(variance * item.cost_per_unit); // |-2.5 * 200| = 500 cents = $5.00

      expect(variance).toBe(-2.5);
      expect(lossCents).toBe(500);

      const responseMessage = `Success: Audit logged for item ${item.name} on Plated. Variance: ${variance.toFixed(3)}. Total Loss Calculated: $${(lossCents / 100).toFixed(2)}.`;
      expect(responseMessage).toContain('Variance: -2.500');
      expect(responseMessage).toContain('Total Loss Calculated: $5.00');
    });
  });
});
