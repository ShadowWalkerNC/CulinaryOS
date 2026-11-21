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

export function hasConfiguredNativePostgresCredentials(): boolean {
  if (process.env.CULINARYOS_NATIVE_PG === 'false') return false;
  if (process.env.CULINARYOS_NATIVE_PG === 'true') return true;
  if (!isPlaceholderSecret(process.env.SUPABASE_URL)) return false;
  const value = process.env.DATABASE_URL ?? '';
  if (!value || isPlaceholderSecret(value)) return false;
  if (value === 'postgres://fixture.invalid/test') return false;
  return true;
}

export function isNativePostgresConfigured(): boolean {
  return hasConfiguredNativePostgresCredentials();
}

export const isLivePostgresConfigured = isNativePostgresConfigured;

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

/** Validate the selected backend before starting listeners or workers.
 * Native PostgreSQL is automatically enabled as a primary production backend
 * when DATABASE_URL is configured (or CULINARYOS_NATIVE_PG=true) without
 * requiring Supabase credentials, and verifies the restricted runtime role
 * before opening its listener.
 * Error messages contain variable names, never credential values.
 */
export function assertProductionAuthConfiguration(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const problems: string[] = [];
  if (process.env.AUTH_RELAXED === 'true' || process.env.CULINARYOS_DEMO_MODE === 'true') {
    problems.push('demo authentication must be disabled');
  }
  if (process.env.VITEST) problems.push('VITEST must be unset');
  if (process.env.CULINARYOS_NATIVE_PG === 'true' || hasConfiguredNativePostgresCredentials()) {
    const value = process.env.DATABASE_URL;
    if (isPlaceholderSecret(value)) {
      problems.push('DATABASE_URL is required for native PostgreSQL');
    } else {
      try {
        const url = new URL(value!);
        if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
          problems.push('DATABASE_URL must be a PostgreSQL URL with a host and database');
        }
      } catch {
        problems.push('DATABASE_URL must be a valid PostgreSQL URL');
      }
    }
    if (problems.length) {
      throw new Error(`Production authentication configuration rejected: ${problems.join('; ')}`);
    }
    return;
  }
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
