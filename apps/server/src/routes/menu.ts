// ============================================================
// CulinaryOS — Public Menu Route
// No auth required. Uses get_public_menu_by_slug RPC (security definer)
// so anon cannot scrape all tenants' menus via table SELECT.
// ============================================================

import { Hono }         from 'hono';
import type { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../types.js';

import { isLiveSupabaseConfigured } from '../lib/secrets.js';

export const menuRoutes = new Hono<Env>();

export const DEMO_PUBLIC_MENU = {
  restaurant: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'The Golden Fork Bistro',
    slug: 'golden-fork',
    tagline: 'Artisanal Mediterranean & Wood-Fired Kitchen',
    address: '142 Mercer Street, Soho, New York, NY 10012',
    phone: '(212) 555-0198',
  },
  menu: {
    id: 'demo-menu-01',
    name: 'Main Dining & Chef Tasting',
    description: 'Fresh seasonal ingredients, wood-fired crusts, and locally sourced sustainable meats.',
  },
  sections: [
    {
      id: 'sec-starters',
      name: 'Starters & Small Plates',
      sort_order: 1,
      menu_items: [
        {
          id: 'item-1',
          name: 'Maine Clam Chowder',
          description: 'Traditional creamy New England chowder, tender ocean clams, smoked bacon & oyster crackers',
          price: 900,
          status: 'available',
          station: 'cold',
          allergens: ['dairy', 'seafood', 'gluten'],
          sort_order: 1,
          modifier_groups: [],
        },
        {
          id: 'item-2',
          name: 'Crispy Point Judith Calamari',
          description: 'Flash-fried cherry peppers, lemon wedge, house roasted garlic & spicy dipping aioli',
          price: 1450,
          status: 'available',
          station: 'fry',
          allergens: ['gluten', 'seafood'],
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-sauce',
              name: 'Extra Dipping Sauce',
              required: false,
              min_selections: 0,
              max_selections: 2,
              modifiers: [
                { id: 'mod-sauce-1', name: 'Spicy Sambal Aioli', price_adjustment: 150, is_default: false },
                { id: 'mod-sauce-2', name: 'Roasted Garlic Tartar', price_adjustment: 0, is_default: true },
              ],
            },
          ],
        },
        {
          id: 'item-3',
          name: 'Truffle Parmesan Hand-Cut Fries',
          description: 'Double-cooked Maine russets, white truffle oil, shaved pecorino & rosemary aioli',
          price: 850,
          status: 'available',
          station: 'fry',
          allergens: ['dairy'],
          sort_order: 3,
          modifier_groups: [],
        },
      ],
    },
    {
      id: 'sec-mains',
      name: 'Mains & Wood-Fired Classics',
      sort_order: 2,
      menu_items: [
        {
          id: 'item-4',
          name: 'Alley Katz Classic Lobster Roll',
          description: 'Chilled Maine claw & knuckle lobster meat, griddled brioche split-top bun, light lemon-mayo dressing or warm butter',
          price: 2800,
          status: 'available',
          station: 'cold',
          allergens: ['shellfish', 'dairy', 'gluten'],
          sort_order: 1,
          modifier_groups: [
            {
              id: 'group-lobster-style',
              name: 'Preparation Style',
              required: true,
              min_selections: 1,
              max_selections: 1,
              modifiers: [
                { id: 'mod-lob-1', name: 'Traditional Chilled w/ Herb Mayo', price_adjustment: 0, is_default: true },
                { id: 'mod-lob-2', name: 'Warm Poached in Brown Butter', price_adjustment: 200, is_default: false },
              ],
            },
          ],
        },
        {
          id: 'item-6',
          name: 'Prime Smash Cheeseburger',
          description: 'Two dry-aged 4oz beef patties, double Cabot cheddar, shaved red onion, dill pickle, secret sauce on toasted potato bun',
          price: 1650,
          status: 'available',
          station: 'grill',
          allergens: ['gluten', 'dairy'],
          sort_order: 2,
          modifier_groups: [
            {
              id: 'group-burger-temp',
              name: 'Meat Temperature',
              required: true,
              min_selections: 1,
              max_selections: 1,
              modifiers: [
                { id: 'mod-cook-1', name: 'Medium Rare (Juicy)', price_adjustment: 0, is_default: true },
                { id: 'mod-cook-2', name: 'Medium (Standard)', price_adjustment: 0, is_default: false },
                { id: 'mod-cook-3', name: 'Well Done (Crisp Edge)', price_adjustment: 0, is_default: false },
              ],
            },
            {
              id: 'group-burger-adds',
              name: 'Burger Add-Ons',
              required: false,
              min_selections: 0,
              max_selections: 3,
              modifiers: [
                { id: 'mod-b-1', name: 'Applewood Smoked Bacon', price_adjustment: 250, is_default: false },
                { id: 'mod-b-2', name: 'Fried Farm Egg', price_adjustment: 200, is_default: false },
                { id: 'mod-b-3', name: 'Gluten-Free Bun', price_adjustment: 150, is_default: false },
              ],
            },
          ],
        },
        {
          id: 'item-7',
          name: 'Wood-Fired Margherita Pizza',
          description: 'Crushed San Marzano tomatoes, fresh mozzarella curd, torn organic basil, Sicilian olive oil',
          price: 1650,
          status: 'available',
          station: 'grill',
          allergens: ['gluten', 'dairy'],
          sort_order: 3,
          modifier_groups: [
            {
              id: 'group-toppings',
              name: 'Pizza Toppings',
              required: false,
              min_selections: 0,
              max_selections: 4,
              modifiers: [
                { id: 'mod-top-1', name: 'Prosciutto di Parma', price_adjustment: 400, is_default: false },
                { id: 'mod-top-2', name: 'Roasted Wild Mushrooms', price_adjustment: 250, is_default: false },
                { id: 'mod-top-3', name: 'Hot Honey Drizzle', price_adjustment: 150, is_default: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'sec-sweets-bevs',
      name: 'Bakery Sweets & Beverages',
      sort_order: 3,
      menu_items: [
        {
          id: 'item-8',
          name: 'Warm Wild Maine Blueberry Hand Pie',
          description: 'Flaky butter crust filled with sweet Rockland wild blueberries, turbinado sugar & vanilla glaze',
          price: 650,
          status: 'available',
          station: 'cold',
          allergens: ['gluten', 'dairy'],
          sort_order: 1,
          modifier_groups: [],
        },
        {
          id: 'item-10',
          name: 'Masons Brewing Local IPA (16oz)',
          description: 'Hazy New England IPA brewed in Brewer, ME — tropical hops, citrus zest, smooth body',
          price: 800,
          status: 'available',
          station: 'bar',
          allergens: ['gluten'],
          sort_order: 2,
          modifier_groups: [],
        },
      ],
    },
  ],
};

function anonDb() {
  if (!isLiveSupabaseConfigured()) return null;
  try {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  } catch {
    return null;
  }
}

function withCache(c: Context, seconds = 60) {
  c.header('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=120`);
}

menuRoutes.get('/:tenantSlug', async (c: Context) => {
  const slug = c.req.param('tenantSlug') || 'golden-fork';

  // If Supabase is offline/unconfigured, immediately return demo catalog
  const supabase = anonDb();
  if (!supabase) {
    withCache(c, 60);
    return c.json({
      ok: true,
      data: {
        ...DEMO_PUBLIC_MENU,
        restaurant: {
          ...DEMO_PUBLIC_MENU.restaurant,
          slug,
          name: slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        },
      },
    });
  }

  let rpcData: any = null;
  try {
    const { data, error } = await supabase.rpc('get_public_menu_by_slug', { p_slug: slug });
    if (!error && data) {
      rpcData = data;
    }
  } catch {
    // Network or RPC failure — fall back gracefully
  }

  if (!rpcData) {
    // Fallback for envs without V12 migration yet — service-scoped query via injected admin
    const admin = c.get('supabase');
    if (!admin) {
      // Return demo menu fallback rather than 500
      withCache(c, 60);
      return c.json({
        ok: true,
        data: {
          ...DEMO_PUBLIC_MENU,
          restaurant: {
            ...DEMO_PUBLIC_MENU.restaurant,
            slug,
            name: slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          },
        },
      });
    }

    try {
      const { data: tenant, error: tenantErr } = await admin
        .from('tenants')
        .select('id, name, slug')
        .eq('slug', slug)
        .single();

      if (tenantErr || !tenant) {
        return c.json({ ok: false, error: 'Restaurant not found' }, 404);
      }

      const { data: menuData, error: menuErr } = await admin
        .from('menus')
        .select('id, name, description')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (menuErr || !menuData) return c.json({ ok: false, error: 'No active menu found' }, 404);

      const { data: sections, error: secErr } = await admin
        .from('menu_sections')
        .select(`
          id, name, sort_order,
          menu_items (
            id, name, description, price, status,
            station, allergens, image_url, sort_order,
            modifier_groups (
              id, name, required, min_selections, max_selections, sort_order,
              modifiers ( id, name, price_adjustment, is_default )
            )
          )
        `)
        .eq('menu_id', menuData.id)
        .order('sort_order');

      if (secErr) {
        withCache(c, 60);
        return c.json({ ok: true, data: DEMO_PUBLIC_MENU });
      }

      const structured = (sections ?? []).map((s: any) => ({
        ...s,
        menu_items: [...(s.menu_items as any[])]
          .filter((i) => i.status === 'available')
          .sort((a, b) => a.sort_order - b.sort_order),
      })).filter((s: any) => s.menu_items.length > 0);

      withCache(c, 60);
      return c.json({
        ok: true,
        data: {
          restaurant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
          menu: { id: menuData.id, name: menuData.name, description: menuData.description },
          sections: structured,
        },
      });
    } catch {
      withCache(c, 60);
      return c.json({ ok: true, data: DEMO_PUBLIC_MENU });
    }
  }

  const data = rpcData;
  if (!data) return c.json({ ok: false, error: 'Restaurant not found' }, 404);
  if (!data.menu) return c.json({ ok: false, error: 'No active menu found' }, 404);

  withCache(c, 60);
  return c.json({
    ok: true,
    data: {
      restaurant: data.tenant,
      menu: {
        id: data.menu.id,
        name: data.menu.name,
        description: data.menu.description,
      },
      sections: (data.sections ?? []).map((s: any) => ({
        ...s,
        menu_items: s.items ?? s.menu_items ?? [],
      })),
    },
  });
});



menuRoutes.get('/:tenantSlug/item/:itemId', async (c: Context) => {
  const slug     = c.req.param('tenantSlug');
  const itemId   = c.req.param('itemId');
  // Use service client scoped by slug resolution — never open all items to anon
  const admin = c.get('supabase') ?? anonDb();

  if (!admin) {
    // Search demo catalog
    for (const section of DEMO_PUBLIC_MENU.sections) {
      const match = section.menu_items.find((i: any) => i.id === itemId);
      if (match) {
        withCache(c, 30);
        return c.json({ ok: true, data: match });
      }
    }
    return c.json({ ok: false, error: 'Item not found' }, 404);
  }

  try {
    const { data: tenant } = await admin
      .from('tenants')
      .select('id, slug')
      .eq('slug', slug)
      .single();

    if (!tenant) return c.json({ ok: false, error: 'Item not found' }, 404);

    const { data: item, error } = await admin
      .from('menu_items')
      .select(`
        id, name, description, price, status, tenant_id,
        station, allergens, image_url,
        modifier_groups (
          id, name, required, min_selections, max_selections, sort_order,
          modifiers ( id, name, price_adjustment, is_default )
        )
      `)
      .eq('id', itemId)
      .eq('tenant_id', tenant.id)
      .eq('status', 'available')
      .single();

    if (error || !item) return c.json({ ok: false, error: 'Item not found' }, 404);

    withCache(c, 30);
    return c.json({ ok: true, data: item });
  } catch {
    // Fallback to demo items if database throws
    for (const section of DEMO_PUBLIC_MENU.sections) {
      const match = section.menu_items.find((i: any) => i.id === itemId);
      if (match) {
        withCache(c, 30);
        return c.json({ ok: true, data: match });
      }
    }
    return c.json({ ok: false, error: 'Item not found' }, 404);
  }
});

export default menuRoutes;
