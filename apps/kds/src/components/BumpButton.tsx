import React, { useState } from 'react';

interface Props {
  ticketId:  string;
  disabled?: boolean;
  onBump:    (ticketId: string) => Promise<void>;
}

/**
 * Tactile bump button for KDS touch screens matching the CulinaryOS design system.
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
      className={`w-full min-h-[48px] sm:min-h-[52px] py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 select-none mt-2 border-2 ${
        disabled || loading
          ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed opacity-60 shadow-none'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-sm hover:shadow-md active:scale-[0.97] transition-transform duration-75 ease-out cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400'
      }`}
    >
      {loading ? (
        <>
          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          <span>Bumping…</span>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Bump Ticket</span>
        </>
      )}
    </button>
  );
}

