-- ============================================================
-- CulinaryOS V1 — Tenants & Auth
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

create table public.tenants (
  id         uuid primary key default uuid_generate_v4(),
  slug       text not null unique,
  name       text not null,
  plan       text not null default 'starter' check (plan in ('starter','pro','enterprise')),
  status     text not null default 'active'  check (status in ('active','suspended','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_users (
  id         uuid primary key default uuid_generate_v4(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'viewer' check (role in ('owner','manager','chef','server','viewer')),
  created_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);

create index idx_tenant_users_tenant on public.tenant_users(tenant_id);
create index idx_tenant_users_user   on public.tenant_users(user_id);

-- Helper: get calling user's tenant_id (used in RLS)
create or replace function public.my_tenant_id()
returns uuid language sql stable as $$
  select tenant_id from public.tenant_users where user_id = auth.uid() limit 1;
$$;

create or replace function public.my_role(p_tenant_id uuid)
returns text language sql stable as $$
  select role from public.tenant_users where user_id = auth.uid() and tenant_id = p_tenant_id limit 1;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
