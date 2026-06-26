-- ============================================================
-- CulinaryOS V11 — Public Menu Read Access
-- Allows unauthenticated reads on active menus + items.
-- All other operations remain tenant-only.
-- ============================================================

-- Enable RLS on menu tables (may already be on from V4, idempotent)
alter table public.menus         enable row level security;
alter table public.menu_sections enable row level security;
alter table public.menu_items    enable row level security;
alter table public.modifiers     enable row level security;
alter table public.modifier_groups enable row level security;

-- Public read: active menus only
create policy "menu_public_read" on public.menus
  for select to anon
  using (status = 'active');

-- Public read: sections belonging to an active menu
create policy "menu_sections_public_read" on public.menu_sections
  for select to anon
  using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id and m.status = 'active'
    )
  );

-- Public read: available items only (not 86'd or unavailable)
create policy "menu_items_public_read" on public.menu_items
  for select to anon
  using (
    status = 'available'
    and exists (
      select 1
      from   public.menu_sections s
      join   public.menus m on m.id = s.menu_id
      where  s.id = section_id and m.status = 'active'
    )
  );

-- Public read: modifier groups + modifiers for available items
create policy "modifier_groups_public_read" on public.modifier_groups
  for select to anon
  using (
    exists (
      select 1 from public.menu_items i
      where  i.id = menu_item_id and i.status = 'available'
    )
  );

create policy "modifiers_public_read" on public.modifiers
  for select to anon
  using (
    exists (
      select 1
      from   public.modifier_groups g
      join   public.menu_items i on i.id = g.menu_item_id
      where  g.id = modifier_group_id and i.status = 'available'
    )
  );

-- Tenant-owned write policies (all tables)
create policy "menus_tenant_all"   on public.menus         for all using (tenant_id = public.my_tenant_id());
create policy "sections_tenant_all" on public.menu_sections for all using (tenant_id = public.my_tenant_id());
create policy "items_tenant_all"   on public.menu_items    for all using (tenant_id = public.my_tenant_id());
