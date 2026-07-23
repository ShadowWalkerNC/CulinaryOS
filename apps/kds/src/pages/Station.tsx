import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtimeTickets, bumpDemoTicket } from '../hooks/useRealtimeTickets';
import { useCourseFiredNotices }  from '../hooks/useCourseFiredNotices';
import { CourseHoldBanner }       from '../components/CourseHoldBanner';
import { TicketCard }             from '../components/TicketCard';
import { AnalyticsBar }           from '../components/AnalyticsBar';
import type { AnalyticsSummary }  from '../types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const STATIONS = [
  { id: '1', label: 'Hot Grill' },
  { id: '2', label: 'Cold Prep' },
  { id: '3', label: 'Fryer' },
  { id: '4', label: 'Bar' },
  { id: 'all', label: 'All Stations' },
];

/**
 * Main KitchenKit KDS station view.
 */
export function Station() {
  const { stationId = '1' } = useParams<{ stationId: string }>();
  const navigate = useNavigate();

  const { tickets, loading, error, setTickets } = useRealtimeTickets(stationId);
  const courseEvent                             = useCourseFiredNotices(5_000);
  const [analytics, setAnalytics]               = useState<AnalyticsSummary | null>(null);

  // Poll analytics every 30s
  useEffect(() => {
    let mounted = true;
    async function fetchAnalytics() {
      try {
        const res  = await fetch(`${API}/v1/kds/stations/${stationId}/analytics`);
        const json = await res.json();
        if (mounted && json.data) setAnalytics(json.data);
      } catch {
        // non-fatal — analytics bar stays blank
      }
    }
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, [stationId]);

  // Bump a ticket via REST or local state fallback
  const handleBump = useCallback(async (ticketId: string) => {
    try {
      await fetch(`${API}/v1/tickets/${ticketId}/bump`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ stationId }),
      });
    } catch {
      // Fallback local bump
    }
    bumpDemoTicket(ticketId);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
  }, [stationId, setTickets]);

  const activeStationLabel = STATIONS.find(s => s.id === stationId)?.label ?? `Station ${stationId}`;

  return (
    <div style={{
      minHeight:     '100dvh',
      background:    'var(--bg)',
      display:       'flex',
      flexDirection: 'column',
    }}>
      {/* Course fired flash banner */}
      <CourseHoldBanner event={courseEvent} />

      {/* Station header */}
      <header style={{
        padding:        '12px 24px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        borderBottom:   '1px solid var(--border)',
        background:     'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}><path d="M6 18V6a6 6 0 0 1 12 0v12" /><path d="M12 10V6" /><path d="M18 14H6" /><rect width="18" height="4" x="3" y="18" rx="1" /></svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>KitchenKit — {activeStationLabel}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CulinaryOS KDS Terminal</div>
            </div>
          </div>

          {/* Station Selection Tabs */}
          <nav style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
            {STATIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/station/${s.id}`)}
                style={{
                  background:    s.id === stationId ? 'var(--accent)' : 'var(--surface-2)',
                  color:         s.id === stationId ? '#ffffff' : 'var(--text-muted)',
                  border:        '1px solid var(--border)',
                  borderRadius:  '6px',
                  padding:       '5px 12px',
                  fontSize:      '11px',
                  fontWeight:    700,
                  cursor:        'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  transition:    'all 0.15s ease',
                }}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live indicator */}
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: error ? 'var(--amber)' : 'var(--green)',
            boxShadow: error ? '0 0 6px var(--amber)' : '0 0 6px var(--green)',
            animation: 'pulseLive 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {error ? 'Demo Mode' : 'Live'}
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
        padding:    '20px 24px 80px',
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>All clear — no active tickets for {activeStationLabel}</div>
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
