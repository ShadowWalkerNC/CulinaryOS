-- ============================================================
-- CulinaryOS V3 — POS Schema
-- menus, menu_sections, menu_items, modifiers
-- pos_orders, pos_order_line_items
-- tabs, payments
-- ============================================================

-- ---- MENUS ----

create table public.menus (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  name         text not null,
  description  text,
  status       text not null default 'draft' check (status in ('draft','active','archived')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_menus_tenant on public.menus(tenant_id, status);

create table public.menu_sections (
  id         uuid primary key default uuid_generate_v4(),
  menu_id    uuid not null references public.menus(id) on delete cascade,
  tenant_id  uuid not null,
  name       text not null,
  sort_order int  not null default 0
);

create index idx_menu_sections_menu on public.menu_sections(menu_id, sort_order);

create table public.menu_items (
  id           uuid    primary key default uuid_generate_v4(),
  section_id   uuid    not null references public.menu_sections(id) on delete cascade,
  tenant_id    uuid    not null,
  name         text    not null,
  description  text,
  price        int     not null default 0,    -- cents
  status       text    not null default 'available' check (status in ('available','unavailable','86d')),
  station      text    not null default 'hot' check (station in ('hot','cold','grill','fry','sauce','pastry','pass','bar')),
  recipe_id    uuid,                          -- RecipeOS link (cross-service, not FK)
  allergens    text[]  not null default '{}',
  image_url    text,
  sort_order   int     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_menu_items_section  on public.menu_items(section_id, sort_order);
create index idx_menu_items_tenant   on public.menu_items(tenant_id, status);
create index idx_menu_items_name_trgm on public.menu_items using gin(name gin_trgm_ops);

create table public.modifier_groups (
  id             uuid primary key default uuid_generate_v4(),
  menu_item_id   uuid not null references public.menu_items(id) on delete cascade,
  name           text not null,
  required       boolean not null default false,
  min_selections int not null default 0,
  max_selections int not null default 1,
  sort_order     int not null default 0
);

create table public.modifiers (
  id                uuid    primary key default uuid_generate_v4(),
  modifier_group_id uuid    not null references public.modifier_groups(id) on delete cascade,
  name              text    not null,
  price_adjustment  int     not null default 0,    -- cents, can be negative
  is_default        boolean not null default false
);

-- ---- TABS ----

create table public.tabs (
  id           uuid primary key default uuid_generate_v4(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  table_number text,
  cover_count  int,
  server_name  text,
  status       text not null default 'open' check (status in ('open','closed','transferred')),
  opened_at    timestamptz not null default now(),
  closed_at    timestamptz,
  updated_at   timestamptz not null default now()
);

create index idx_tabs_tenant_status on public.tabs(tenant_id, status);

-- ---- ORDERS ----

create table public.pos_orders (
  id           uuid    primary key default uuid_generate_v4(),
  tenant_id    uuid    not null references public.tenants(id) on delete cascade,
  tab_id       uuid    references public.tabs(id) on delete set null,
  order_number serial,                              -- human-readable per-tenant (handled by trigger)
  table_number text,
  cover_count  int,
  server_name  text,
  status       text    not null default 'open'
                       check (status in ('open','sent','in-progress','ready','served','paid','voided')),
  notes        text,
  subtotal     int     not null default 0,          -- cents, computed
  tax          int     not null default 0,          -- cents
  total        int     not null default 0,          -- cents
  fired_at     timestamptz,
  paid_at      timestamptz,
  voided_at    timestamptz,
  void_reason  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_orders_tenant_status on public.pos_orders(tenant_id, status);
create index idx_orders_tab           on public.pos_orders(tab_id);

create table public.pos_order_line_items (
  id               uuid primary key default uuid_generate_v4(),
  order_id         uuid not null references public.pos_orders(id) on delete cascade,
  tenant_id        uuid not null,
  menu_item_id     uuid not null references public.menu_items(id),
  name             text not null,                   -- snapshot at time of order
  quantity         int  not null default 1,
  unit_price       int  not null,                   -- cents snapshot
  line_total       int  not null,                   -- computed: qty * unit_price + modifiers
  station          text not null,
  course_number    int  not null default 1,
  recipe_id        uuid,
  notes            text,
  void_reason      text,
  is_voided        boolean not null default false,
  sort_order       int  not null default 0,
  created_at       timestamptz not null default now()
);

create index idx_oli_order   on public.pos_order_line_items(order_id);
create index idx_oli_tenant  on public.pos_order_line_items(tenant_id);

create table public.line_item_modifiers (
  id               uuid primary key default uuid_generate_v4(),
  line_item_id     uuid not null references public.pos_order_line_items(id) on delete cascade,
  modifier_id      uuid references public.modifiers(id) on delete set null,
  name             text not null,                   -- snapshot
  price_adjustment int  not null default 0
);

-- ---- PAYMENTS ----

create table public.payments (
  id             uuid    primary key default uuid_generate_v4(),
  tenant_id      uuid    not null references public.tenants(id) on delete cascade,
  order_id       uuid    not null references public.pos_orders(id) on delete cascade,
  amount         int     not null,                  -- cents
  method         text    not null check (method in ('cash','card','split','comp','gift_card')),
  status         text    not null default 'pending' check (status in ('pending','completed','refunded','failed')),
  tip_amount     int     not null default 0,
  reference_id   text,                              -- external payment processor ref
  processed_at   timestamptz,
  created_at     timestamptz not null default now()
);

create index idx_payments_order  on public.payments(order_id);
create index idx_payments_tenant on public.payments(tenant_id, status);

-- Add FK from kitchen_tickets to pos_orders now that V3 is in place
alter table public.kitchen_tickets
  add constraint fk_kt_order foreign key (order_id) references public.pos_orders(id) on delete cascade;

-- Updated_at triggers
create trigger trg_menus_updated_at       before update on public.menus       for each row execute function public.set_updated_at();
create trigger trg_menu_items_updated_at  before update on public.menu_items  for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at      before update on public.pos_orders  for each row execute function public.set_updated_at();
create trigger trg_tabs_updated_at        before update on public.tabs        for each row execute function public.set_updated_at();
