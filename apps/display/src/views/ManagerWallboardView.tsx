// ============================================================
// CulinaryOS — Manager Wallboard Android TV View
// Large Screen Operational Summary: Sales, Check Avg, Station Load, 86 Items & Low Inventory
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DisplayShell,
  MetricCard,
  StatusChip,
  DisplayClient,
} from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const ManagerWallboardView: React.FC = () => {
  const navigate = useNavigate();
  const [projection, setProjection] = useState<any>({
    salesToday: 428300,
    ordersToday: 186,
    avgTicketCents: 2303,
    kitchenAvgTimeSeconds: 434,
    openOrdersCount: 9,
    lateOrdersCount: 2,
    currentVelocityPerHour: 34,
    stationLoad: {
      hot: 'BUSY',
      cold: 'NORMAL',
      fry: 'HEAVY',
      grill: 'BUSY',
      expo: 'NORMAL',
    },
    items86: ['Haddock', 'Blueberry Pie'],
    lowStockAlerts: [
      { item: 'Brioche Buns', remaining: '8 packs', status: 'LOW' },
      { item: 'Sharp Cheddar', remaining: '3 blocks', status: 'CRITICAL' },
      { item: 'Fries', remaining: '1.5 cases', status: 'LOW' },
    ],
    laborSnapshot: {
      clockedIn: 6,
      laborCostPercent: 24.5,
    },
  });

  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const loadData = useCallback(async () => {
    try {
      const data = await client.fetchProjection('manager', 'live', 'culinaryos');
      setProjection(data);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [client]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle remote command
  const handleRemoteCommand = useCallback(
    (cmd: DisplayRemoteCommand) => {
      if (cmd.type === 'navigate' && cmd.mode) {
        if (cmd.mode === 'kitchen') navigate('/kitchen');
        else if (cmd.mode === 'staff') navigate('/staff');
        else if (cmd.mode === 'guest') navigate('/menu');
        else if (cmd.mode === 'pickup') navigate('/pickup');
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

  const salesFormatted = `$${(projection.salesToday / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
  const checkAvgFormatted = `$${(projection.avgTicketCents / 100).toFixed(2)}`;
  const kitchenAvgFormatted = `${Math.floor(projection.kitchenAvgTimeSeconds / 60)}:${(
    projection.kitchenAvgTimeSeconds % 60
  )
    .toString()
    .padStart(2, '0')}`;

  return (
    <DisplayShell
      brand="culinaryos"
      online={online}
      headerProps={{
        title: 'MANAGER OPERATIONAL WALLBOARD',
        subtitle: 'LIVE RESTAURANT PERFORMANCE & REALTIME SUMMARY',
        stationLabel: 'EXECUTIVE LIVE',
      }}
      remoteHints={['Status updates automatically every 10s', 'Managed remotely via CulinaryOS Manager Hub']}
    >
      <div className="flex-1 flex flex-col gap-6 font-mono">
        {/* Top Operational Metrics Grid */}
        <div className="grid grid-cols-6 gap-5">
          <MetricCard
            label="TODAY'S SALES"
            value={salesFormatted}
            subValue="+12% vs last week"
            variant="accent"
          />
          <MetricCard
            label="TOTAL ORDERS"
            value={projection.ordersToday}
            subValue="34 orders / hour"
            variant="default"
          />
          <MetricCard
            label="AVG CHECK"
            value={checkAvgFormatted}
            subValue="FOH + Online"
            variant="default"
          />
          <MetricCard
            label="KITCHEN AVG"
            value={kitchenAvgFormatted}
            subValue="Target: 08:00"
            variant="success"
          />
          <MetricCard
            label="OPEN ORDERS"
            value={projection.openOrdersCount}
            subValue="Active in kitchen"
            variant="warning"
          />
          <MetricCard
            label="LATE TICKETS"
            value={projection.lateOrdersCount}
            subValue="Exceeding 10m"
            variant={projection.lateOrdersCount > 0 ? 'alert' : 'default'}
          />
        </div>

        {/* Middle Section: Station Load & Inventory/86 Grid */}
        <div className="grid grid-cols-3 gap-6 flex-1">
          {/* Station Load Status */}
          <div className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">
                  KITCHEN STATION LOAD
                </h3>
                <span className="text-xs uppercase bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded">
                  Pacing Engine
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {Object.entries(projection.stationLoad || {}).map(([station, load]) => {
                  const isHeavy = load === 'HEAVY';
                  const isBusy = load === 'BUSY';
                  return (
                    <div
                      key={station}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800"
                    >
                      <span className="text-lg font-black uppercase text-slate-200">
                        {station.toUpperCase()}
                      </span>
                      <StatusChip
                        label={String(load)}
                        variant={isHeavy ? 'late' : isBusy ? 'cooking' : 'success'}
                        size="md"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Labor Snapshot</span>
              <span className="text-white font-bold">
                {projection.laborSnapshot?.clockedIn} Clocked In • {projection.laborSnapshot?.laborCostPercent}% Labor Cost
              </span>
            </div>
          </div>

          {/* 86 List & Portions Remaining */}
          <div className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-xl font-black text-amber-400 uppercase tracking-wider">
                  CURRENT 86'D ITEMS
                </h3>
                <span className="text-xs uppercase bg-rose-950 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-800">
                  {projection.items86?.length || 0} ITEMS UNAVAILABLE
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {(projection.items86 || []).map((item: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40"
                  >
                    <span className="text-lg font-black text-rose-200">{item}</span>
                    <span className="text-xs font-black uppercase tracking-wider bg-rose-600 text-white px-2.5 py-1 rounded">
                      SOLD OUT
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 text-xs text-slate-400 flex items-center gap-2">
              <span className="text-amber-400">ⓘ</span>
              <span>Menu boards and online ordering update automatically.</span>
            </div>
          </div>

          {/* Low Stock Inventory Warnings */}
          <div className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">
                  LOW INVENTORY ALERTS
                </h3>
                <span className="text-xs uppercase bg-amber-950 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-800">
                  Stock Depletion
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {(projection.lowStockAlerts || []).map((alert: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800"
                  >
                    <div>
                      <div className="text-base font-black text-slate-100">{alert.item}</div>
                      <div className="text-xs font-bold text-amber-400">{alert.remaining} remaining</div>
                    </div>
                    <StatusChip
                      label={alert.status}
                      variant={alert.status === 'CRITICAL' ? 'late' : 'alert'}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Ordering Health</span>
              <span className="text-emerald-400 font-bold">Online & Cloud Sync Active</span>
            </div>
          </div>
        </div>
      </div>
    </DisplayShell>
  );
};
