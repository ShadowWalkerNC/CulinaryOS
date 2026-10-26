-- ============================================================
-- CulinaryOS V19 - Prep Tasks & Plans Column Reconciliation
-- P06-SCHEMA-01: prep_tasks.prep_plan_id vs plan_id alignment
-- Multi-Tenant RLS Hardening & Cross-Surface Compatibility
-- ============================================================

-- 1. Add tenant_id to prep_plan_items for multi-tenant RLS isolation
ALTER TABLE public.prep_plan_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill tenant_id from parent prep_plans
UPDATE public.prep_plan_items ppi
SET tenant_id = pp.tenant_id
FROM public.prep_plans pp
WHERE ppi.plan_id = pp.id AND ppi.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_prep_plan_items_tenant ON public.prep_plan_items(tenant_id);

-- 2. Add prep_plan_id column aliasing plan_id
ALTER TABLE public.prep_plan_items
  ADD COLUMN IF NOT EXISTS prep_plan_id UUID REFERENCES public.prep_plans(id) ON DELETE CASCADE;

-- Backfill prep_plan_id from plan_id
UPDATE public.prep_plan_items
SET prep_plan_id = plan_id
WHERE prep_plan_id IS NULL AND plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prep_plan_items_prep_plan_id ON public.prep_plan_items(prep_plan_id);

-- 3. Bi-directional column synchronization trigger
-- Keeps plan_id and prep_plan_id synchronized on INSERT and UPDATE
-- Automatically populates tenant_id from parent prep_plans if missing
CREATE OR REPLACE FUNCTION public.sync_prep_plan_item_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync plan_id <-> prep_plan_id with asymmetric update prevention
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.plan_id IS DISTINCT FROM OLD.plan_id) AND (NEW.prep_plan_id IS NOT DISTINCT FROM OLD.prep_plan_id) THEN
      NEW.prep_plan_id := NEW.plan_id;
    ELSIF (NEW.prep_plan_id IS DISTINCT FROM OLD.prep_plan_id) AND (NEW.plan_id IS NOT DISTINCT FROM OLD.plan_id) THEN
      NEW.plan_id := NEW.prep_plan_id;
    ELSIF NEW.plan_id IS NOT NULL AND NEW.prep_plan_id IS NULL THEN
      NEW.prep_plan_id := NEW.plan_id;
    ELSIF NEW.prep_plan_id IS NOT NULL AND NEW.plan_id IS NULL THEN
      NEW.plan_id := NEW.prep_plan_id;
    ELSIF NEW.plan_id IS NOT NULL AND NEW.prep_plan_id IS NOT NULL AND NEW.plan_id <> NEW.prep_plan_id THEN
      NEW.plan_id := NEW.prep_plan_id;
    END IF;
  ELSE
    IF NEW.prep_plan_id IS NOT NULL AND NEW.plan_id IS NULL THEN
      NEW.plan_id := NEW.prep_plan_id;
    ELSIF NEW.plan_id IS NOT NULL AND NEW.prep_plan_id IS NULL THEN
      NEW.prep_plan_id := NEW.plan_id;
    ELSIF NEW.plan_id IS NOT NULL AND NEW.prep_plan_id IS NOT NULL AND NEW.plan_id <> NEW.prep_plan_id THEN
      NEW.plan_id := NEW.prep_plan_id;
    END IF;
  END IF;

  -- Auto-populate tenant_id from parent prep_plans if null
  IF NEW.tenant_id IS NULL THEN
    IF NEW.plan_id IS NOT NULL THEN
      SELECT tenant_id INTO NEW.tenant_id
      FROM public.prep_plans
      WHERE id = NEW.plan_id;
    ELSIF NEW.prep_plan_id IS NOT NULL THEN
      SELECT tenant_id INTO NEW.tenant_id
      FROM public.prep_plans
      WHERE id = NEW.prep_plan_id;
    END IF;

    -- If still null, fallback to public.my_tenant_id()
    IF NEW.tenant_id IS NULL THEN
      NEW.tenant_id := public.my_tenant_id();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_prep_plan_item_columns ON public.prep_plan_items;
