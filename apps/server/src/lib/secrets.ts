/** Placeholder values never enable live services or production authentication. */
export { isPlaceholderSecret } from '@culinaryos/shared';
import { isPlaceholderSecret } from '@culinaryos/shared';

function isAutomatedTestEnvironment(): boolean {
  // A test-runner marker must never turn a production process into a demo.
  return process.env.NODE_ENV !== 'production' &&
    (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST));
}

function hasConfiguredSupabaseCredentials(): boolean {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return Boolean(url && key && !isPlaceholderSecret(url) && !isPlaceholderSecret(key));
}

export function isLiveSupabaseConfigured(): boolean {
  // Ordinary automated tests must not contact a developer's live project.
  if (isAutomatedTestEnvironment() && process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES !== 'true') {
    return false;
  }
  return hasConfiguredSupabaseCredentials();
}

/** Local demo access is explicit; missing backend configuration is not permission. */
export function isLocalDemoMode(): boolean {
  const environment = process.env.NODE_ENV;
  if (environment && environment !== 'development' && environment !== 'test') return false;
  if (isLiveSupabaseConfigured()) return false;
  // Keep isolated mock tests usable, without allowing a configured PostgreSQL
  // deployment to masquerade as a demo before its adapter has been implemented.
  if (isAutomatedTestEnvironment() && process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES !== 'true') return true;
  if (!isPlaceholderSecret(process.env.DATABASE_URL)) return false;
  return process.env.CULINARYOS_DEMO_MODE === 'true' || process.env.AUTH_RELAXED === 'true';
}

/** AUTH_RELAXED is honored only in an eligible, explicitly local demo. */
export function isAuthRelaxed(): boolean {
  return process.env.AUTH_RELAXED === 'true' && isLocalDemoMode();
}

export const isDemoMode = isLocalDemoMode;
export const isDemoAuthAllowed = isLocalDemoMode;

/** Validate the current Supabase runtime before starting listeners or workers.
 * DATABASE_URL alone is not a replacement backend. Update this contract only
 * when the PostgreSQL identity/data adapter is implemented and verified.
 * Error messages contain variable names, never credential values.
 */
export function assertProductionAuthConfiguration(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const problems: string[] = [];
  if (process.env.AUTH_RELAXED === 'true' || process.env.CULINARYOS_DEMO_MODE === 'true') {
    problems.push('demo authentication must be disabled');
  }
  if (process.env.VITEST) problems.push('VITEST must be unset');
  for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'] as const) {
    if (isPlaceholderSecret(process.env[name])) problems.push(`${name} is required`);
  }
  try {
    const url = new URL(process.env.SUPABASE_URL ?? '');
    if (url.protocol !== 'https:' || url.username || url.password) {
      problems.push('SUPABASE_URL must be an HTTPS URL without embedded credentials');
    }
  } catch {
    problems.push('SUPABASE_URL must be a valid HTTPS URL');
  }
  if (problems.length) {
    throw new Error(`Production authentication configuration rejected: ${problems.join('; ')}`);
  }
}
