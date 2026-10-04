-- ============================================================
-- CulinaryOS pg-foundation 007 — token-derived RLS + mint proofs
-- Fix-forward for 001-006 (those files are immutable).
--
-- 1. Tenant authorization no longer reads the mutable app.tenant_id /
--    app.user_id settings at all. Policies derive the tenant from the
--    opaque credential: app.token_hash -> resolve_identity() ->
--    app_verified_tenant_id(). Forging a tenant now requires forging a
--    live, unguessable token hash; changing app.tenant_id after resolution
--    is meaningless (no policy reads it). The old helpers are dropped.
-- 2. mint_session requires proof of authentication at the database
--    boundary: exactly one of (a) an unguessable active PIN lookup HMAC
--    for this user+tenant, or (b) a live prior session for the same
--    user+tenant (rotation). Membership existence alone mints nothing.
-- 3. Bootstrap is migration-owner only: add_tenant_member rejects NULL
--    manager tokens. The first tenant/user/membership/PIN rows are
--    inserted by the owner login (documented ceremony); the first session
--    is then minted with PIN proof like any other.
-- ============================================================

-- ---- 0. Verified-identity helpers (sole tenant derivation for RLS) ----
-- SECURITY INVOKER: they only resolve the caller's own token setting
-- through resolve_identity (SECURITY DEFINER). Invalid/missing tokens yield
-- zero rows, so the helpers return NULL and every policy denies.
CREATE OR REPLACE FUNCTION public.app_verified_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM public.resolve_identity(current_setting('app.token_hash', true)) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.app_verified_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT user_id FROM public.resolve_identity(current_setting('app.token_hash', true)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.app_verified_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_verified_tenant_id() TO culinaryos_app, culinaryos_identity;
REVOKE ALL ON FUNCTION public.app_verified_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_verified_user_id() TO culinaryos_app, culinaryos_identity;

-- ---- 1. Identity-function surgery (as the owning identity role) ----
-- CREATE OR REPLACE requires ownership; the migration login acts through
-- its 006 membership. SET LOCAL ends at this file's COMMIT, and RESET ROLE
-- below restores the owner for the policy DDL that follows. The identity
-- role holds CREATE on the schema solely so migration surgery can replace
-- the functions it owns; it cannot log in, so the privilege is exercisable
-- only via SET ROLE by the migration owner.
GRANT CREATE ON SCHEMA public TO culinaryos_identity;
SET LOCAL ROLE culinaryos_identity;

-- mint_session gains two proof parameters, so the old signature is dropped
-- and recreated (a new object: owner is the identity role via SET ROLE).
DROP FUNCTION IF EXISTS public.mint_session(text, uuid, uuid, uuid, timestamptz);

CREATE FUNCTION public.mint_session(
  p_token_hash text, p_user_id uuid, p_tenant_id uuid,
  p_device_id uuid, p_expires_at timestamptz,
  p_pin_lookup_hash text, p_prior_token_hash text
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
  IF (p_pin_lookup_hash IS NULL AND p_prior_token_hash IS NULL)
     OR (p_pin_lookup_hash IS NOT NULL AND p_prior_token_hash IS NOT NULL) THEN
    RAISE EXCEPTION 'mint_session: exactly one of PIN proof or prior-session proof is required';
  END IF;
  SELECT tu.role INTO v_role
  FROM public.tenant_users tu
  WHERE tu.user_id = p_user_id AND tu.tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE foreign_key_violation USING MESSAGE = 'mint_session: no membership for user in tenant';
  END IF;
  IF p_pin_lookup_hash IS NOT NULL THEN
    IF p_pin_lookup_hash !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'mint_session: PIN proof must be 64 lowercase hex chars';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.staff_pins p
      WHERE p.tenant_id = p_tenant_id AND p.user_id = p_user_id
        AND p.pin_lookup_hash = p_pin_lookup_hash AND p.active
    ) THEN
      RAISE insufficient_privilege USING MESSAGE = 'mint_session: PIN proof invalid for this user and tenant';
    END IF;
  ELSE
    IF p_prior_token_hash !~ '^[0-9a-f]{64}$' THEN
      RAISE insufficient_privilege USING MESSAGE = 'mint_session: prior session invalid for rotation';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.identity_session(p_prior_token_hash) s
      WHERE s.user_id = p_user_id AND s.tenant_id = p_tenant_id
    ) THEN
      RAISE insufficient_privilege USING MESSAGE = 'mint_session: prior session invalid for rotation';
    END IF;
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