CREATE TRIGGER trg_sync_prep_plan_item_columns
  BEFORE INSERT OR UPDATE ON public.prep_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_prep_plan_item_columns();

-- 4. Harden Row-Level Security on prep_plan_items
-- Drop insecure USING (true) policy and enforce strict tenant isolation
DROP POLICY IF EXISTS "prep_plan_items_all" ON public.prep_plan_items;
DROP POLICY IF EXISTS "prep_plan_items_tenant_isolation" ON public.prep_plan_items;

CREATE POLICY "prep_plan_items_tenant_isolation" ON public.prep_plan_items
  FOR ALL
  USING (tenant_id = public.my_tenant_id())
  WITH CHECK (tenant_id = public.my_tenant_id());

-- Ensure unique index on prep_plans for upsert compatibility (kds-server.ts:91)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prep_plans_user_shift_date ON public.prep_plans(user_id, shift, plan_date);

-- 5. Canonical prep_tasks View with Full Backward & Forward Field Compatibility
CREATE OR REPLACE VIEW public.prep_tasks
WITH (security_invoker = true) AS
SELECT
  ppi.id,
  ppi.tenant_id,
  pp.user_id,
  ppi.plan_id,
  ppi.prep_plan_id,
  ppi.plan_id AS prep_list_id,
  ppi.recipe_id,
  ppi.ingredient_name AS task,
  ppi.ingredient_name,
  NULL::text AS station,
  NULL::integer AS estimated_minutes,
  pp.plan_date::text AS scheduled_for,
  ppi.is_done,
  ppi.done_at AS completed_at,
  ppi.done_at,
  0 AS sort_order,
  ppi.prep_amount,
  ppi.unit,
  pp.shift,
  pp.created_at,
  ppi.is_done AS completed,
  CASE WHEN ppi.is_done THEN 'completed' ELSE 'pending' END::text AS status
FROM public.prep_plan_items ppi
LEFT JOIN public.prep_plans pp ON pp.id = ppi.plan_id;

-- 6. Canonical prep_lists View Aliasing prep_plans for RecipeOS
CREATE OR REPLACE VIEW public.prep_lists
WITH (security_invoker = true) AS
SELECT
  pp.id,
  pp.tenant_id,
  pp.user_id,
  (pp.shift || ' Prep (' || pp.plan_date::text || ')') AS name,
  NULL::uuid AS recipe_id,
  pp.is_completed,
  pp.completed_at,
  pp.shift,
  pp.plan_date,
  pp.created_at
FROM public.prep_plans pp;

-- 7. Updatable View Triggers for public.prep_tasks
CREATE OR REPLACE FUNCTION public.trg_prep_tasks_view_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_inserted_id UUID;
  v_tenant_id UUID;
  v_is_done BOOLEAN;
  v_done_at TIMESTAMPTZ;
BEGIN
  v_plan_id := COALESCE(NEW.plan_id, NEW.prep_plan_id, NEW.prep_list_id);
  -- Strictly enforce tenant isolation: prevent client-injected cross-tenant writes
  NEW.tenant_id := public.my_tenant_id();
  v_tenant_id := NEW.tenant_id;

  IF NEW.is_done = true OR NEW.completed = true OR NEW.status = 'completed' THEN
    v_is_done := true;
    v_done_at := COALESCE(NEW.completed_at, NEW.done_at, now());
  ELSE
    v_is_done := false;
    v_done_at := NULL;
  END IF;

  INSERT INTO public.prep_plan_items (
    id,
    tenant_id,
    plan_id,
    prep_plan_id,
    recipe_id,
    ingredient_name,
    prep_amount,
    unit,
    is_done,
    done_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    v_tenant_id,
    v_plan_id,
    v_plan_id,
    NEW.recipe_id,
    COALESCE(NEW.task, NEW.ingredient_name, 'Prep Task'),
    COALESCE(NEW.prep_amount, 1),
    COALESCE(NEW.unit, 'ea'),
    v_is_done,
    v_done_at
  )
  RETURNING id INTO v_inserted_id;

  NEW.id := v_inserted_id;
  NEW.is_done := v_is_done;
  NEW.completed := v_is_done;
  NEW.status := CASE WHEN v_is_done THEN 'completed' ELSE 'pending' END;
  NEW.done_at := v_done_at;
  NEW.completed_at := v_done_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prep_tasks_insert ON public.prep_tasks;
