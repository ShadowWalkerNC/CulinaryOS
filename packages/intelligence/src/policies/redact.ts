/**
 * Secret redaction: least-privilege output. Applied to audit entries,
 * approval payloads, and any data crossing a trust boundary.
 */

const SENSITIVE_KEY = /(password|passwd|secret|api[_-]?key|access[_-]?key|auth|token|credential|private[_-]?key|connection[_-]?string)/i;
const BEARER_RE = /\b(bearer\s+)[a-z0-9\-._~+/=]{6,}/gi;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;

export const REDACTED = '[redacted]';

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(BEARER_RE, '$1' + REDACTED).replace(CARD_RE, REDACTED);
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? REDACTED : redactValue(v);
    }
    return out;
  }
  return value;
}

export function redact<T>(obj: T): T {
  return redactValue(obj) as T;
}
