// ============================================================
// CulinaryOS — Public Menu Route
// No auth required — uses anon Supabase client.
// All reads are tenant-scoped by slug or tenant_id param.
//
// GET /v1/menu/:tenantSlug          — full active menu
// GET /v1/menu/:tenantSlug/item/:id — single item detail
// ============================================================

import { Hono }         from 'hono';
import type { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../types.js';

export const menuRoutes = new Hono<Env>();

// Anon client — respects public RLS policies from V11
function anonDb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}

// Cache-control helper — menus change infrequently
function withCache(c: Context, seconds = 60) {
  c.header('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=120`);
}

// ============================================================
// GET /v1/menu/:tenantSlug
// Returns the active menu for a tenant, structured as:
// { menu, sections: [{ ...section, items: [...] }] }
// ============================================================
menuRoutes.get('/:tenantSlug', async (c: Context) => {
  const slug     = c.req.param('tenantSlug');
  const supabase = anonDb();

  // Resolve tenant by slug
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', slug)
    .single();

  if (tenantErr || !tenant) return c.json({ ok: false, error: 'Restaurant not found' }, 404);

  // Fetch active menu
  const { data: menuData, error: menuErr } = await supabase
    .from('menus')
    .select('id, name, description')
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
    .order('published_at', { ascending: false })
    .limit(1)
    .single();

  if (menuErr || !menuData) return c.json({ ok: false, error: 'No active menu found' }, 404);

  // Fetch sections with items
  const { data: sections, error: secErr } = await supabase
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

  if (secErr) return c.json({ ok: false, error: secErr.message }, 500);

  // Sort items within each section
  const structured = (sections ?? []).map((s) => ({
    ...s,
    menu_items: [...(s.menu_items as any[])]
      .filter((i) => i.status === 'available')
      .sort((a, b) => a.sort_order - b.sort_order),
  })).filter((s) => s.menu_items.length > 0);

  withCache(c, 60);
  return c.json({
    ok:   true,
    data: {
      restaurant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      menu:       { id: menuData.id, name: menuData.name, description: menuData.description },
      sections:   structured,
    },
  });
});

// ============================================================
// GET /v1/menu/:tenantSlug/item/:itemId
// Full item detail including all modifier groups.
// ============================================================
menuRoutes.get('/:tenantSlug/item/:itemId', async (c: Context) => {
  const slug     = c.req.param('tenantSlug');
  const itemId   = c.req.param('itemId');
  const supabase = anonDb();

  const { data: item, error } = await supabase
    .from('menu_items')
    .select(`
      id, name, description, price, status,
      station, allergens, image_url,
      modifier_groups (
        id, name, required, min_selections, max_selections, sort_order,
        modifiers ( id, name, price_adjustment, is_default )
      ),
      menu_sections!inner ( menu_id,
        menus!inner ( tenant_id, tenants!inner ( slug ) )
      )
    `)
    .eq('id', itemId)
    .eq('status', 'available')
    .single();

  if (error || !item) return c.json({ ok: false, error: 'Item not found' }, 404);

  // Verify item belongs to requested tenant
  const itemSlug = (item as any).menu_sections?.menus?.tenants?.slug;
  if (itemSlug !== slug) return c.json({ ok: false, error: 'Item not found' }, 404);

  withCache(c, 30);
  return c.json({ ok: true, data: item });
});

export default menuRoutes;
