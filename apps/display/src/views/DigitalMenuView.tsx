// ============================================================
// CulinaryOS — Digital Menu Board Android TV View
// High-Contrast Category Layouts, Prices, Descriptions & Realtime Sold-Out Sync
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplayShell, StatusChip, DisplayClient } from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const DigitalMenuView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({
    categories: [],
    specialItem: null,
  });

  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const loadData = useCallback(async () => {
    try {
      const res = await client.fetchProjection('guest', 'menu', 'culinaryos');
      setData(res);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [client]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle remote view switching
  const handleRemoteCommand = useCallback(
    (cmd: DisplayRemoteCommand) => {
      if (cmd.type === 'navigate' && cmd.mode) {
        if (cmd.mode === 'kitchen') navigate('/kitchen');
        else if (cmd.mode === 'manager') navigate('/manager');
        else if (cmd.mode === 'staff') navigate('/staff');
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

  const categories = data.categories || [];

  return (
    <DisplayShell
      brand="culinaryos"
      online={online}
      headerProps={{
        title: 'OUR MENU',
        subtitle: 'FRESH LOCALLY SOURCED INGREDIENTS • PREPARED TO ORDER',
        stationLabel: 'MAIN DINING',
      }}
      remoteHints={['Prices include local sales tax where applicable', 'Ask server about dietary modifications']}
    >
      <div className="flex-1 flex flex-col justify-between font-mono gap-6">
        {/* Categories Grid */}
        <div className="grid grid-cols-2 gap-8 flex-1">
          {categories.map((cat: any, cIdx: number) => (
            <div
              key={cIdx}
              className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col"
            >
              <div className="pb-3 border-b border-amber-400/40 mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-black text-amber-400 uppercase tracking-widest">
                  {cat.name}
                </h3>
                <span className="text-xs uppercase bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded">
                  Craft Kitchen
                </span>
              </div>

              <div className="space-y-4 flex-1">
                {(cat.items || []).map((item: any, iIdx: number) => {
                  const isSoldOut = item.isSoldOut || item.is86;
                  const priceStr = `$${(item.priceCents / 100).toFixed(0)}`;

                  return (
                    <div
                      key={iIdx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isSoldOut
                          ? 'bg-zinc-900/40 border-zinc-800 opacity-50'
                          : item.isFeatured
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xl font-black tracking-tight ${
                              isSoldOut ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.isFeatured && !isSoldOut && (
                            <StatusChip label="FEATURED" variant="cooking" size="sm" />
                          )}
                          {isSoldOut && (
                            <span className="text-xs font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded">
                              SOLD OUT
                            </span>
                          )}
                        </div>

                        <span className="text-2xl font-black text-amber-400 font-mono">
                          {priceStr}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-sm font-sans text-slate-400 font-medium mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Featured Daily Special Strip */}
        {data.specialItem && (
          <div className="bg-gradient-to-r from-amber-950/60 via-[#181102] to-amber-950/60 border-2 border-amber-400/60 rounded-2xl px-8 py-3.5 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-4">
              <span className="bg-amber-400 text-black font-black uppercase px-3 py-1 rounded text-sm tracking-widest">
                TODAY'S SPECIAL
              </span>
              <div>
                <span className="text-xl font-black text-white">{data.specialItem.name}</span>
                <span className="text-slate-400 font-sans text-sm ml-3">
                  {data.specialItem.description}
                </span>
              </div>
            </div>

            <span className="text-3xl font-black text-amber-400 font-mono">
              ${(data.specialItem.priceCents / 100).toFixed(0)}
            </span>
          </div>
        )}
      </div>
    </DisplayShell>
  );
};
