import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export const MOCK_OPS_SESSION: Session = {
  access_token: 'demo-ops-token-mock',
  refresh_token: 'demo-ops-refresh-mock',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: '00000000-0000-0000-0000-000000000003',
    app_metadata: {},
    user_metadata: { name: 'Operations Director (Demo)' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'ops@culinaryos.local',
  },
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('culinaryos_ops_demo_session') === 'true') {
      return MOCK_OPS_SESSION;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('culinaryos_ops_demo_session') === 'true') {
      setSession(MOCK_OPS_SESSION);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (typeof window !== 'undefined' && localStorage.getItem('culinaryos_ops_demo_session') === 'true') {
        setSession(MOCK_OPS_SESSION);
      } else {
        setSession(s);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}
