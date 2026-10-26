// ============================================================
// CulinaryOS — Order Status & Customer Pickup Android TV View
// Ultra-High Contrast Split Board: PREPARING vs READY Order Numbers
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplayShell, TvPickupNumber, DisplayClient } from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const PickupStatusView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({
    preparing: [
      { orderNumber: 1021, estimatedMinutes: 4 },
      { orderNumber: 1024, estimatedMinutes: 6 },
      { orderNumber: 1027, estimatedMinutes: 8 },
      { orderNumber: 1029, estimatedMinutes: 10 },
    ],
    ready: [
      { orderNumber: 1018, readyAt: 'Just now' },
      { orderNumber: 1020, readyAt: '1 min ago' },
      { orderNumber: 1023, readyAt: '3 mins ago' },
    ],
  });

  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const loadData = useCallback(async () => {
    try {
      const res = await client.fetchProjection('pickup', 'status', 'culinaryos');
      setData(res);
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

  // Handle remote view switching
  const handleRemoteCommand = useCallback(
    (cmd: DisplayRemoteCommand) => {
      if (cmd.type === 'navigate' && cmd.mode) {
        if (cmd.mode === 'kitchen') navigate('/kitchen');
        else if (cmd.mode === 'manager') navigate('/manager');
        else if (cmd.mode === 'staff') navigate('/staff');
        else if (cmd.mode === 'guest') navigate('/menu');
        else if (cmd.mode === 'marketing') navigate('/promo');
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
      brand="culinaryos"
      online={online}
      headerProps={{
        title: 'ORDER PICKUP STATUS',
        subtitle: 'PLEASE PROCEED TO THE EXPEDITION COUNTER WHEN YOUR NUMBER TURNS GREEN',
        stationLabel: 'GUEST PICKUP',
      }}
      remoteHints={['Please show your receipt to the expediter when picking up', 'Orders held up to 15 minutes']}
    >
      <div className="flex-1 grid grid-cols-2 gap-10 font-mono">
        {/* Left: Preparing Column */}
        <div className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-8 flex flex-col shadow-2xl">
          <div className="pb-4 border-b-2 border-slate-700 flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-amber-400 uppercase tracking-widest">
              PREPARING
            </h2>
            <span className="text-sm font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3.5 py-1 rounded-full uppercase">
              {data.preparing?.length || 0} In Queue
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 flex-1 auto-rows-min">
            {(data.preparing || []).map((order: any, idx: number) => (
              <TvPickupNumber
                key={idx}
                orderNumber={order.orderNumber}
                status="preparing"
                detail={order.estimatedMinutes ? `~${order.estimatedMinutes} min` : undefined}
              />
            ))}
          </div>
        </div>

        {/* Right: Ready for Pickup Column */}
        <div className="bg-[#061510] border-2 border-emerald-500/60 rounded-3xl p-8 flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.15)]">
          <div className="pb-4 border-b-2 border-emerald-500/60 flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3">
              <span>READY FOR PICKUP</span>
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h2>
            <span className="text-sm font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3.5 py-1 rounded-full uppercase">
              {data.ready?.length || 0} Ready
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 flex-1 auto-rows-min">
            {(data.ready || []).map((order: any, idx: number) => (
              <TvPickupNumber
                key={idx}
                orderNumber={order.orderNumber}
                status="ready"
                detail={order.readyAt || 'Ready'}
              />
            ))}
          </div>
        </div>
      </div>
    </DisplayShell>
  );
};
