import React, { useState } from 'react';
import type { KitchenTicket } from '../types';
import { BumpButton } from './BumpButton';
import { CulinaryBadge } from '@culinaryos/ui';
import {
  translateTicketItem,
  type SupportedLanguage,
} from '@culinaryos/shared';

interface Props {
  ticket: KitchenTicket;
  language?: SupportedLanguage;
  onBump: (ticketId: string) => Promise<void>;
  onFire?: (ticketId: string) => Promise<void>;
  onQuickScrap?: (payload: {
    ingredient: string;
    itemName: string;
    quantity: number;
    reason: 'dropped' | 'burned' | 'spoiled' | 'overportion' | 'void_cooked';
  }) => Promise<void>;
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
  queued: 'QUEUED',
  cooking: 'COOKING',
  ready: 'READY',
  bumped: 'BUMPED',
};

/**
 * Single kitchen ticket card matching the CulinaryOS Design System.
 * Supports dual-language translation, 86 inventory countdowns, multi-course pacing, and quick scrap logging.
 */
export function TicketCard({
  ticket,
  language = 'en',
  onBump,
  onFire,
  onQuickScrap,
}: Props) {
  const elapsed = ticket.elapsedSeconds ?? 0;
  const timer = getTimerMeta(elapsed);
  const isHeld = ticket.courseHoldStatus === 'held';
  const canBump = !isHeld && ticket.status !== 'voided';
  const [scrapItemName, setScrapItemName] = useState<string | null>(null);
  const [scrapSuccess, setScrapSuccess] = useState(false);

  // Multi-course pacing alert: if held and order is >= 12 mins (720s) old
  const isPacingAlert = isHeld && elapsed >= 720;
  const isPacingUrgent = isHeld && elapsed >= 900;

  // Accent bar color at top of card
  const topAccentColor = isPacingUrgent
    ? 'bg-red-600 animate-pulse'
    : isHeld
      ? 'bg-amber-500'
      : elapsed >= 600
        ? 'bg-red-500'
        : elapsed >= 300
          ? 'bg-amber-500'
          : 'bg-[#16a34a]';

  async function handleQuickScrapSubmit(
    itemName: string,
    reason: 'dropped' | 'burned' | 'spoiled' | 'overportion' | 'void_cooked'
  ) {
    if (onQuickScrap) {
      await onQuickScrap({
        ingredient: itemName,
        itemName,
        quantity: 1,
        reason,
      });
    } else {
      // Direct API fallback
      const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const tenantId = (import.meta as any).env?.VITE_TENANT_ID || '00000000-0000-0000-0000-000000000001';
      await fetch(`${apiBase}/v1/ops/waste/quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({ ingredient: itemName, itemName, quantity: 1, reason }),
      }).catch(() => {});
    }

    setScrapItemName(null);
    setScrapSuccess(true);
    setTimeout(() => setScrapSuccess(false), 2000);
  }

  return (
    <article className="bg-white border border-[#e5e7eb] rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col gap-3 min-w-[280px] max-w-[350px] shrink-0 relative overflow-hidden transition-all hover:shadow-sm">
      {/* Top accent indicator strip */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${topAccentColor}`} />

      {/* Pacing Alert Warning Banner */}
      {isPacingAlert && (
        <div className="mt-1 px-2 py-1 bg-red-600 text-white font-black text-[10px] rounded-lg uppercase tracking-wider flex items-center justify-between animate-pulse">
          <span>🚨 PACING ALERT: FIRE COURSE {ticket.courseNumber} NOW!</span>
          <span className="font-mono">+{Math.floor(elapsed / 60)}m</span>
        </div>
      )}

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

      {/* Ticket Items with Dual-Language & 86 Countdowns */}
      <ul className="flex flex-col gap-2.5 my-1">
        {ticket.items.map((item: any) => {
          const trans = translateTicketItem(
            { name: item.name, quantity: item.quantity || 1, modifiers: item.modifiers || [] },
            language
          );
          const hasTranslation = language !== 'en' && trans.translatedName !== item.name;
          const translatedMods = trans.translatedModifiers ?? [];

          return (
            <li key={item.id} className="text-xs group relative">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <span className="font-mono font-black text-xs bg-[#0f172a0d] text-[#0f172a] px-1.5 py-0.5 rounded border border-[#0f172a15] shrink-0">
                    ×{item.quantity}
                  </span>

                  <div className="flex flex-col">
                    {/* Primary Name (Translated or Original) */}
                    <span className="font-bold text-[#1f2937] leading-snug">
                      {trans.translatedName}
                    </span>

                    {/* Dual-Language Subtitle */}
                    {hasTranslation && (
                      <span className="text-[10px] text-zinc-500 font-medium italic">
                        ({item.name})
                      </span>
                    )}
                  </div>
                </div>

                {/* 86 Countdown Indicator & Quick Waste Action */}
                <div className="flex items-center gap-1.5">
                  {item.countRemaining != null && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                        item.countRemaining <= 0
                          ? 'bg-red-600 text-white animate-pulse'
                          : item.countRemaining <= 5
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : 'bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {item.countRemaining <= 0 ? "86'D" : `${item.countRemaining} LEFT`}
                    </span>
                  )}

                  <button
                    onClick={() => setScrapItemName(scrapItemName === item.name ? null : item.name)}
                    className="opacity-0 group-hover:opacity-100 transition text-zinc-400 hover:text-red-600 p-1 text-[11px]"
                    title="1-Click Kitchen Scrap / Waste Log"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Quick Scrap Reason Dropdown */}
              {scrapItemName === item.name && (
                <div className="mt-1.5 p-2 bg-zinc-900 text-white rounded-xl border border-zinc-700 space-y-1 z-10 shadow-lg">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase">
                    Log Quick Scrap: {item.name}
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    {(['dropped', 'burned', 'spoiled', 'overportion', 'void_cooked'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleQuickScrapSubmit(item.name, r)}
                        className="px-1.5 py-1 text-[9px] font-bold bg-zinc-800 hover:bg-red-600 text-zinc-200 hover:text-white rounded transition text-center"
                      >
                        {r.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers (Dual-Language) */}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="pl-7 text-[11px] text-[#6b7280] mt-0.5 font-medium">
                  {translatedMods.join(' · ')}
                  {hasTranslation && (
                    <span className="block text-[10px] text-zinc-400 italic">
                      ({item.modifiers.join(' · ')})
                    </span>
                  )}
                </div>
              )}

              {item.notes && (
                <div className="ml-7 mt-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold rounded flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">flag</span>
                  <span>{item.notes}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Scrap confirmation alert */}
      {scrapSuccess && (
        <div className="px-2 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded text-center">
          ✓ Scrap logged to Kitchen Waste Ledger!
        </div>
      )}

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
          className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] mt-2 cursor-pointer ${
            isPacingAlert
              ? 'bg-red-600 hover:bg-red-500 text-white animate-bounce'
              : 'bg-[#0f172a] hover:bg-[#1e293b] text-white'
          }`}
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
