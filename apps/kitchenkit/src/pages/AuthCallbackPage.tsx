import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import FullScreenSpinner from '@/components/ui/FullScreenSpinner';

/**
 * Supabase redirects here after the user clicks the magic link.
 * The URL contains the session tokens as hash params.
 * We let the Supabase SDK handle the exchange, then redirect to /dashboard.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/dashboard', { replace: true });
      }
    });
  }, [navigate]);

  return <FullScreenSpinner />;
}
