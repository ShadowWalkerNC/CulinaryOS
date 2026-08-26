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

  async function handleClick() {
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
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label="Bump ticket"
      className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 select-none shadow-xs mt-2 ${
        disabled || loading
          ? 'bg-[#f3f4f6] text-[#9ca3af] border border-[#e5e7eb] cursor-not-allowed shadow-none'
          : 'bg-[#16a34a] hover:bg-[#15803d] text-white active:scale-[0.98] cursor-pointer shadow-sm hover:shadow-md'
      }`}
    >
      {loading ? (
        <>
          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          <span>Bumping…</span>
        </>
      ) : (
        <>
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>Bump Ticket</span>
        </>
      )}
    </button>
  );
}

