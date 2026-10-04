import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { configuredSupabase } from '@/lib/supabase';
import { observeAuth, type AuthState } from '@/lib/auth-state';

interface AuthContextValue extends AuthState { user: User | null; }
const initial: AuthState = { session: null, loading: true, error: null };
const AuthContext = createContext<AuthContextValue>({ ...initial, user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initial);
  useEffect(() => observeAuth(configuredSupabase, setState), []);
  return <AuthContext.Provider value={{ ...state, user: state.session?.user ?? null }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
