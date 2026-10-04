import { createHash, randomBytes } from 'node:crypto';

export class DomainError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 422) {
    super(message);
    this.name = 'DomainError';
  }
}

export function uuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new DomainError('VALIDATION_ERROR', `${field} must be a UUID`);
  }
  return value.toLowerCase();
}

export function integer(value: unknown, field: string, min = 0, max = 2_147_483_647): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new DomainError('VALIDATION_ERROR', `${field} must be an integer from ${min} to ${max}`);
  }
  return value;
}

export function text(value: unknown, field: string, max = 200, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) {
    throw new DomainError('VALIDATION_ERROR', `${field} must be a string of at most ${max} characters`);
  }
  return value.trim();
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('VALIDATION_ERROR', 'A JSON object is required');
  }
  return value as Record<string, unknown>;
}

/** Stable payload fingerprints bind replay IDs to an immutable request. */
export function canonicalJson(value: unknown, depth = 0): string {
  if (depth > 16) throw new DomainError('VALIDATION_ERROR', 'Request nesting exceeds the supported limit');
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(item => canonicalJson(item, depth + 1)).join(',') + ']';
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return '{' + Object.keys(record).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(record[key], depth + 1)).join(',') + '}';
  }
  throw new DomainError('VALIDATION_ERROR', 'Request contains an unsupported JSON value');
}

export function fingerprint(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function opaqueToken(kind: 'session' | 'device'): string {
  return `${kind === 'session' ? 'cs' : 'cd'}_${randomBytes(32).toString('base64url')}`;
}

/** Exact half-up tax rounding on integer cents, with database-range validation. */
export function taxCents(subtotal: number, rateBps: number): number {
  integer(subtotal, 'subtotal');
  integer(rateBps, 'tax rate', 0, 10_000);
  const result = Number((BigInt(subtotal) * BigInt(rateBps) + 5_000n) / 10_000n);
  return integer(result, 'tax');
}

/** Stable remainder allocation preserves every cent without floating point. */
export function allocateCents(total: number, shares: number): number[] {
  integer(total, 'total');
  integer(shares, 'shares', 1, 100);
  const base = Math.floor(total / shares);
  const remainder = total % shares;
  return Array.from({ length: shares }, (_, index) => base + (index < remainder ? 1 : 0));
}