REVOKE ALL ON FUNCTION public.mint_session(text, uuid, uuid, uuid, timestamptz, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mint_session(text, uuid, uuid, uuid, timestamptz, text, text) TO culinaryos_app;

-- add_tenant_member keeps its signature (plain replace preserves owner and
-- grants) but the NULL bootstrap path is removed: bootstrap inserts are
-- performed by the migration-owner login, never through the runtime role.
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
  IF p_manager_token_hash IS NULL THEN
    RAISE insufficient_privilege USING MESSAGE = 'add_tenant_member: bootstrap is migration-owner only; runtime membership changes require a live owner/manager session';
  END IF;
  SELECT s.role INTO v_role
  FROM public.identity_session(p_manager_token_hash) s
  WHERE s.tenant_id = p_tenant_id;
  IF NOT FOUND OR v_role NOT IN ('owner', 'manager') THEN
    RAISE insufficient_privilege USING MESSAGE = 'add_tenant_member: live owner/manager session in this tenant is required';
  END IF;
  INSERT INTO public.tenant_users(tenant_id, user_id, role)
  VALUES (p_tenant_id, p_user_id, p_role);
END;
$$;

RESET ROLE;

-- ---- 2. Policy rewrite: every tenant derivation goes through the token ----
-- app_users_insert, organizations_insert, schema_migrations_all, and the
-- TO-culinaryos_identity policies intentionally keep their definitions.

DROP POLICY IF EXISTS "app_users_select_own" ON public.app_users;
CREATE POLICY "app_users_select_own" ON public.app_users
  FOR SELECT USING (id = public.app_verified_user_id());

DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.organization_id = organizations.id
      AND t.id = public.app_verified_tenant_id()
  ));

DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT USING (id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "tenants_insert" ON public.tenants;
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT WITH CHECK (id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE USING (id = public.app_verified_tenant_id()) WITH CHECK (id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "tenants_delete" ON public.tenants;
CREATE POLICY "tenants_delete" ON public.tenants FOR DELETE USING (id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "tu_select" ON public.tenant_users;
CREATE POLICY "tu_select" ON public.tenant_users FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "tu_insert" ON public.tenant_users;
CREATE POLICY "tu_insert" ON public.tenant_users FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "tu_update" ON public.tenant_users;
CREATE POLICY "tu_update" ON public.tenant_users FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "tu_delete" ON public.tenant_users;
CREATE POLICY "tu_delete" ON public.tenant_users FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "pins_select" ON public.staff_pins;
CREATE POLICY "pins_select" ON public.staff_pins FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "pins_insert" ON public.staff_pins;
CREATE POLICY "pins_insert" ON public.staff_pins FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "pins_update" ON public.staff_pins;
CREATE POLICY "pins_update" ON public.staff_pins FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "pins_delete" ON public.staff_pins;
CREATE POLICY "pins_delete" ON public.staff_pins FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "dk_select" ON public.device_keys;
CREATE POLICY "dk_select" ON public.device_keys FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "dk_insert" ON public.device_keys;
CREATE POLICY "dk_insert" ON public.device_keys FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "dk_update" ON public.device_keys;
CREATE POLICY "dk_update" ON public.device_keys FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "dk_delete" ON public.device_keys;
CREATE POLICY "dk_delete" ON public.device_keys FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "sess_select" ON public.auth_sessions;
CREATE POLICY "sess_select" ON public.auth_sessions FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "sess_insert" ON public.auth_sessions;
CREATE POLICY "sess_insert" ON public.auth_sessions FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "sess_update" ON public.auth_sessions;
CREATE POLICY "sess_update" ON public.auth_sessions FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "sess_delete" ON public.auth_sessions;
CREATE POLICY "sess_delete" ON public.auth_sessions FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "menus_select" ON public.menus;
CREATE POLICY "menus_select" ON public.menus FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "menus_insert" ON public.menus;
CREATE POLICY "menus_insert" ON public.menus FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "menus_update" ON public.menus;
CREATE POLICY "menus_update" ON public.menus FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "menus_delete" ON public.menus;
CREATE POLICY "menus_delete" ON public.menus FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "ms_select" ON public.menu_sections;
CREATE POLICY "ms_select" ON public.menu_sections FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "ms_insert" ON public.menu_sections;
CREATE POLICY "ms_insert" ON public.menu_sections FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "ms_update" ON public.menu_sections;
CREATE POLICY "ms_update" ON public.menu_sections FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "ms_delete" ON public.menu_sections;
CREATE POLICY "ms_delete" ON public.menu_sections FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "mi_select" ON public.menu_items;
CREATE POLICY "mi_select" ON public.menu_items FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "mi_insert" ON public.menu_items;
CREATE POLICY "mi_insert" ON public.menu_items FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "mi_update" ON public.menu_items;
CREATE POLICY "mi_update" ON public.menu_items FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "mi_delete" ON public.menu_items;
CREATE POLICY "mi_delete" ON public.menu_items FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "mg_select" ON public.modifier_groups;
CREATE POLICY "mg_select" ON public.modifier_groups FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "mg_insert" ON public.modifier_groups;
CREATE POLICY "mg_insert" ON public.modifier_groups FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "mg_update" ON public.modifier_groups;
CREATE POLICY "mg_update" ON public.modifier_groups FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "mg_delete" ON public.modifier_groups;
CREATE POLICY "mg_delete" ON public.modifier_groups FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "mod_select" ON public.modifiers;
CREATE POLICY "mod_select" ON public.modifiers FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "mod_insert" ON public.modifiers;
CREATE POLICY "mod_insert" ON public.modifiers FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "mod_update" ON public.modifiers;
CREATE POLICY "mod_update" ON public.modifiers FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "mod_delete" ON public.modifiers;
CREATE POLICY "mod_delete" ON public.modifiers FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "tabs_select" ON public.tabs;
CREATE POLICY "tabs_select" ON public.tabs FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "tabs_insert" ON public.tabs;
CREATE POLICY "tabs_insert" ON public.tabs FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "tabs_update" ON public.tabs;
CREATE POLICY "tabs_update" ON public.tabs FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "tabs_delete" ON public.tabs;
CREATE POLICY "tabs_delete" ON public.tabs FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "orders_select" ON public.pos_orders;
CREATE POLICY "orders_select" ON public.pos_orders FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "orders_insert" ON public.pos_orders;
CREATE POLICY "orders_insert" ON public.pos_orders FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "orders_update" ON public.pos_orders;
CREATE POLICY "orders_update" ON public.pos_orders FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "orders_delete" ON public.pos_orders;
CREATE POLICY "orders_delete" ON public.pos_orders FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "oli_select" ON public.pos_order_line_items;
CREATE POLICY "oli_select" ON public.pos_order_line_items FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "oli_insert" ON public.pos_order_line_items;
CREATE POLICY "oli_insert" ON public.pos_order_line_items FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "oli_update" ON public.pos_order_line_items;
CREATE POLICY "oli_update" ON public.pos_order_line_items FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "oli_delete" ON public.pos_order_line_items;
CREATE POLICY "oli_delete" ON public.pos_order_line_items FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "lim_select" ON public.line_item_modifiers;
CREATE POLICY "lim_select" ON public.line_item_modifiers FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "lim_insert" ON public.line_item_modifiers;
CREATE POLICY "lim_insert" ON public.line_item_modifiers FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "lim_update" ON public.line_item_modifiers;
CREATE POLICY "lim_update" ON public.line_item_modifiers FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "lim_delete" ON public.line_item_modifiers;
CREATE POLICY "lim_delete" ON public.line_item_modifiers FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "kt_select" ON public.kitchen_tickets;
CREATE POLICY "kt_select" ON public.kitchen_tickets FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "kt_insert" ON public.kitchen_tickets;
CREATE POLICY "kt_insert" ON public.kitchen_tickets FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "kt_update" ON public.kitchen_tickets;
CREATE POLICY "kt_update" ON public.kitchen_tickets FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "kt_delete" ON public.kitchen_tickets;
CREATE POLICY "kt_delete" ON public.kitchen_tickets FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "ti_select" ON public.ticket_items;
CREATE POLICY "ti_select" ON public.ticket_items FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "ti_insert" ON public.ticket_items;
CREATE POLICY "ti_insert" ON public.ticket_items FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "ti_update" ON public.ticket_items;
CREATE POLICY "ti_update" ON public.ticket_items FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "ti_delete" ON public.ticket_items;
CREATE POLICY "ti_delete" ON public.ticket_items FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "de_select" ON public.domain_events;
CREATE POLICY "de_select" ON public.domain_events FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "de_insert" ON public.domain_events;
CREATE POLICY "de_insert" ON public.domain_events FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "de_update" ON public.domain_events;
CREATE POLICY "de_update" ON public.domain_events FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "de_delete" ON public.domain_events;
CREATE POLICY "de_delete" ON public.domain_events FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "pp_select" ON public.pending_push;
CREATE POLICY "pp_select" ON public.pending_push FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "pp_insert" ON public.pending_push;
CREATE POLICY "pp_insert" ON public.pending_push FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "pp_update" ON public.pending_push;
CREATE POLICY "pp_update" ON public.pending_push FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "pp_delete" ON public.pending_push;
CREATE POLICY "pp_delete" ON public.pending_push FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "payments_update" ON public.payments;
CREATE POLICY "payments_update" ON public.payments FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "payments_delete" ON public.payments;
CREATE POLICY "payments_delete" ON public.payments FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "or_select" ON public.operation_receipts;
CREATE POLICY "or_select" ON public.operation_receipts FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "or_insert" ON public.operation_receipts;
CREATE POLICY "or_insert" ON public.operation_receipts FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "or_update" ON public.operation_receipts;
CREATE POLICY "or_update" ON public.operation_receipts FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "or_delete" ON public.operation_receipts;
CREATE POLICY "or_delete" ON public.operation_receipts FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "wi_select" ON public.stripe_webhook_inbox;
CREATE POLICY "wi_select" ON public.stripe_webhook_inbox FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "wi_insert" ON public.stripe_webhook_inbox;
CREATE POLICY "wi_insert" ON public.stripe_webhook_inbox FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "wi_update" ON public.stripe_webhook_inbox;
CREATE POLICY "wi_update" ON public.stripe_webhook_inbox FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "wi_delete" ON public.stripe_webhook_inbox;
CREATE POLICY "wi_delete" ON public.stripe_webhook_inbox FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "al_select" ON public.audit_logs;
CREATE POLICY "al_select" ON public.audit_logs FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "al_insert" ON public.audit_logs;
CREATE POLICY "al_insert" ON public.audit_logs FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());

DROP POLICY IF EXISTS "ds_select" ON public.drawer_sessions;
CREATE POLICY "ds_select" ON public.drawer_sessions FOR SELECT USING (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "ds_insert" ON public.drawer_sessions;
CREATE POLICY "ds_insert" ON public.drawer_sessions FOR INSERT WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "ds_update" ON public.drawer_sessions;
CREATE POLICY "ds_update" ON public.drawer_sessions FOR UPDATE USING (tenant_id = public.app_verified_tenant_id()) WITH CHECK (tenant_id = public.app_verified_tenant_id());
DROP POLICY IF EXISTS "ds_delete" ON public.drawer_sessions;
CREATE POLICY "ds_delete" ON public.drawer_sessions FOR DELETE USING (tenant_id = public.app_verified_tenant_id());

-- ---- 3. Drop the mutable-setting helpers (nothing may read them now) ----
DROP FUNCTION IF EXISTS public.app_tenant_id();
DROP FUNCTION IF EXISTS public.app_user_id();
