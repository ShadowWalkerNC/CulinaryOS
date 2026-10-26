// ============================================================
// CulinaryOS — Kitchen KDS Android TV View
// D-Pad Remote Navigation, Ticket Timer, Allergen Visibility, Fast Bump & Offline State
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  DisplayShell,
  TvTicketCard,
  TvAlertStrip,
  useLinearDpadGrid,
  useRemoteDpadNavigation,
  DisplayClient,
} from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

const STATIONS = ['all', 'hot', 'cold', 'fry', 'grill', 'expo'] as const;

export const KitchenKdsView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const stationParam = searchParams.get('station') || 'all';

  const [stationIndex, setStationIndex] = useState<number>(() => {
    const idx = STATIONS.indexOf(stationParam as any);
    return idx >= 0 ? idx : 0;
  });

  const activeStation = STATIONS[stationIndex] || 'all';

  const [projection, setProjection] = useState<any>({
    tickets: [],
    activeCount: 0,
    avgTicketSeconds: 434,
    oldestTicketSeconds: 762,
    readyCount: 3,
    items86: [],
  });

  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [online, setOnline] = useState<boolean>(true);
  const [recentlyBumped, setRecentlyBumped] = useState<any[]>([]);

  const client = useMemo(() => new DisplayClient(), []);

  // Fetch live projection data
  const loadProjection = useCallback(async () => {
    try {
      const data = await client.fetchProjection('kitchen', activeStation, 'culinaryos');
      setProjection(data);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [client, activeStation]);

  useEffect(() => {
    loadProjection();
    const interval = setInterval(loadProjection, 5000);
    return () => clearInterval(interval);
  }, [loadProjection]);

  // Handle remote commands from heartbeat (e.g. manager changes view or requests refresh)
  const handleRemoteCommand = useCallback((cmd: DisplayRemoteCommand) => {
    if (cmd.type === 'navigate') {
      if (cmd.mode === 'manager') navigate('/manager');
      else if (cmd.mode === 'staff') navigate('/staff');
      else if (cmd.mode === 'guest') navigate('/menu');
      else if (cmd.mode === 'pickup') navigate('/pickup');
      else if (cmd.mode === 'marketing') navigate('/promo');
      else if (cmd.view) {
        const sIdx = STATIONS.indexOf(cmd.view as any);
        if (sIdx >= 0) setStationIndex(sIdx);
      }
    } else if (cmd.type === 'refresh') {
      window.location.reload();
    }
  }, [navigate]);

  useEffect(() => {
    client.startHeartbeatLoop(15000, handleRemoteCommand);
    return () => client.stopHeartbeatLoop();
  }, [client, handleRemoteCommand]);

  // Sync station change to URL
  useEffect(() => {
    setSearchParams({ station: activeStation });
    setFocusedIndex(0);
  }, [activeStation, setSearchParams]);

  // Bump action
  const handleBump = useCallback(
    async (ticket: any) => {
      if (!ticket) return;

      // Optimistically remove from state
      setRecentlyBumped((prev) => [ticket, ...prev.slice(0, 4)]);
      setProjection((prev: any) => ({
        ...prev,
        tickets: prev.tickets.filter((t: any) => t.id !== ticket.id),
        activeCount: Math.max(0, prev.activeCount - 1),
      }));

      // Adjust focus index if needed
      setFocusedIndex((prev) => Math.max(0, Math.min(prev, projection.tickets.length - 2)));

      // Call API
      await client.bumpTicket(ticket.id);
    },
    [client, projection.tickets.length]
  );

  // Undo / Recall bumped ticket
  const handleRecall = useCallback(() => {
    if (recentlyBumped.length === 0) return;
    const recalled = recentlyBumped[0];
    setRecentlyBumped((prev) => prev.slice(1));
    setProjection((prev: any) => ({
      ...prev,
      tickets: [recalled, ...prev.tickets],
      activeCount: prev.activeCount + 1,
    }));
  }, [recentlyBumped]);

  // Remote D-Pad Navigation:
  // LEFT / RIGHT: Navigate tickets
  // OK: Bump active ticket
  // BACK: Recall / Undo last bump
  useLinearDpadGrid({
    items: projection.tickets || [],
    selectedIndex: focusedIndex,
    onIndexChange: setFocusedIndex,
    onAction: (ticket: any) => handleBump(ticket),
    onBack: handleRecall,
    orientation: 'horizontal',
  });

  // UP / DOWN: Cycle through stations
  useRemoteDpadNavigation({
    onUp: () => setStationIndex((prev) => Math.max(0, prev - 1)),
    onDown: () => setStationIndex((prev) => Math.min(STATIONS.length - 1, prev + 1)),
  });

  const tickets = projection.tickets || [];

  return (
    <DisplayShell
      brand="culinaryos"
      online={online}
      bannerContent={<TvAlertStrip items86={projection.items86} />}
      headerProps={{
        title: 'KITCHEN DISPLAY SYSTEM',
        subtitle: `STATION: ${activeStation.toUpperCase()} • ${tickets.length} ACTIVE ORDERS`,
        stationLabel: activeStation.toUpperCase(),
        rightBadge: (
          <div className="flex items-center gap-4 bg-[#101726] border border-slate-700 px-4 py-1.5 rounded-xl font-mono text-xs">
            <span className="text-slate-400">
              ACTIVE: <strong className="text-white text-sm">{projection.activeCount}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              AVG:{' '}
              <strong className="text-amber-400 text-sm">
                {Math.floor(projection.avgTicketSeconds / 60)}:
                {(projection.avgTicketSeconds % 60).toString().padStart(2, '0')}
              </strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              OLDEST:{' '}
              <strong className="text-red-400 text-sm">
                {Math.floor(projection.oldestTicketSeconds / 60)}:
                {(projection.oldestTicketSeconds % 60).toString().padStart(2, '0')}
              </strong>
            </span>
          </div>
        ),
      }}
      remoteHints={[
        '[◀ ▶] Select Ticket',
        '[OK] Bump Ticket',
        '[BACK] Undo / Recall',
        '[▲ ▼] Switch Station (' + activeStation.toUpperCase() + ')',
      ]}
    >
      {/* Horizontal Ticket Rail with smooth horizontal scroll */}
      {tickets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center font-mono">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-4xl mb-4">
            ✓
          </div>
          <h2 className="text-3xl font-black uppercase text-slate-200 tracking-wide">
            All Caught Up
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            No active tickets for station: {activeStation.toUpperCase()}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-6 overflow-x-auto pb-4 pt-2 px-2 scroll-smooth">
          {tickets.map((t: any, idx: number) => (
            <div key={t.id || idx} className="shrink-0">
              <TvTicketCard
                id={t.id}
                orderNumber={t.orderNumber}
                orderType={t.orderType}
                tableNumber={t.tableNumber}
                elapsedSeconds={t.elapsedSeconds}
                status={t.status}
                station={t.station}
                courseNumber={t.courseNumber}
                items={t.items || []}
                allergyFlag={t.allergyFlag}
                specialInstructions={t.notes}
                isFocused={idx === focusedIndex}
                onBump={() => handleBump(t)}
                warningMinutes={5}
                criticalMinutes={10}
              />
            </div>
          ))}
        </div>
      )}
    </DisplayShell>
  );
};
