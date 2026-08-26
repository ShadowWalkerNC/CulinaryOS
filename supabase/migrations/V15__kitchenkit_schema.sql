-- ============================================================
-- CulinaryOS V15 — KitchenKit Integrated Schema & RPCs
-- ============================================================

-- 1. Recipes Table
CREATE TABLE IF NOT EXISTS public.recipes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id             UUID,
  name                TEXT NOT NULL,
  description         TEXT,
  base_ingredient     TEXT NOT NULL,
  yield_unit          TEXT NOT NULL DEFAULT 'g',
  base_yield_portions NUMERIC NOT NULL DEFAULT 1,
  station             TEXT,
  is_public           BOOLEAN NOT NULL DEFAULT false,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_tenant ON public.recipes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_user ON public.recipes(user_id);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_select" ON public.recipes
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    OR user_id = auth.uid()
    OR is_public = true
    OR auth.uid() IS NULL
  );

CREATE POLICY "recipes_modify" ON public.recipes
  FOR ALL USING (
    tenant_id = public.my_tenant_id()
    OR user_id = auth.uid()
    OR auth.uid() IS NULL
  );

-- 2. Recipe Ingredients Table (Sub-recipes supported)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id      UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  ratio          NUMERIC NOT NULL,
  unit           TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  sub_recipe_id  UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_sub_recipe ON public.recipe_ingredients(sub_recipe_id);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_ing_select" ON public.recipe_ingredients
  FOR SELECT USING (true);

CREATE POLICY "recipe_ing_modify" ON public.recipe_ingredients
  FOR ALL USING (true);

-- 3. Par Levels Table
CREATE TABLE IF NOT EXISTS public.par_levels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id          UUID,
  recipe_id        UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  ingredient_name  TEXT NOT NULL,
  par_amount       NUMERIC NOT NULL DEFAULT 0,
  current_stock    NUMERIC NOT NULL DEFAULT 0,
  unit             TEXT NOT NULL DEFAULT 'g',
  shelf_life_days  INTEGER DEFAULT 7,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_par_levels_tenant ON public.par_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_par_levels_user ON public.par_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_par_levels_recipe_id ON public.par_levels(recipe_id);

ALTER TABLE public.par_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "par_levels_select" ON public.par_levels
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    OR user_id = auth.uid()
    OR auth.uid() IS NULL
  );

CREATE POLICY "par_levels_modify" ON public.par_levels
  FOR ALL USING (
    tenant_id = public.my_tenant_id()
    OR user_id = auth.uid()
    OR auth.uid() IS NULL
  );

-- 4. Prep Plans & Items
CREATE TABLE IF NOT EXISTS public.prep_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      UUID,
  shift        TEXT NOT NULL,
  plan_date    DATE NOT NULL DEFAULT current_date,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prep_plans_tenant ON public.prep_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prep_plans_user ON public.prep_plans(user_id);

ALTER TABLE public.prep_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prep_plans_all" ON public.prep_plans
  FOR ALL USING (
    tenant_id = public.my_tenant_id()
    OR user_id = auth.uid()
    OR auth.uid() IS NULL
  );

CREATE TABLE IF NOT EXISTS public.prep_plan_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID REFERENCES public.prep_plans(id) ON DELETE CASCADE,
  recipe_id       UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  ingredient_name TEXT NOT NULL,
  prep_amount     NUMERIC NOT NULL,
  unit            TEXT NOT NULL,
  is_done         BOOLEAN NOT NULL DEFAULT false,
  done_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prep_plan_items_plan ON public.prep_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_prep_plan_items_recipe ON public.prep_plan_items(recipe_id);

ALTER TABLE public.prep_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prep_plan_items_all" ON public.prep_plan_items
  FOR ALL USING (true);

-- 5. Vendors & Vendor Items
CREATE TABLE IF NOT EXISTS public.vendors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id           UUID,
  name              TEXT NOT NULL,
  contact_name      TEXT,
  email             TEXT,
  phone             TEXT,
  order_days        TEXT[] DEFAULT '{}',
  min_order_amount  NUMERIC(10,2) DEFAULT 0.00,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON public.vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_user ON public.vendors(user_id);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_all" ON public.vendors
  FOR ALL USING (
    tenant_id = public.my_tenant_id()
    OR user_id = auth.uid()
    OR auth.uid() IS NULL
  );

CREATE TABLE IF NOT EXISTS public.vendor_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id         UUID,
  ingredient_name TEXT NOT NULL,
  sku             TEXT,
  package_size    TEXT,
  unit_cost       NUMERIC(10,2) DEFAULT 0.00,
  is_preferred    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor ON public.vendor_items(vendor_id);

ALTER TABLE public.vendor_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_items_all" ON public.vendor_items
  FOR ALL USING (true);

-- 6. Inventory Batches (Shelf Life)
CREATE TABLE IF NOT EXISTS public.inventory_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id          UUID,
  ingredient_name  TEXT NOT NULL,
  quantity         NUMERIC NOT NULL DEFAULT 0,
  unit             TEXT NOT NULL DEFAULT 'g',
  received_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date  DATE NOT NULL,
  storage_location TEXT DEFAULT 'Walk-in Cooler',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_tenant ON public.inventory_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_exp ON public.inventory_batches(expiration_date);

ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_batches_all" ON public.inventory_batches
  FOR ALL USING (true);

-- 7. Waste Logs
CREATE TABLE IF NOT EXISTS public.waste_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id         UUID,
  ingredient_name TEXT NOT NULL,
  quantity        NUMERIC NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'g',
  reason          TEXT NOT NULL DEFAULT 'Expired',
  cost            NUMERIC(10,2) DEFAULT 0.00,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waste_logs_tenant ON public.waste_logs(tenant_id);

ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waste_logs_all" ON public.waste_logs
  FOR ALL USING (true);

-- 8. RPC: get_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_effective_user_id uuid;
  v_total_recipes bigint;
  v_total_par_items bigint;
  v_below_par_items bigint;
  v_active_prep_plans bigint;
BEGIN
  v_effective_user_id := COALESCE(p_user_id, auth.uid());

  SELECT count(*) INTO v_total_recipes
  FROM public.recipes
  WHERE user_id = v_effective_user_id OR tenant_id = public.my_tenant_id() OR v_effective_user_id IS NULL;

  SELECT count(*) INTO v_total_par_items
  FROM public.par_levels
  WHERE user_id = v_effective_user_id OR tenant_id = public.my_tenant_id() OR v_effective_user_id IS NULL;

  SELECT count(*) INTO v_below_par_items
  FROM public.par_levels
  WHERE (user_id = v_effective_user_id OR tenant_id = public.my_tenant_id() OR v_effective_user_id IS NULL)
    AND current_stock < par_amount;

  SELECT count(*) INTO v_active_prep_plans
  FROM public.prep_plans
  WHERE (user_id = v_effective_user_id OR tenant_id = public.my_tenant_id() OR v_effective_user_id IS NULL)
    AND is_completed = false;

  RETURN json_build_object(
    'total_recipes',     COALESCE(v_total_recipes, 0),
    'total_par_items',   COALESCE(v_total_par_items, 0),
    'below_par_items',   COALESCE(v_below_par_items, 0),
    'active_prep_plans', COALESCE(v_active_prep_plans, 0)
  );
END;
$$;
