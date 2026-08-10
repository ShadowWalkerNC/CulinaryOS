-- ============================================================
-- CulinaryOS — Demo menu seed (The Golden Fork)
-- Idempotent. Run after base_tenant.sql (needs the tenant to exist).
-- Creates the active "Dinner Menu" the POS / Web read out of the box.
-- Tenant UUID matches VITE_TENANT_ID default in .env.example.
-- ============================================================

-- Active menu
INSERT INTO public.menus (id, tenant_id, name, description, status, published_at)
VALUES ('00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-000000000001',
        'Dinner Menu', 'CulinaryOS demo dinner menu', 'active', NOW())
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status;

-- Sections
INSERT INTO public.menu_sections (id, menu_id, tenant_id, name, sort_order) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-000000000001', 'Starters', 1),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-000000000001', 'Mains', 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

-- Items (price in cents)
INSERT INTO public.menu_items (id, section_id, tenant_id, name, description, price, status, station, allergens, sort_order) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', 'Truffle Hummus & Pita', 'Whipped chickpea, black truffle, warm pita', 950, 'available', 'cold', ARRAY['gluten','sesame'], 1),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', 'Crispy Calamari', 'Flash-fried, lemon, herb aioli', 1400, 'available', 'fry', ARRAY['gluten','seafood'], 2),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001', 'Wood-Fired Margherita Pizza', 'San Marzano, fresh mozzarella, basil', 1650, 'available', 'pass', ARRAY['gluten','dairy'], 1),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001', 'Prime Bistro Burger', 'Dry-aged beef, aged cheddar, brioche', 1850, 'available', 'grill', ARRAY['gluten','dairy'], 2)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price,
    status = EXCLUDED.status, station = EXCLUDED.station, allergens = EXCLUDED.allergens, sort_order = EXCLUDED.sort_order;

-- Modifier groups
INSERT INTO public.modifier_groups (id, menu_item_id, name, required, min_selections, max_selections, sort_order) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c2', 'Extra Dipping Sauce', false, 0, 2, 1),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c3', 'Add Toppings', false, 0, 4, 1),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c4', 'Meat Preparation', true, 1, 1, 1)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, required = EXCLUDED.required, min_selections = EXCLUDED.min_selections, max_selections = EXCLUDED.max_selections;

-- Modifiers (price_adjustment in cents)
INSERT INTO public.modifiers (id, modifier_group_id, name, price_adjustment, is_default) VALUES
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'Spicy Aioli', 150, false),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d1', 'Garlic Aioli', 0, true),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000d2', 'Prosciutto di Parma', 400, false),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000d2', 'Wild Mushrooms', 250, false),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000d2', 'Extra Mozzarella', 200, false),
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000d3', 'Medium Rare', 0, true),
  ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000d3', 'Medium', 0, false),
  ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000d3', 'Well Done', 0, false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, price_adjustment = EXCLUDED.price_adjustment, is_default = EXCLUDED.is_default;
