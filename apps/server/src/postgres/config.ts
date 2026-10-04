import { DomainError } from './domain.js';

/** Native PostgreSQL feature gate. Off by default; explicit opt-in only. */
export function isNativePostgresEnabled(overrides?: { enabled?: boolean }): boolean {
  if (overrides?.enabled !== undefined) return overrides.enabled;
  return process.env.CULINARYOS_NATIVE_PG === 'true';
}

export function requireNativePostgres(overrides?: { enabled?: boolean }): void {
  if (!isNativePostgresEnabled(overrides)) {
    throw new Error('Native PostgreSQL integration is disabled (set CULINARYOS_NATIVE_PG=true to enable)');
  }
}

function isPlaceholder(value: string): boolean {
  return !value || value.includes('placeholder') || value.includes('your_');
}

/**
 * Resolve a database URL without logging values. The ephemeral test URL is
 * honored ONLY in NODE_ENV=test; every other environment uses DATABASE_URL,
 * so test configuration can never leak into a live process.
 */
export function getNativeDatabaseUrl(): string | null {
  if (process.env.NODE_ENV === 'test') {
    const testUrl = process.env.TEST_DATABASE_URL ?? '';
    if (testUrl && !isPlaceholder(testUrl)) return testUrl;
  }
  const url = process.env.DATABASE_URL ?? '';
  if (!url || isPlaceholder(url)) return null;
  return url;
}

/**
 * Pilot tax rate in basis points. Unset means zero; a SET but malformed
 * value fails loudly instead of silently becoming zero (mis-taxing checks).
 */
export function defaultTaxRateBps(): number {
  const raw = process.env.CULINARYOS_TAX_RATE_BPS;
  if (raw === undefined || raw === '') return 0;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 10_000) {
    throw new DomainError('CONFIGURATION_ERROR', 'CULINARYOS_TAX_RATE_BPS must be an integer 0-10000', 500);
  }
  return parsed;
}

/** Server HMAC secret for PIN lookup. Never logged; missing means PIN login unavailable. */
export function getPinLookupSecret(): string | null {
  const secret = process.env.CULINARYOS_PIN_LOOKUP_SECRET ?? '';
  if (!secret || secret.includes('placeholder') || secret.length < 32) return null;
  return secret;
}
