-- ============================================================
-- CulinaryOS pg-foundation 006 — identity hardening + FK repair
-- Fix-forward for the 001-005 chain (those files are immutable).
--
-- 1. Composite ON DELETE SET NULL repair: PostgreSQL nulls EVERY column of
--    a multi-column FK on SET NULL, which would null the NOT NULL tenant_id
--    on pos_orders.line_item_modifiers. Replaced with single-column parent
--    links (nullable side only) plus same-tenant triggers.
-- 2. Dedicated culinaryos_identity role (NOLOGIN, NOBYPASSRLS): owns every
--    SECURITY DEFINER identity function and holds narrow table grants plus
--    explicit TO-role RLS policies, so lookups work under FORCE RLS without
--    superuser or BYPASSRLS.
-- 3. Narrow lifecycle functions: session/device/PIN/membership writes go
--    through constrained SECURITY DEFINER functions that re-verify a live
--    opaque-token session from database state; roles come from membership
--    rows, never from caller arguments.
-- 4. Broad runtime grants on identity tables are revoked: culinaryos_app can
--    no longer raw-read hashes/tokens or raw-write sessions, devices, PINs,
--    or memberships. tenant_users keeps SELECT (no secrets, tenant-scoped).
-- ============================================================

-- ---- 0. Composite ON DELETE SET NULL repair (003 defects) ----
ALTER TABLE public.pos_orders DROP CONSTRAINT IF EXISTS fk_pos_orders_tab;
ALTER TABLE public.pos_orders
  ADD CONSTRAINT fk_pos_orders_tab FOREIGN KEY (tab_id)
  REFERENCES public.tabs(id) ON DELETE SET NULL;

ALTER TABLE public.line_item_modifiers DROP CONSTRAINT IF EXISTS fk_lim_modifier;
ALTER TABLE public.line_item_modifiers
  ADD CONSTRAINT fk_lim_modifier FOREIGN KEY (modifier_id)
  REFERENCES public.modifiers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.assert_pos_order_tab_tenant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tab_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.tabs t
    WHERE t.id = NEW.tab_id AND t.tenant_id = NEW.tenant_id
  ) THEN
    RAISE foreign_key_violation USING MESSAGE = 'pos_orders.tab_id must reference a tab in the same tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pos_orders_tab_tenant ON public.pos_orders;
CREATE TRIGGER trg_pos_orders_tab_tenant
  BEFORE INSERT OR UPDATE OF tab_id, tenant_id ON public.pos_orders
  FOR EACH ROW EXECUTE FUNCTION public.assert_pos_order_tab_tenant();

CREATE OR REPLACE FUNCTION public.assert_lim_modifier_tenant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.modifier_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.modifiers m
    WHERE m.id = NEW.modifier_id AND m.tenant_id = NEW.tenant_id
  ) THEN
    RAISE foreign_key_violation USING MESSAGE = 'line_item_modifiers.modifier_id must reference a modifier in the same tenant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lim_modifier_tenant ON public.line_item_modifiers;
CREATE TRIGGER trg_lim_modifier_tenant
  BEFORE INSERT OR UPDATE OF modifier_id, tenant_id ON public.line_item_modifiers
  FOR EACH ROW EXECUTE FUNCTION public.assert_lim_modifier_tenant();

-- ---- 1. Dedicated identity role (owns definer functions, never logs in) ----
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'culinaryos_identity') THEN
    CREATE ROLE culinaryos_identity WITH NOLOGIN NOBYPASSRLS;
  ELSE
    ALTER ROLE culinaryos_identity WITH NOLOGIN NOBYPASSRLS;
  END IF;
END
$do$;

GRANT USAGE ON SCHEMA public TO culinaryos_identity;

-- The migration login needs membership to transfer function ownership without
-- superuser (ALTER ... OWNER TO requires membership in the new owning role).
DO $do$
BEGIN
  EXECUTE format('GRANT culinaryos_identity TO %I', current_user);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$do$;

-- ---- 2. Explicit TO-role policies (FORCE RLS constrains owners too) ----
-- The identity role reaches these tables ONLY through its SECURITY DEFINER
-- functions (it cannot log in). Each policy below is scoped TO that role, so
-- no other caller gains anything from them.
CREATE POLICY "sess_identity_select" ON public.auth_sessions
  FOR SELECT TO culinaryos_identity USING (true);
