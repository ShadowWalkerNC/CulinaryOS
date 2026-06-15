import React, { useEffect, useState } from 'react';
import { Clock, Check } from 'lucide-react';
import { KDSTicket } from '../types';

interface KDSProps {
  tickets: KDSTicket[];
  onBumpTicket: (id: string) => void;
}

export const KDSScreen: React.FC<KDSProps> = ({ tickets, onBumpTicket }) => {
  const [stationFilter, setStationFilter] = useState<string>('All');
  const [localTickets, setLocalTickets] = useState<KDSTicket[]>(tickets);

  // Sync tickets prop with local state
  useEffect(() => {
    setLocalTickets(tickets.filter(t => t.status !== 'bumped'));
  }, [tickets]);

  // Tick the timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTickets(prev => 
        prev.map(t => ({ ...t, elapsedSeconds: t.elapsedSeconds + 1 }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerStyles = (seconds: number): { color: string; border: string; glow: string } => {
    if (seconds >= 600) { // 10+ minutes (Critical Red)
      return { 
        color: 'var(--status-danger)', 
        border: '2px solid var(--status-danger)', 
        glow: '0 0 10px rgba(239, 68, 68, 0.4)' 
      };
    } else if (seconds >= 300) { // 5-10 minutes (Warning Amber)
      return { 
        color: 'var(--status-warning)', 
        border: '1px solid var(--status-warning)', 
        glow: 'none' 
      };
    }
    return { 
      color: 'var(--status-success)', 
      border: '1px solid var(--bg-tertiary)', 
      glow: 'none' 
    };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="title-xl" style={{ marginBottom: '4px' }}>KDS Active Queue</h2>
          <p style={{ color: 'var(--text-muted)' }}>Station: Hot Kitchen + Bakery Display</p>
        </div>

        {/* Station Filters */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Bakery', 'Expresso', 'Grill'].map(station => (
            <button
              key={station}
              onClick={() => setStationFilter(station)}
              className="btn-secondary"
              style={{
                borderColor: stationFilter === station ? 'var(--accent-orange)' : 'var(--bg-tertiary)',
                color: stationFilter === station ? 'var(--accent-orange)' : 'var(--text-main)'
              }}
            >
              {station}
            </button>
          ))}
        </div>
      </div>

      {localTickets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '96px 0',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px dashed var(--bg-tertiary)',
          borderRadius: '12px',
          color: 'var(--text-muted)'
        }}>
          <Clock size={48} style={{ marginBottom: '16px', color: 'var(--text-muted)' }} />
          <h3>All Clear! No active order tickets.</h3>
        </div>
      ) : (
        <div className="kds-container">
          {localTickets.map(ticket => {
            const timerStyle = getTimerStyles(ticket.elapsedSeconds);

            return (
              <div 
                key={ticket.id} 
                className="kds-card"
                style={{ 
                  border: timerStyle.border,
                  boxShadow: timerStyle.glow
                }}
              >
                {/* Header */}
                <div className="kds-header">
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '18px' }}>Table {ticket.tableNumber || 'Takeout'}</span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>ID: {ticket.id.slice(0, 5)}</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: timerStyle.color,
                    fontWeight: '700',
                    fontSize: '15px'
                  }}>
                    <Clock size={16} />
                    {formatTimer(ticket.elapsedSeconds)}
                  </div>
                </div>

                {/* Body Items */}
                <div className="kds-body">
                  {ticket.items.map(item => (
                    <div key={item.id} className="kds-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--accent-orange)', marginRight: '8px' }}>
                          {item.quantity}x
                        </span>
                        <span style={{ fontWeight: '500', fontSize: '15px' }}>{item.productName}</span>
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                          {item.modifiers.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Action */}
                <button
                  onClick={() => onBumpTicket(ticket.id)}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: 'none',
                    borderTop: '1px solid var(--bg-tertiary)',
                    color: 'var(--status-success)',
                    padding: '12px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    fontFamily: 'var(--font-family)',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                >
                  <Check size={16} /> BUMP TICKET
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
