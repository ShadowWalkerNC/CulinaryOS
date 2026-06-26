import React, { useState } from 'react';

interface Props {
  ticketId:  string;
  disabled?: boolean;
  onBump:    (ticketId: string) => Promise<void>;
}

/**
 * Large tactile bump button for KDS touch screens.
 * Shows a spinning loader during the async bump call.
 * Disabled while loading or explicitly disabled.
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
      style={{
        width:           '100%',
        padding:         '12px',
        marginTop:       '12px',
        borderRadius:    'var(--radius-sm)',
        border:          'none',
        background:      disabled ? '#2a2d40' : 'var(--green)',
        color:           disabled ? 'var(--text-muted)' : '#052e16',
        fontFamily:      'var(--font-sans)',
        fontWeight:      700,
        fontSize:        '13px',
        letterSpacing:   '0.05em',
        textTransform:   'uppercase',
        cursor:          disabled || loading ? 'not-allowed' : 'pointer',
        transition:      'background 0.15s, transform 0.1s, box-shadow 0.15s',
        boxShadow:       disabled ? 'none' : '0 2px 12px var(--green-glow)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '6px',
      }}
      onMouseDown={(e) => { if (!disabled && !loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
      onMouseUp={(e)   => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
    >
      {loading ? (
        <>
          <span style={{ animation: 'spin 0.7s linear infinite', display: 'inline-block' }}>⟳</span>
          Bumping…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      ) : (
        <>✓ BUMP</>
      )}
    </button>
  );
}
