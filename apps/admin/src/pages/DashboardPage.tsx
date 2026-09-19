import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import {
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed,
  Flame,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Plus,
} from '@culinaryos/ui';

export function DashboardPage() {
  const { effectiveDevice } = useDevice();
  const [refreshing, setRefreshing] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [shiftNotes, setShiftNotes] = useState([
    { id: '1', time: '14:20', author: 'Chef Marcus', text: 'Halibut delivery delayed by 45 mins. Prepped cod as catch-of-the-day backup.' },
    { id: '2', time: '12:15', author: 'GM Sarah', text: 'VIP Table 8 (Senator party) arriving at 19:30. Ensure booth 8 is held.' },
  ]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    setShiftNotes([
      { id: Date.now().toString(), time: 'Just now', author: 'MOD', text: quickNote },
      ...shiftNotes,
    ]);
    setQuickNote('');
  };

  // ==========================================
  // 1. MOBILE VIEW: Shift Pulse & Urgent Tasks
  // ==========================================
  if (effectiveDevice === 'mobile') {
    return (
      <div className="space-y-4">
        {/* Shift Pulse Dial */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Shift Pulse · Dinner Service
              </span>
              <h2 className="text-lg font-black text-slate-900">$14,820 Net Sales</h2>
            </div>
            <div className="px-2 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12.4%</span>
            </div>
          </div>

          {/* Quick 3-metric ring */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Covers</p>
              <p className="text-base font-black text-slate-900 mt-0.5">184 <span className="text-[10px] text-slate-400 font-normal">/ 220</span></p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Labor %</p>
              <p className="text-base font-black text-emerald-600 mt-0.5">26.4%</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Ticket Time</p>
              <p className="text-base font-black text-slate-900 mt-0.5">14m</p>
            </div>
          </div>
        </div>

        {/* Live Urgent Alerts Stack */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Active Shift Alerts (2)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Live Sync</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-red-50 border border-red-200 flex items-start justify-between gap-2 text-xs">
            <div className="flex items-start gap-2">
              <Flame className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-950">Maine Lobster Risotto 86'd</p>
                <p className="text-[10px] text-red-700">Pantry stock exhausted at 18:40</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-900 text-[9px] font-extrabold uppercase">
              BOH
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-2 text-xs">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Break Overdue: Jason K. (Line 2)</p>
                <p className="text-[10px] text-amber-700">5.2 hrs elapsed · Mandated 30m break</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[9px] font-extrabold uppercase">
              Labor
            </span>
          </div>
        </div>

        {/* Shift Broadcast Log */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 space-y-3">
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-500" />
            Manager Shift Log
          </h3>

          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              placeholder="Add quick shift note..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold active:scale-[0.97] min-h-[44px]"
            >
              Post
            </button>
          </form>

          <div className="space-y-2 max-h-40 overflow-y-auto pt-1">
            {shiftNotes.map((note) => (
              <div key={note.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-bold text-slate-700">{note.author}</span>
                  <span>{note.time}</span>
                </div>
                <p className="text-slate-800">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. TABLET VIEW: Touch Glance Deck & Oversight
  // ==========================================
  if (effectiveDevice === 'tablet') {
    return (
      <div className="space-y-5">
        {/* Tablet Header & Quick Range */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-950">Floor & Operations Deck</h1>
            <p className="text-xs text-slate-500">Live supervisor telemetry for Dinner Shift</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="min-h-[48px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs flex items-center gap-2 active:scale-[0.97]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-600' : ''}`} />
            <span>Sync Live</span>
          </button>
        </div>

        {/* High-Impact Touch Glance Deck */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs min-h-[110px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Net Sales</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">$14,820</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">+12.4% vs last Sat</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs min-h-[110px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Labor Margin</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600">26.4%</p>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Budget: &le; 28.0%</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs min-h-[110px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Table Turn Velocity</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">58 min</p>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">184 covers seated</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs min-h-[110px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>KDS Wait Latency</span>
              <UtensilsCrossed className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">14.2 min</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Kitchen in flow</p>
            </div>
          </div>
        </div>

        {/* Tablet 2-column Floor Oversight Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Station Overview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Station Load & Wait Times</h3>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Optimal</span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { station: 'Grill & Roast (BOH 1)', orders: 8, wait: '16m', load: '85%' },
                { station: 'Sauté & Pasta (BOH 2)', orders: 6, wait: '12m', load: '65%' },
                { station: 'Raw Bar & Cold (Garde Manger)', orders: 3, wait: '6m', load: '40%' },
                { station: 'Main Bar & Cocktails (FOH)', orders: 11, wait: '4m', load: '90%' },
              ].map((s) => (
                <div key={s.station} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{s.station}</p>
                    <p className="text-[11px] text-slate-500">{s.orders} active tickets · Avg {s.wait}</p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                    {s.load}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor Live Exceptions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Shift Alerts & Approvals</h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-red-950">Item 86: Maine Lobster Risotto</p>
                  <p className="text-[11px] text-red-700">Par depleted · Alerted POS & Online Menus</p>
                </div>
                <button type="button" className="min-h-[44px] px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-xs">
                  Review
                </button>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-amber-950">Void Over Limit: Table 14 ($140.00)</p>
                  <p className="text-[11px] text-amber-700">Requested by Server Alex M. · Needs GM approval</p>
                </div>
                <button type="button" className="min-h-[44px] px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs">
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. DESKTOP VIEW: Full Enterprise Workstation Telemetry
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Telemetry Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Executive Intelligence Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium">
            Multi-unit operational telemetry, sales velocity, margin controls & real-time exception tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className="text-slate-400">Date:</span>
            <span>Today (Saturday, Dinner Prime)</span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 5-Card Operational Telemetry Strip */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Sales</p>
          <p className="text-2xl font-black text-slate-900 mt-1">$15,940</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+14.2% vs target</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Labor Cost Margin</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">26.4%</p>
          <p className="text-[11px] text-slate-500 mt-1">$3,912 labor / $14.8k net</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Food Cost</p>
          <p className="text-2xl font-black text-slate-900 mt-1">28.2%</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">1.8% below 30% ceiling</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Table Turns & Covers</p>
          <p className="text-2xl font-black text-slate-900 mt-1">184 Covers</p>
          <p className="text-[11px] text-slate-500 mt-1">2.4 turns/table · 58m avg</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kitchen Ticket Speed</p>
          <p className="text-2xl font-black text-slate-900 mt-1">14.2 min</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Within 15m benchmark</p>
        </div>
      </div>

      {/* Main Multi-Metric Dashboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Hourly Velocity & Real-time Throughput */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-950">Hourly Revenue Velocity vs Plan</h3>
                <p className="text-xs text-slate-500">Real-time point-of-sale throughput across dining room & bar</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="w-3 h-3 rounded-xs bg-orange-600" />
                  <span>Actual Velocity</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <span className="w-3 h-3 rounded-xs bg-slate-200" />
                  <span>Forecast Plan</span>
                </span>
              </div>
            </div>

            {/* Simulated Chart Bars */}
            <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
              {[
                { hour: '11:00', actual: 40, plan: 35, val: '$1,200' },
                { hour: '12:00', actual: 85, plan: 70, val: '$2,850' },
                { hour: '13:00', actual: 95, plan: 80, val: '$3,100' },
                { hour: '14:00', actual: 50, plan: 45, val: '$1,650' },
                { hour: '15:00', actual: 30, plan: 30, val: '$980' },
                { hour: '16:00', actual: 45, plan: 40, val: '$1,420' },
                { hour: '17:00', actual: 75, plan: 70, val: '$2,600' },
                { hour: '18:00', actual: 110, plan: 95, val: '$3,820' },
                { hour: '19:00', actual: 130, plan: 110, val: '$4,400' },
              ].map((bar) => (
                <div key={bar.hour} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                  <div
                    style={{ height: `${bar.actual}%` }}
                    className="w-full bg-orange-600 rounded-t-md hover:bg-orange-500 transition-all relative"
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-950 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                      {bar.val}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1">{bar.hour}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Peak Service: 19:00 - 20:30 (Dinner Rush in Progress)</span>
              <span className="font-bold text-slate-900">Current Pace: +14.2% over target</span>
            </div>
          </div>

          {/* BOH Station Latency Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-950">Kitchen Station Performance & Queue</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900">Grill & Sauté Station</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Normal</span>
                </div>
                <p className="text-slate-500 text-[11px]">8 active checks · Avg fire time 12.4 mins</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900">Cold & Raw Bar Station</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Normal</span>
                </div>
                <p className="text-slate-500 text-[11px]">4 active checks · Avg prep time 5.8 mins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Alert Center & Shift Log */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Live Alert Center
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-red-950">Item 86 Triggered</span>
                  <span className="text-[10px] font-mono text-red-600">18:40</span>
                </div>
                <p className="text-red-800 text-[11px]">
                  Maine Lobster Risotto par exhausted. Synchronized to POS terminals and KDS rails.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-950">Manager Comp Limit</span>
                  <span className="text-[10px] font-mono text-amber-600">18:22</span>
                </div>
                <p className="text-amber-800 text-[11px]">
                  Table 14: $140 VIP promo comp authorized by GM PIN.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-blue-950">Cold Chain Monitor</span>
                  <span className="text-[10px] font-mono text-blue-600">17:55</span>
                </div>
                <p className="text-blue-800 text-[11px]">
                  Walk-in Cooler #2 door closed after restock. Temp normalized at 36.8°F.
                </p>
              </div>
            </div>
          </div>

          {/* Shift Broadcast Log */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-950">Floor Manager Shift Notes</h3>
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                placeholder="Broadcast shift log..."
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Log
              </button>
            </form>
            <div className="space-y-2 max-h-56 overflow-y-auto pt-1">
              {shiftNotes.map((n) => (
                <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-slate-800">{n.author}</span>
                    <span>{n.time}</span>
                  </div>
                  <p className="text-slate-700">{n.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
