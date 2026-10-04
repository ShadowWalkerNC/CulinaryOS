-- ============================================================
-- CulinaryOS pg-foundation 003 — menus, tabs, orders, line items
-- Ported from V3 (+V10 order columns). Additive deltas vs V3: tenant_id on
-- modifier_groups/modifiers/line_item_modifiers, missing tenant FKs, and
-- composite (tenant_id, id) FKs so child rows cannot reference another
-- tenant's parent. Money stays integer cents. No card data anywhere.
-- ============================================================

-- ---- MENUS ----
CREATE TABLE public.menus (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);
CREATE INDEX idx_menus_tenant ON public.menus(tenant_id, status);

CREATE TABLE public.menu_sections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id    uuid NOT NULL,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, id),
  CONSTRAINT fk_menu_sections_menu FOREIGN KEY (tenant_id, menu_id)
    REFERENCES public.menus(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_menu_sections_menu ON public.menu_sections(menu_id, sort_order);

CREATE TABLE public.menu_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   uuid NOT NULL,
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  price        int NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'available' CHECK (status IN ('available','unavailable','86d')),
  station      text NOT NULL DEFAULT 'hot' CHECK (station IN ('hot','cold','grill','fry','sauce','pastry','pass','bar')),
  recipe_id    uuid,
  allergens    text[] NOT NULL DEFAULT '{}',
  image_url    text,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  CONSTRAINT fk_menu_items_section FOREIGN KEY (tenant_id, section_id)
    REFERENCES public.menu_sections(tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_menu_items_section ON public.menu_items(section_id, sort_order);
CREATE INDEX idx_menu_items_tenant ON public.menu_items(tenant_id, status);
CREATE INDEX idx_menu_items_name_trgm ON public.menu_items USING gin(name gin_trgm_ops);

CREATE TABLE public.modifier_groups (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id   uuid NOT NULL,
  tenant_id      uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name           text NOT NULL,
  required       boolean NOT NULL DEFAULT false,
  min_selections int NOT NULL DEFAULT 0,
  max_selections int NOT NULL DEFAULT 1,
  sort_order     int NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, id),
  CONSTRAINT fk_modifier_groups_item FOREIGN KEY (tenant_id, menu_item_id)
    REFERENCES public.menu_items(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE public.modifiers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_group_id uuid NOT NULL,
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name              text NOT NULL,
  price_adjustment  int NOT NULL DEFAULT 0,
  is_default        boolean NOT NULL DEFAULT false,
  UNIQUE (tenant_id, id),
  CONSTRAINT fk_modifiers_group FOREIGN KEY (tenant_id, modifier_group_id)
    REFERENCES public.modifier_groups(tenant_id, id) ON DELETE CASCADE
);

-- ---- TABS ----
CREATE TABLE public.tabs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_number text,
  cover_count  int,
  server_name  text,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','transferred')),
  opened_at    timestamptz NOT NULL DEFAULT now(),
  closed_at    timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id)
);
CREATE INDEX idx_tabs_tenant_status ON public.tabs(tenant_id, status);

-- ---- ORDERS ----
CREATE TABLE public.pos_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tab_id       uuid,
  order_number serial,
  table_number text,
  cover_count  int,
  server_name  text,
  status       text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','sent','in-progress','ready','served','paid','voided')),
  notes        text,
  subtotal     int NOT NULL DEFAULT 0,
  tax          int NOT NULL DEFAULT 0,
  total        int NOT NULL DEFAULT 0,
  total_cents  int GENERATED ALWAYS AS (total) STORED,
  covers       int NOT NULL DEFAULT 1,
  fired_at     timestamptz,
  paid_at      timestamptz,
  voided_at    timestamptz,
  void_reason  text,
  closed_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  CONSTRAINT fk_pos_orders_tab FOREIGN KEY (tenant_id, tab_id)
    REFERENCES public.tabs(tenant_id, id) ON DELETE SET NULL
);
CREATE INDEX idx_orders_tenant_status ON public.pos_orders(tenant_id, status);
CREATE INDEX idx_orders_tab ON public.pos_orders(tab_id);

