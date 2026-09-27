import React, { useState } from 'react';
import { CheckCircle2 } from '@culinaryos/ui';

interface Props {
  ticketId:  string;
  disabled?: boolean;
  onBump:    (ticketId: string) => Promise<void>;
}

/**
 * Tactile bump button for KDS touch screens matching the CulinaryOS design system (Rule 13 / R3).
 * Minimum 64px height engineered for gloved kitchen line operation with zero-layout-shift loading bounds.
 */
export function BumpButton({ ticketId, disabled = false, onBump }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onBump(ticketId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label="Bump ticket"
      aria-busy={loading ? true : undefined}
      className={`relative w-full min-h-[64px] sm:min-h-[72px] h-16 sm:h-20 py-3 px-5 rounded-xl font-black text-sm sm:text-base uppercase tracking-wider transition-all flex items-center justify-center select-none mt-2 border-2 ${
        disabled || loading
          ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed opacity-60 shadow-none'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-sm hover:shadow-md active:scale-[0.96] transition-transform duration-75 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2'
      }`}
    >
      <span className={loading ? 'invisible' : 'inline-flex items-center justify-center gap-2'}>
        <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span>Bump Ticket</span>
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-2" aria-hidden="true">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Bumping…</span>
        </span>
      )}
    </button>
  );
}

