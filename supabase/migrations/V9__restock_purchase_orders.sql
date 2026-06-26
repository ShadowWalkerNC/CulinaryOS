-- ============================================================
-- CulinaryOS V9 — Restock Purchase Orders
-- Flow: low-stock alert → draft PO → approve → sent → received
-- ============================================================

-- PO status enum
create type public.po_status as enum ('draft', 'approved', 'sent', 'received', 'cancelled');

-- Purchase order header
create table if not exists public.restock_purchase_orders (
  id             uuid        primary key default uuid_generate_v4(),
  tenant_id      uuid        not null references public.tenants(id) on delete cascade,
  po_number      text        not null,  -- human-readable e.g. "PO-2026-0001"
  status         public.po_status not null default 'draft',
  supplier       text,
  notes          text,
  created_by     text        not null,
  approved_by    text,
  approved_at    timestamptz,
  sent_at        timestamptz,
  expected_at    date,
  received_at    timestamptz,
  total_cost     numeric     not null default 0, -- cents, computed on approve
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, po_number)
);

create index idx_po_tenant_status on public.restock_purchase_orders(tenant_id, status);
create index idx_po_tenant_created on public.restock_purchase_orders(tenant_id, created_at desc);

create trigger set_updated_at_po
  before update on public.restock_purchase_orders
  for each row execute function public.set_updated_at();

alter table public.restock_purchase_orders enable row level security;
create policy "po_select_own" on public.restock_purchase_orders
  for select using (tenant_id = public.my_tenant_id());
create policy "po_modify_own" on public.restock_purchase_orders
  for all using (tenant_id = public.my_tenant_id());

-- PO line items — one row per ingredient ordered
create table if not exists public.po_line_items (
  id              uuid    primary key default uuid_generate_v4(),
  po_id           uuid    not null references public.restock_purchase_orders(id) on delete cascade,
  ingredient_id   uuid    not null references public.ingredients(id) on delete restrict,
  ingredient_name text    not null,  -- denormalised for historical accuracy
  unit            text    not null,
  ordered_qty     numeric not null check (ordered_qty > 0),
  received_qty    numeric not null default 0,
  unit_cost       numeric not null default 0, -- cents
  created_at      timestamptz not null default now()
);

create index idx_poli_po          on public.po_line_items(po_id);
create index idx_poli_ingredient  on public.po_line_items(ingredient_id);

alter table public.po_line_items enable row level security;
create policy "poli_select" on public.po_line_items for select using (
  exists (
    select 1 from public.restock_purchase_orders p
    where p.id = po_id and p.tenant_id = public.my_tenant_id()
  )
);
create policy "poli_modify" on public.po_line_items for all using (
  exists (
    select 1 from public.restock_purchase_orders p
    where p.id = po_id and p.tenant_id = public.my_tenant_id()
  )
);

-- Enable Realtime for live admin dashboard updates
alter publication supabase_realtime add table public.restock_purchase_orders;
alter publication supabase_realtime add table public.po_line_items;

-- Helper: generate sequential PO number for a tenant
create or replace function public.next_po_number(p_tenant_id uuid)
returns text
language plpgsql security definer
as $$
declare
  seq int;
begin
  select coalesce(count(*), 0) + 1
  into   seq
  from   public.restock_purchase_orders
  where  tenant_id = p_tenant_id;
  return 'PO-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 4, '0');
end;
$$;
