-- ============================================================
-- CulinaryOS V4 — Row Level Security
-- All tables scoped to tenant via tenant_users join
-- ============================================================

alter table public.tenants            enable row level security;
alter table public.tenant_users       enable row level security;
alter table public.kitchen_tickets    enable row level security;
alter table public.ticket_items       enable row level security;
alter table public.menus              enable row level security;
alter table public.menu_sections      enable row level security;
alter table public.menu_items         enable row level security;
alter table public.modifier_groups    enable row level security;
alter table public.modifiers          enable row level security;
alter table public.tabs               enable row level security;
alter table public.pos_orders         enable row level security;
alter table public.pos_order_line_items enable row level security;
alter table public.line_item_modifiers  enable row level security;
alter table public.payments           enable row level security;

-- ---- TENANTS ----
create policy "tenants_member_select" on public.tenants
  for select using (id = public.my_tenant_id());

-- ---- TENANT USERS ----
create policy "tu_select_own_tenant" on public.tenant_users
  for select using (tenant_id = public.my_tenant_id());

-- ---- KDS ----
create policy "kt_select"  on public.kitchen_tickets for select  using (tenant_id = public.my_tenant_id());
create policy "kt_insert"  on public.kitchen_tickets for insert  with check (tenant_id = public.my_tenant_id());
create policy "kt_update"  on public.kitchen_tickets for update  using (tenant_id = public.my_tenant_id());
create policy "kt_delete"  on public.kitchen_tickets for delete  using (tenant_id = public.my_tenant_id());

create policy "ti_select"  on public.ticket_items for select
  using (exists (select 1 from public.kitchen_tickets kt where kt.id = ticket_id and kt.tenant_id = public.my_tenant_id()));
create policy "ti_insert"  on public.ticket_items for insert
  with check (exists (select 1 from public.kitchen_tickets kt where kt.id = ticket_id and kt.tenant_id = public.my_tenant_id()));

-- ---- POS — MENUS ----
create policy "menus_select" on public.menus for select  using (tenant_id = public.my_tenant_id());
create policy "menus_insert" on public.menus for insert  with check (tenant_id = public.my_tenant_id());
create policy "menus_update" on public.menus for update  using (tenant_id = public.my_tenant_id());
create policy "menus_delete" on public.menus for delete  using (tenant_id = public.my_tenant_id());

create policy "ms_select" on public.menu_sections for select  using (tenant_id = public.my_tenant_id());
create policy "ms_insert" on public.menu_sections for insert  with check (tenant_id = public.my_tenant_id());
create policy "ms_update" on public.menu_sections for update  using (tenant_id = public.my_tenant_id());

create policy "mi_select" on public.menu_items for select  using (tenant_id = public.my_tenant_id());
create policy "mi_insert" on public.menu_items for insert  with check (tenant_id = public.my_tenant_id());
create policy "mi_update" on public.menu_items for update  using (tenant_id = public.my_tenant_id());

create policy "mg_select" on public.modifier_groups for select
  using (exists (select 1 from public.menu_items mi where mi.id = menu_item_id and mi.tenant_id = public.my_tenant_id()));
create policy "mod_select" on public.modifiers for select
  using (exists (
    select 1 from public.modifier_groups mg
    join public.menu_items mi on mi.id = mg.menu_item_id
    where mg.id = modifier_group_id and mi.tenant_id = public.my_tenant_id()
  ));

-- ---- POS — ORDERS ----
create policy "orders_select" on public.pos_orders for select  using (tenant_id = public.my_tenant_id());
create policy "orders_insert" on public.pos_orders for insert  with check (tenant_id = public.my_tenant_id());
create policy "orders_update" on public.pos_orders for update  using (tenant_id = public.my_tenant_id());
create policy "orders_delete" on public.pos_orders for delete  using (tenant_id = public.my_tenant_id());

create policy "oli_select" on public.pos_order_line_items for select  using (tenant_id = public.my_tenant_id());
create policy "oli_insert" on public.pos_order_line_items for insert  with check (tenant_id = public.my_tenant_id());
create policy "oli_update" on public.pos_order_line_items for update  using (tenant_id = public.my_tenant_id());

create policy "lim_select" on public.line_item_modifiers for select
  using (exists (select 1 from public.pos_order_line_items oli where oli.id = line_item_id and oli.tenant_id = public.my_tenant_id()));

-- ---- TABS ----
create policy "tabs_select" on public.tabs for select  using (tenant_id = public.my_tenant_id());
create policy "tabs_insert" on public.tabs for insert  with check (tenant_id = public.my_tenant_id());
create policy "tabs_update" on public.tabs for update  using (tenant_id = public.my_tenant_id());

-- ---- PAYMENTS ----
create policy "payments_select" on public.payments for select  using (tenant_id = public.my_tenant_id());
create policy "payments_insert" on public.payments for insert  with check (tenant_id = public.my_tenant_id());
create policy "payments_update" on public.payments for update  using (tenant_id = public.my_tenant_id());
