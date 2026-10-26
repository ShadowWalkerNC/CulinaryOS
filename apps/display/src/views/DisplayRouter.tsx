// ============================================================
// CulinaryOS — Display Auto-Router
// Evaluates device pairing status & routes to the assigned TV view
// ============================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplayClient } from '@culinaryos/display';

export const DisplayRouter: React.FC = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState<boolean>(true);

  useEffect(() => {
    const client = new DisplayClient();
    async function determineRoute() {
      const token = client.getDeviceToken();
      if (!token) {
        navigate('/pair', { replace: true });
        return;
      }

      const session = await client.getSession();
      if (!session || !session.isPaired) {
        navigate('/pair', { replace: true });
        return;
      }

      const mode = session.assignedMode || 'kitchen';
      const view = session.assignedView || 'all';
      const brand = session.configuration?.brand || 'culinaryos';

      if (brand === 'cheezies') {
        if (mode === 'kitchen') navigate('/cheezies/ops', { replace: true });
        else if (mode === 'manager') navigate('/cheezies/owner', { replace: true });
        else if (mode === 'guest') navigate('/cheezies/menu', { replace: true });
        else if (mode === 'pickup') navigate('/cheezies/pickup', { replace: true });
        else if (mode === 'marketing') navigate('/cheezies/promo', { replace: true });
        else navigate('/cheezies/ops', { replace: true });
      } else {
        if (mode === 'kitchen') navigate(`/kitchen?station=${view}`, { replace: true });
        else if (mode === 'manager') navigate('/manager', { replace: true });
        else if (mode === 'staff') navigate('/staff', { replace: true });
        else if (mode === 'guest') navigate('/menu', { replace: true });
        else if (mode === 'pickup') navigate('/pickup', { replace: true });
        else if (mode === 'marketing') navigate('/promo', { replace: true });
        else navigate('/kitchen', { replace: true });
      }
      setChecking(false);
    }

    determineRoute();
  }, [navigate]);

  if (checking) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center font-mono text-slate-400">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm font-bold uppercase tracking-widest text-white">
          CulinaryOS Display Starting...
        </span>
      </div>
    );
  }

  return null;
};
