import type { Session, SupabaseClient } from '@supabase/supabase-js';

export interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export type AuthClient = { auth: Pick<SupabaseClient['auth'], 'getSession' | 'onAuthStateChange'> };

export const MOCK_DEMO_SESSION: Session = {
  access_token: 'demo-prep-token-mock',
  refresh_token: 'demo-prep-refresh-mock',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: '00000000-0000-0000-0000-000000000002',
    app_metadata: {},
    user_metadata: { name: 'Executive Chef (Demo)' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'chef@culinaryos.local',
  },
};

export function observeAuth(client: AuthClient | null, publish: (state: AuthState) => void, timeoutMs = 10_000): () => void {
  // Check if offline demo mode is active
  const isDemo = typeof window !== 'undefined' && localStorage.getItem('culinaryos_kitchenkit_demo_session') === 'true';
  if (isDemo) {
    publish({ session: MOCK_DEMO_SESSION, loading: false, error: null });
    return () => {};
  }

  if (!client) {
    // If not configured, gracefully route to login with demo option instead of hard blocking
    publish({ session: null, loading: false, error: null });
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
