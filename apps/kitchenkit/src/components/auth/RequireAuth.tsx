import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import FullScreenSpinner from '@/components/ui/FullScreenSpinner';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, error } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenSpinner />;
  if (error) return <div role="alert" className="p-6"><p>{error}</p><a href="/login">Return to sign in</a></div>;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
