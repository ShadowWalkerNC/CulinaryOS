// ============================================================
// Cheezies Gourmet — Truck Owner Wallboard Android TV View
// Truck Revenue, Average Check, Artisan Melt Velocity & Event Progress
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplayShell, MetricCard, StatusChip, DisplayClient } from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const CheeziesOwnerView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({
    salesToday: 284500,
    ordersToday: 112,
    avgTicketCents: 2540,
    foodCostPercent: 26.2,
    rushStatus: 'PEAK RUSH',
    topSellers: [
      { name: 'The Patty Meltdown', count: 48, revenue: '$720' },
      { name: 'The Mac Attack', count: 34, revenue: '$476' },
      { name: 'The Truffle Melt', count: 26, revenue: '$416' },
      { name: 'Chips & Drink Combo', count: 62, revenue: '$248' },
    ],
    lowStock: [
      { item: 'Artisan Brioche Loaves', count: '4 left', alert: 'CRITICAL' },
      { item: 'Sharp Wisconsin Cheddar', count: '2 blocks', alert: 'LOW' },
      { item: 'House Cheese Sauce', count: '3 liters', alert: 'LOW' },
    ],
    eventTarget: {
      name: 'Cuyahoga Falls Riverfront Festival',
      targetSales: '$3,500',
      progressPercent: 81,
    },
  });

  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const loadData = useCallback(async () => {
    try {
      const res = await client.fetchProjection('manager', 'cheezies_owner', 'cheezies');
      setData((prev: any) => ({ ...prev, ...res }));
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
        if (cmd.mode === 'kitchen') navigate('/cheezies/ops');
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

  const salesFormatted = `$${(data.salesToday / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
  const checkAvgFormatted = `$${(data.avgTicketCents / 100).toFixed(2)}`;

  return (
    <DisplayShell
      brand="cheezies"
      online={online}
      headerProps={{
        brand: 'cheezies',
        title: 'TRUCK OWNER LIVE DASHBOARD',
        subtitle: 'SUMMIT COUNTY PILOT UNIT #01 • REALTIME OPERATIONAL METRICS',
        stationLabel: 'OWNER VIEW',
      }}
      remoteHints={['Cheezies Live Economics', 'Includes Square Terminal & Window Sales']}
    >
      <div className="flex-1 flex flex-col gap-6 font-mono">
        {/* Top Operational Metrics */}
        <div className="grid grid-cols-5 gap-6">
          <MetricCard
            label="TODAY'S REVENUE"
            value={salesFormatted}
            subValue="Square + Cash + Mobile"
            variant="accent"
          />
          <MetricCard
            label="TOTAL ORDERS"
            value={data.ordersToday}
            subValue="28 orders / hr"
            variant="default"
          />
          <MetricCard
            label="AVG TICKET"
            value={checkAvgFormatted}
            subValue="Target: $22.00"
            variant="default"
          />
          <MetricCard
            label="EST. FOOD COST"
            value={`${data.foodCostPercent}%`}
            subValue="Target: 28% GP"
            variant="success"
          />
          <MetricCard
            label="RUSH STATUS"
            value={data.rushStatus}
            subValue="Line Depth: 4 tickets"
            variant="warning"
          />
        </div>

        {/* Center Grid: Top Melts & Event Target */}
        <div className="grid grid-cols-3 gap-6 flex-1">
          {/* Top Selling Melts */}
          <div className="bg-[#181102] border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black text-amber-400 uppercase tracking-wider pb-3 border-b border-amber-500/30 mb-4">
                TOP SELLING ARTISAN MELTS
              </h3>
              <div className="space-y-3">
                {(data.topSellers || []).map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20"
                  >
                    <div>
                      <span className="text-lg font-black text-amber-100">{item.name}</span>
                      <div className="text-xs text-amber-400 font-bold">{item.count} melts sold</div>
                    </div>
                    <span className="text-lg font-black text-amber-300 font-mono">{item.revenue}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t border-amber-500/20 text-xs text-amber-400/80">
              Ranked by total units sold today
            </div>
          </div>

          {/* Low Stock On-Truck */}
          <div className="bg-[#181102] border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black text-amber-400 uppercase tracking-wider pb-3 border-b border-amber-500/30 mb-4">
                LOW TRUCK INVENTORY
              </h3>
              <div className="space-y-3">
                {(data.lowStock || []).map((stock: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20"
                  >
                    <div>
                      <span className="text-base font-black text-amber-100">{stock.item}</span>
                      <div className="text-xs font-bold text-amber-400">{stock.count}</div>
                    </div>
                    <StatusChip
                      label={stock.alert}
                      variant={stock.alert === 'CRITICAL' ? 'late' : 'alert'}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#231804] border border-amber-500/30 text-xs text-amber-300">
              Restock alert sent to Commissary prep kitchen
            </div>
          </div>

          {/* Event Goal Progress */}
          <div className="bg-[#181102] border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black text-amber-400 uppercase tracking-wider pb-3 border-b border-amber-500/30 mb-4">
                EVENT SALES TARGET
              </h3>
              <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/30 mt-4">
                <span className="text-xs font-bold uppercase text-amber-300 tracking-wider">
                  {data.eventTarget?.name}
                </span>
                <div className="text-4xl font-black text-amber-400 mt-2">
                  {salesFormatted}{' '}
                  <span className="text-xl text-amber-600 font-bold">
                    / {data.eventTarget?.targetSales}
                  </span>
                </div>
                <div className="w-full bg-amber-950 rounded-full h-3.5 mt-4 border border-amber-500/40 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${data.eventTarget?.progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-amber-300 mt-2 block text-right">
                  {data.eventTarget?.progressPercent}% OF DAILY TARGET
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-amber-500/20 text-xs text-amber-400/80">
              Food Truck Live Pace Engine • CulinaryOS
            </div>
          </div>
        </div>
      </div>
    </DisplayShell>
  );
};
