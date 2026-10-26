// ============================================================
// Cheezies Gourmet — Food Truck Order Pickup Android TV View
// High-Contrast Split Board: COOKING vs READY Ticket Numbers
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplayShell, TvPickupNumber, DisplayClient } from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const CheeziesPickupView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({
    cooking: [
      { orderNumber: 42, estimatedMinutes: 3 },
      { orderNumber: 43, estimatedMinutes: 5 },
      { orderNumber: 45, estimatedMinutes: 7 },
    ],
    ready: [
      { orderNumber: 39, readyAt: 'Window #2' },
      { orderNumber: 41, readyAt: 'Window #2' },
    ],
  });

  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const loadData = useCallback(async () => {
    try {
      const res = await client.fetchProjection('pickup', 'cheezies_pickup', 'cheezies');
      if (res.preparing) {
        setData({
          cooking: res.preparing,
          ready: res.ready,
        });
      }
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [client]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle remote command
  const handleRemoteCommand = useCallback(
    (cmd: DisplayRemoteCommand) => {
      if (cmd.type === 'navigate' && cmd.mode) {
        if (cmd.mode === 'kitchen') navigate('/cheezies/ops');
        else if (cmd.mode === 'manager') navigate('/cheezies/owner');
        else if (cmd.mode === 'guest') navigate('/cheezies/menu');
        else if (cmd.mode === 'marketing') navigate('/cheezies/promo');
      } else if (cmd.type === 'refresh') {
        window.location.reload();
      }
    },
    [navigate]
  );

  useEffect(() => {
    client.startHeartbeatLoop(15000, handleRemoteCommand);
    return () => client.stopHeartbeatLoop();
  }, [client, handleRemoteCommand]);

  return (
    <DisplayShell
      brand="cheezies"
      online={online}
      headerProps={{
        brand: 'cheezies',
        title: 'TRUCK ORDER STATUS',
        subtitle: 'PICK UP HOT MELTS AT WINDOW #2 WHEN YOUR NUMBER TURNS GREEN',
        stationLabel: 'WINDOW STATUS',
      }}
      remoteHints={['Orders called by ticket number', 'Follow @cheeziesohio for live updates']}
    >
      <div className="flex-1 grid grid-cols-2 gap-10 font-mono">
        {/* Left: Cooking On Grill Column */}
        <div className="bg-[#181102] border-2 border-amber-500/40 rounded-3xl p-8 flex flex-col shadow-2xl">
          <div className="pb-4 border-b-2 border-amber-500/40 flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-amber-400 uppercase tracking-widest flex items-center gap-3">
              <span>COOKING ON GRILL</span>
              <span className="text-2xl">🔥</span>
            </h2>
            <span className="text-sm font-black bg-amber-400 text-amber-950 px-3.5 py-1 rounded-full uppercase">
              {data.cooking?.length || 0} Orders
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 flex-1 auto-rows-min">
            {(data.cooking || []).map((order: any, idx: number) => (
              <TvPickupNumber
                key={idx}
                orderNumber={order.orderNumber}
                status="preparing"
                detail={order.estimatedMinutes ? `~${order.estimatedMinutes} min` : undefined}
                className="bg-amber-950/20 border-amber-500/30 text-amber-200"
              />
            ))}
          </div>
        </div>

        {/* Right: Ready at Window Column */}
        <div className="bg-[#0b1f13] border-2 border-emerald-400 rounded-3xl p-8 flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          <div className="pb-4 border-b-2 border-emerald-400 flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3">
              <span>READY AT WINDOW #2</span>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h2>
            <span className="text-sm font-black bg-emerald-400 text-black px-3.5 py-1 rounded-full uppercase">
              {data.ready?.length || 0} Ready Now
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 flex-1 auto-rows-min">
            {(data.ready || []).map((order: any, idx: number) => (
              <TvPickupNumber
                key={idx}
                orderNumber={order.orderNumber}
                status="ready"
                detail={order.readyAt || 'Window #2'}
                className="bg-emerald-950/50 border-emerald-400 text-emerald-300"
              />
            ))}
          </div>
        </div>
      </div>
    </DisplayShell>
  );
};