CREATE POLICY "sess_identity_insert" ON public.auth_sessions
  FOR INSERT TO culinaryos_identity WITH CHECK (true);
CREATE POLICY "sess_identity_update" ON public.auth_sessions
  FOR UPDATE TO culinaryos_identity USING (true) WITH CHECK (true);

CREATE POLICY "dk_identity_select" ON public.device_keys
  FOR SELECT TO culinaryos_identity USING (true);
CREATE POLICY "dk_identity_insert" ON public.device_keys
  FOR INSERT TO culinaryos_identity WITH CHECK (true);
CREATE POLICY "dk_identity_update" ON public.device_keys
  FOR UPDATE TO culinaryos_identity USING (true) WITH CHECK (true);

CREATE POLICY "tu_identity_select" ON public.tenant_users
  FOR SELECT TO culinaryos_identity USING (true);
CREATE POLICY "tu_identity_insert" ON public.tenant_users
  FOR INSERT TO culinaryos_identity WITH CHECK (true);
CREATE POLICY "tu_identity_delete" ON public.tenant_users
  FOR DELETE TO culinaryos_identity USING (true);

CREATE POLICY "pins_identity_select" ON public.staff_pins
  FOR SELECT TO culinaryos_identity USING (true);
CREATE POLICY "pins_identity_insert" ON public.staff_pins
  FOR INSERT TO culinaryos_identity WITH CHECK (true);
CREATE POLICY "pins_identity_update" ON public.staff_pins
  FOR UPDATE TO culinaryos_identity USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.auth_sessions TO culinaryos_identity;
GRANT SELECT, INSERT, UPDATE ON TABLE public.device_keys TO culinaryos_identity;
GRANT SELECT, INSERT, DELETE ON TABLE public.tenant_users TO culinaryos_identity;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff_pins TO culinaryos_identity;

-- ---- 3. Re-home the 002 lookups under the identity role ----
ALTER FUNCTION public.resolve_identity(text) OWNER TO culinaryos_identity;
ALTER FUNCTION public.find_staff_pin(uuid, text) OWNER TO culinaryos_identity;
REVOKE ALL ON FUNCTION public.resolve_identity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_identity(text) TO culinaryos_app;
REVOKE ALL ON FUNCTION public.find_staff_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_staff_pin(uuid, text) TO culinaryos_app;

