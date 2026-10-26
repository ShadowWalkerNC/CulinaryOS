// ============================================================
// CulinaryOS — DisplayHeader Component for Large TV Screens
// Shows brand, view title, station badge, live time and online heartbeat
// ============================================================

import React, { useState, useEffect } from 'react';
import { StatusChip } from './StatusChip';

export interface DisplayHeaderProps {
  brand?: 'culinaryos' | 'cheezies';
  title: string;
  subtitle?: string;
  stationLabel?: string;
  stationColor?: string;
  online?: boolean;
  lastUpdated?: string;
  showClock?: boolean;
  rightBadge?: React.ReactNode;
}

export const DisplayHeader: React.FC<DisplayHeaderProps> = ({
  brand = 'culinaryos',
  title,
  subtitle,
  stationLabel,
  online = true,
  showClock = true,
  rightBadge,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCheezies = brand === 'cheezies';

  return (
    <header
      className={`w-full px-8 py-4 flex items-center justify-between border-b ${
        isCheezies
          ? 'bg-[#181102] border-amber-500/30 text-amber-50'
          : 'bg-[#0a0f18] border-slate-800 text-slate-100'
      }`}
    >
      {/* Brand & View Info */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          {isCheezies ? (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black tracking-tight text-amber-400 font-sans">
                CHEEZIES
              </span>
              <span className="text-xs uppercase bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded tracking-widest">
                OHIO
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black tracking-tight text-white font-sans">
                CULINARY<span className="text-amber-400">OS</span>
              </span>
              <span className="text-xs uppercase bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded tracking-widest">
                DISPLAY
              </span>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-700/60" />

        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-wide uppercase text-white font-mono">
              {title}
            </h1>
            {stationLabel && (
              <StatusChip
                label={stationLabel}
                variant={isCheezies ? 'cheezies' : 'cooking'}
                size="md"
              />
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-slate-400 font-medium tracking-wide">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right Controls: Right Badge, Clock & Network State */}
      <div className="flex items-center gap-6">
        {rightBadge}

        {/* Live Clock */}
        {showClock && (
          <div className="text-right font-mono">
            <span className="text-3xl font-bold tracking-wider text-slate-100">
              {currentTime}
            </span>
          </div>
        )}

        {/* Online / Offline Dot Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              online
                ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse'
                : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
            }`}
          />
          <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
            {online ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </header>
  );
};
