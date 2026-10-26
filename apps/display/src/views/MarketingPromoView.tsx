// ============================================================
// CulinaryOS — Marketing & Promo Playlist Android TV View
// Automated Timed Slide Rotation, Specials, Loyalty QR & Remote Pause
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DisplayShell,
  TvQRCodeCard,
  useRemoteDpadNavigation,
  DisplayClient,
} from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const MarketingPromoView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({
    slides: [
      {
        id: 'slide-1',
        type: 'featured',
        title: 'THE CHEF SIGNATURE PRIME RIBEYE',
        subtitle: 'AVAILABLE THIS WEEKEND ONLY',
        description:
          '12oz Center-cut prime ribeye steak grilled over hickory, roasted garlic compound butter, charred asparagus & truffle mashed potatoes.',
        priceCents: 3800,
        durationSeconds: 15,
        qrCodeUrl: 'https://culinaryos.app/menu',
      },
      {
        id: 'slide-2',
        type: 'special',
        title: 'SUNSET HAPPY HOUR SPECIAL',
        subtitle: '4:00 PM – 6:30 PM DAILY',
        description:
          'Enjoy half-priced craft cocktails, artisanal flatbreads, and draft local beers at the bar lounge.',
        priceCents: 1200,
        durationSeconds: 12,
        qrCodeUrl: 'https://culinaryos.app/happyhour',
      },
      {
        id: 'slide-3',
        type: 'loyalty',
        title: 'JOIN CULINARY REWARDS VIP',
        subtitle: 'INSTANT $5 WELCOME CREDIT',
        description:
          'Earn 1 point for every dollar spent. Unlock exclusive chef tastings, secret menu items, and birthday treats.',
        durationSeconds: 10,
        qrCodeUrl: 'https://culinaryos.app/vip',
      },
    ],
    rotationIntervalSeconds: 15,
  });

  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const slides = data.slides || [];
  const currentSlide = slides[activeSlideIndex] || slides[0];

  const loadData = useCallback(async () => {
    try {
      const res = await client.fetchProjection('marketing', 'playlist', 'culinaryos');
      setData(res);
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
        if (cmd.mode === 'kitchen') navigate('/kitchen');
        else if (cmd.mode === 'manager') navigate('/manager');
        else if (cmd.mode === 'staff') navigate('/staff');
        else if (cmd.mode === 'guest') navigate('/menu');
        else if (cmd.mode === 'pickup') navigate('/pickup');
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

  // Automated playlist rotation timer
  useEffect(() => {
    if (slides.length <= 1) return;
    const duration = (currentSlide?.durationSeconds || 12) * 1000;
    const timer = setTimeout(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slides.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [activeSlideIndex, slides.length, currentSlide]);

  // Remote key overrides (Left/Right to skip slide)
  useRemoteDpadNavigation({
    onLeft: () => setActiveSlideIndex((prev) => (prev - 1 + slides.length) % slides.length),
    onRight: () => setActiveSlideIndex((prev) => (prev + 1) % slides.length),
  });

  if (!currentSlide) return null;

  return (
    <DisplayShell
      brand="culinaryos"
      online={online}
      headerProps={{
        title: 'FEATURED SPOTLIGHT',
        subtitle: `SLIDE ${activeSlideIndex + 1} OF ${slides.length} • PROMOTION PLAYLIST`,
        stationLabel: 'PROMOTION',
      }}
      remoteHints={['[◀ ▶] Next / Previous Slide', 'Auto-advancing promotion rotation']}
    >
      <div className="flex-1 flex items-center justify-between gap-12 font-mono px-12">
        {/* Left: Slide Content */}
        <div className="flex-1 max-w-3xl">
          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-400 text-black font-black uppercase text-sm tracking-widest mb-6">
            {currentSlide.subtitle || 'PROMOTION'}
          </div>

          <h2 className="text-6xl font-black uppercase text-white tracking-tight leading-tight mb-6">
            {currentSlide.title}
          </h2>

          <p className="text-2xl font-sans text-slate-300 font-medium leading-relaxed mb-8">
            {currentSlide.description}
          </p>

          {currentSlide.priceCents && (
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-black text-amber-400 font-mono">
                ${(currentSlide.priceCents / 100).toFixed(0)}
              </span>
              <span className="text-sm uppercase font-bold text-slate-400 tracking-wider">
                Limited Time Offering
              </span>
            </div>
          )}

          {/* Slide Progress Dots */}
          <div className="flex items-center gap-3 mt-12">
            {slides.map((_: any, idx: number) => (
              <div
                key={idx}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  idx === activeSlideIndex ? 'w-12 bg-amber-400' : 'w-3 bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right: Dynamic QR Action Card */}
        {currentSlide.qrCodeUrl && (
          <div className="shrink-0">
            <TvQRCodeCard
              url={currentSlide.qrCodeUrl}
              label="SCAN TO ORDER"
              callToAction="Point your phone camera to claim this special instantly"
              brand="culinaryos"
            />
          </div>
        )}
      </div>
    </DisplayShell>
  );
};