CREATE TABLE public.pos_order_line_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  menu_item_id     uuid NOT NULL,
  name             text NOT NULL,
  quantity         int NOT NULL DEFAULT 1,
  unit_price       int NOT NULL,
  line_total       int NOT NULL,
  station          text NOT NULL,
  course_number    int NOT NULL DEFAULT 1,
  recipe_id        uuid,
  notes            text,
  void_reason      text,
  is_voided        boolean NOT NULL DEFAULT false,
  sort_order       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  CONSTRAINT fk_oli_order FOREIGN KEY (tenant_id, order_id)
    REFERENCES public.pos_orders(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_oli_menu_item FOREIGN KEY (tenant_id, menu_item_id)
    REFERENCES public.menu_items(tenant_id, id)
);
CREATE INDEX idx_oli_order ON public.pos_order_line_items(order_id);
CREATE INDEX idx_oli_tenant ON public.pos_order_line_items(tenant_id);

CREATE TABLE public.line_item_modifiers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id     uuid NOT NULL,
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  modifier_id      uuid,
  name             text NOT NULL,
  price_adjustment int NOT NULL DEFAULT 0,
  CONSTRAINT fk_lim_line_item FOREIGN KEY (tenant_id, line_item_id)
    REFERENCES public.pos_order_line_items(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_lim_modifier FOREIGN KEY (tenant_id, modifier_id)
    REFERENCES public.modifiers(tenant_id, id) ON DELETE SET NULL
);

-- Stamp closed_at on paid/voided transitions (ported from V10).
CREATE OR REPLACE FUNCTION public.set_order_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid', 'voided') AND OLD.status NOT IN ('paid', 'voided') THEN
    NEW.closed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_order_closed_at BEFORE UPDATE ON public.pos_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_closed_at();

CREATE TRIGGER trg_menus_updated_at BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.pos_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tabs_updated_at BEFORE UPDATE ON public.tabs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- RLS (enabled + forced on every table) ----
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus FORCE ROW LEVEL SECURITY;
CREATE POLICY "menus_select" ON public.menus FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "menus_insert" ON public.menus FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "menus_update" ON public.menus FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "menus_delete" ON public.menus FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_sections FORCE ROW LEVEL SECURITY;
CREATE POLICY "ms_select" ON public.menu_sections FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "ms_insert" ON public.menu_sections FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "ms_update" ON public.menu_sections FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "ms_delete" ON public.menu_sections FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items FORCE ROW LEVEL SECURITY;
CREATE POLICY "mi_select" ON public.menu_items FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "mi_insert" ON public.menu_items FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "mi_update" ON public.menu_items FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "mi_delete" ON public.menu_items FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups FORCE ROW LEVEL SECURITY;
CREATE POLICY "mg_select" ON public.modifier_groups FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "mg_insert" ON public.modifier_groups FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "mg_update" ON public.modifier_groups FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "mg_delete" ON public.modifier_groups FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers FORCE ROW LEVEL SECURITY;
CREATE POLICY "mod_select" ON public.modifiers FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "mod_insert" ON public.modifiers FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "mod_update" ON public.modifiers FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "mod_delete" ON public.modifiers FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabs FORCE ROW LEVEL SECURITY;
CREATE POLICY "tabs_select" ON public.tabs FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "tabs_insert" ON public.tabs FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "tabs_update" ON public.tabs FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "tabs_delete" ON public.tabs FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY "orders_select" ON public.pos_orders FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "orders_insert" ON public.pos_orders FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "orders_update" ON public.pos_orders FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "orders_delete" ON public.pos_orders FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.pos_order_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_line_items FORCE ROW LEVEL SECURITY;
CREATE POLICY "oli_select" ON public.pos_order_line_items FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "oli_insert" ON public.pos_order_line_items FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "oli_update" ON public.pos_order_line_items FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "oli_delete" ON public.pos_order_line_items FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.line_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_item_modifiers FORCE ROW LEVEL SECURITY;
CREATE POLICY "lim_select" ON public.line_item_modifiers FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "lim_insert" ON public.line_item_modifiers FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "lim_update" ON public.line_item_modifiers FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "lim_delete" ON public.line_item_modifiers FOR DELETE USING (tenant_id = public.app_tenant_id());

-- ---- Grants ----
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.menus, public.menu_sections, public.menu_items,
  public.modifier_groups, public.modifiers, public.tabs,
  public.pos_orders, public.pos_order_line_items, public.line_item_modifiers
  TO culinaryos_app;
GRANT USAGE, SELECT ON SEQUENCE public.pos_orders_order_number_seq TO culinaryos_app;
