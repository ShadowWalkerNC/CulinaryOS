-- ============================================================
-- CulinaryOS V12 — Security hardening from audit
-- * Explicit tenant context for my_tenant_id()
-- * security_invoker views
-- * Complete RLS write policies on child tables
-- * pending_push outbox for KDS reconnect
-- * Narrow public menu access (slug RPC; drop broad anon SELECT)
-- * Harden SECURITY DEFINER helpers
-- ============================================================

-- ---- Explicit tenant context ----
-- Prefer JWT claim `tenant_id` (app_metadata / custom claim).
-- Fallback: single membership only when user has exactly one tenant.
create or replace function public.my_tenant_id()
returns uuid
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  claim text;
  uid uuid := auth.uid();
  tid uuid;
  cnt int;
begin
  claim := coalesce(
    auth.jwt() ->> 'tenant_id',
    auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );
  if claim is not null and claim <> '' then
    begin
      tid := claim::uuid;
    exception when others then
      tid := null;
    end;
    if tid is not null and exists (
      select 1 from public.tenant_users tu
      where tu.user_id = uid and tu.tenant_id = tid
    ) then
      return tid;
    end if;
  end if;

  select count(*) into cnt from public.tenant_users where user_id = uid;
  if cnt = 1 then
    select tenant_id into tid from public.tenant_users where user_id = uid;
    return tid;
  end if;

  return null;
end;
$$;

-- ---- Views: enforce invoker RLS ----
drop view if exists public.pantry_status;
create view public.pantry_status
  with (security_invoker = true)
as
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

drop view if exists public.order_course_status;
create view public.order_course_status
  with (security_invoker = true)
as
select
  kt.order_id,
  kt.tenant_id,
  kt.course_number,
  count(*) filter (where kt.course_hold_status = 'held')    as held_count,
  count(*) filter (where kt.course_hold_status = 'firing')  as firing_count,
  count(*) filter (where kt.course_hold_status = 'fired')   as fired_count,
  count(*) filter (where kt.status = 'bumped')              as bumped_count,
  count(*)                                                  as total_count,
  bool_and(kt.status = 'bumped')                            as all_bumped
from public.kitchen_tickets kt
where kt.status not in ('voided')
group by kt.order_id, kt.tenant_id, kt.course_number;

drop view if exists public.beta_at_risk;
create view public.beta_at_risk
  with (security_invoker = true)
as
  select
    ba.business_name,
    ba.phone,
    bf.week_number,
    bf.conversion_intent,
    bf.conversion_blocker,
    bf.nps_score,
    bf.call_date
  from beta_feedback bf
  join beta_applications ba on ba.id = bf.application_id
  where bf.conversion_intent in ('unlikely', 'churning')
     or bf.nps_score < 7
  order by bf.call_date desc;

-- Revoke broad grants on PII view if present
revoke all on public.beta_at_risk from anon, authenticated;
grant select on public.beta_at_risk to service_role;

-- ---- Complete child-table RLS write policies ----
drop policy if exists "ti_update" on public.ticket_items;
create policy "ti_update" on public.ticket_items for update
  using (exists (
    select 1 from public.kitchen_tickets kt
    where kt.id = ticket_id and kt.tenant_id = public.my_tenant_id()
  ));

drop policy if exists "ti_delete" on public.ticket_items;
create policy "ti_delete" on public.ticket_items for delete
  using (exists (
    select 1 from public.kitchen_tickets kt
    where kt.id = ticket_id and kt.tenant_id = public.my_tenant_id()
  ));

drop policy if exists "lim_insert" on public.line_item_modifiers;
create policy "lim_insert" on public.line_item_modifiers for insert
  with check (exists (
    select 1 from public.pos_order_line_items oli
    where oli.id = line_item_id and oli.tenant_id = public.my_tenant_id()
  ));

drop policy if exists "lim_update" on public.line_item_modifiers;
create policy "lim_update" on public.line_item_modifiers for update
  using (exists (
    select 1 from public.pos_order_line_items oli
    where oli.id = line_item_id and oli.tenant_id = public.my_tenant_id()
  ));

drop policy if exists "lim_delete" on public.line_item_modifiers;
create policy "lim_delete" on public.line_item_modifiers for delete
  using (exists (
    select 1 from public.pos_order_line_items oli
    where oli.id = line_item_id and oli.tenant_id = public.my_tenant_id()
  ));

drop policy if exists "ms_delete" on public.menu_sections;
create policy "ms_delete" on public.menu_sections for delete
  using (tenant_id = public.my_tenant_id());

drop policy if exists "mi_delete" on public.menu_items;
create policy "mi_delete" on public.menu_items for delete
  using (tenant_id = public.my_tenant_id());

