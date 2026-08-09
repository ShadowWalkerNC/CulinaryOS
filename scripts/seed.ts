/**
 * CulinaryOS — Demo seed
 * ---------------------------------------------------------------------------
 * Creates a reproducible single-tenant demo dataset (tenant + active menu with
 * sections, items and modifiers) so a fresh Supabase project can immediately
 * back the POS / KDS / Web apps.
 *
 * Idempotent: every write is an upsert keyed on a fixed UUID, so running it
 * repeatedly converges to the same state without creating duplicates.
 *
 * Usage:
 *   pnpm seed
 *
 * Requires (from .env or the environment):
 *   SUPABASE_URL                 - project URL (https://<ref>.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY    - service-role key (bypasses RLS for seeding)
 *
 * The tenant id matches VITE_TENANT_ID in .env.example so the frontends read
 * this data out of the box.
 */
import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Fixed ids — keep in sync with VITE_TENANT_ID in .env.example.
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const MENU_ID = '00000000-0000-0000-0000-0000000000a0';
const SECTION = {
  starters: '00000000-0000-0000-0000-0000000000b1',
  mains: '00000000-0000-0000-0000-0000000000b2',
};
const ITEM = {
  hummus: '00000000-0000-0000-0000-0000000000c1',
  calamari: '00000000-0000-0000-0000-0000000000c2',
  pizza: '00000000-0000-0000-0000-0000000000c3',
  burger: '00000000-0000-0000-0000-0000000000c4',
};
const GROUP = {
  sauce: '00000000-0000-0000-0000-0000000000d1',
  toppings: '00000000-0000-0000-0000-0000000000d2',
  cook: '00000000-0000-0000-0000-0000000000d3',
};

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
    fail('SUPABASE_URL is not set (or still the placeholder). Set it in .env before seeding.');
  }
  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.includes('your-service-role')) {
    fail(
      'SUPABASE_SERVICE_ROLE_KEY is not set (or still the placeholder).\n' +
        '  Copy it from the Supabase dashboard: Project Settings → API → service_role.\n' +
        '  Seeding must bypass RLS, which requires the service-role key.',
    );
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Seeding demo data into ${SUPABASE_URL} …`);

  // 1. Tenant
  await upsert(db, 'tenants', [
    { id: TENANT_ID, slug: 'demo', name: 'The Golden Fork', plan: 'pro', status: 'active' },
  ]);

  // 2. Menu (active so anon/public reads and the POS pick it up)
  await upsert(db, 'menus', [
    {
      id: MENU_ID,
      tenant_id: TENANT_ID,
      name: 'Dinner Menu',
      description: 'CulinaryOS demo dinner menu',
      status: 'active',
      published_at: new Date().toISOString(),
    },
  ]);

  // 3. Sections
  await upsert(db, 'menu_sections', [
    { id: SECTION.starters, menu_id: MENU_ID, tenant_id: TENANT_ID, name: 'Starters', sort_order: 1 },
    { id: SECTION.mains, menu_id: MENU_ID, tenant_id: TENANT_ID, name: 'Mains', sort_order: 2 },
  ]);

  // 4. Items (price in cents)
  await upsert(db, 'menu_items', [
    { id: ITEM.hummus, section_id: SECTION.starters, tenant_id: TENANT_ID, name: 'Truffle Hummus & Pita', description: 'Whipped chickpea, black truffle, warm pita', price: 950, status: 'available', station: 'cold', allergens: ['gluten', 'sesame'], sort_order: 1 },
    { id: ITEM.calamari, section_id: SECTION.starters, tenant_id: TENANT_ID, name: 'Crispy Calamari', description: 'Flash-fried, lemon, herb aioli', price: 1400, status: 'available', station: 'fry', allergens: ['gluten', 'seafood'], sort_order: 2 },
    { id: ITEM.pizza, section_id: SECTION.mains, tenant_id: TENANT_ID, name: 'Wood-Fired Margherita Pizza', description: 'San Marzano, fresh mozzarella, basil', price: 1650, status: 'available', station: 'pass', allergens: ['gluten', 'dairy'], sort_order: 1 },
    { id: ITEM.burger, section_id: SECTION.mains, tenant_id: TENANT_ID, name: 'Prime Bistro Burger', description: 'Dry-aged beef, aged cheddar, brioche', price: 1850, status: 'available', station: 'grill', allergens: ['gluten', 'dairy'], sort_order: 2 },
  ]);

  // 5. Modifier groups
  await upsert(db, 'modifier_groups', [
    { id: GROUP.sauce, menu_item_id: ITEM.calamari, name: 'Extra Dipping Sauce', required: false, min_selections: 0, max_selections: 2, sort_order: 1 },
    { id: GROUP.toppings, menu_item_id: ITEM.pizza, name: 'Add Toppings', required: false, min_selections: 0, max_selections: 4, sort_order: 1 },
    { id: GROUP.cook, menu_item_id: ITEM.burger, name: 'Meat Preparation', required: true, min_selections: 1, max_selections: 1, sort_order: 1 },
  ]);

  // 6. Modifiers (price_adjustment in cents)
  await upsert(db, 'modifiers', [
    { id: '00000000-0000-0000-0000-0000000000e1', modifier_group_id: GROUP.sauce, name: 'Spicy Aioli', price_adjustment: 150, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e2', modifier_group_id: GROUP.sauce, name: 'Garlic Aioli', price_adjustment: 0, is_default: true },
    { id: '00000000-0000-0000-0000-0000000000e3', modifier_group_id: GROUP.toppings, name: 'Prosciutto di Parma', price_adjustment: 400, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e4', modifier_group_id: GROUP.toppings, name: 'Wild Mushrooms', price_adjustment: 250, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e5', modifier_group_id: GROUP.toppings, name: 'Extra Mozzarella', price_adjustment: 200, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e6', modifier_group_id: GROUP.cook, name: 'Medium Rare', price_adjustment: 0, is_default: true },
    { id: '00000000-0000-0000-0000-0000000000e7', modifier_group_id: GROUP.cook, name: 'Medium', price_adjustment: 0, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e8', modifier_group_id: GROUP.cook, name: 'Well Done', price_adjustment: 0, is_default: false },
  ]);

  // Summary
  const [{ count: items }, { count: mods }] = await Promise.all([
    db.from('menu_items').select('*', { count: 'exact', head: true }).eq('tenant_id', TENANT_ID),
    db.from('modifiers').select('*', { count: 'exact', head: true }),
  ]);

  console.log('\n✔ Seed complete');
  console.log(`  tenant   : ${TENANT_ID} (The Golden Fork)`);
  console.log(`  menu     : Dinner Menu [active]`);
  console.log(`  items    : ${items ?? '?'}`);
  console.log(`  modifiers: ${mods ?? '?'}`);
}

async function upsert(
  db: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
) {
  // Cast: seeding runs against an untyped schema, so supabase-js infers `never`.
  const { error } = await db.from(table).upsert(rows as never, { onConflict: 'id' });
  if (error) fail(`Failed to seed ${table}: ${error.message}`);
  console.log(`  • ${table}: ${rows.length} row(s) upserted`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
