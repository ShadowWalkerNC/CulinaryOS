import React from 'react';
import type { KitchenTicket } from '../types';
import { BumpButton } from './BumpButton';
import { CulinaryBadge } from '@culinaryos/ui';

interface Props {
  ticket:  KitchenTicket;
  onBump:  (ticketId: string) => Promise<void>;
  onFire?: (ticketId: string) => Promise<void>;
}

/** Returns color + alert status based on elapsed seconds */
function getTimerMeta(secs: number): {
  badgeVariant: 'success' | 'warning' | 'danger';
  textColor: string;
  label: string;
  alertName: string;
} {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  const formatted = `${m}:${s}`;

  if (secs < 300) {
    return {
      badgeVariant: 'success',
      textColor: 'text-[#16a34a]',
      label: formatted,
      alertName: 'NORMAL',
    };
  }
  if (secs < 600) {
    return {
      badgeVariant: 'warning',
      textColor: 'text-[#d97706]',
      label: formatted,
      alertName: 'AMBER ALERT',
    };
  }
  return {
    badgeVariant: 'danger',
    textColor: 'text-[#dc2626]',
    label: formatted,
    alertName: 'RED ALERT',
  };
}

const STATUS_LABEL: Record<string, string> = {
  queued:  'QUEUED',
  cooking: 'COOKING',
  ready:   'READY',
  bumped:  'BUMPED',
};

/**
 * Single kitchen ticket card matching the CulinaryOS Design System.
 * Shows table, station, course badge, hold status, items, modifiers, elapsed timer, and fire/bump buttons.
 */
export function TicketCard({ ticket, onBump, onFire }: Props) {
  const elapsed = ticket.elapsedSeconds ?? 0;
  const timer = getTimerMeta(elapsed);
  const isHeld = ticket.courseHoldStatus === 'held';
  const canBump = !isHeld && ticket.status !== 'voided';

  // Accent bar color at top of card
  const topAccentColor = isHeld
    ? 'bg-amber-500'
    : elapsed >= 600
      ? 'bg-red-500'
      : elapsed >= 300
        ? 'bg-amber-500'
        : 'bg-[#16a34a]';

  return (
    <article className="bg-white border border-[#e5e7eb] rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col gap-3 min-w-[280px] max-w-[340px] shrink-0 relative overflow-hidden transition-all hover:shadow-sm">
      {/* Top accent indicator strip */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${topAccentColor}`} />

      {/* Header row */}
      <div className="flex justify-between items-start pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-base text-[#0b1c30] uppercase tracking-tight">
              {ticket.tableLabel}
            </span>
            {ticket.stationName && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb] rounded uppercase tracking-wider">
                {ticket.stationName}
              </span>
            )}
          </div>
          {ticket.seatNumber != null && (
            <div className="text-[11px] font-medium text-[#6b7280] mt-0.5">
              Seat #{ticket.seatNumber}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {/* Course badge */}
          <CulinaryBadge variant="brand">
            Course {ticket.courseNumber}
          </CulinaryBadge>

          {/* Hold / Fired Status Badge */}
          {isHeld ? (
            <CulinaryBadge variant="warning" className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">pause_circle</span>
              <span>HELD</span>
            </CulinaryBadge>
          ) : (
            <CulinaryBadge variant="success" className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
              <span>FIRED</span>
            </CulinaryBadge>
          )}
        </div>
      </div>

      {/* Status indicator bar */}
      <div className="flex items-center justify-between pb-2 border-b border-[#f3f4f6] text-[10px]">
        <span className="text-[#9ca3af] font-mono uppercase">
          ID: {(ticket.id ?? '').slice(-6).toUpperCase()}
        </span>
        <span className="font-bold uppercase tracking-wider text-[#4b5563]">
          {STATUS_LABEL[ticket.status] ?? (ticket.status ?? 'PENDING').toUpperCase()}
        </span>
      </div>

      {/* Ticket Items */}
      <ul className="flex flex-col gap-2.5 my-1">
        {ticket.items.map((item: any) => (
          <li key={item.id} className="text-xs">
            <div className="flex items-start gap-2">
              <span className="font-mono font-black text-xs bg-[#0f172a0d] text-[#0f172a] px-1.5 py-0.5 rounded border border-[#0f172a15] shrink-0">
                ×{item.quantity}
              </span>
              <span className="font-bold text-[#1f2937] leading-snug">
                {item.name}
              </span>
            </div>

            {item.modifiers && item.modifiers.length > 0 && (
              <div className="pl-7 text-[11px] text-[#6b7280] mt-0.5">
                {item.modifiers.join(' · ')}
              </div>
            )}

            {item.notes && (
              <div className="ml-7 mt-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">flag</span>
                <span>{item.notes}</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Timer & Aging alert */}
      <div className="flex justify-between items-center mt-auto pt-3 border-t border-[#f3f4f6]">
        <CulinaryBadge variant={timer.badgeVariant}>
          {timer.alertName}
        </CulinaryBadge>

        <div className={`font-mono text-2xl font-black tracking-tight ${timer.textColor}`}>
          {timer.label}
        </div>
      </div>

      {/* Actions: Fire Course (if held) or Bump Button */}
      {isHeld && onFire ? (
        <button
          onClick={() => onFire(ticket.id)}
          className="w-full py-3 px-4 bg-[#0f172a] hover:bg-[#1e293b] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] mt-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
          <span>Fire Course {ticket.courseNumber}</span>
        </button>
      ) : (
        <BumpButton ticketId={ticket.id} disabled={!canBump} onBump={onBump} />
      )}
    </article>
  );
}

