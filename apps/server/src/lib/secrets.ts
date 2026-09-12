/** Treat placeholder env values as unset so demo/mock paths stay available. */
export { isPlaceholderSecret } from '@culinaryos/shared';
import { isPlaceholderSecret } from '@culinaryos/shared';

function isAutomatedTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
}

export function isLiveSupabaseConfigured(): boolean {
  // Tests must not silently use a developer's configured Supabase project.
  // A dedicated opt-in keeps integration tests explicit and auditable.
  if (
    isAutomatedTestEnvironment() &&
    process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES !== 'true'
  ) {
    return false;
  }

  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return Boolean(url && key && !isPlaceholderSecret(url) && !isPlaceholderSecret(key));
}

<<<<<<< Updated upstream
/**
 * Explicit opt-in ONLY. AUTH_RELAXED=true disables authentication for every
 * route — it is for local development and demos, NEVER for production or any
 * deployment with a live database.
 */
export function isAuthRelaxed(): boolean {
  return process.env.AUTH_RELAXED === 'true';
}

/**
 * True when no usable Supabase backend is configured. The API then serves
 * mock/demo data only. There is no real restaurant data at risk in this
 * state, so documented demo conveniences (demo PINs, header-only tenant)
 * are acceptable here.
 */
export function isLocalDemoMode(): boolean {
  return !isLiveSupabaseConfigured();
}

/**
 * Single predicate for "may demo credentials be honored". Demo PINs and
 * header-only tenant access are accepted ONLY when explicitly relaxed or in
 * local demo mode — NEVER when a live backend is configured.
 */
export function isDemoAuthAllowed(): boolean {
  return isAuthRelaxed() || isLocalDemoMode();
}
=======
/** Demo mode is possible only when live server credentials are absent. */
export function isDemoMode(): boolean {
  return !isLiveSupabaseConfigured();
}
>>>>>>> Stashed changes
