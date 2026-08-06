-- ============================================================
-- CulinaryOS V13 — Complete pantry RPC, outbox lifecycle, PO counter
-- ============================================================

-- Tenant-scoped stock decrement + ledger write
create or replace function public.decrement_pantry_stock(
  item_id uuid,
  qty numeric,
  p_tenant_id uuid default null,
  p_reason text default 'sale',
  p_reference_id text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_new_qty numeric;
begin
  v_tenant := coalesce(p_tenant_id, public.my_tenant_id());
  if v_tenant is null then
    raise exception 'tenant required';
  end if;

  if auth.uid() is not null and not exists (
    select 1 from public.tenant_users
    where user_id = auth.uid() and tenant_id = v_tenant
  ) and current_setting('role', true) <> 'service_role' then
    -- allow service_role / backend; deny mismatched membership
    if not exists (
      select 1 from public.tenant_users
      where user_id = auth.uid() and tenant_id = v_tenant
    ) then
      raise exception 'not a member of tenant';
    end if;
  end if;

  update public.ingredients
  set current_qty = greatest(0, current_qty - qty)
  where id = item_id and tenant_id = v_tenant
  returning current_qty into v_new_qty;

  if not found then
    raise exception 'ingredient not found for tenant';
  end if;

  insert into public.pantry_ledger (tenant_id, ingredient_id, delta, reason, reference_id)
  values (v_tenant, item_id, -abs(qty), coalesce(p_reason, 'sale'), p_reference_id);

  return v_new_qty;
end;
$$;

revoke all on function public.decrement_pantry_stock(uuid, numeric, uuid, text, text) from public;
grant execute on function public.decrement_pantry_stock(uuid, numeric, uuid, text, text)
  to authenticated, service_role;

-- Compatibility overload (item_id, qty) used by older callers
create or replace function public.decrement_pantry_stock(item_id uuid, qty numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.decrement_pantry_stock(item_id, qty, public.my_tenant_id(), 'sale', null);
end;
$$;

revoke all on function public.decrement_pantry_stock(uuid, numeric) from public;
grant execute on function public.decrement_pantry_stock(uuid, numeric)
  to authenticated, service_role;

-- pending_push mark-delivered (service / member update)
drop policy if exists "pending_push_update" on public.pending_push;
create policy "pending_push_update" on public.pending_push
  for update using (tenant_id = public.my_tenant_id());

drop policy if exists "pending_push_insert" on public.pending_push;
create policy "pending_push_insert" on public.pending_push
  for insert with check (tenant_id = public.my_tenant_id());

-- Atomic PO number counter per tenant
alter table public.tenants
  add column if not exists po_seq int not null default 0;

create or replace function public.next_po_number(p_tenant_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  seq int;
begin
  if auth.uid() is not null and not exists (
    select 1 from public.tenant_users
    where user_id = auth.uid() and tenant_id = p_tenant_id
  ) then
    raise exception 'not a member of tenant';
  end if;

  update public.tenants
  set po_seq = po_seq + 1
  where id = p_tenant_id
  returning po_seq into seq;

  if not found then
    raise exception 'tenant not found';
  end if;

  return 'PO-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 4, '0');
end;
$$;

-- Soften ai_prompt_log FKs that referenced nonexistent companies/staff
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'ai_prompt_log'
  ) then
    alter table public.ai_prompt_log add column if not exists company_id uuid;
    alter table public.ai_prompt_log add column if not exists user_id uuid;
    -- Drop broken FKs if present
    begin
      alter table public.ai_prompt_log drop constraint if exists ai_prompt_log_company_id_fkey;
    exception when others then null;
    end;
    begin
      alter table public.ai_prompt_log drop constraint if exists ai_prompt_log_staff_id_fkey;
    exception when others then null;
    end;
  end if;
end $$;
