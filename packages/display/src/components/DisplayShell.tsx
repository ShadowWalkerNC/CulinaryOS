// ============================================================
// CulinaryOS — DisplayShell Component
// 1080p/4K 16:9 Responsive TV Shell, Offline Graceful State & Remote Navigation Hints
// ============================================================

import React from 'react';
import { DisplayHeader, DisplayHeaderProps } from './DisplayHeader';

export interface DisplayShellProps {
  headerProps?: DisplayHeaderProps;
  children: React.ReactNode;
  brand?: 'culinaryos' | 'cheezies';
  theme?: string;
  online?: boolean;
  lastUpdated?: string;
  remoteHints?: string[];
  bannerContent?: React.ReactNode;
  className?: string;
}

export const DisplayShell: React.FC<DisplayShellProps> = ({
  headerProps,
  children,
  brand = 'culinaryos',
  online = true,
  lastUpdated,
  remoteHints = ['[◀ ▶] Select Ticket', '[OK] Bump / Action', '[BACK] Undo / Return'],
  bannerContent,
  className = '',
}) => {
  const isCheezies = brand === 'cheezies';

  return (
    <div
      className={`min-h-screen w-screen flex flex-col overflow-hidden select-none font-sans ${
        isCheezies
          ? 'bg-[#0f0a02] text-amber-50'
          : 'bg-[#05080e] text-slate-100'
      } ${className}`}
      style={{
        // Safe overscan margins for physical television bezels
        padding: '0.5rem',
      }}
    >
      {/* Optional Top Warning Banner (e.g. Offline status) */}
      {!online && (
        <div className="w-full bg-amber-500 text-black px-6 py-2 flex items-center justify-between font-bold text-sm uppercase tracking-wider animate-pulse">
          <div className="flex items-center gap-2">
            <span>⚠</span>
            <span>Display Offline — Showing cached operational state</span>
          </div>
          {lastUpdated && <span>Last sync: {lastUpdated}</span>}
        </div>
      )}

      {/* Global Alert Strip if present */}
      {bannerContent}

      {/* TV Header */}
      {headerProps && <DisplayHeader brand={brand} online={online} {...headerProps} />}

      {/* Main TV Viewing Canvas */}
      <main className="flex-1 w-full overflow-hidden p-6 flex flex-col">{children}</main>

      {/* Ergonomic Remote Navigation Legend (Bottom Bar) */}
      <footer
        className={`w-full px-8 py-2.5 flex items-center justify-between text-xs tracking-wider uppercase font-mono border-t ${
          isCheezies
            ? 'bg-[#181102]/80 border-amber-500/20 text-amber-400/80'
            : 'bg-[#090d15]/80 border-slate-800/80 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-6">
          {remoteHints.map((hint, idx) => (
            <span key={idx} className="flex items-center gap-1.5 font-bold">
              <span className="text-white">{hint}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">Android TV 14 • 1080p 60Hz</span>
        </div>
      </footer>
    </div>
  );
};