drop policy if exists "mg_insert" on public.modifier_groups;
create policy "mg_insert" on public.modifier_groups for insert
  with check (exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_id and mi.tenant_id = public.my_tenant_id()
  ));

drop policy if exists "mg_update" on public.modifier_groups;
create policy "mg_update" on public.modifier_groups for update
  using (exists (
    select 1 from public.menu_items mi
    where mi.id = menu_item_id and mi.tenant_id = public.my_tenant_id()
  ));

drop policy if exists "mod_insert" on public.modifiers;
create policy "mod_insert" on public.modifiers for insert
  with check (exists (
    select 1 from public.modifier_groups mg
    join public.menu_items mi on mi.id = mg.menu_item_id
    where mg.id = modifier_group_id and mi.tenant_id = public.my_tenant_id()
  ));

drop policy if exists "mod_update" on public.modifiers;
create policy "mod_update" on public.modifiers for update
  using (exists (
    select 1 from public.modifier_groups mg
    join public.menu_items mi on mi.id = mg.menu_item_id
    where mg.id = modifier_group_id and mi.tenant_id = public.my_tenant_id()
  ));

-- ---- Narrow public menu: drop broad anon table policies ----
drop policy if exists "menu_public_read" on public.menus;
drop policy if exists "menu_sections_public_read" on public.menu_sections;
drop policy if exists "menu_items_public_read" on public.menu_items;
drop policy if exists "modifier_groups_public_read" on public.modifier_groups;
drop policy if exists "modifiers_public_read" on public.modifiers;

-- Prefer RPC for public menu (single-tenant projection). No broad anon SELECT on menu tables.
-- security definer reads underlying tables; callers cannot scrape all tenants via PostgREST.
create or replace function public.get_public_menu_by_slug(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant public.tenants%rowtype;
  v_menu   public.menus%rowtype;
  result   jsonb;
begin
  select * into v_tenant from public.tenants where slug = p_slug limit 1;
  if not found then
    return null;
  end if;

  select * into v_menu
  from public.menus
  where tenant_id = v_tenant.id and status = 'active'
  order by created_at desc nulls last
  limit 1;

  if not found then
    return jsonb_build_object('tenant', jsonb_build_object('id', v_tenant.id, 'slug', v_tenant.slug, 'name', v_tenant.name), 'menu', null, 'sections', '[]'::jsonb);
  end if;

  select jsonb_build_object(
    'tenant', jsonb_build_object('id', v_tenant.id, 'slug', v_tenant.slug, 'name', v_tenant.name),
    'menu', to_jsonb(v_menu),
    'sections', coalesce((
      select jsonb_agg(
        to_jsonb(s) || jsonb_build_object(
          'items', coalesce((
            select jsonb_agg(to_jsonb(i) order by i.sort_order nulls last)
            from public.menu_items i
            where i.section_id = s.id and i.status = 'available'
          ), '[]'::jsonb)
        )
        order by s.sort_order nulls last
      )
      from public.menu_sections s
      where s.menu_id = v_menu.id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_public_menu_by_slug(text) from public;
grant execute on function public.get_public_menu_by_slug(text) to anon, authenticated, service_role;

-- ---- pending_push outbox ----
create table if not exists public.pending_push (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  station_id   text,
  event_type   text not null,
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists idx_pending_push_tenant_undelivered
  on public.pending_push (tenant_id, created_at)
  where delivered_at is null;

alter table public.pending_push enable row level security;

drop policy if exists "pending_push_select" on public.pending_push;
create policy "pending_push_select" on public.pending_push
  for select using (tenant_id = public.my_tenant_id());

-- ---- Harden next_po_number if present ----
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'next_po_number'
  ) then
    execute $fn$
      create or replace function public.next_po_number(p_tenant_id uuid)
      returns text
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        seq int;
      begin
        if auth.uid() is not null and not exists (
          select 1 from public.tenant_users
          where user_id = auth.uid() and tenant_id = p_tenant_id
        ) then
          raise exception 'not a member of tenant';
        end if;
        select coalesce(count(*), 0) + 1
        into   seq
        from   public.restock_purchase_orders
        where  tenant_id = p_tenant_id;
        return 'PO-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 4, '0');
      end;
      $body$;
    $fn$;
  end if;
exception when others then
  raise notice 'next_po_number harden skipped: %', SQLERRM;
end $$;

-- ---- ai_prompt_log company scoping (if table exists) ----
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'ai_prompt_log') then
    alter table public.ai_prompt_log add column if not exists company_id uuid;
    alter table public.ai_prompt_log add column if not exists user_id uuid;
  end if;
end $$;
