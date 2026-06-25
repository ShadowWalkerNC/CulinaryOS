-- ============================================================
-- CulinaryOS V7 — RecipeOS Pantry Schema
-- ============================================================

create table public.ingredients (
  id           uuid        primary key default uuid_generate_v4(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  name         text        not null,
  unit         text        not null,          -- g, ml, each, oz, lb …
  current_qty  numeric     not null default 0 check (current_qty >= 0),
  reorder_at   numeric     not null default 0,
  reorder_qty  numeric     not null default 0,
  cost_per_unit numeric    not null default 0, -- cents
  supplier     text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_ing_tenant on public.ingredients(tenant_id);
create trigger set_updated_at_ingredients
  before update on public.ingredients
  for each row execute function public.set_updated_at();

alter table public.ingredients enable row level security;
create policy "ing_select_own" on public.ingredients for select using (tenant_id = public.my_tenant_id());
create policy "ing_modify_own" on public.ingredients for all    using (tenant_id = public.my_tenant_id());

-- Recipe ↔ ingredient link (how much of each ingredient per 1 recipe yield)
create table public.recipe_ingredients (
  id             uuid    primary key default uuid_generate_v4(),
  recipe_id      uuid    not null,   -- soft FK to RecipeOS recipes (cross-service)
  ingredient_id  uuid    not null references public.ingredients(id) on delete cascade,
  quantity       numeric not null,   -- per 1 unit of recipe
  unit           text    not null,
  notes          text,
  created_at     timestamptz not null default now()
);

create index idx_ri_recipe     on public.recipe_ingredients(recipe_id);
create index idx_ri_ingredient on public.recipe_ingredients(ingredient_id);
alter table public.recipe_ingredients enable row level security;
create policy "ri_select" on public.recipe_ingredients for select using (
  exists (select 1 from public.ingredients i where i.id = ingredient_id and i.tenant_id = public.my_tenant_id())
);
create policy "ri_modify" on public.recipe_ingredients for all using (
  exists (select 1 from public.ingredients i where i.id = ingredient_id and i.tenant_id = public.my_tenant_id())
);

-- Pantry ledger — every deduction/addition is logged
create table public.pantry_ledger (
  id            uuid        primary key default uuid_generate_v4(),
  tenant_id     uuid        not null references public.tenants(id) on delete cascade,
  ingredient_id uuid        not null references public.ingredients(id) on delete cascade,
  delta         numeric     not null,          -- negative = deduct, positive = restock
  reason        text        not null,          -- 'sale', 'restock', 'waste', 'adjustment'
  reference_id  text,                          -- order_id or PO number
  recorded_by   text,
  created_at    timestamptz not null default now()
);

create index idx_pl_tenant      on public.pantry_ledger(tenant_id);
create index idx_pl_ingredient  on public.pantry_ledger(ingredient_id, created_at desc);
alter table public.pantry_ledger enable row level security;
create policy "pl_select_own" on public.pantry_ledger for select using (tenant_id = public.my_tenant_id());
create policy "pl_insert_own" on public.pantry_ledger for insert with check (tenant_id = public.my_tenant_id());

-- View: current stock levels with low-stock flag
create view public.pantry_status as
select
  i.id,
  i.tenant_id,
  i.name,
  i.unit,
  i.current_qty,
  i.reorder_at,
  i.reorder_qty,
  i.cost_per_unit,
  i.supplier,
  case
    when i.current_qty <= 0              then 'out_of_stock'
    when i.current_qty <= i.reorder_at   then 'low_stock'
    else 'ok'
  end as stock_status
from public.ingredients i;
