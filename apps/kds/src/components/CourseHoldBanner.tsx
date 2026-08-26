import React, { useEffect, useState } from 'react';
import type { CourseFireEvent } from '../types';

interface Props {
  event: CourseFireEvent | null;
}

/**
 * Modern full-width flash banner shown when a new course is fired.
 * Animates in and fades out.
 */
export function CourseHoldBanner({ event }: Props) {
  const [visible, setVisible] = useState(false);
  const [fading,  setFading]  = useState(false);

  useEffect(() => {
    if (!event) { setVisible(false); setFading(false); return; }
    setFading(false);
    setVisible(true);
    const fade  = setTimeout(() => setFading(true),  3_500);
    const hide  = setTimeout(() => setVisible(false), 4_200);
    return () => { clearTimeout(fade); clearTimeout(hide); };
  }, [event]);

  if (!visible || !event) return null;

  const label = event.firedBy === 'auto'
    ? `Course ${event.courseNumber} Fired Automatically`
    : `Course ${event.courseNumber} Fired by Server`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-6 py-3 bg-[#0f172a] text-white border-b border-[#1e293b] shadow-lg transition-all duration-300 ${
        fading ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0 animate-fadeIn'
      }`}
    >
      {/* Flame Icon */}
      <span className="material-symbols-outlined text-[20px] text-amber-400 filled">
        local_fire_department
      </span>

      <div className="flex items-center gap-3">
        <span className="font-black text-sm uppercase tracking-wide text-white">
          {label}
        </span>
        <span className="text-[#cbd5e1]">·</span>
        <span className="text-xs text-[#94a3b8] font-medium">
          {event.firedTicketIds.length} ticket{event.firedTicketIds.length !== 1 ? 's' : ''} released
        </span>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white uppercase">
          Order #{(event.orderId ?? '').slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Pulse indicator */}
      <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse ml-1" />
    </div>
  );
}

