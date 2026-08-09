import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CulinaryHeader } from '@culinaryos/ui';
import { useRealtimeTickets, bumpDemoTicket, fireDemoTicket } from '../hooks/useRealtimeTickets';
import { useCourseFiredNotices }  from '../hooks/useCourseFiredNotices';
import { CourseHoldBanner }       from '../components/CourseHoldBanner';
import { TicketCard }             from '../components/TicketCard';
import { AnalyticsBar }           from '../components/AnalyticsBar';
import type { AnalyticsSummary }  from '../types';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const TENANT_ID = import.meta.env.VITE_TENANT_ID ?? '';
const DEVICE_KEY = import.meta.env.VITE_DEVICE_API_KEY ?? import.meta.env.VITE_INTERNAL_API_KEY ?? '';

const STATIONS = [
  { id: 'expo', label: 'Expo Pass' },
  { id: '1', label: 'Hot Grill' },
  { id: '2', label: 'Cold Prep' },
  { id: '3', label: 'Fryer' },
  { id: '4', label: 'Bar' },
  { id: 'all', label: 'All Stations' },
];

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (TENANT_ID) headers['X-Tenant-Id'] = TENANT_ID;
  if (DEVICE_KEY) headers['Authorization'] = `Bearer ${DEVICE_KEY}`;
  return headers;
}

/**
 * Main KitchenKit KDS station view & Expediter (Expo) Pass View.
 */
export function Station() {
  const { stationId = 'expo' } = useParams<{ stationId: string }>();
  const navigate = useNavigate();

  const { tickets, loading, error, setTickets } = useRealtimeTickets(stationId);
  const courseEvent                             = useCourseFiredNotices(5_000);
  const [analytics, setAnalytics]               = useState<AnalyticsSummary | null>(null);

  // Poll analytics every 30s
  useEffect(() => {
    let mounted = true;
    async function fetchAnalytics() {
      try {
        const res  = await fetch(`${API}/v1/kds/stations/${stationId}/analytics`, {
          headers: apiHeaders(),
        });
        if (!res.ok) return;
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

  // Bump a ticket via REST — only mutate local state on success
  const handleBump = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`${API}/v1/kds/tickets/${ticketId}/bump`, {
        method:  'PATCH',
        headers: apiHeaders(),
        body:    JSON.stringify({ stationId }),
      });
      if (!res.ok) throw new Error(`Bump failed (${res.status})`);
      bumpDemoTicket(ticketId);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
    } catch {
      // Demo / offline fallback only when API unreachable
      if (!import.meta.env.VITE_SUPABASE_URL || String(import.meta.env.VITE_SUPABASE_URL).includes('your-project')) {
        bumpDemoTicket(ticketId);
        setTickets(prev => prev.filter(t => t.id !== ticketId));
      }
    }
  }, [stationId, setTickets]);

  // Manual course fire handler — only mutate local state on success
  const handleFireCourse = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`${API}/v1/kds/tickets/${ticketId}/fire`, {
        method:  'PATCH',
        headers: apiHeaders(),
      });
      if (!res.ok) throw new Error(`Fire failed (${res.status})`);
      fireDemoTicket(ticketId);
      setTickets(prev => prev.map(t => t.id === ticketId ? {
        ...t,
        courseHoldStatus: 'fired',
        status: 'cooking',
        firedAt: new Date().toISOString(),
      } : t));
    } catch {
      if (!import.meta.env.VITE_SUPABASE_URL || String(import.meta.env.VITE_SUPABASE_URL).includes('your-project')) {
        fireDemoTicket(ticketId);
        setTickets(prev => prev.map(t => t.id === ticketId ? {
          ...t,
          courseHoldStatus: 'fired',
          status: 'cooking',
          firedAt: new Date().toISOString(),
        } : t));
      }
    }
  }, [setTickets]);

  const activeStationLabel = STATIONS.find(s => s.id === stationId)?.label ?? `Station ${stationId}`;
  const isExpoPass = stationId === 'expo';

  // Compute station status counters for Expo Pass view
  const stationCounts = {
    hotGrill: tickets.filter(t => t.stationId === '1' && t.courseHoldStatus === 'fired').length,
    coldPrep: tickets.filter(t => t.stationId === '2' && t.courseHoldStatus === 'fired').length,
    fryer:    tickets.filter(t => t.stationId === '3' && t.courseHoldStatus === 'fired').length,
    bar:      tickets.filter(t => t.stationId === '4' && t.courseHoldStatus === 'fired').length,
    held:     tickets.filter(t => t.courseHoldStatus === 'held').length,
    total:    tickets.length,
  };

  return (
    <div style={{
      minHeight:     '100dvh',
      background:    'var(--bg)',
      display:       'flex',
      flexDirection: 'column',
    }}>
      {/* Universal CulinaryOS Header */}
      <CulinaryHeader activeModule="kds" tenantName={`KitchenKit — ${activeStationLabel}`} />

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
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>
                KitchenKit — {activeStationLabel} {isExpoPass ? '(Head Chef)' : ''}
              </div>
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
                  background:    s.id === stationId ? 'var(--accent-strong)' : 'var(--surface-2)',
                  color:         s.id === stationId ? '#ffffff' : 'var(--text-muted)',
                  border:        s.id === stationId ? '1px solid var(--accent-strong)' : '1px solid var(--border)',
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

      {/* Expo Pass Real-Time Station Status Bar */}
      {isExpoPass && (
        <section style={{
          background:    'var(--surface-2)',
          borderBottom:  '1px solid var(--border)',
          padding:       '8px 24px',
          display:       'flex',
          gap:           '16px',
          alignItems:    'center',
          fontSize:      '12px',
        }}>
          <span style={{ fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Real-Time Station Overview:
          </span>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { icon: 'outdoor_grill', label: 'Hot Grill', value: stationCounts.hotGrill },
              { icon: 'eco',           label: 'Cold Prep', value: stationCounts.coldPrep },
              { icon: 'lunch_dining',  label: 'Fryer',     value: stationCounts.fryer },
              { icon: 'local_bar',     label: 'Bar',       value: stationCounts.bar },
            ].map((st) => (
              <span key={st.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--text-muted)' }}>{st.icon}</span>
                {st.label}: <strong style={{ color: 'var(--accent)' }}>{st.value}</strong>
              </span>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '4px', background: 'var(--amber-glow)', border: '1px solid var(--amber)', fontWeight: 700, color: 'var(--amber)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>pause_circle</span>
              Held Courses: <strong>{stationCounts.held}</strong>
            </span>
          </div>
        </section>
      )}

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
          <TicketCard key={t.id} ticket={t} onBump={handleBump} onFire={handleFireCourse} />
        ))}
      </main>

      {/* Analytics footer */}
      <AnalyticsBar analytics={analytics} />
    </div>
  );
}