CREATE TRIGGER trg_prep_tasks_insert
  INSTEAD OF INSERT ON public.prep_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prep_tasks_view_insert();

CREATE OR REPLACE FUNCTION public.trg_prep_tasks_view_update()
RETURNS TRIGGER AS $$
DECLARE
  v_is_done BOOLEAN;
  v_done_at TIMESTAMPTZ;
BEGIN
  -- Determine completion state and handle unchecking
  IF NEW.is_done = false
     OR NEW.completed = false
     OR (NEW.status IS NOT NULL AND NEW.status <> 'completed')
     OR (NEW.completed_at IS NULL AND (OLD.completed_at IS NOT NULL OR OLD.done_at IS NOT NULL) AND NEW.is_done IS NOT DISTINCT FROM OLD.is_done)
  THEN
    -- When unchecking tasks, ensure both completed_at and done_at are cleared to null
    v_is_done := false;
    v_done_at := NULL;
  ELSIF NEW.is_done = true
     OR NEW.completed = true
     OR NEW.status = 'completed'
  THEN
    v_is_done := true;
    v_done_at := CASE
      WHEN NEW.completed_at IS NOT NULL THEN NEW.completed_at
      WHEN NEW.done_at IS NOT NULL AND NEW.done_at IS DISTINCT FROM OLD.done_at THEN NEW.done_at
      WHEN OLD.is_done = false OR OLD.done_at IS NULL THEN now()
      ELSE OLD.done_at
    END;
  ELSE
    v_is_done := OLD.is_done;
    v_done_at := CASE
      WHEN NEW.completed_at IS NOT NULL THEN NEW.completed_at
      WHEN NEW.done_at IS NOT NULL AND NEW.done_at IS DISTINCT FROM OLD.done_at THEN NEW.done_at
      ELSE OLD.done_at
    END;
  END IF;

  UPDATE public.prep_plan_items
  SET
    is_done = v_is_done,
    done_at = v_done_at,
    prep_amount = COALESCE(NEW.prep_amount, prep_amount),
    unit = COALESCE(NEW.unit, unit),
    ingredient_name = COALESCE(NEW.task, NEW.ingredient_name, ingredient_name),
    recipe_id = COALESCE(NEW.recipe_id, recipe_id),
    plan_id = COALESCE(NEW.plan_id, NEW.prep_plan_id, NEW.prep_list_id, plan_id),
    prep_plan_id = COALESCE(NEW.prep_plan_id, NEW.plan_id, NEW.prep_list_id, prep_plan_id),
    tenant_id = COALESCE(NEW.tenant_id, tenant_id)
  WHERE id = OLD.id;

  NEW.is_done := v_is_done;
  NEW.completed := v_is_done;
  NEW.status := CASE WHEN v_is_done THEN 'completed' ELSE 'pending' END;
  NEW.done_at := v_done_at;
  NEW.completed_at := v_done_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prep_tasks_update ON public.prep_tasks;
CREATE TRIGGER trg_prep_tasks_update
  INSTEAD OF UPDATE ON public.prep_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prep_tasks_view_update();

CREATE OR REPLACE FUNCTION public.trg_prep_tasks_view_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.prep_plan_items WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prep_tasks_delete ON public.prep_tasks;
CREATE TRIGGER trg_prep_tasks_delete
  INSTEAD OF DELETE ON public.prep_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prep_tasks_view_delete();

