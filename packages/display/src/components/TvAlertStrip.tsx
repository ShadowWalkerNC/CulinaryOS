// ============================================================
// CulinaryOS — TvAlertStrip Component
// Broadcasts 86 inventory updates, station alerts, and system notices
// ============================================================

import React from 'react';

export interface TvAlertStripProps {
  items86?: Array<{ name: string; countRemaining?: number | null } | string>;
  systemAlert?: string | null;
  className?: string;
}

export const TvAlertStrip: React.FC<TvAlertStripProps> = ({
  items86 = [],
  systemAlert,
  className = '',
}) => {
  if ((!items86 || items86.length === 0) && !systemAlert) {
    return null;
  }

  return (
    <div
      className={`w-full bg-[#1e1302] border-b border-amber-500/40 px-8 py-2 flex items-center justify-between text-xs font-mono font-bold tracking-wider text-amber-300 ${className}`}
    >
      <div className="flex items-center gap-4 overflow-hidden">
        <span className="bg-amber-500 text-black px-2 py-0.5 rounded font-black uppercase text-[10px] tracking-widest">
          86 NOTICE
        </span>
        <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap">
          {items86.map((item, idx) => {
            const name = typeof item === 'string' ? item : item.name;
            const count = typeof item === 'object' ? item.countRemaining : null;
            return (
              <span key={idx} className="flex items-center gap-1.5 text-amber-200">
                <span className="text-red-400 font-black">✕</span>
                <span>{name}</span>
                {count !== null && count !== undefined && count > 0 && (
                  <span className="text-amber-400 font-extrabold">({count} left)</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {systemAlert && (
        <div className="text-rose-400 font-black animate-pulse flex items-center gap-1.5">
          <span>⚠</span>
          <span>{systemAlert}</span>
        </div>
      )}
    </div>
  );
};
