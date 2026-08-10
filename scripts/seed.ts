/**
 * CulinaryOS local seed helper.
 *
 * Idempotent, single-tenant demo seed. Two interchangeable paths:
 *
 *   1. DATABASE_URL present  → apply the SQL seed files via `pg`
 *        (base_tenant.sql → menu.sql → demo.sql)
 *   2. no DATABASE_URL, but SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY present
 *        → seed via the Supabase service-role REST client (bypasses RLS)
 *
 * Use path 2 when you only have Supabase API keys (no raw Postgres password).
 *
 * Usage:
 *   pnpm seed
 *   DATABASE_URL=postgresql://... pnpm seed
 *
 * The tenant id matches VITE_TENANT_ID in .env.example, so the frontends read
 * this data out of the box.
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// SQL files applied (in order) by the DATABASE_URL path.
const SQL_FILES = ['base_tenant.sql', 'menu.sql', 'demo.sql'];

async function seedViaPostgres(url: string) {
  let pg: typeof import('pg') | null = null;
  try {
    pg = await import('pg');
  } catch {
    console.error('[seed] `pg` is required for the DATABASE_URL path: pnpm add -Dw pg');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const name of SQL_FILES) {
      const file = resolve(root, 'supabase/seeds', name);
      if (!existsSync(file)) continue;
      console.log(`[seed] Applying supabase/seeds/${name} …`);
      await client.query(readFileSync(file, 'utf8'));
    }
    console.log('[seed] Done (Postgres).');
  } finally {
    await client.end();
  }
}

async function seedViaServiceRole(url: string, key: string) {
  let mod: typeof import('@supabase/supabase-js') | null = null;
  try {
    mod = await import('@supabase/supabase-js');
  } catch {
    console.error('[seed] `@supabase/supabase-js` is required for the service-role path.');
    process.exit(1);
  }
  const db = mod.createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const upsert = async (table: string, rows: Record<string, unknown>[]) => {
    const { error } = await db.from(table).upsert(rows as never, { onConflict: 'id' });
    if (error) {
      console.error(`[seed] Failed to seed ${table}: ${error.message}`);
      process.exit(1);
    }
    console.log(`[seed]   • ${table}: ${rows.length} row(s)`);
  };

  console.log(`[seed] Seeding via Supabase service-role REST → ${url}`);
  await upsert('tenants', [
    { id: TENANT_ID, slug: 'golden-fork', name: 'The Golden Fork', plan: 'pro', status: 'active' },
  ]);
  await upsert('menus', [
    { id: '00000000-0000-0000-0000-0000000000a0', tenant_id: TENANT_ID, name: 'Dinner Menu', description: 'CulinaryOS demo dinner menu', status: 'active', published_at: new Date().toISOString() },
  ]);
  await upsert('menu_sections', [
    { id: '00000000-0000-0000-0000-0000000000b1', menu_id: '00000000-0000-0000-0000-0000000000a0', tenant_id: TENANT_ID, name: 'Starters', sort_order: 1 },
    { id: '00000000-0000-0000-0000-0000000000b2', menu_id: '00000000-0000-0000-0000-0000000000a0', tenant_id: TENANT_ID, name: 'Mains', sort_order: 2 },
  ]);
  await upsert('menu_items', [
    { id: '00000000-0000-0000-0000-0000000000c1', section_id: '00000000-0000-0000-0000-0000000000b1', tenant_id: TENANT_ID, name: 'Truffle Hummus & Pita', description: 'Whipped chickpea, black truffle, warm pita', price: 950, status: 'available', station: 'cold', allergens: ['gluten', 'sesame'], sort_order: 1 },
    { id: '00000000-0000-0000-0000-0000000000c2', section_id: '00000000-0000-0000-0000-0000000000b1', tenant_id: TENANT_ID, name: 'Crispy Calamari', description: 'Flash-fried, lemon, herb aioli', price: 1400, status: 'available', station: 'fry', allergens: ['gluten', 'seafood'], sort_order: 2 },
    { id: '00000000-0000-0000-0000-0000000000c3', section_id: '00000000-0000-0000-0000-0000000000b2', tenant_id: TENANT_ID, name: 'Wood-Fired Margherita Pizza', description: 'San Marzano, fresh mozzarella, basil', price: 1650, status: 'available', station: 'pass', allergens: ['gluten', 'dairy'], sort_order: 1 },
    { id: '00000000-0000-0000-0000-0000000000c4', section_id: '00000000-0000-0000-0000-0000000000b2', tenant_id: TENANT_ID, name: 'Prime Bistro Burger', description: 'Dry-aged beef, aged cheddar, brioche', price: 1850, status: 'available', station: 'grill', allergens: ['gluten', 'dairy'], sort_order: 2 },
  ]);
  await upsert('modifier_groups', [
    { id: '00000000-0000-0000-0000-0000000000d1', menu_item_id: '00000000-0000-0000-0000-0000000000c2', name: 'Extra Dipping Sauce', required: false, min_selections: 0, max_selections: 2, sort_order: 1 },
    { id: '00000000-0000-0000-0000-0000000000d2', menu_item_id: '00000000-0000-0000-0000-0000000000c3', name: 'Add Toppings', required: false, min_selections: 0, max_selections: 4, sort_order: 1 },
    { id: '00000000-0000-0000-0000-0000000000d3', menu_item_id: '00000000-0000-0000-0000-0000000000c4', name: 'Meat Preparation', required: true, min_selections: 1, max_selections: 1, sort_order: 1 },
  ]);
  await upsert('modifiers', [
    { id: '00000000-0000-0000-0000-0000000000e1', modifier_group_id: '00000000-0000-0000-0000-0000000000d1', name: 'Spicy Aioli', price_adjustment: 150, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e2', modifier_group_id: '00000000-0000-0000-0000-0000000000d1', name: 'Garlic Aioli', price_adjustment: 0, is_default: true },
    { id: '00000000-0000-0000-0000-0000000000e3', modifier_group_id: '00000000-0000-0000-0000-0000000000d2', name: 'Prosciutto di Parma', price_adjustment: 400, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e4', modifier_group_id: '00000000-0000-0000-0000-0000000000d2', name: 'Wild Mushrooms', price_adjustment: 250, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e5', modifier_group_id: '00000000-0000-0000-0000-0000000000d2', name: 'Extra Mozzarella', price_adjustment: 200, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e6', modifier_group_id: '00000000-0000-0000-0000-0000000000d3', name: 'Medium Rare', price_adjustment: 0, is_default: true },
    { id: '00000000-0000-0000-0000-0000000000e7', modifier_group_id: '00000000-0000-0000-0000-0000000000d3', name: 'Medium', price_adjustment: 0, is_default: false },
    { id: '00000000-0000-0000-0000-0000000000e8', modifier_group_id: '00000000-0000-0000-0000-0000000000d3', name: 'Well Done', price_adjustment: 0, is_default: false },
  ]);
  await seedDemoStaff(db, TENANT_ID);
  console.log('[seed] Done (Supabase service-role). Note: this path seeds tenant + menu; run the SQL path with DATABASE_URL for pantry/recipe demo data too.');
}

/** Create Auth users + tenant_users + staff_pins for demo PINs 1234 / 5678. */
async function seedDemoStaff(
  db: import('@supabase/supabase-js').SupabaseClient,
  tenantId: string
) {
  // Dynamic import of pin hasher (mirrors apps/server/src/lib/pin.ts)
  const { randomBytes, scryptSync } = await import('node:crypto');
  const hashPin = (pin: string) => {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(pin, salt, 32).toString('hex');
    return `${salt}:${hash}`;
  };

  const staff = [
    {
      email: 'server@demo.culinaryos.local',
      pin: '1234',
      displayName: 'John Doe',
      role: 'server',
    },
    {
      email: 'manager@demo.culinaryos.local',
      pin: '5678',
      displayName: 'Jane Smith',
      role: 'manager',
    },
  ];

  console.log('[seed] Ensuring demo Auth users + staff_pins …');
  for (const s of staff) {
    let userId: string | undefined;

    const listed = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = listed.data?.users?.find(
      (u) => u.email?.toLowerCase() === s.email.toLowerCase()
    );

    if (existing) {
      userId = existing.id;
      await db.auth.admin.updateUserById(userId, {
        password: s.pin,
        email_confirm: true,
        user_metadata: { display_name: s.displayName, tenant_id: tenantId },
      });
    } else {
      const { data, error } = await db.auth.admin.createUser({
        email: s.email,
        password: s.pin,
        email_confirm: true,
        user_metadata: { display_name: s.displayName, tenant_id: tenantId },
      });
      if (error || !data.user) {
        console.warn(`[seed] Auth user ${s.email}: ${error?.message ?? 'failed'}`);
        continue;
      }
      userId = data.user.id;
    }

    const { error: tuErr } = await db.from('tenant_users').upsert(
      { tenant_id: tenantId, user_id: userId, role: s.role },
      { onConflict: 'tenant_id,user_id' }
    );
    if (tuErr) console.warn(`[seed] tenant_users ${s.email}: ${tuErr.message}`);

    const { error: pinErr } = await db.from('staff_pins').upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        pin_hash: hashPin(s.pin),
        display_name: s.displayName,
        active: true,
      },
      { onConflict: 'tenant_id,user_id' }
    );
    if (pinErr) {
      console.warn(
        `[seed] staff_pins ${s.email}: ${pinErr.message} (apply V14 migration if missing)`
      );
    } else {
      console.log(`[seed]   • staff ${s.displayName} PIN ${s.pin} (${s.role})`);
    }
  }
}

