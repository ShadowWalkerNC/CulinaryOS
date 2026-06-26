import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtimeTickets }     from '../hooks/useRealtimeTickets';
import { useCourseFiredNotices }  from '../hooks/useCourseFiredNotices';
import { CourseHoldBanner }       from '../components/CourseHoldBanner';
import { TicketCard }             from '../components/TicketCard';
import { AnalyticsBar }           from '../components/AnalyticsBar';
import type { AnalyticsSummary }  from '../types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Main KDS station view.
 * Renders live ticket cards, the CourseHoldBanner flash, and the analytics bar.
 */
export function Station() {
  const { stationId = '1' } = useParams<{ stationId: string }>();

  const { tickets, loading, error } = useRealtimeTickets(stationId);
  const courseEvent                 = useCourseFiredNotices(5_000);
  const [analytics, setAnalytics]   = useState<AnalyticsSummary | null>(null);

  // Poll analytics every 30s
  useEffect(() => {
    let mounted = true;
    async function fetchAnalytics() {
      try {
        const res  = await fetch(`${API}/v1/kds/stations/${stationId}/analytics`);
        const json = await res.json();
        if (mounted && json.data) setAnalytics(json.data);
      } catch {
        // non-fatal — analytics bar just stays blank
      }
    }
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [stationId]);

  // Bump a ticket via REST
  const handleBump = useCallback(async (ticketId: string) => {
    await fetch(`${API}/v1/tickets/${ticketId}/bump`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ stationId }),
    });
  }, [stationId]);

  return (
    <div style={{
      minHeight:  '100dvh',
      background: 'var(--bg)',
      display:    'flex',
      flexDirection: 'column',
    }}>
      {/* Course fired flash banner */}
      <CourseHoldBanner event={courseEvent} />

      {/* Station header */}
      <header style={{
        padding:        '16px 24px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        borderBottom:   '1px solid var(--border)',
        background:     'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>👨‍🍳</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Station {stationId}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CulinaryOS Kitchen Display</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live indicator */}
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: error ? 'var(--red)' : 'var(--green)',
            boxShadow: error ? '0 0 6px var(--red-glow)' : '0 0 6px var(--green-glow)',
            animation: 'pulseLive 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {error ? 'Disconnected' : 'Live'}
          </span>
        </div>
        <style>{`
          @keyframes pulseLive {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
        `}</style>
      </header>

      {/* Ticket board */}
      <main style={{
        flex:       1,
        overflowX:  'auto',
        overflowY:  'hidden',
        display:    'flex',
        alignItems: 'flex-start',
        gap:        '16px',
        padding:    '20px 24px 80px', // 80px bottom for analytics bar
      }}>
        {loading && (
          <div style={{ color: 'var(--text-muted)', margin: 'auto' }}>Loading tickets…</div>
        )}
        {!loading && tickets.length === 0 && (
          <div style={{
            margin:    'auto',
            textAlign: 'center',
            color:     'var(--text-muted)',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontWeight: 600 }}>All clear — no active tickets</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>New orders will appear here in real time</div>
          </div>
        )}
        {tickets.map((t) => (
          <TicketCard key={t.id} ticket={t} onBump={handleBump} />
        ))}
      </main>

      {/* Analytics footer */}
      <AnalyticsBar analytics={analytics} />
    </div>
  );
}
