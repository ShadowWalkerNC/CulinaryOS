// ============================================================
// Cheezies Gourmet — Customer Digital Menu Android TV View
// Handcrafted Artisan Melts, Combos, Summit County Tax Notice & High Contrast Distance Display
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplayShell, StatusChip, TvQRCodeCard, DisplayClient } from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const CheeziesMenuView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({
    categories: [],
    specialNotice: 'Summit County Sales Tax 6.75% applied at register • Online ordering: cheeziesgourmetohio.com',
  });

  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const loadData = useCallback(async () => {
    try {
      const res = await client.fetchProjection('guest', 'cheezies_menu', 'cheezies');
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

  // Handle remote command
  const handleRemoteCommand = useCallback(
    (cmd: DisplayRemoteCommand) => {
      if (cmd.type === 'navigate' && cmd.mode) {
        if (cmd.mode === 'kitchen') navigate('/cheezies/ops');
        else if (cmd.mode === 'manager') navigate('/cheezies/owner');
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

  const categories = data.categories || [];

  return (
    <DisplayShell
      brand="cheezies"
      online={online}
      headerProps={{
        brand: 'cheezies',
        title: 'HANDCRAFTED ARTISAN MELTS',
        subtitle: 'THICK SOURDOUGH & BRIOCHE • 100% REAL WISCONSIN CHEESES',
        stationLabel: 'FOOD TRUCK MENU',
      }}
      remoteHints={[
        'Follow on Instagram & TikTok: @cheeziesohio',
        data.specialNotice || 'Summit County 6.75% Tax',
      ]}
    >
      <div className="flex-1 flex gap-8 font-mono">
        {/* Left: Main Artisan Melts & Sides Columns */}
        <div className="flex-1 grid grid-cols-2 gap-8">
          {categories.map((cat: any, cIdx: number) => (
            <div
              key={cIdx}
              className="bg-[#181102] border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col justify-between"
            >
              <div>
                <div className="pb-3 border-b-2 border-amber-400 mb-4 flex items-center justify-between">
                  <h3 className="text-2xl font-black text-amber-400 uppercase tracking-widest">
                    {cat.name}
                  </h3>
                  <span className="text-xs uppercase bg-amber-400 text-amber-950 font-black px-2.5 py-1 rounded">
                    OHIO ARTISAN
                  </span>
                </div>

                <div className="space-y-4">
                  {(cat.items || []).map((item: any, iIdx: number) => {
                    const isSoldOut = item.isSoldOut || item.is86;
                    const priceStr = `$${(item.priceCents / 100).toFixed(0)}`;

                    return (
                      <div
                        key={iIdx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSoldOut
                            ? 'bg-zinc-900/60 border-zinc-800 opacity-50'
                            : item.isFeatured
                            ? 'bg-amber-950/40 border-amber-400/80 shadow-md'
                            : 'bg-amber-950/20 border-amber-500/20'
                        }`}
                      >
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xl font-black tracking-tight ${
                                isSoldOut ? 'line-through text-amber-500/60' : 'text-amber-50'
                              }`}
                            >
                              {item.name}
                            </span>
                            {item.isFeatured && !isSoldOut && (
                              <StatusChip label="TOP SELLER" variant="cheezies" size="sm" />
                            )}
                            {isSoldOut && (
                              <span className="text-xs font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded">
                                SOLD OUT
                              </span>
                            )}
                          </div>

                          <span className="text-3xl font-black text-amber-400 font-mono">
                            {priceStr}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-sm font-sans text-amber-200/80 font-medium mt-1 leading-snug">
                            {item.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {cat.id === 'cat-sides-drinks' && (
                <div className="p-4 rounded-2xl bg-amber-400 text-amber-950 font-bold text-sm uppercase tracking-wide mt-4 flex items-center justify-between">
                  <span>Upgrade Any Melt to a Combo for $4</span>
                  <span className="text-xs font-black bg-amber-950 text-amber-400 px-2 py-1 rounded">
                    SAVE $2
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: Cheezies Online Order QR & Mobile Pickup Card */}
        <div className="w-80 flex flex-col justify-between">
          <TvQRCodeCard
            url="https://cheeziesgourmetohio.square.site"
            label="ORDER FROM PHONE"
            callToAction="Skip the truck line! Order online for immediate pickup at window #2."
            brand="cheezies"
          />

          <div className="bg-[#181102] border border-amber-500/40 rounded-3xl p-6 text-center font-sans mt-4">
            <span className="text-xs uppercase tracking-widest font-black text-amber-400">
              Catering & Private Events
            </span>
            <p className="text-xs text-amber-200/80 mt-2 font-medium">
              Book Cheezies Gourmet for weddings, corporate lunches & Ohio festivals.
            </p>
            <div className="text-sm font-black text-white font-mono mt-2">
              cheeziesgourmetohio.com
            </div>
          </div>
        </div>
      </div>
    </DisplayShell>
  );
};
