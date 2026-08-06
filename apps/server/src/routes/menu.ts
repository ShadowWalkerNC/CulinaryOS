// ============================================================
// CulinaryOS — Public Menu Route
// No auth required. Uses get_public_menu_by_slug RPC (security definer)
// so anon cannot scrape all tenants' menus via table SELECT.
// ============================================================

import { Hono }         from 'hono';
import type { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../types.js';

export const menuRoutes = new Hono<Env>();

function anonDb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}

function withCache(c: Context, seconds = 60) {
  c.header('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=120`);
}

menuRoutes.get('/:tenantSlug', async (c: Context) => {
  const slug     = c.req.param('tenantSlug');
  const supabase = anonDb();

  const { data, error } = await supabase.rpc('get_public_menu_by_slug', { p_slug: slug });

  if (error) {
    // Fallback for envs without V12 migration yet — service-scoped query via injected admin
    const admin = c.get('supabase');
    if (!admin) return c.json({ ok: false, error: error.message }, 500);

    const { data: tenant, error: tenantErr } = await admin
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', slug)
      .single();

    if (tenantErr || !tenant) return c.json({ ok: false, error: 'Restaurant not found' }, 404);

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

    if (secErr) return c.json({ ok: false, error: secErr.message }, 500);

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
        menu:       { id: menuData.id, name: menuData.name, description: menuData.description },
        sections:   structured,
      },
    });
  }

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
});

export default menuRoutes;
