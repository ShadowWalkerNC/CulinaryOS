-- ============================================================
-- CulinaryOS V5 — Event Bus Audit Log
-- All domain events are persisted here for replay + debugging
-- ============================================================

create table public.domain_events (
  id           uuid        primary key default uuid_generate_v4(),
  event_id     uuid        not null unique,        -- from DomainEvent.eventId
  event_type   text        not null,               -- e.g. 'pos:order:created'
  tenant_id    uuid        not null references public.tenants(id) on delete cascade,
  source       text        not null,               -- service name
  version      int         not null default 1,
  payload      jsonb       not null,
  processed    boolean     not null default false,
  processed_at timestamptz,
  error        text,                               -- set if handler threw
  created_at   timestamptz not null default now()
);

create index idx_de_tenant_type    on public.domain_events(tenant_id, event_type);
create index idx_de_unprocessed    on public.domain_events(processed, created_at) where processed = false;
create index idx_de_created        on public.domain_events(created_at desc);

alter table public.domain_events enable row level security;

create policy "de_select_own_tenant" on public.domain_events
  for select using (tenant_id = public.my_tenant_id());
-- Only service-role / backend can insert/update
