import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, setSession, Session, AuthRole } from '@culinaryos/auth';

interface AuthContextValue {
  session: Session | null;
  role: AuthRole | null;
  isAuthenticated: boolean;
  isManagerOrOwner: boolean;
  logout: () => void;
  refreshSession: () => void;
  setAuthenticatedSession: (session: Session) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => getSession());

  const refreshSession = useCallback(() => {
    const s = getSession();
    setSessionState(s);
  }, []);

  const setAuthenticatedSession = useCallback((newSession: Session) => {
    setSession(newSession);
    setSessionState(newSession);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setSessionState(null);
  }, []);

  useEffect(() => {
    // Listen for storage events in case another tab logs in or logs out
    function handleStorage(e: StorageEvent) {
      if (e.key === 'culinaryos_session') {
        refreshSession();
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshSession]);

  const role = session?.role ?? null;
  const isAuthenticated = Boolean(session && session.accessToken);
  const isManagerOrOwner = role === 'owner' || role === 'manager';

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        isAuthenticated,
        isManagerOrOwner,
        logout,
        refreshSession,
        setAuthenticatedSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
