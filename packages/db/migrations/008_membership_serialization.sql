-- ============================================================
-- CulinaryOS pg-foundation 008 — membership serialization + CREATE revoke
-- Fix-forward for 001-007 (those files are immutable).
--
-- 1. Last-owner race: add_tenant_member and remove_tenant_member each read
--    membership state (manager role check, owner count) and then write.
--    Two concurrent removers could each observe another surviving owner and
--    both delete, leaving zero owners. Both functions now take the SAME
--    per-tenant transaction-scoped advisory lock BEFORE any membership role
--    check or owner count, so all same-tenant membership add/remove work
--    serializes: the loser blocks until the winner commits, then re-reads
--    settled state. Manager/user provenance (live owner/manager session in
--    the tenant via identity_session, roles from membership rows) and the
--    last-owner guard are unchanged; only the lock is added.
-- 2. 007 granted CREATE ON SCHEMA public TO culinaryos_identity solely for
--    migration surgery. The surgery below runs under SET LOCAL ROLE while
--    that grant still exists, and CREATE is revoked at the end. The
--    identity role keeps USAGE, function ownership, narrow grants, and its
--    TO-role policies, so runtime lookups are unaffected. Any future
--    function surgery must re-grant CREATE for that migration only and
--    revoke it again at the end.
-- ============================================================

-- ---- 0. Membership-function surgery (as the owning identity role) ----
-- CREATE OR REPLACE preserves owner and grants; the REVOKE/GRANT lines
-- below re-assert them idempotently. SET LOCAL ends at this file's COMMIT.
SET LOCAL ROLE culinaryos_identity;

-- Add one membership. Requires a live owner/manager session in the tenant.
-- NULL manager tokens stay rejected: bootstrap is migration-owner only.
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
  PERFORM pg_advisory_xact_lock(hashtext('tenant_membership:' || COALESCE(p_tenant_id::text, 'null')));
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
  PERFORM pg_advisory_xact_lock(hashtext('tenant_membership:' || COALESCE(p_tenant_id::text, 'null')));
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

REVOKE ALL ON FUNCTION public.add_tenant_member(text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_tenant_member(text, uuid, uuid, text) TO culinaryos_app;
REVOKE ALL ON FUNCTION public.remove_tenant_member(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_tenant_member(text, uuid, uuid) TO culinaryos_app;

RESET ROLE;

-- ---- 1. Retire the surgery grant ----
-- The identity role cannot log in, so CREATE was exercisable only via SET
-- ROLE by the migration owner; with surgery complete it is revoked. USAGE,
-- ownership, EXECUTE grants, and TO-role policies are untouched.
REVOKE CREATE ON SCHEMA public FROM culinaryos_identity;
