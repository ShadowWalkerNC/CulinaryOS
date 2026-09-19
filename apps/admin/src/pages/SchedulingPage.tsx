import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import {
  Clock,
  Calendar,
  Users,
  AlertTriangle,
  Plus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from '@culinaryos/ui';

interface ShiftBlock {
  id: string;
  employeeName: string;
  role: string;
  station: 'Bar' | 'Floor' | 'Grill' | 'Prep' | 'Expo';
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  start: string;
  end: string;
  hours: number;
}

export function SchedulingPage() {
  const { effectiveDevice } = useDevice();
  const [selectedDay, setSelectedDay] = useState<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'>('Sat');

  const shifts: ShiftBlock[] = [
    { id: '1', employeeName: 'Sarah Jenkins', role: 'Server', station: 'Floor', day: 'Sat', start: '16:00', end: '23:30', hours: 7.5 },
    { id: '2', employeeName: 'Alex Mercer', role: 'Bartender', station: 'Bar', day: 'Sat', start: '15:00', end: '01:00', hours: 10.0 },
    { id: '3', employeeName: 'Chef Marcus', role: 'Lead Cook', station: 'Grill', day: 'Sat', start: '14:00', end: '23:00', hours: 9.0 },
    { id: '4', employeeName: 'Elena Rostova', role: 'Expo / Host', station: 'Expo', day: 'Sat', start: '17:00', end: '22:30', hours: 5.5 },
    { id: '5', employeeName: 'David Chen', role: 'Prep Cook', station: 'Prep', day: 'Sat', start: '09:00', end: '16:00', hours: 7.0 },
  ];

  const stationColors: Record<ShiftBlock['station'], string> = {
    Bar: 'bg-purple-100 border-purple-300 text-purple-900',
    Floor: 'bg-blue-100 border-blue-300 text-blue-900',
    Grill: 'bg-red-100 border-red-300 text-red-900',
    Prep: 'bg-amber-100 border-amber-300 text-amber-900',
    Expo: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  };

  // Mobile View: My Schedule & Today's Crew
  if (effectiveDevice === 'mobile') {
    return (
      <div className="space-y-4">
        {/* Active Shift Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My Shift Today</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Clocked In
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 text-sm">Station: Floor (Section A)</span>
              <span className="text-slate-500 font-mono">16:00 - 23:30</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Elapsed Shift Time:</span>
              <span className="font-mono font-bold text-slate-900">2h 45m</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full min-h-[48px] bg-slate-950 text-white rounded-2xl font-bold text-xs active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Clock Out / Start Break</span>
          </button>
        </div>

        {/* Today's Working Crew */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">On Duty Tonight (Sat)</h3>
            <span className="text-[10px] font-bold text-slate-500">5 on floor</span>
          </div>

          <div className="space-y-2">
            {shifts.map((s) => (
              <div key={s.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{s.employeeName}</p>
                  <p className="text-[10px] text-slate-500">{s.role} · {s.start} - {s.end}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stationColors[s.station]}`}>
                  {s.station}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Tablet View: Day-by-Day Touch Roster
  if (effectiveDevice === 'tablet') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-950">Shift Roster & Labor</h1>
            <p className="text-xs text-slate-500">Daily supervisor staffing schedule & touch re-assignment</p>
          </div>
          <button
            type="button"
            className="min-h-[48px] px-4 rounded-xl bg-slate-950 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Shift</span>
          </button>
        </div>

        {/* Day Selector Chips (>= 48px touch targets) */}
        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
          {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`flex-1 min-h-[48px] rounded-xl text-xs font-bold transition-all active:scale-[0.97] ${
                selectedDay === day
                  ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Daily Shift Cards */}
        <div className="space-y-2.5">
          {shifts.map((s) => (
            <div key={s.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                  {s.employeeName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{s.employeeName}</p>
                  <p className="text-[11px] text-slate-500">{s.role} · {s.hours} hrs scheduled</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-slate-700">{s.start} - {s.end}</span>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${stationColors[s.station]}`}>
                  {s.station}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop View: Visual 7-Day Matrix & Labor Budget Calculator
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Shift Roster & Labor Forecasting</h1>
          <p className="text-xs text-slate-500 font-medium">
            Visual weekly roster builder, real-time labor cost modeling, and break compliance monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Week of Sept 15 - Sept 21</span>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Shift Block</span>
          </button>
        </div>
      </div>

      {/* Labor Budget vs Scheduled Telemetry */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Forecast Sales</span>
          <p className="text-2xl font-black text-slate-900 mt-1">$94,200</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Weekly revenue plan</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Scheduled Labor $</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">$24,492</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Target &le; $26,376 (28%)</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Projected Labor %</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">26.0%</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">2.0% under budget ceiling</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Scheduled Hours</span>
          <p className="text-2xl font-black text-slate-900 mt-1">1,180 hrs</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Zero overtime violations</p>
        </div>
      </div>

      {/* Visual Weekly Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Master Roster & Station Allocation</h3>
            <p className="text-xs text-slate-500">Color-coded station assignments with daily shift coverage</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {Object.entries(stationColors).map(([st, cls]) => (
              <span key={st} className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className={`w-3 h-3 rounded-xs border ${cls}`} />
                <span>{st}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3 w-48">Staff Member</th>
                <th className="p-3 text-center">Mon</th>
                <th className="p-3 text-center">Tue</th>
                <th className="p-3 text-center">Wed</th>
                <th className="p-3 text-center">Thu</th>
                <th className="p-3 text-center">Fri</th>
                <th className="p-3 text-center bg-orange-50/50 text-orange-950">Sat (Today)</th>
                <th className="p-3 text-center">Sun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-3">
                    <p className="font-bold text-slate-900">{s.employeeName}</p>
                    <p className="text-[10px] text-slate-400">{s.role}</p>
                  </td>
                  <td className="p-3 text-center text-slate-400">—</td>
                  <td className="p-3 text-center text-slate-400">—</td>
                  <td className="p-3 text-center">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-[10px] font-mono">16:00-22:00</div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-[10px] font-mono">16:00-22:00</div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-[10px] font-mono">15:00-23:00</div>
                  </td>
                  <td className="p-3 text-center bg-orange-50/30">
                    <div className={`p-1.5 rounded-lg border font-mono font-bold text-[10px] ${stationColors[s.station]}`}>
                      {s.start}-{s.end} ({s.station})
                    </div>
                  </td>
                  <td className="p-3 text-center text-slate-400">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
