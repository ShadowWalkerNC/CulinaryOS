import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Grid,
  X,
  ExternalLink,
  Tablet,
  Tv,
  Laptop,
  ChefHat,
  ShoppingBag,
  TrendingUp,
  CulinaryHeader,
} from '@culinaryos/ui';
import { apiHeaders, getApiBase, getTenantId, loadLocalSettings, saveLocalSettings, applyDisplaySettingsToDOM } from '@culinaryos/shared';
import { useRealtimeTickets, bumpDemoTicket, fireDemoTicket } from '../hooks/useRealtimeTickets';
import { useCourseFiredNotices }  from '../hooks/useCourseFiredNotices';
import { CourseHoldBanner }       from '../components/CourseHoldBanner';
import { TicketCard }             from '../components/TicketCard';
import { AnalyticsBar }           from '../components/AnalyticsBar';
import type { AnalyticsSummary }  from '../types';

const API = getApiBase();
const TENANT_ID = getTenantId();

const STATIONS = [
  { id: 'expo', label: 'Expo Pass', icon: 'room_service', color: 'text-amber-400' },
  { id: '1', label: 'Hot Grill', icon: 'outdoor_grill', color: 'text-orange-400' },
  { id: '2', label: 'Cold Prep', icon: 'eco', color: 'text-emerald-400' },
  { id: '3', label: 'Fryer', icon: 'lunch_dining', color: 'text-yellow-400' },
  { id: '4', label: 'Bar', icon: 'local_bar', color: 'text-purple-400' },
  { id: 'all', label: 'All Stations', icon: 'grid_view', color: 'text-slate-400' },
];

