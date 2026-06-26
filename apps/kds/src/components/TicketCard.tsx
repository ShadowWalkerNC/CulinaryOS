import React from 'react';
import type { KitchenTicket } from '../types';
import { BumpButton } from './BumpButton';

interface Props {
  ticket:  KitchenTicket;
  onBump:  (ticketId: string) => Promise<void>;
}

/** Returns color + label based on elapsed seconds */
function timerColor(secs: number): { color: string; label: string } {
  if (secs < 300)  return { color: 'var(--green)',  label: formatTime(secs) };
  if (secs < 600)  return { color: 'var(--amber)',  label: formatTime(secs) };
  return               { color: 'var(--red)',    label: formatTime(secs) };
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const STATUS_LABEL: Record<string, string> = {
  queued:  'QUEUED',
  cooking: 'COOKING',
  ready:   'READY',
  bumped:  'BUMPED',
};

const STATUS_COLOR: Record<string, string> = {
  queued:  'var(--text-muted)',
  cooking: 'var(--accent)',
  ready:   'var(--green)',
  bumped:  '#374151',
};

/**
 * Single kitchen ticket card.
 * Shows table, course badge, items, modifiers, elapsed timer, and bump button.
 */
export function TicketCard({ ticket, onBump }: Props) {
  const timer = timerColor(ticket.elapsedSeconds);
  const canBump = ticket.status === 'cooking' || ticket.status === 'ready';

  return (
    <article
      style={{
        background:    'var(--surface)',
        border:        `1px solid var(--border)`,
        borderTop:     `3px solid ${timer.color}`,
        borderRadius:  'var(--radius)',
        padding:       '16px',
        display:       'flex',
        flexDirection: 'column',
        gap:           '10px',
        boxShadow:     'var(--shadow)',
        minWidth:      '220px',
        maxWidth:      '300px',
        flex:          '0 0 auto',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>
            {ticket.tableLabel}
          </div>
          {ticket.seatNumber != null && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Seat {ticket.seatNumber}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {/* Course badge */}
          <span style={{
            background:    'var(--surface-2)',
            border:        '1px solid var(--border)',
            borderRadius:  '4px',
            padding:       '2px 7px',
            fontSize:      '10px',
            fontWeight:    600,
            letterSpacing: '0.06em',
            color:         'var(--accent)',
            textTransform: 'uppercase',
          }}>
            Course {ticket.courseNumber}
          </span>
          {/* Status badge */}
          <span style={{ fontSize: '10px', fontWeight: 600, color: STATUS_COLOR[ticket.status] ?? 'var(--text-muted)' }}>
            {STATUS_LABEL[ticket.status] ?? ticket.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)' }} />

      {/* Items */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {ticket.items.map((item) => (
          <li key={item.id}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
              <span style={{
                fontFamily:  'var(--font-mono)',
                fontWeight:  700,
                fontSize:    '13px',
                color:       'var(--accent)',
                minWidth:    '18px',
              }}>×{item.quantity}</span>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{item.name}</span>
            </div>
            {item.modifiers && item.modifiers.length > 0 && (
              <div style={{ paddingLeft: '26px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {item.modifiers.join(' · ')}
              </div>
            )}
            {item.notes && (
              <div style={{
                paddingLeft: '26px',
                fontSize:    '11px',
                color:       'var(--amber)',
                marginTop:   '2px',
                fontStyle:   'italic',
              }}>⚑ {item.notes}</div>
            )}
          </li>
        ))}
      </ul>

      {/* Timer */}
      <div style={{
        fontFamily:    'var(--font-mono)',
        fontSize:      '22px',
        fontWeight:    700,
        color:         timer.color,
        textAlign:     'right',
        letterSpacing: '0.04em',
      }}>
        {timer.label}
      </div>

      {/* Bump */}
      <BumpButton ticketId={ticket.id} disabled={!canBump} onBump={onBump} />
    </article>
  );
}
