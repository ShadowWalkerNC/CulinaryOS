-- ============================================================
-- CulinaryOS Demo Seed — The Golden Fork
-- Extends previous seed with pantry ingredients + recipe links
-- ============================================================

-- Only run if tenant already exists (safe re-run)
do $$ begin
  if not exists (select 1 from public.tenants where name = 'The Golden Fork') then
    raise exception 'Run V1–V6 seeds first';
  end if;
end $$;

-- Get tenant id
do $$
declare
  tid uuid;
  ribeye_id   uuid := uuid_generate_v4();
  salmon_id   uuid := uuid_generate_v4();
  frites_id   uuid := uuid_generate_v4();
  butter_id   uuid := uuid_generate_v4();
  herbs_id    uuid := uuid_generate_v4();
  garlic_id   uuid := uuid_generate_v4();
begin
  select id into tid from public.tenants where name = 'The Golden Fork' limit 1;

  -- Ingredients
  insert into public.ingredients (id, tenant_id, name, unit, current_qty, reorder_at, reorder_qty, cost_per_unit) values
    (ribeye_id,  tid, '12oz Ribeye Steak',    'each', 24,  8,  20,  2800),
    (salmon_id,  tid, 'Atlantic Salmon Fillet','each', 18,  6,  15,  1800),
    (frites_id,  tid, 'Pommes Frites',         'portion', 60, 20, 40, 120),
    (butter_id,  tid, 'Compound Butter',       'g',   2000, 500, 1000, 5),
    (herbs_id,   tid, 'Fresh Herbs Mix',       'g',   800,  200, 500, 8),
    (garlic_id,  tid, 'Roasted Garlic',        'bulb', 30,  10,  20, 45)
  on conflict (id) do nothing;

  -- Recipe → ingredient links
  -- Assuming menu items from demo seed have recipe_ids already set;
  -- These link recipe_id (a UUID matching menu_item.recipe_id) to ingredients.
  -- Ribeye: 1 steak, 30g butter, 5g herbs, 1 garlic bulb
  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values
    ('00000000-0000-0000-0001-000000000001', ribeye_id,  1,  'each'),
    ('00000000-0000-0000-0001-000000000001', butter_id,  30, 'g'),
    ('00000000-0000-0000-0001-000000000001', herbs_id,   5,  'g'),
    ('00000000-0000-0000-0001-000000000001', garlic_id,  1,  'bulb')
  on conflict do nothing;

  -- Salmon: 1 fillet, 20g butter, 5g herbs, 1 portion frites
  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit) values
    ('00000000-0000-0000-0001-000000000002', salmon_id,  1,  'each'),
    ('00000000-0000-0000-0001-000000000002', butter_id,  20, 'g'),
    ('00000000-0000-0000-0001-000000000002', herbs_id,   5,  'g'),
    ('00000000-0000-0000-0001-000000000002', frites_id,  1,  'portion')
  on conflict do nothing;

end $$;
