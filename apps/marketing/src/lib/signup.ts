export interface SignupInput {
  restaurant_name: string;
  email: string;
  password: string;
  timezone: string;
}

/** A successful request starts verification; it never grants workspace access. */
export async function requestSignup(
  input: SignupInput,
  apiUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<{ tenantId: string | null }> {
  if (!apiUrl?.trim()) throw new Error('Cloud signup is not configured yet. Please try again later.');
  const base = new URL(apiUrl.trim());
  const localDevelopment = process.env.NODE_ENV !== 'production' &&
    base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if ((base.protocol !== 'https:' && !localDevelopment) || base.username || base.password || base.search || base.hash) {
    throw new Error('Cloud signup needs a secure API configuration.');
  }
  const response = await fetchImpl(`${base.href.replace(/\/$/, '')}/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body: unknown = await response.json().catch(() => null);
  const envelope = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  if (!response.ok) {
    if (response.status === 409) throw new Error('An account with this email already exists. Please log in or use another email.');
    const error = envelope.error;
    const message = error && typeof error === 'object' && 'message' in error ? error.message : envelope.message;
    throw new Error(typeof message === 'string' ? message : `Signup failed (${response.status})`);
  }
  const result = envelope.data && typeof envelope.data === 'object'
    ? envelope.data as Record<string, unknown> : envelope;
  if (result.demo_mode) throw new Error('This server is a demo. It cannot create a cloud account.');
  if (result.verification_required !== true) {
    throw new Error('Cloud account verification is not available yet. Please try again later.');
  }
  return { tenantId: typeof result.tenant_id === 'string' ? result.tenant_id : null };
}