-- 8. Updatable View Triggers for public.prep_lists
CREATE OR REPLACE FUNCTION public.trg_prep_lists_view_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_inserted_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Strictly enforce tenant isolation: prevent client-injected cross-tenant writes
  NEW.tenant_id := public.my_tenant_id();
  v_tenant_id := NEW.tenant_id;

  INSERT INTO public.prep_plans (
    id,
    tenant_id,
    user_id,
    shift,
    plan_date,
    is_completed,
    completed_at,
    created_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    v_tenant_id,
    COALESCE(NEW.user_id, auth.uid()),
    COALESCE(NEW.shift, 'Morning'),
    COALESCE(NEW.plan_date, current_date),
    COALESCE(NEW.is_completed, false),
    NEW.completed_at,
    COALESCE(NEW.created_at, now())
  )
  RETURNING id INTO v_inserted_id;

  NEW.id := v_inserted_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prep_lists_insert ON public.prep_lists;
CREATE TRIGGER trg_prep_lists_insert
  INSTEAD OF INSERT ON public.prep_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prep_lists_view_insert();

CREATE OR REPLACE FUNCTION public.trg_prep_lists_view_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.prep_plans
  SET
    is_completed = COALESCE(NEW.is_completed, is_completed),
    completed_at = CASE
      WHEN NEW.completed_at IS NOT NULL THEN NEW.completed_at
      WHEN NEW.is_completed = true AND is_completed = false THEN now()
      WHEN NEW.is_completed = false THEN NULL
      ELSE completed_at
    END,
    shift = COALESCE(NEW.shift, shift),
    plan_date = COALESCE(NEW.plan_date, plan_date),
    tenant_id = COALESCE(NEW.tenant_id, tenant_id),
    user_id = COALESCE(NEW.user_id, user_id)
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prep_lists_update ON public.prep_lists;
CREATE TRIGGER trg_prep_lists_update
  INSTEAD OF UPDATE ON public.prep_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prep_lists_view_update();

CREATE OR REPLACE FUNCTION public.trg_prep_lists_view_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.prep_plans WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prep_lists_delete ON public.prep_lists;
CREATE TRIGGER trg_prep_lists_delete
  INSTEAD OF DELETE ON public.prep_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_prep_lists_view_delete();

-- Grant view permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prep_tasks TO authenticated, service_role, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prep_lists TO authenticated, service_role, anon;

-- 9. RPC Function: build_shift_prep
-- Called by mcp/src/kds-server.ts:75
CREATE OR REPLACE FUNCTION public.build_shift_prep(
  p_user_id UUID DEFAULT NULL,
  p_shift TEXT DEFAULT 'Morning',
  p_date DATE DEFAULT current_date
)
RETURNS TABLE (
  ingredient_name TEXT,
  current_stock NUMERIC,
  par_amount NUMERIC,
  prep_amount NUMERIC,
  unit TEXT,
  recipe_id UUID
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_effective_user_id UUID;
  v_effective_tenant_id UUID;
BEGIN
  v_effective_user_id := COALESCE(p_user_id, auth.uid());
  v_effective_tenant_id := public.my_tenant_id();

  -- If tenant_id was not resolved from context, try resolving from user_id if present
  IF v_effective_tenant_id IS NULL AND v_effective_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_effective_tenant_id
    FROM public.tenant_users
    WHERE user_id = v_effective_user_id
    LIMIT 1;
  END IF;

  -- Fail closed: require valid tenant context
  IF v_effective_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: missing tenant context';
  END IF;

  RETURN QUERY
  SELECT
    pl.ingredient_name,
    pl.current_stock,
    pl.par_amount,
    ROUND((pl.par_amount - pl.current_stock), 2) AS prep_amount,
    pl.unit,
    pl.recipe_id
  FROM public.par_levels pl
  WHERE
    (
      pl.tenant_id = v_effective_tenant_id
      OR (v_effective_user_id IS NOT NULL AND pl.user_id = v_effective_user_id)
    )
    AND pl.current_stock < pl.par_amount
  ORDER BY pl.ingredient_name;
END;
$$;

REVOKE ALL ON FUNCTION public.build_shift_prep(UUID, TEXT, DATE) FROM public;
REVOKE EXECUTE ON FUNCTION public.build_shift_prep(UUID, TEXT, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.build_shift_prep(UUID, TEXT, DATE) TO authenticated, service_role;
