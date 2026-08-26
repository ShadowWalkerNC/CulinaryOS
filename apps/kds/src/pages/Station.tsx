import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CulinaryHeader } from '@culinaryos/ui';
import { apiHeaders, getApiBase, getTenantId } from '@culinaryos/shared';
import { useRealtimeTickets, bumpDemoTicket, fireDemoTicket } from '../hooks/useRealtimeTickets';
import { useCourseFiredNotices }  from '../hooks/useCourseFiredNotices';
import { CourseHoldBanner }       from '../components/CourseHoldBanner';
import { TicketCard }             from '../components/TicketCard';
import { AnalyticsBar }           from '../components/AnalyticsBar';
import type { AnalyticsSummary }  from '../types';

const API = getApiBase();
const TENANT_ID = getTenantId();

const STATIONS = [
  { id: 'expo', label: 'Expo Pass', icon: 'room_service' },
  { id: '1', label: 'Hot Grill', icon: 'outdoor_grill' },
  { id: '2', label: 'Cold Prep', icon: 'eco' },
  { id: '3', label: 'Fryer', icon: 'lunch_dining' },
  { id: '4', label: 'Bar', icon: 'local_bar' },
  { id: 'all', label: 'All Stations', icon: 'grid_view' },
];

/**
 * Main KitchenKit KDS station view & Expediter (Expo) Pass View matching CulinaryOS design system.
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
          headers: apiHeaders(TENANT_ID),
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
        headers: apiHeaders(TENANT_ID),
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
        headers: apiHeaders(TENANT_ID),
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
    <div className="h-screen w-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col overflow-hidden antialiased select-none">
      {/* Universal CulinaryOS Master Header */}
      <CulinaryHeader activeModule="kds" tenantName={`KitchenKit — ${activeStationLabel}`} />

      {/* Course fired flash banner */}
      <CourseHoldBanner event={courseEvent} />

      {/* Sub-Navigation Bar matching POS & Admin */}
      <header className="bg-white border-b border-[#e5e7eb] px-6 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#0f172a] filled">skillet</span>
            <span className="font-black text-xs tracking-wider text-[#0b1c30] uppercase">
              KitchenKit — {activeStationLabel} {isExpoPass ? '(Expo Pass)' : ''}
            </span>
          </div>
          <span className="text-[#e5e7eb]">|</span>

          {/* Station Selection Tabs */}
          <nav className="flex items-center gap-1 bg-[#f8f9fa] border border-[#e5e7eb] p-1 rounded-xl">
            {STATIONS.map((s) => {
              const isActive = s.id === stationId;
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/station/${s.id}`)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#0f172a] shadow-xs border border-[#e5e7eb]'
                      : 'text-[#6b7280] hover:text-[#0b1c30] hover:bg-[#e5e7eb50]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Live / Demo Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#f8f9fa] border border-[#e5e7eb] px-3 py-1.5 rounded-xl text-[10px] text-[#6b7280]">
            <span className={`w-2 h-2 rounded-full ${error ? 'bg-amber-500' : 'bg-[#22c55e] animate-pulse'}`} />
            <span className="font-semibold">{error ? 'Demo Mode' : 'Live Realtime'}</span>
          </div>
        </div>
      </header>

      {/* Expo Pass Real-Time Station Status Bar */}
      {isExpoPass && (
        <section className="bg-white border-b border-[#e5e7eb] px-6 py-2 flex items-center justify-between shadow-2xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-[#1f2937] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-[#0f172a]">dashboard</span>
              <span>Station Overview:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { icon: 'outdoor_grill', label: 'Hot Grill', value: stationCounts.hotGrill },
                { icon: 'eco',           label: 'Cold Prep', value: stationCounts.coldPrep },
                { icon: 'lunch_dining',  label: 'Fryer',     value: stationCounts.fryer },
                { icon: 'local_bar',     label: 'Bar',       value: stationCounts.bar },
              ].map((st) => (
                <span
                  key={st.label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f8f9fa] border border-[#e5e7eb] text-[10px] font-bold text-[#4b5563]"
                >
                  <span className="material-symbols-outlined text-[13px] text-[#6b7280]">{st.icon}</span>
                  <span>{st.label}:</span>
                  <strong className="text-[#0f172a] font-mono">{st.value}</strong>
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-black text-amber-800">
                <span className="material-symbols-outlined text-[13px]">pause_circle</span>
                <span>Held Courses:</span>
                <strong className="font-mono">{stationCounts.held}</strong>
              </span>
            </div>
          </div>
          <div className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">
            Total Active Tickets: <strong className="text-[#0f172a] font-mono">{stationCounts.total}</strong>
          </div>
        </section>
      )}

      {/* Ticket board */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden flex items-start gap-4 p-6 pb-24 bg-[#f8f9fa]">
        {loading && (
          <div className="m-auto flex flex-col items-center gap-2 text-[#6b7280]">
            <span className="material-symbols-outlined text-3xl animate-spin text-[#0f172a]">progress_activity</span>
            <span className="font-bold text-xs uppercase tracking-wider">Loading kitchen tickets…</span>
          </div>
        )}
        {!loading && tickets.length === 0 && (
          <div className="m-auto text-center p-8 bg-white border border-[#e5e7eb] rounded-2xl shadow-xs max-w-md">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <h3 className="font-black text-sm text-[#1f2937] uppercase tracking-wide">
              All Clear — No Active Tickets
            </h3>
            <p className="text-xs text-[#6b7280] mt-1">
              Station {activeStationLabel} is currently clear. New orders will appear here automatically in real time.
            </p>
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