-- ---- 4. Narrow lifecycle functions ----
-- Live-session resolution shared by every privileged function below. NOT
-- granted to culinaryos_app: only the identity role's own functions call it
-- (nested SECURITY DEFINER execution runs as the owning identity role).
CREATE OR REPLACE FUNCTION public.identity_session(p_token_hash text)
RETURNS TABLE (tenant_id uuid, user_id uuid, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.tenant_id, s.user_id, tu.role
  FROM public.auth_sessions s
  JOIN public.tenant_users tu
    ON tu.user_id = s.user_id AND tu.tenant_id = s.tenant_id
  LEFT JOIN public.device_keys d ON d.id = s.device_id
  WHERE s.token_hash = p_token_hash
    AND s.revoked_at IS NULL
    AND s.expires_at > now()
    AND (s.device_id IS NULL
      OR (d.revoked_at IS NULL AND (d.expires_at IS NULL OR d.expires_at > now())))
  LIMIT 1;
$$;

-- Mint one opaque session. The role is read from the live membership row,
-- never from a caller argument, so sessions cannot escalate privilege.
CREATE OR REPLACE FUNCTION public.mint_session(
  p_token_hash text, p_user_id uuid, p_tenant_id uuid,
  p_device_id uuid, p_expires_at timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'mint_session: token hash must be 64 lowercase hex chars';
  END IF;
  IF p_expires_at IS NULL OR p_expires_at <= now() OR p_expires_at > now() + interval '30 days' THEN
    RAISE EXCEPTION 'mint_session: expiry must be within (now, now + 30 days]';
  END IF;
  SELECT tu.role INTO v_role
  FROM public.tenant_users tu
  WHERE tu.user_id = p_user_id AND tu.tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE foreign_key_violation USING MESSAGE = 'mint_session: no membership for user in tenant';
  END IF;
  IF p_device_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.device_keys d
      WHERE d.id = p_device_id
        AND d.tenant_id = p_tenant_id
        AND d.revoked_at IS NULL
        AND (d.expires_at IS NULL OR d.expires_at > now())
    ) THEN
      RAISE foreign_key_violation USING MESSAGE = 'mint_session: device is unknown, foreign-tenant, revoked, or expired';
    END IF;
  END IF;
  INSERT INTO public.auth_sessions(token_hash, user_id, tenant_id, role, device_id, expires_at)
  VALUES (p_token_hash, p_user_id, p_tenant_id, v_role, p_device_id, p_expires_at);
  RETURN v_role;
END;
$$;

-- Revoke one session. Allowed for the session itself or for a live
-- owner/manager session in the target's tenant. Returns false (no error)
-- for unknown callers, unknown targets, and cross-tenant attempts.
CREATE OR REPLACE FUNCTION public.revoke_session(p_caller_token_hash text, p_target_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_role text;
  v_target_tenant uuid;
BEGIN
  IF p_target_token_hash IS NULL OR p_target_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'revoke_session: target token hash must be 64 lowercase hex chars';
  END IF;
  SELECT s.tenant_id, s.role INTO v_tenant, v_role
  FROM public.identity_session(p_caller_token_hash) s;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF p_caller_token_hash = p_target_token_hash THEN
    UPDATE public.auth_sessions
    SET revoked_at = now()
    WHERE token_hash = p_target_token_hash AND revoked_at IS NULL;
    RETURN FOUND;
  END IF;
  IF v_role NOT IN ('owner', 'manager') THEN
    RETURN false;
  END IF;
  SELECT s.tenant_id INTO v_target_tenant
  FROM public.auth_sessions s
  WHERE s.token_hash = p_target_token_hash;
  IF NOT FOUND OR v_target_tenant <> v_tenant THEN
    RETURN false;
  END IF;
  UPDATE public.auth_sessions
  SET revoked_at = now()
  WHERE token_hash = p_target_token_hash AND revoked_at IS NULL;
  RETURN FOUND;
END;
$$;

-- Register one device key. Requires a live owner/manager session in the same
-- tenant. Capabilities must be a non-empty JSON array drawn from the device
-- allowlist; manager-only power is unrepresentable by construction.
CREATE OR REPLACE FUNCTION public.register_device_key(
  p_manager_token_hash text, p_key_hash text, p_tenant_id uuid,
  p_label text, p_capabilities jsonb, p_expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_id uuid;
BEGIN
  SELECT s.role INTO v_role
  FROM public.identity_session(p_manager_token_hash) s
  WHERE s.tenant_id = p_tenant_id;
  IF NOT FOUND OR v_role NOT IN ('owner', 'manager') THEN
    RAISE insufficient_privilege USING MESSAGE = 'register_device_key: live owner/manager session in this tenant is required';
  END IF;
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'register_device_key: key hash must be 64 lowercase hex chars';
  END IF;
  IF p_capabilities IS NULL
     OR jsonb_typeof(p_capabilities) <> 'array'
     OR jsonb_array_length(p_capabilities) = 0 THEN
    RAISE EXCEPTION 'register_device_key: capabilities must be a non-empty JSON array';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(p_capabilities) elem
    WHERE elem NOT IN ('orders:read','orders:write','tickets:read','tickets:write','kds:read','sync:replay','menu:read')
  ) THEN
    RAISE EXCEPTION 'register_device_key: capability outside the device allowlist';
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'register_device_key: expiry must be in the future';
  END IF;
  IF p_label IS NOT NULL AND (char_length(p_label) = 0 OR char_length(p_label) > 200) THEN
    RAISE EXCEPTION 'register_device_key: label must be 1-200 chars';
  END IF;
  INSERT INTO public.device_keys(key_hash, tenant_id, label, capabilities, expires_at)
  VALUES (p_key_hash, p_tenant_id, COALESCE(p_label, ''), p_capabilities, p_expires_at)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Revoke one device key. Requires a live owner/manager session in the
-- device's tenant. Sessions bound to the device stop resolving immediately.
CREATE OR REPLACE FUNCTION public.revoke_device_key(p_manager_token_hash text, p_device_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_tenant uuid;
BEGIN
  SELECT s.role, s.tenant_id INTO v_role, v_tenant
  FROM public.identity_session(p_manager_token_hash) s;
  IF NOT FOUND OR v_role NOT IN ('owner', 'manager') THEN
    RETURN false;
  END IF;
  UPDATE public.device_keys d
  SET revoked_at = now()
  WHERE d.id = p_device_id AND d.tenant_id = v_tenant AND d.revoked_at IS NULL;
  RETURN FOUND;
END;
$$;

-- Add one membership. Requires a live owner/manager session in the tenant,
-- except the first-owner bootstrap: a NULL manager token is accepted only
-- when the tenant has zero members and the role is 'owner'. The server still
-- gates bootstrap behind its one-time bootstrap key; this rule only keeps the
-- database consistent if that gate is ever bypassed.
CREATE OR REPLACE FUNCTION public.add_tenant_member(
  p_manager_token_hash text, p_tenant_id uuid, p_user_id uuid, p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF p_role NOT IN ('owner','manager','chef','server','viewer','bartender','busser','food_runner','host','line_cook','prep_cook','dishwasher','barista','sommelier') THEN
    RAISE EXCEPTION 'add_tenant_member: unknown role';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('add_tenant_member:' || p_tenant_id::text));
  IF p_manager_token_hash IS NULL THEN
    IF p_role <> 'owner' THEN
      RAISE insufficient_privilege USING MESSAGE = 'add_tenant_member: bootstrap membership must be owner';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tenant_users tu WHERE tu.tenant_id = p_tenant_id) THEN
      RAISE insufficient_privilege USING MESSAGE = 'add_tenant_member: bootstrap allowed only for a tenant with zero members';
    END IF;
  ELSE
    SELECT s.role INTO v_role
    FROM public.identity_session(p_manager_token_hash) s
    WHERE s.tenant_id = p_tenant_id;
    IF NOT FOUND OR v_role NOT IN ('owner', 'manager') THEN
      RAISE insufficient_privilege USING MESSAGE = 'add_tenant_member: live owner/manager session in this tenant is required';
    END IF;
  END IF;
  INSERT INTO public.tenant_users(tenant_id, user_id, role)
  VALUES (p_tenant_id, p_user_id, p_role);
END;
$$;

-- Remove one membership. Requires a live owner/manager session in the tenant
-- and refuses to remove the last owner.
CREATE OR REPLACE FUNCTION public.remove_tenant_member(
  p_manager_token_hash text, p_tenant_id uuid, p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_target_role text;
BEGIN
  SELECT s.role INTO v_role
  FROM public.identity_session(p_manager_token_hash) s
  WHERE s.tenant_id = p_tenant_id;
  IF NOT FOUND OR v_role NOT IN ('owner', 'manager') THEN
    RETURN false;
  END IF;
  SELECT tu.role INTO v_target_role
  FROM public.tenant_users tu
  WHERE tu.tenant_id = p_tenant_id AND tu.user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_target_role = 'owner' AND NOT EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id AND tu.role = 'owner' AND tu.user_id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'remove_tenant_member: cannot remove the last owner';
  END IF;
  DELETE FROM public.tenant_users tu
  WHERE tu.tenant_id = p_tenant_id AND tu.user_id = p_user_id;
  RETURN FOUND;
END;
$$;

-- Create or replace one staff PIN. Requires a live owner/manager session in
-- the tenant; the PIN owner must already be a member of the tenant.
CREATE OR REPLACE FUNCTION public.set_staff_pin(
  p_manager_token_hash text, p_tenant_id uuid, p_user_id uuid,
  p_pin_hash text, p_lookup_hash text, p_display_name text, p_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT s.role INTO v_role
  FROM public.identity_session(p_manager_token_hash) s
  WHERE s.tenant_id = p_tenant_id;
  IF NOT FOUND OR v_role NOT IN ('owner', 'manager') THEN
    RAISE insufficient_privilege USING MESSAGE = 'set_staff_pin: live owner/manager session in this tenant is required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id AND tu.user_id = p_user_id
  ) THEN
    RAISE foreign_key_violation USING MESSAGE = 'set_staff_pin: user is not a member of this tenant';
  END IF;
  IF p_pin_hash IS NULL OR char_length(p_pin_hash) = 0 OR char_length(p_pin_hash) > 512 THEN
    RAISE EXCEPTION 'set_staff_pin: pin_hash must be 1-512 chars';
  END IF;
  IF p_lookup_hash IS NULL OR p_lookup_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'set_staff_pin: lookup hash must be 64 lowercase hex chars';
  END IF;
  IF p_display_name IS NULL OR char_length(p_display_name) = 0 OR char_length(p_display_name) > 200 THEN
    RAISE EXCEPTION 'set_staff_pin: display_name must be 1-200 chars';
  END IF;
  INSERT INTO public.staff_pins(tenant_id, user_id, pin_hash, pin_lookup_hash, display_name, active)
  VALUES (p_tenant_id, p_user_id, p_pin_hash, p_lookup_hash, p_display_name, COALESCE(p_active, true))
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    pin_lookup_hash = EXCLUDED.pin_lookup_hash,
    display_name = EXCLUDED.display_name,
    active = EXCLUDED.active;
END;
$$;

-- ---- 5. Function ownership and least-privilege execution ----
ALTER FUNCTION public.identity_session(text) OWNER TO culinaryos_identity;
ALTER FUNCTION public.mint_session(text, uuid, uuid, uuid, timestamptz) OWNER TO culinaryos_identity;
ALTER FUNCTION public.revoke_session(text, text) OWNER TO culinaryos_identity;
ALTER FUNCTION public.register_device_key(text, text, uuid, text, jsonb, timestamptz) OWNER TO culinaryos_identity;
ALTER FUNCTION public.revoke_device_key(text, uuid) OWNER TO culinaryos_identity;
ALTER FUNCTION public.add_tenant_member(text, uuid, uuid, text) OWNER TO culinaryos_identity;
ALTER FUNCTION public.remove_tenant_member(text, uuid, uuid) OWNER TO culinaryos_identity;
ALTER FUNCTION public.set_staff_pin(text, uuid, uuid, text, text, text, boolean) OWNER TO culinaryos_identity;

REVOKE ALL ON FUNCTION public.identity_session(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mint_session(text, uuid, uuid, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_session(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_device_key(text, text, uuid, text, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_device_key(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_tenant_member(text, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_tenant_member(text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_staff_pin(text, uuid, uuid, text, text, text, boolean) FROM PUBLIC;

-- identity_session is deliberately NOT granted: only the identity role's own
-- functions may call it. Every other function is runtime-callable.
GRANT EXECUTE ON FUNCTION public.mint_session(text, uuid, uuid, uuid, timestamptz) TO culinaryos_app;
GRANT EXECUTE ON FUNCTION public.revoke_session(text, text) TO culinaryos_app;
GRANT EXECUTE ON FUNCTION public.register_device_key(text, text, uuid, text, jsonb, timestamptz) TO culinaryos_app;
GRANT EXECUTE ON FUNCTION public.revoke_device_key(text, uuid) TO culinaryos_app;
GRANT EXECUTE ON FUNCTION public.add_tenant_member(text, uuid, uuid, text) TO culinaryos_app;
GRANT EXECUTE ON FUNCTION public.remove_tenant_member(text, uuid, uuid) TO culinaryos_app;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(text, uuid, uuid, text, text, text, boolean) TO culinaryos_app;

-- ---- 6. Revoke broad runtime access to identity tables ----
-- After this point culinaryos_app cannot bulk-read token/PIN hashes and
-- cannot mint, alter, or delete sessions, devices, PINs, or memberships
-- except through the constrained functions above. tenant_users keeps SELECT:
-- staff listing is tenant-scoped by RLS and contains no secrets.
REVOKE ALL ON TABLE public.auth_sessions FROM culinaryos_app;
REVOKE ALL ON TABLE public.device_keys FROM culinaryos_app;
REVOKE ALL ON TABLE public.staff_pins FROM culinaryos_app;
REVOKE ALL ON TABLE public.tenant_users FROM culinaryos_app;
GRANT SELECT ON TABLE public.tenant_users TO culinaryos_app;
