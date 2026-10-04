import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { createCulinaryClient, CulinaryOSClient } from '../../packages/sdk/src/index';

describe('@culinaryos/sdk Client Suite', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  let client: CulinaryOSClient;
  let lastRequest: { url: string; options: any } | null = null;

  beforeEach(() => {
    lastRequest = null;
    // Mock global fetch
    globalThis.fetch = (async (url: string | URL | Request, options?: any) => {
      lastRequest = { url: String(url), options };
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ success: true, data: { echoed: true } }),
      } as any;
    }) as any;

    client = createCulinaryClient({
      baseUrl: 'http://localhost:3000',
      tenantId,
      apiKey: 'test-key',
    });
  });

  it('initializes with tenantId and attaches headers', async () => {
    expect(client.tenantId).toBe(tenantId);
    expect(client.baseUrl).toBe('http://localhost:3000');

    await client.menu.list();
    expect(lastRequest).not.toBeNull();
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/menu');
    expect(lastRequest!.options.headers['X-Tenant-Id']).toBe(tenantId);
    expect(lastRequest!.options.headers['x-internal-key']).toBe('test-key');
  });

  it('supports menu domain queries', async () => {
    await client.menu.get('item-123');
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/menu/item-123');

    await client.menu.get();
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/menu');
  });

  it('supports inventory and pantry adjustments', async () => {
    await client.inventory.list();
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/pantry/items');

    await client.inventory.get('ing-flour');
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/pantry/items/ing-flour');

    await client.inventory.adjust({
      itemId: 'ing-flour',
      amountChangeGrams: -500,
      reason: 'prep_shift',
    });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/pantry/adjust');
    expect(lastRequest!.options.method).toBe('POST');
    const body = JSON.parse(lastRequest!.options.body);
    expect(body.itemId).toBe('ing-flour');
    expect(body.amountChangeGrams).toBe(-500);
  });

  it('supports prep task querying and recipe lookups', async () => {
    await client.prep.tasks.list({ shift: 'dinner' });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/ops/prep-tasks?shift=dinner');

    await client.prep.recipes.get('rec-sourdough');
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/ops/recipes/rec-sourdough');
  });

  it('supports marketing campaign post scheduling', async () => {
    await client.marketing.posts.schedule({
      channel: 'instagram',
      content: 'Chef Gabriel special dinner tonight!',
      scheduledAt: '2026-10-04T18:00:00Z',
    });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/marketing/posts');
    expect(lastRequest!.options.method).toBe('POST');
    const body = JSON.parse(lastRequest!.options.body);
    expect(body.channel).toBe('instagram');
  });

  it('supports analytics report querying', async () => {
    await client.analytics.query({ date: '2026-10-04' });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/reports/sales?date=2026-10-04');
  });

  it('supports order creation', async () => {
    await client.orders.create({
      table_number: '12',
      guest_count: 4,
      items: [{ item_id: 'burger', quantity: 2 }],
    });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/orders');
    expect(lastRequest!.options.method).toBe('POST');
  });

  it('supports ops waste logging', async () => {
    await client.ops.waste.log({
      ingredient: 'Ribeye Steak',
      quantity_grams: 500,
      reason: 'burned',
      cost_per_gram: 0.05,
    });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/ops/waste');
    expect(lastRequest!.options.method).toBe('POST');
    const body = JSON.parse(lastRequest!.options.body);
    expect(body.ingredient).toBe('Ribeye Steak');
    expect(body.quantity_grams).toBe(500);
    expect(body.reason).toBe('burned');
  });

  it('supports ops waste listing', async () => {
    await client.ops.waste.list();
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/ops/waste');

    await client.ops.waste.list({ from: '2026-10-01', to: '2026-10-04' });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/ops/waste?from=2026-10-01&to=2026-10-04');
  });

  it('supports ops food-cost variance calculation', async () => {
    await client.ops.foodCost.calculateVariance({ from: '2026-10-01', to: '2026-10-04' });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/ops/food-cost/variance');
    expect(lastRequest!.options.method).toBe('POST');
    const body = JSON.parse(lastRequest!.options.body);
    expect(body.from).toBe('2026-10-01');
    expect(body.to).toBe('2026-10-04');
  });

  it('supports ops plate economics lookup', async () => {
    await client.ops.plateEconomics.get();
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/ops/plate-economics');

    await client.ops.plateEconomics.get({ order_id: 'order-123' });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/ops/plate-economics?order_id=order-123');
  });

  it('supports intelligence routing, skills, and approval decisions', async () => {
    await client.intelligence.route('what is the margin on burger?');
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/intelligence/route');
    expect(lastRequest!.options.method).toBe('POST');
    const routeBody = JSON.parse(lastRequest!.options.body);
    expect(routeBody.query).toBe('what is the margin on burger?');

    await client.intelligence.skills.list();
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/intelligence/skills');

    await client.intelligence.skills.run('recipe-costing', { recipeId: 'rec-1' });
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/intelligence/skills/recipe-costing/run');
    expect(lastRequest!.options.method).toBe('POST');

    await client.intelligence.approvals.list();
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/intelligence/approvals');

    await client.intelligence.approvals.decide('app-1', 'approved', 'Chef approved');
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/intelligence/approvals/app-1/decide');
    expect(lastRequest!.options.method).toBe('POST');
    const decisionBody = JSON.parse(lastRequest!.options.body);
    expect(decisionBody.decision).toBe('approved');
  });

  it('supports hardware drivers, ESC/POS builder, and offline coordinator', async () => {
    const builder = client.hardware.createEscposBuilder();
    builder.line('SDK TEST PRINT').cut();
    const bytes = builder.build();
    expect(bytes.length).toBeGreaterThan(0);

    const printer = client.hardware.createLoopbackPrinter('SDK Virtual Printer');
    const status = await printer.status();
    expect(status.connected).toBe(true);

    const printSuccess = await printer.printRaw(bytes);
    expect(printSuccess).toBe(true);

    const kicked = await printer.kickDrawer(2);
    expect(kicked).toBe(true);
    expect(printer.getDrawerKickCount()).toBe(1);

    const coordinator = client.hardware.createOfflineCoordinator({ kitchenPrinter: printer });
    expect(coordinator.getPendingCount()).toBe(0);
  });

  it('supports Shoreline Care OS clinical nutrition integration with HIPAA isolation', async () => {
    const shoreline = client.integrations.shoreline;

    // 1. Dietary standard checks
    expect(shoreline.isCardiacLowSodium({ calories: 350, proteinGrams: 25, carbsGrams: 30, fatGrams: 10, sodiumMg: 120 })).toBe(true);
    expect(shoreline.isCardiacLowSodium({ calories: 350, proteinGrams: 25, carbsGrams: 30, fatGrams: 10, sodiumMg: 450 })).toBe(false);

    expect(shoreline.isDiabeticCompliant({ calories: 400, proteinGrams: 30, carbsGrams: 35, fatGrams: 12, sodiumMg: 200 })).toBe(true);
    expect(shoreline.isDiabeticCompliant({ calories: 400, proteinGrams: 30, carbsGrams: 65, fatGrams: 12, sodiumMg: 200 })).toBe(false);

    // 2. Allergen conflict detection
    const recipes = [
      { recipeId: 'rec-1', recipeName: 'Peanut Crusted Salmon', allergens: ['fish', 'peanuts'] as any },
      { recipeId: 'rec-2', recipeName: 'Steamed Broccoli', allergens: [] as any },
    ];
    const conflicts = shoreline.checkAllergenConflicts(recipes, ['peanuts', 'tree_nuts'] as any);
    expect(conflicts).toHaveLength(2);
    expect(conflicts[0]!.containsAllergen).toBe(true);
    expect(conflicts[0]!.matchingAllergens).toEqual(['peanuts']);
    expect(conflicts[1]!.containsAllergen).toBe(false);

    // 3. Sanitized export dispatch
    const exportData = {
      recipeId: 'rec-101',
      recipeName: 'Herb Grilled Chicken Breast',
      servingSizeGrams: 180,
      macros: {
        calories: 220,
        proteinGrams: 38,
        carbsGrams: 2,
        fatGrams: 6,
        sodiumMg: 115,
      },
      allergens: [],
      dietaryTags: ['cardiac_low_sodium', 'diabetic_compliant', 'gluten_free'] as any,
      ingredientsList: ['Chicken Breast', 'Olive Oil', 'Rosemary', 'Thyme', 'Black Pepper'],
      exportedAt: '2026-10-04T12:00:00Z',
    };

    const result = await shoreline.exportToShoreline(exportData);
    expect(result.success).toBe(true);
    expect(result.syncedRecipeId).toBe('rec-101');
    expect(lastRequest!.url).toBe('http://localhost:3000/v1/integrations/shoreline/sync');
    expect(lastRequest!.options.method).toBe('POST');

    const sentPayload = JSON.parse(lastRequest!.options.body);
    expect(sentPayload.recipeName).toBe('Herb Grilled Chicken Breast');
    expect(sentPayload.macros.sodiumMg).toBe(115);
  });
});