export function Station() {
  const { stationId = 'expo' } = useParams<{ stationId: string }>();
  const navigate = useNavigate();

  const { tickets, loading, error, setTickets } = useRealtimeTickets(stationId);
  const courseEvent                             = useCourseFiredNotices(5_000);
  const [analytics, setAnalytics]               = useState<AnalyticsSummary | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [displaySettings, setDisplaySettings]     = useState(loadLocalSettings().display);
  const [showApps, setShowApps]                   = useState(false);

  const appModules = [
    { id: 'pos', label: 'POS Terminal', port: '5172', desc: 'Point of sale, 2D/3D floor map & checkout', icon: Tablet },
    { id: 'kds', label: 'KDS Kitchen', port: '5173', desc: 'Kitchen tickets, station filters & aging timers', icon: Tv, active: true },
    { id: 'admin', label: 'Back-Office Admin', port: '5174', desc: 'Menu editor, staff PINs, auto-PO & settings', icon: Laptop },
    { id: 'kitchenkit', label: 'KitchenKit', port: '5175', desc: 'Shift prep lists, recipe ratios & shelf life', icon: ChefHat },
    { id: 'web', label: 'Guest Storefront', port: '5176', desc: 'Online customer ordering & live order tracker', icon: ShoppingBag },
    { id: 'ops', label: 'CulinaryOps', port: '5177', desc: 'Theoretical vs actual food cost & waste ledger', icon: TrendingUp },
  ];

  useEffect(() => {
    applyDisplaySettingsToDOM(displaySettings);
  }, [displaySettings]);

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
        method: 'POST',
        headers: apiHeaders(TENANT_ID),
      });
      if (!res.ok) throw new Error(`Bump failed: ${res.status}`);
      setTickets(prev => prev.filter(t => t.id !== ticketId));
    } catch {
      // Demo / offline fallback only when API unreachable
      if (!import.meta.env.VITE_SUPABASE_URL || String(import.meta.env.VITE_SUPABASE_URL).includes('your-project')) {
        bumpDemoTicket(ticketId);
        setTickets(prev => prev.filter(t => t.id !== ticketId));
      }
    }
  }, [setTickets]);

  // Hold a course via REST
  const handleHoldCourse = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`${API}/v1/kds/tickets/${ticketId}/hold`, {
        method: 'POST',
        headers: apiHeaders(TENANT_ID),
      });
      if (!res.ok) throw new Error(`Hold failed: ${res.status}`);
      setTickets(prev => prev.map(t => t.id === ticketId ? {
        ...t,
        courseHoldStatus: 'held',
        status: 'queued',
        heldAt: new Date().toISOString(),
      } : t));
    } catch {
      if (!import.meta.env.VITE_SUPABASE_URL || String(import.meta.env.VITE_SUPABASE_URL).includes('your-project')) {
        setTickets(prev => prev.map(t => t.id === ticketId ? {
          ...t,
          courseHoldStatus: 'held',
          status: 'queued',
          heldAt: new Date().toISOString(),
        } : t));
      }
    }
  }, [setTickets]);

  // Fire a held course via REST
  const handleFireCourse = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`${API}/v1/kds/tickets/${ticketId}/fire`, {
        method: 'POST',
        headers: apiHeaders(TENANT_ID),
      });
      if (!res.ok) throw new Error(`Fire failed: ${res.status}`);
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
      {/* Single Unified KDS Kitchen Navigation Header */}
      <header className="bg-white border-b border-[#e5e7eb] px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 shadow-xs gap-3">
        {/* Left: Brand & Station Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined filled text-[18px]">skillet</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm tracking-tight text-slate-950 uppercase">
                CulinaryOS KDS
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                {activeStationLabel} {isExpoPass ? '(Expo Pass)' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Station Selection Tabs — High-Contrast Kitchen Symbols */}
        <nav className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar">
          {STATIONS.map((s) => {
            const isActive = s.id === stationId;
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/station/${s.id}`)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
                }`}
              >
                <span className={`material-symbols-outlined text-[17px] ${isActive ? s.color : 'text-slate-500'}`}>
                  {s.icon}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Display Settings, Apps & Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 shadow-xs cursor-pointer transition-colors"
            title="Display & Audio Scale"
          >
            <span className="material-symbols-outlined text-[15px]">tune</span>
            <span className="hidden md:inline">{displaySettings.textScalePercent}%</span>
          </button>

          <button
            type="button"
            onClick={() => setShowApps(!showApps)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              showApps
                ? 'bg-[#0f172a] text-white border-[#0f172a]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Switch Applications"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Apps</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] text-slate-600 font-semibold">
            <span className={`w-2 h-2 rounded-full ${error ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            <span className="hidden sm:inline">{error ? 'Demo Mode' : 'Realtime'}</span>
          </div>
        </div>
      </header>

      {/* App Switcher Modal */}
      {showApps && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowApps(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-900 animate-slideIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0f172a] text-white flex items-center justify-center">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    CulinaryOS Applications
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Switch between restaurant surfaces</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApps(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {appModules.map((m) => {
                const Icon = m.icon;
                return (
                  <a
                    key={m.id}
                    href={`http://localhost:${m.port}`}
                    onClick={() => setShowApps(false)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      m.active
                        ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        m.active ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-xs'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${m.active ? 'text-white' : 'text-slate-950'}`}>
                          {m.label}
                        </p>
                        {m.active && (
                          <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] line-clamp-1 mt-0.5 ${m.active ? 'text-slate-200' : 'text-slate-500'}`}>
                        {m.desc}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <a
                href="http://localhost:5176/"
                className="font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1"
              >
                <span>Platform Home</span>
              </a>
              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <span>GitHub Monorepo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Course fired flash banner */}
      <CourseHoldBanner event={courseEvent} />

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

      {/* KDS Kitchen Display & Audio Quick Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#0f172a]">tune</span>
                <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">
                  KDS Display & Sound Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-[#9ca3af] hover:text-[#0f172a] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Text Scale / Big Screen Mode */}
            <div className="space-y-2">
              <label className="text-xs font-black text-[#0f172a] uppercase tracking-wider block">
                Screen Scale ({displaySettings.textScalePercent}%)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'standard', label: 'Standard (100%)', scale: 100, desc: 'Touchscreen / Tablet' },
                  { id: 'large', label: 'Large (125%)', scale: 125, desc: 'Mount 24"' },
                  { id: 'xlarge', label: 'TV Wall (140%)', scale: 140, desc: '32"+ Kitchen TV' },
                ].map((s) => {
                  const isSelected = displaySettings.textSize === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...displaySettings,
                          textSize: s.id as any,
                          textScalePercent: s.scale,
                        };
                        setDisplaySettings(updated);
                        saveLocalSettings({ display: updated });
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-xs'
                          : 'border-[#e5e7eb] bg-[#f8f9fa] text-[#1f2937] hover:border-[#9ca3af]'
                      }`}
                    >
                      <span className="text-xs font-black block">{s.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-gray-300' : 'text-[#6b7280]'}`}>
                        {s.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Alerts & Contrast Toggles */}
            <div className="space-y-2 border-t border-[#e5e7eb] pt-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={displaySettings.kdsAlertSounds}
                  onChange={(e) => {
                    const updated = { ...displaySettings, kdsAlertSounds: e.target.checked };
                    setDisplaySettings(updated);
                    saveLocalSettings({ display: updated });
                  }}
                  className="w-4 h-4 rounded text-[#0f172a]"
                />
                <div>
                  <span className="text-xs font-bold text-[#0f172a] block">Audio Chime on Order Arrival</span>
                  <span className="text-[10px] text-[#6b7280]">Play sound whenever POS sends tickets</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={displaySettings.contrastMode === 'high-contrast-oled'}
                  onChange={(e) => {
                    const updated = {
                      ...displaySettings,
                      contrastMode: (e.target.checked ? 'high-contrast-oled' : 'standard') as any,
                    };
                    setDisplaySettings(updated);
                    saveLocalSettings({ display: updated });
                  }}
                  className="w-4 h-4 rounded text-[#0f172a]"
                />
                <div>
                  <span className="text-xs font-bold text-[#0f172a] block">High Contrast Kitchen Mode</span>
                  <span className="text-[10px] text-[#6b7280]">Enhanced black borders and bold badges</span>
                </div>
              </label>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-[#0f172a] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

