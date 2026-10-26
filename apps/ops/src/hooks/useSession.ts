import { useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { configuredSupabase } from '../lib/supabase';

if (typeof window !== 'undefined') {
  try { window.localStorage?.removeItem('culinaryos_ops_demo_session'); } catch {}
}

export interface OpsSessionState {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export type OpsAuthClient = { auth: Pick<SupabaseClient['auth'], 'getSession' | 'onAuthStateChange'> };

export function observeOpsSession(client: OpsAuthClient | null, publish: (state: OpsSessionState) => void, timeoutMs = 10_000): () => void {
  try {
    const storage = (globalThis as { localStorage?: { removeItem(key: string): void } }).localStorage;
    storage?.removeItem('culinaryos_ops_demo_session');
  } catch {}
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

export function useSession() {
  const [state, setState] = useState<OpsSessionState>({
    session: null,
    loading: Boolean(configuredSupabase),
    error: configuredSupabase ? null : 'Sign-in is unavailable: authentication is not configured.',
  });

  useEffect(() => observeOpsSession(configuredSupabase, setState), []);

  return { session: state.session, loading: state.loading, error: state.error };
}
