-- ============================================================
-- CulinaryOS — Demo Seed Data (dev only)
-- ============================================================

-- Tenant
insert into public.tenants (id, slug, name, plan) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'the-golden-fork', 'The Golden Fork', 'pro')
  on conflict (id) do nothing;

-- Menu
insert into public.menus (id, tenant_id, name, status, published_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Dinner Menu', 'active', now())
  on conflict (id) do nothing;

-- Sections
insert into public.menu_sections (id, menu_id, tenant_id, name, sort_order) values
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Starters',  1),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Mains',     2),
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Desserts',  3)
  on conflict (id) do nothing;

-- Menu Items
insert into public.menu_items (id, section_id, tenant_id, name, description, price, station, sort_order) values
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Beef Tartare',           'Hand-cut beef, capers, Dijon, quail egg',        2200, 'cold',   1),
  ('dddddddd-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'French Onion Soup',      'Gruyère croûte, veal stock, 24h onion confit',   1800, 'sauce',  2),
  ('dddddddd-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Duck Confit',            'Leg confit, lentilles du Puy, sauce vierge',     3800, 'hot',    1),
  ('dddddddd-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '28-Day Dry-Aged Ribeye', '400g, bone marrow butter, pommes pont-neuf',     6200, 'grill',  2),
  ('dddddddd-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Pan-Seared Halibut',     'Beurre blanc, asparagus, sauce vierge',           4200, 'hot',    3),
  ('dddddddd-0000-0000-0000-000000000006', 'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Crème Brülée',           'Tahitian vanilla, caramelised crust',              1400, 'pastry', 1),
  ('dddddddd-0000-0000-0000-000000000007', 'cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Chocolate Fondant',      '70% Valrhona, crème anglaise',                   1600, 'pastry', 2)
  on conflict (id) do nothing;

-- Open Tab
insert into public.tabs (id, tenant_id, table_number, cover_count, server_name) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '12', 2, 'Alex')
  on conflict (id) do nothing;

-- Demo Order (open, not yet fired)
insert into public.pos_orders (id, tenant_id, tab_id, table_number, cover_count, server_name, status, subtotal, tax, total) values
  ('ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000001', '12', 2, 'Alex', 'open', 8200, 820, 9020)
  on conflict (id) do nothing;

-- Line Items
insert into public.pos_order_line_items (id, order_id, tenant_id, menu_item_id, name, quantity, unit_price, line_total, station, course_number, sort_order)
values
  ('11111111-1111-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001', 'Beef Tartare',     1, 2200, 2200, 'cold',  1, 1),
  ('11111111-1111-0000-0000-000000000002', 'ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000004', '28-Day Dry-Aged Ribeye', 1, 6200, 6200, 'grill', 2, 2)
  on conflict (id) do nothing;

-- Demo KDS Ticket (fired, cooking)
insert into public.kitchen_tickets (id, tenant_id, order_id, order_number, station, status, priority, table_number, cover_count, course_number, fired_at)
values
  ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-000000000001', 42, 'grill', 'cooking', 'normal', '12', 2, 2, now() - interval '8 minutes')
  on conflict (id) do nothing;

insert into public.ticket_items (ticket_id, line_item_id, name, quantity, modifiers)
values
  ('99999999-0000-0000-0000-000000000001', '11111111-1111-0000-0000-000000000002',
   '28-Day Dry-Aged Ribeye', 1, '{"Medium Rare", "Bone marrow butter"}')
  on conflict do nothing;
