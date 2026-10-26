// ============================================================
// CulinaryOS — TvTicketCard Component for Kitchen TV KDS
// High-contrast, distance-legible ticket card with remote focus ring
// ============================================================

import React from 'react';
import { FocusRing } from './FocusRing';
import { StatusChip } from './StatusChip';

export interface TvTicketItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[];
  notes?: string | null;
  station?: string;
}

export interface TvTicketCardProps {
  id: string;
  orderNumber: number | string;
  orderType?: string;
  tableNumber?: string | null;
  elapsedSeconds: number;
  status: string;
  station?: string;
  courseNumber?: number;
  items: TvTicketItem[];
  allergyFlag?: string | null;
  specialInstructions?: string | null;
  isFocused?: boolean;
  onBump?: () => void;
  brand?: 'culinaryos' | 'cheezies';
  warningMinutes?: number;
  criticalMinutes?: number;
  className?: string;
}

export function formatElapsedSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const TvTicketCard: React.FC<TvTicketCardProps> = ({
  orderNumber,
  orderType = 'DINE IN',
  tableNumber,
  elapsedSeconds,
  station,
  items,
  allergyFlag,
  specialInstructions,
  isFocused = false,
  brand = 'culinaryos',
  warningMinutes = 5,
  criticalMinutes = 10,
  className = '',
}) => {
  const elapsedMins = elapsedSeconds / 60;

  // Timer Color Thresholds
  let timerBadgeColor = 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50';
  let isLate = false;
  if (elapsedMins >= criticalMinutes) {
    timerBadgeColor = 'bg-red-950 text-red-300 border-red-500 font-black animate-pulse';
    isLate = true;
  } else if (elapsedMins >= warningMinutes) {
    timerBadgeColor = 'bg-amber-950/80 text-amber-300 border-amber-500/50 font-bold';
  }

  const isCheezies = brand === 'cheezies';

  return (
    <FocusRing isFocused={isFocused} accentColor={isCheezies ? 'amber' : 'amber'}>
      <div
        className={`w-80 min-h-[380px] max-h-[500px] flex flex-col justify-between rounded-2xl border-2 p-5 font-mono shadow-2xl transition-all ${
          isFocused
            ? isCheezies
              ? 'bg-[#221703] border-amber-400'
              : 'bg-[#131b2c] border-amber-400'
            : isLate
            ? 'bg-[#160608] border-red-800/80'
            : isCheezies
            ? 'bg-[#140e02] border-amber-900/60'
            : 'bg-[#0a0f19] border-slate-800'
        } ${className}`}
      >
        {/* Ticket Header: Order #, Table & Elapsed Timer */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-white tracking-tight">
                  #{orderNumber}
                </span>
                {station && (
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {station}
                  </span>
                )}
              </div>
              <div className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mt-0.5">
                {tableNumber ? `TABLE ${tableNumber} • ` : ''}
                {orderType}
              </div>
            </div>

            {/* Timer Badge */}
            <div className={`px-3 py-1.5 rounded-lg border text-lg font-black ${timerBadgeColor}`}>
              {formatElapsedSeconds(elapsedSeconds)}
            </div>
          </div>

          {/* Allergy Critical Warning Strip (Not Color-Only) */}
          {allergyFlag && (
            <div className="my-2.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-black text-sm uppercase tracking-wider flex items-center gap-2 border border-red-300 shadow-md">
              <span className="text-lg">⚠</span>
              <span>ALLERGY: {allergyFlag}</span>
            </div>
          )}

          {/* Special Instructions Strip */}
          {specialInstructions && !allergyFlag && (
            <div className="my-2 px-3 py-1 rounded bg-amber-500/20 text-amber-200 text-xs font-bold uppercase tracking-wide border border-amber-500/40">
              Note: {specialInstructions}
            </div>
          )}

          {/* Items & Modifiers List */}
          <div className="py-3 space-y-3 overflow-y-auto max-h-[300px]">
            {items.map((item, idx) => (
              <div key={idx} className="border-b border-slate-800/60 pb-2.5 last:border-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-amber-400">{item.quantity}×</span>
                  <span className="text-lg font-bold text-slate-100 tracking-tight leading-tight">
                    {item.name}
                  </span>
                </div>

                {/* Modifiers List */}
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="pl-6 pt-1 space-y-0.5">
                    {item.modifiers.map((mod, mIdx) => (
                      <div key={mIdx} className="text-xs font-extrabold tracking-wide text-amber-300">
                        • {mod.toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}

                {/* Item-level notes */}
                {item.notes && !item.notes.toLowerCase().includes('allergy') && (
                  <div className="pl-6 pt-0.5 text-xs italic font-semibold text-slate-400">
                    "{item.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Remote Bump Hint Footer on Focused Card */}
        {isFocused && (
          <div className="mt-2 pt-2 border-t border-amber-400/30 flex items-center justify-between text-xs font-black uppercase tracking-wider text-amber-400">
            <span>[OK] TO BUMP TICKET</span>
            <span>PRESS CENTER</span>
          </div>
        )}
      </div>
    </FocusRing>
  );
};
