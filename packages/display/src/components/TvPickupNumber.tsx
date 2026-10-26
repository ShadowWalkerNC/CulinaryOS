// ============================================================
// CulinaryOS — TvPickupNumber Component
// Ultra-bold distance-legible order number chip for customer pickup boards
// ============================================================

import React from 'react';

export interface TvPickupNumberProps {
  orderNumber: number | string;
  status: 'preparing' | 'ready';
  detail?: string | null | undefined;
  className?: string | undefined;
}

export const TvPickupNumber: React.FC<TvPickupNumberProps> = ({
  orderNumber,
  status,
  detail,
  className = '',
}) => {
  const isReady = status === 'ready';

  return (
    <div
      className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center transition-transform shadow-xl ${
        isReady
          ? 'bg-emerald-950/40 border-emerald-400 text-emerald-300 scale-105'
          : 'bg-[#0f172a]/70 border-slate-700 text-slate-200'
      } ${className}`}
    >
      <span className="text-6xl font-black font-mono tracking-tight">#{orderNumber}</span>
      {detail && (
        <span
          className={`text-sm font-bold uppercase tracking-wider mt-2 ${
            isReady ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {detail}
        </span>
      )}
    </div>
  );
};
