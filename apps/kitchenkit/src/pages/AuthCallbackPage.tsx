import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import FullScreenSpinner from '@/components/ui/FullScreenSpinner';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { session, loading, error } = useAuth();
  useEffect(() => {
    if (!loading && !error) navigate(session ? '/dashboard' : '/login', { replace: true });
  }, [session, loading, error, navigate]);
  if (error) return <div role="alert" className="p-6"><p>{error}</p><a href="/login">Return to sign in</a></div>;
  return <FullScreenSpinner />;
}
