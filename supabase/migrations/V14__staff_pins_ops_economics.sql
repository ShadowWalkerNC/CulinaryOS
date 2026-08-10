-- ============================================================
-- V14 — Staff PIN auth, ops waste log, plate economics, RLS helpers
-- ============================================================

-- Harden tenant helpers (avoid RLS recursion under INVOKER)
create or replace function public.my_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'tenant_id', '')::uuid,
    (select tu.tenant_id from public.tenant_users tu where tu.user_id = auth.uid() limit 1)
  );
$$;

create or replace function public.my_role(p_tenant_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.tenant_users
  where user_id = auth.uid() and tenant_id = p_tenant_id
  limit 1;
$$;

revoke all on function public.my_tenant_id() from public;
grant execute on function public.my_tenant_id() to authenticated, service_role;

revoke all on function public.my_role(uuid) from public;
grant execute on function public.my_role(uuid) to authenticated, service_role;

-- Terminal PIN → Auth user mapping (password for Auth user = PIN at seed time)
create table if not exists public.staff_pins (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  pin_hash      text not null,
  display_name  text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists idx_staff_pins_tenant on public.staff_pins(tenant_id);
alter table public.staff_pins enable row level security;

drop policy if exists staff_pins_select_own on public.staff_pins;
create policy staff_pins_select_own on public.staff_pins
  for select using (tenant_id = public.my_tenant_id());

-- Managers/owners can manage pins for their tenant (writes typically via service role)
drop policy if exists staff_pins_modify_managers on public.staff_pins;
create policy staff_pins_modify_managers on public.staff_pins
  for all using (
    tenant_id = public.my_tenant_id()
    and public.my_role(tenant_id) in ('owner', 'manager')
  );

-- Waste events (CulinaryOps / MCP log_waste)
create table if not exists public.waste_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  ingredient      text not null,
  quantity_grams  numeric not null,
  cost_per_gram   numeric not null default 0,
  waste_cost      numeric not null default 0,
  reason          text not null,
  notes           text,
  log_date        date not null default current_date,
  created_by      uuid,
  created_at      timestamptz not null default now()
);

create index if not exists idx_waste_events_tenant_date
  on public.waste_events(tenant_id, log_date desc);
alter table public.waste_events enable row level security;

drop policy if exists waste_select_own on public.waste_events;
create policy waste_select_own on public.waste_events
  for select using (tenant_id = public.my_tenant_id());

drop policy if exists waste_insert_own on public.waste_events;
create policy waste_insert_own on public.waste_events
  for insert with check (tenant_id = public.my_tenant_id());

-- Plate economics snapshot when an order is fired (closed-loop cost story)
create table if not exists public.plate_economics (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  order_id         uuid not null,
  menu_item_id     uuid,
  item_name        text not null,
  quantity         numeric not null default 1,
  sale_price_cents integer,
  theoretical_cost_cents integer,
  created_at       timestamptz not null default now()
);

create index if not exists idx_plate_econ_tenant_order
  on public.plate_economics(tenant_id, order_id);
alter table public.plate_economics enable row level security;

drop policy if exists plate_econ_select_own on public.plate_economics;
create policy plate_econ_select_own on public.plate_economics
  for select using (tenant_id = public.my_tenant_id());

drop policy if exists plate_econ_insert_own on public.plate_economics;
create policy plate_econ_insert_own on public.plate_economics
  for insert with check (tenant_id = public.my_tenant_id());

-- Menu item ↔ recipe link for cost loop (soft FK to RecipeOS / pantry)
create table if not exists public.menu_item_recipes (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  menu_item_id  uuid not null,
  recipe_id     uuid not null,
  unique (tenant_id, menu_item_id)
);

alter table public.menu_item_recipes enable row level security;
drop policy if exists mir_select_own on public.menu_item_recipes;
create policy mir_select_own on public.menu_item_recipes
  for select using (tenant_id = public.my_tenant_id());
drop policy if exists mir_modify_own on public.menu_item_recipes;
create policy mir_modify_own on public.menu_item_recipes
  for all using (tenant_id = public.my_tenant_id());
