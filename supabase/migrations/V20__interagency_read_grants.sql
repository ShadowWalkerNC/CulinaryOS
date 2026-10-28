-- Optional Interagency read grants. No operational data is mutated by this integration.
BEGIN;
CREATE TABLE public.interagency_grants (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 audience text NOT NULL CHECK(audience='culinaryos-interagency'),
 scopes text[] NOT NULL CHECK(cardinality(scopes)>0 AND scopes <@ ARRAY['recipes','menus','purchases','inventory','sales_summary']::text[]),
 expires_at timestamptz NOT NULL, revoked_at timestamptz,
 token_hash text UNIQUE, token_expires_at timestamptz, refresh_hash text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX interagency_grants_tenant_user ON public.interagency_grants(tenant_id,user_id);
ALTER TABLE public.interagency_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY interagency_grants_select_own ON public.interagency_grants FOR SELECT TO authenticated USING (
 user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.tenant_users t WHERE t.tenant_id=interagency_grants.tenant_id AND t.user_id=auth.uid() AND t.role::text IN ('owner','manager'))
);
REVOKE ALL ON public.interagency_grants FROM anon,authenticated;
GRANT SELECT(id,tenant_id,user_id,audience,scopes,expires_at,revoked_at,created_at) ON public.interagency_grants TO authenticated;

CREATE TABLE public.interagency_authorizations (
 code_hash text PRIMARY KEY, grant_id uuid NOT NULL REFERENCES public.interagency_grants(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 challenge text NOT NULL, redirect_uri text NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz
);
ALTER TABLE public.interagency_authorizations ENABLE ROW LEVEL SECURITY;
-- One-time codes are server-only; no authenticated/anonymous read or write policy.
REVOKE ALL ON public.interagency_authorizations FROM anon,authenticated;

CREATE FUNCTION public.interagency_create_authorization(p_grant jsonb,p_authorization jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 INSERT INTO public.interagency_grants(id,tenant_id,user_id,audience,scopes,expires_at)
 VALUES((p_grant->>'id')::uuid,(p_grant->>'tenant_id')::uuid,(p_grant->>'user_id')::uuid,p_grant->>'audience',ARRAY(SELECT jsonb_array_elements_text(p_grant->'scopes')),(p_grant->>'expires_at')::timestamptz);
 INSERT INTO public.interagency_authorizations(code_hash,grant_id,tenant_id,challenge,redirect_uri,expires_at)
 VALUES(p_authorization->>'code_hash',(p_grant->>'id')::uuid,(p_grant->>'tenant_id')::uuid,p_authorization->>'challenge',p_authorization->>'redirect_uri',(p_authorization->>'expires_at')::timestamptz);
END $$;

CREATE FUNCTION public.interagency_exchange_code(p_code_hash text,p_challenge text,p_redirect_uri text,p_token_hash text,p_refresh_hash text,p_token_expires_at timestamptz,p_now timestamptz)
RETURNS SETOF public.interagency_grants LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a public.interagency_authorizations; g public.interagency_grants;
BEGIN
 SELECT * INTO a FROM public.interagency_authorizations WHERE code_hash=p_code_hash FOR UPDATE;
 IF NOT FOUND OR a.used_at IS NOT NULL OR a.expires_at<=p_now OR a.challenge<>p_challenge OR a.redirect_uri<>p_redirect_uri THEN RETURN; END IF;
 SELECT * INTO g FROM public.interagency_grants WHERE id=a.grant_id FOR UPDATE;
 IF NOT FOUND OR g.revoked_at IS NOT NULL OR g.expires_at<=p_now OR g.tenant_id<>a.tenant_id THEN RETURN; END IF;
 UPDATE public.interagency_authorizations SET used_at=p_now WHERE code_hash=p_code_hash;
 RETURN QUERY UPDATE public.interagency_grants SET token_hash=p_token_hash,refresh_hash=p_refresh_hash,token_expires_at=p_token_expires_at WHERE id=g.id RETURNING *;
END $$;

CREATE FUNCTION public.interagency_rotate_refresh(p_id uuid,p_old_refresh_hash text,p_token_hash text,p_refresh_hash text,p_token_expires_at timestamptz,p_now timestamptz)
RETURNS SETOF public.interagency_grants LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 UPDATE public.interagency_grants SET token_hash=p_token_hash,refresh_hash=p_refresh_hash,token_expires_at=p_token_expires_at
 WHERE id=p_id AND refresh_hash=p_old_refresh_hash AND revoked_at IS NULL AND expires_at>p_now RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.interagency_create_authorization(jsonb,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.interagency_exchange_code(text,text,text,text,text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.interagency_rotate_refresh(uuid,text,text,text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interagency_create_authorization(jsonb,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.interagency_exchange_code(text,text,text,text,text,timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.interagency_rotate_refresh(uuid,text,text,text,timestamptz,timestamptz) TO service_role;
COMMIT;
