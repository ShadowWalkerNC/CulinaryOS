-- ============================================================
-- CulinaryOS V2 — KDS Schema
-- kitchen_tickets + ticket_items
-- ============================================================

create table public.kitchen_tickets (
  id                uuid    primary key default uuid_generate_v4(),
  tenant_id         uuid    not null references public.tenants(id) on delete cascade,
  order_id          uuid    not null,                -- FK to pos_orders (added in V3)
  order_number      int     not null,
  station           text    not null check (station in ('hot','cold','grill','fry','sauce','pastry','pass','bar')),
  status            text    not null default 'queued' check (status in ('queued','fired','cooking','bumped','recalled','voided')),
  priority          text    not null default 'normal' check (priority in ('normal','rush','allergy')),
  table_number      text,
  cover_count       int,
  course_number     int     not null default 1,
  notes             text,
  void_reason       text,
  fired_at          timestamptz,
  bumped_at         timestamptz,
  cook_time_seconds int,                             -- recorded when bumped
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_kt_tenant_status  on public.kitchen_tickets(tenant_id, status);
create index idx_kt_tenant_station on public.kitchen_tickets(tenant_id, station, status);
create index idx_kt_order          on public.kitchen_tickets(order_id);

create table public.ticket_items (
  id           uuid primary key default uuid_generate_v4(),
  ticket_id    uuid not null references public.kitchen_tickets(id) on delete cascade,
  line_item_id uuid not null,                        -- FK to pos_order_line_items
  name         text not null,
  quantity     int  not null default 1,
  modifiers    text[] not null default '{}',
  notes        text,
  sort_order   int  not null default 0
);

create index idx_ticket_items_ticket on public.ticket_items(ticket_id, sort_order);

create trigger trg_kt_updated_at before update on public.kitchen_tickets
  for each row execute function public.set_updated_at();

-- Station summary view (used by CLI + MCP get_station_summary)
create or replace view public.station_summary as
select
  tenant_id,
  station,
  count(*) filter (where status in ('queued','fired','cooking')) as active_count,
  count(*) filter (where status = 'bumped')                       as bumped_count,
  round(avg(cook_time_seconds) filter (where cook_time_seconds is not null)) as avg_cook_seconds
from public.kitchen_tickets
group by tenant_id, station;
