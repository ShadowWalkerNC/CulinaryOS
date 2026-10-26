import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import FullScreenSpinner from '@/components/ui/FullScreenSpinner';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, error } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenSpinner />;
  if (error) return (
    <div role="alert" className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
        <p className="text-sm text-amber-400 font-semibold">{error}</p>
        <a href="/login" className="block text-xs text-zinc-500 hover:text-zinc-300 underline">
          Return to sign in
        </a>
      </div>
    </div>
  );
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
