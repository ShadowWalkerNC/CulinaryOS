import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session:  Session | null;
  user:     User | null;
  loading:  boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user:    null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock profile matching seed.sql
  const mockUser: User = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'chef@kitchenkit.local',
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  useEffect(() => {
    if (!supabase) {
      setSession(mockSession);
      setLoading(false);
      return;
    }

    // Hydrate session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || mockSession);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession || mockSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? mockUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
