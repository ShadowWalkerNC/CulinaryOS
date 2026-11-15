-- One-use grants for the Rust site service. Only the identity role can read
-- or write the table. The application role calls the checked functions below.
CREATE TABLE public.native_device_pairings (
  code_hash text PRIMARY KEY CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  issuer_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
  device_role text NOT NULL CHECK (device_role IN ('pos', 'kds', 'manager')),
  station text,
  expires_at timestamptz NOT NULL,
  CHECK ((device_role = 'kds' AND station IS NOT NULL AND station IN ('hot','cold','grill','fry','sauce','pastry','pass','bar'))
    OR (device_role <> 'kds' AND station IS NULL))
);
CREATE INDEX native_device_pairings_tenant_expiry ON public.native_device_pairings (tenant_id, expires_at);
ALTER TABLE public.native_device_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_device_pairings FORCE ROW LEVEL SECURITY;
CREATE POLICY native_device_pairings_identity ON public.native_device_pairings
  FOR ALL TO culinaryos_identity USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, DELETE ON public.native_device_pairings TO culinaryos_identity;

CREATE FUNCTION public.issue_native_pairing(
  manager_hash text, site_id uuid, pairing_hash text, device_label text, role_name text, station_name text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE issuer uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tenant_membership:' || site_id::text));
  SELECT s.user_id INTO issuer FROM public.identity_session(manager_hash) s
    WHERE s.tenant_id = site_id AND s.role IN ('owner', 'manager');
  IF NOT FOUND THEN RETURN false; END IF;
  DELETE FROM public.native_device_pairings p WHERE p.tenant_id = site_id AND p.expires_at <= clock_timestamp();
  INSERT INTO public.native_device_pairings (code_hash, tenant_id, issuer_id, label, device_role, station, expires_at)
    VALUES (pairing_hash, site_id, issuer, device_label, role_name, station_name, clock_timestamp() + interval '5 minutes');
  RETURN true;
END
$$;

CREATE FUNCTION public.redeem_native_pairing(pairing_hash text, site_id uuid, device_hash text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE grant_row public.native_device_pairings%ROWTYPE;
registered uuid;
BEGIN
  IF device_hash IS NULL OR device_hash !~ '^[0-9a-f]{64}$' THEN RETURN NULL; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('tenant_membership:' || site_id::text));
  DELETE FROM public.native_device_pairings p
  WHERE p.code_hash = pairing_hash AND p.tenant_id = site_id AND p.expires_at > clock_timestamp()
    AND EXISTS (SELECT 1 FROM public.tenant_users u
      WHERE u.tenant_id = p.tenant_id AND u.user_id = p.issuer_id AND u.role IN ('owner','manager'))
  RETURNING p.* INTO grant_row;
  IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO public.device_keys (key_hash, tenant_id, label, capabilities, expires_at)
    VALUES (device_hash, grant_row.tenant_id, grant_row.label,
      jsonb_build_array('native:' || grant_row.device_role, grant_row.station),
      clock_timestamp() + interval '365 days')
    RETURNING id INTO registered;
  RETURN registered;
END
$$;

GRANT CREATE ON SCHEMA public TO culinaryos_identity;
ALTER FUNCTION public.issue_native_pairing(text, uuid, text, text, text, text) OWNER TO culinaryos_identity;
ALTER FUNCTION public.redeem_native_pairing(text, uuid, text) OWNER TO culinaryos_identity;
REVOKE CREATE ON SCHEMA public FROM culinaryos_identity;
REVOKE ALL ON FUNCTION public.issue_native_pairing(text, uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_native_pairing(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_native_pairing(text, uuid, text, text, text, text) TO culinaryos_app;
GRANT EXECUTE ON FUNCTION public.redeem_native_pairing(text, uuid, text) TO culinaryos_app;
