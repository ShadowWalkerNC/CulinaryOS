// ============================================================
// Cheezies Gourmet — Food Truck Ops Android TV View
// Ticket Queue, Service Time Remaining, Ohio Event Location, 86 Items & Fast Line Bump
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DisplayShell,
  TvTicketCard,
  TvAlertStrip,
  useLinearDpadGrid,
  DisplayClient,
} from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const CheeziesOpsView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({
    tickets: [],
    activeCount: 0,
    avgTicketSeconds: 380,
    eventLocation: 'Cuyahoga Falls Riverfront Park, OH',
    serviceTimeRemaining: '02h 45m',
    items86: [{ name: 'Gluten-Free Brioche', countRemaining: 0 }],
  });

  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const loadData = useCallback(async () => {
    try {
      const res = await client.fetchProjection('kitchen', 'cheezies_truck_ops', 'cheezies');
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

  // Handle remote command
  const handleRemoteCommand = useCallback(
    (cmd: DisplayRemoteCommand) => {
      if (cmd.type === 'navigate' && cmd.mode) {
        if (cmd.mode === 'manager') navigate('/cheezies/owner');
        else if (cmd.mode === 'guest') navigate('/cheezies/menu');
        else if (cmd.mode === 'pickup') navigate('/cheezies/pickup');
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

  // Fast Bump
  const handleBump = useCallback(
    async (ticket: any) => {
      if (!ticket) return;
      setData((prev: any) => ({
        ...prev,
        tickets: prev.tickets.filter((t: any) => t.id !== ticket.id),
        activeCount: Math.max(0, prev.activeCount - 1),
      }));
      setFocusedIndex((prev) => Math.max(0, Math.min(prev, data.tickets.length - 2)));
      await client.bumpTicket(ticket.id);
    },
    [client, data.tickets.length]
  );

  useLinearDpadGrid({
    items: data.tickets || [],
    selectedIndex: focusedIndex,
    onIndexChange: setFocusedIndex,
    onAction: (ticket: any) => handleBump(ticket),
    orientation: 'horizontal',
  });

  const tickets = data.tickets || [];

  return (
    <DisplayShell
      brand="cheezies"
      online={online}
      bannerContent={<TvAlertStrip items86={data.items86} />}
      headerProps={{
        brand: 'cheezies',
        title: 'FOOD TRUCK LINE OPS',
        subtitle: `LOCATION: ${data.eventLocation || 'AKRON / CUYAHOGA FALLS, OH'}`,
        stationLabel: 'MELT LINE #1',
        rightBadge: (
          <div className="flex items-center gap-4 bg-[#231804] border border-amber-500/40 px-4 py-1.5 rounded-xl font-mono text-xs">
            <span className="text-amber-200">
              SERVICE TIME:{' '}
              <strong className="text-amber-400 text-sm font-black">
                {data.serviceTimeRemaining || '02h 45m'}
              </strong>
            </span>
            <span className="text-amber-700">|</span>
            <span className="text-amber-200">
              AVG TICKET:{' '}
              <strong className="text-emerald-400 text-sm font-black">
                {Math.floor(data.avgTicketSeconds / 60)}:
                {(data.avgTicketSeconds % 60).toString().padStart(2, '0')}
              </strong>
            </span>
          </div>
        ),
      }}
      remoteHints={['[◀ ▶] Select Melt Ticket', '[OK] Bump Ticket', 'Cheezies Truck Line Engine']}
    >
      {tickets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center font-mono">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-4xl mb-4">
            🧀
          </div>
          <h2 className="text-3xl font-black uppercase text-amber-300 tracking-wide">
            Cheezies Truck Queue Clear
          </h2>
          <p className="text-amber-400/70 text-sm mt-2">
            Ready for next rush at {data.eventLocation || 'Riverfront'}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-6 overflow-x-auto pb-4 pt-2 px-2 scroll-smooth">
          {tickets.map((t: any, idx: number) => (
            <div key={t.id || idx} className="shrink-0">
              <TvTicketCard
                id={t.id}
                orderNumber={t.orderNumber}
                orderType="TRUCK WINDOW"
                tableNumber={null}
                elapsedSeconds={t.elapsedSeconds}
                status={t.status}
                station="GRILL"
                courseNumber={1}
                items={t.items || []}
                allergyFlag={t.allergyFlag}
                specialInstructions={t.notes}
                isFocused={idx === focusedIndex}
                onBump={() => handleBump(t)}
                brand="cheezies"
                warningMinutes={5}
                criticalMinutes={9}
              />
            </div>
          ))}
        </div>
      )}
    </DisplayShell>
  );
};
