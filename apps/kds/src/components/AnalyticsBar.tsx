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
 * Slim bottom analytics bar for the KDS station.
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
    <div style={{
      position:       'fixed',
      bottom:         0,
      left:           0,
      right:          0,
      display:        'flex',
      justifyContent: 'center',
      gap:            '32px',
      padding:        '10px 24px',
      background:     'var(--surface)',
      borderTop:      '1px solid var(--border)',
      zIndex:         100,
    }}>
      {stats.map((s) => (
        <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{
            fontFamily:  'var(--font-mono)',
            fontSize:    '18px',
            fontWeight:  700,
            color:       s.alert ? 'var(--amber)' : 'var(--text)',
          }}>{s.value}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
