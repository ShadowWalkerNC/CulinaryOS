import type { Session, SupabaseClient } from '@supabase/supabase-js';

export interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export type AuthClient = { auth: Pick<SupabaseClient['auth'], 'getSession' | 'onAuthStateChange'> };

export function observeAuth(client: AuthClient | null, publish: (state: AuthState) => void, timeoutMs = 10_000): () => void {
  if (!client) {
    publish({ session: null, loading: false, error: 'Sign-in is unavailable: authentication is not configured.' });
    return () => {};
  }
  let active = true;
  let changed = false;
  let unsubscribe = () => {};
  const finish = (session: Session | null, error: string | null = null) => {
    if (!active) return;
    clearTimeout(timer);
    publish({ session, loading: false, error });
  };
  const timer = setTimeout(() => {
    changed = true;
    finish(null, 'Sign-in could not be checked. Please try again.');
  }, timeoutMs);
  try {
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      changed = true;
      finish(session);
    });
    unsubscribe = () => subscription.unsubscribe();
    void client.auth.getSession().then(({ data, error }) => {
      if (!changed) finish(error ? null : data.session, error ? 'Sign-in could not be checked. Please try again.' : null);
    }).catch(() => {
      if (!changed) finish(null, 'Sign-in could not be checked. Please try again.');
    });
  } catch {
    if (!changed) finish(null, 'Sign-in could not be checked. Please try again.');
  }
  return () => { active = false; clearTimeout(timer); unsubscribe(); };
}
