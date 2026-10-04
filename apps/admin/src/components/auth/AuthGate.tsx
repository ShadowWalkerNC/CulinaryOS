import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminLoginView } from './AdminLoginView';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { session, isAuthenticated, isManagerOrOwner, setAuthenticatedSession } = useAuth();

  if (!isAuthenticated || !session) {
    return <AdminLoginView onSuccess={setAuthenticatedSession} />;
  }

  if (!isManagerOrOwner) {
    return (
      <AdminLoginView
        onSuccess={setAuthenticatedSession}
        requiredRoleNotice={`Signed in as "${session.displayName || 'Staff'}" with role "${session.role}". Only Manager or Owner roles can access this back-office console.`}
      />
    );
  }

  return <>{children}</>;
}
