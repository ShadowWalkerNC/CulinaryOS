import React from 'react';
import type { AnalyticsSummary } from '../types';

interface Props {
  analytics: AnalyticsSummary | null;
}

function fmt(secs: number): string {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

/**
 * Modern bottom analytics bar for the KDS station matching the CulinaryOS Design System.
 * Shows avg ticket time, bump rate, queue depth, and held count.
 */
export function AnalyticsBar({ analytics }: Props) {
  if (!analytics) return null;

  const stats: { label: string; value: string; alert?: boolean }[] = [
    { label: 'Avg Ticket',   value: fmt(analytics.avgTicketSeconds) },
    { label: 'Bumps/hr',     value: analytics.bumpRate.toFixed(1) },
    { label: 'Queue',        value: String(analytics.queueDepth),  alert: analytics.queueDepth > 8 },
    { label: 'Held',         value: String(analytics.heldCount),   alert: analytics.heldCount > 0 },
    { label: 'Period',       value: `${analytics.periodMinutes}m` },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#e5e7eb] px-6 py-2.5 flex justify-center items-center gap-8 shadow-xs z-50 select-none">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center gap-0.5">
          <span
            className={`font-mono text-base font-black tracking-tight ${
              s.alert ? 'text-[#d97706]' : 'text-[#0f172a]'
            }`}
          >
            {s.value}
          </span>
          <span className="text-[9px] font-bold text-[#6b7280] uppercase tracking-wider">
            {s.label}
          </span>
        </div>
      ))}
    </footer>
  );
}

