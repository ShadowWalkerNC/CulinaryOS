-- ============================================================
-- CulinaryOS V8 — Course Firing
-- Adds course_hold_status to kitchen_tickets and a course_fire_log
-- ============================================================

-- Track hold state on each ticket
alter table public.kitchen_tickets
  add column if not exists course_number      int          not null default 1,
  add column if not exists course_hold_status text         not null default 'firing'
    check (course_hold_status in ('held','firing','fired')),
  add column if not exists held_at            timestamptz,
  add column if not exists fired_at           timestamptz;

create index idx_kt_course on public.kitchen_tickets(order_id, course_number);

-- Log every course fire event for audit / analytics
create table public.course_fire_log (
  id           uuid        primary key default uuid_generate_v4(),
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  order_id     uuid        not null,
  course_number int        not null,
  fired_by     text,           -- 'auto' | server_name | 'system'
  fired_at     timestamptz not null default now(),
  ticket_ids   uuid[]      not null default '{}'
);

create index idx_cfl_order  on public.course_fire_log(order_id, course_number);
create index idx_cfl_tenant on public.course_fire_log(tenant_id, fired_at desc);

alter table public.course_fire_log enable row level security;
create policy "cfl_select" on public.course_fire_log for select using (tenant_id = public.my_tenant_id());
create policy "cfl_insert" on public.course_fire_log for insert with check (tenant_id = public.my_tenant_id());

-- Add course_fire_log to realtime
alter publication supabase_realtime add table public.course_fire_log;

-- View: pending courses per order (held tickets grouped by course)
create view public.order_course_status as
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