async function main() {
  const base = resolve(root, 'supabase/seeds/base_tenant.sql');
  if (!existsSync(base)) {
    console.error('Missing supabase/seeds/base_tenant.sql');
    process.exit(1);
  }

  if (databaseUrl) {
    await seedViaPostgres(databaseUrl);
    // Also seed Auth staff when service role is available
    const supabaseReady =
      supabaseUrl && !supabaseUrl.includes('your-project') &&
      serviceRoleKey && !serviceRoleKey.includes('your-service-role');
    if (supabaseReady) {
      const mod = await import('@supabase/supabase-js');
      const db = mod.createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await seedDemoStaff(db, TENANT_ID);
    }
    return;
  }

  const supabaseReady =
    supabaseUrl && !supabaseUrl.includes('your-project') &&
    serviceRoleKey && !serviceRoleKey.includes('your-service-role');

  if (supabaseReady) {
    await seedViaServiceRole(supabaseUrl, serviceRoleKey);
    return;
  }

  console.log(`
[seed] No seeding credentials found.

Provide EITHER:
  • DATABASE_URL=postgresql://...            (applies base_tenant.sql → menu.sql → demo.sql)
  • SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (seeds tenant + menu via the service-role API)

Typical flow:
  1. Create a Supabase project (or run \`supabase start\`)
  2. cp .env.example .env and fill SUPABASE_* (+ DATABASE_URL for the full SQL seed)
  3. pnpm db:migrate
  4. pnpm seed

Without any backend, POS → KDS still works in demo mode via the API mock kitchen store.
`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] Failed:', err?.message ?? err);
  process.exit(1);
});
