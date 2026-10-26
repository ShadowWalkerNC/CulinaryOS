// ============================================================
// Cheezies Gourmet — Promo & Food Truck Spotlight Android TV View
// Handcrafted Melts Spotlight, Next Ohio Tour Stop, Social CTA & Mobile QR
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplayShell, TvQRCodeCard, DisplayClient } from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const CheeziesPromoView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({
    title: 'THE PATTY MELTDOWN',
    tagline: 'VOTED #1 BEST FOOD TRUCK MELT IN NORTHEAST OHIO',
    description:
      'Thick grilled garlic butter brioche, two smashed prime beef patties, caramelized sweet vidalia onions, melted Swiss and aged Wisconsin cheddar with our signature secret melt sauce.',
    price: '$15',
    nextLocation: 'Tomorrow: Downtown Akron Food Truck Friday • 11:30 AM – 2:30 PM',
    instagramHandle: '@cheeziesohio',
    qrCodeUrl: 'https://cheeziesgourmetohio.square.site',
  });

  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const loadData = useCallback(async () => {
    try {
      const res = await client.fetchProjection('marketing', 'cheezies_promo', 'cheezies');
      setData((prev: any) => ({ ...prev, ...res }));
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [client]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle remote command
  const handleRemoteCommand = useCallback(
    (cmd: DisplayRemoteCommand) => {
      if (cmd.type === 'navigate' && cmd.mode) {
        if (cmd.mode === 'kitchen') navigate('/cheezies/ops');
        else if (cmd.mode === 'manager') navigate('/cheezies/owner');
        else if (cmd.mode === 'guest') navigate('/cheezies/menu');
        else if (cmd.mode === 'pickup') navigate('/cheezies/pickup');
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
        title: 'ARTISAN SPOTLIGHT',
        subtitle: 'CHEEZIES GOURMET FOOD TRUCK • OHIO TOUR 2026',
        stationLabel: 'PROMOTION',
      }}
      remoteHints={[
        `Follow us on Instagram & TikTok: ${data.instagramHandle}`,
        'Online ordering available at cheeziesgourmetohio.com',
      ]}
    >
      <div className="flex-1 flex items-center justify-between gap-12 font-mono px-12">
        {/* Left: Melt Feature & Next Stop Announcement */}
        <div className="flex-1 max-w-3xl">
          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-400 text-amber-950 font-black uppercase text-sm tracking-widest mb-6">
            {data.tagline || 'CHEEZIES SIGNATURE'}
          </div>

          <h2 className="text-6xl font-black uppercase text-amber-50 tracking-tight leading-tight mb-6">
            {data.title}
          </h2>

          <p className="text-2xl font-sans text-amber-200/90 font-medium leading-relaxed mb-8">
            {data.description}
          </p>

          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-6xl font-black text-amber-400 font-mono">{data.price}</span>
            <span className="text-base uppercase font-extrabold text-amber-300 tracking-wider">
              Pair with Tomato Basil Soup Dip for $5
            </span>
          </div>

          {/* Next Tour Stop Banner */}
          <div className="p-4 rounded-2xl bg-[#1e1302] border border-amber-500/40 flex items-center gap-3 text-amber-200 text-sm font-bold">
            <span className="text-xl">📍</span>
            <span>{data.nextLocation}</span>
          </div>
        </div>

        {/* Right: Cheezies Mobile QR Card */}
        <div className="shrink-0 flex flex-col items-center">
          <TvQRCodeCard
            url={data.qrCodeUrl}
            label="ORDER FROM TRUCK"
            callToAction="Scan to place your order on Square Online and pick up hot at window #2."
            brand="cheezies"
          />

          <div className="text-center font-sans mt-4 text-xs font-bold text-amber-400">
            Instagram & TikTok: <span className="text-white">@cheeziesohio</span>
          </div>
        </div>
      </div>
    </DisplayShell>
  );
};
