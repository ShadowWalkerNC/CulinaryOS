import React, { useEffect, useState } from 'react';
import type { CourseFireEvent } from '../types';

interface Props {
  event: CourseFireEvent | null;
}

/**
 * Full-width flash banner shown when a new course is fired.
 * Animates in (slide-down + fade), then fades out after 4s.
 * Renders null when event is null.
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
    ? `Course ${event.courseNumber} fired automatically`
    : `Course ${event.courseNumber} fired by server`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:       'fixed',
        top:            0,
        left:           0,
        right:          0,
        zIndex:         999,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '12px',
        padding:        '14px 24px',
        background:     'linear-gradient(90deg, #14532d 0%, #166534 50%, #14532d 100%)',
        borderBottom:   '2px solid var(--green)',
        boxShadow:      '0 4px 32px rgba(34,197,94,0.35)',
        animation:      fading ? 'bannerFadeOut 0.7s ease forwards' : 'bannerSlideIn 0.35s ease',
        fontFamily:     'var(--font-sans)',
      }}
    >
      {/* Flame icon */}
      <span style={{ fontSize: '22px', lineHeight: 1 }}>🔥</span>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontWeight: 700, fontSize: '16px', color: '#bbf7d0', letterSpacing: '0.01em' }}>
          {label}
        </span>
        <span style={{ fontSize: '12px', color: '#86efac' }}>
          {event.firedTicketIds.length} ticket{event.firedTicketIds.length !== 1 ? 's' : ''} released
          {' · '}
          Order {(event.orderId ?? '').slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Pulse ring */}
      <span style={{
        width: '10px', height: '10px', borderRadius: '50%',
        background: 'var(--green)',
        boxShadow:  '0 0 0 0 var(--green-glow)',
        animation:  'pulseDot 1.2s ease-in-out infinite',
      }} />

      <style>{`
        @keyframes bannerSlideIn {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bannerFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes pulseDot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
          50%       { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  );
}
