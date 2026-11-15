-- Run with the migration owner against an isolated restored database.
-- Bind the verified site UUID as parameter 1. This statement fences every
-- restored device, login session and pairing grant for that site atomically.
WITH pending AS (
    DELETE FROM public.native_device_pairings WHERE tenant_id = $1 RETURNING 1
), devices AS (
    UPDATE public.device_keys SET revoked_at = clock_timestamp()
    WHERE tenant_id = $1 AND revoked_at IS NULL RETURNING 1
), sessions AS (
    UPDATE public.auth_sessions SET revoked_at = clock_timestamp()
    WHERE tenant_id = $1 AND revoked_at IS NULL RETURNING 1
)
SELECT (SELECT count(*) FROM pending) AS removed_pairings,
       (SELECT count(*) FROM devices) AS revoked_devices,
       (SELECT count(*) FROM sessions) AS revoked_sessions;
