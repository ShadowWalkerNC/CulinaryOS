// ============================================================
// CulinaryOS — Staff Board Android TV View
// Shift Announcements, Prep Priorities, Daily Specials & Safety Reminders
// (Strict FLSA / Role Separation: Zero Manager Financials Exposed)
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplayShell, StatusChip, DisplayClient } from '@culinaryos/display';
import type { DisplayRemoteCommand } from '@culinaryos/shared';

export const StaffView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>({
    shiftDate: 'Wednesday, Oct 21',
    shiftNotes: [
      'Downtown lunch rush expected: 12:15 PM - 1:45 PM.',
      'Remember to call out 86 status to expo immediately.',
      'Health inspector visit scheduled for early next week.',
    ],
    prepPriorities: [
      { task: 'Pre-portion artisan bacon strips (50 bags)', station: 'Grill', done: false },
      { task: 'Whisk backup 8L House Cheese Sauce', station: 'Sauce', done: true },
      { task: 'Restock fry station russet wedges', station: 'Fry', done: false },
    ],
    specials: [
      { name: 'The Truffle Meltdown Special', price: '$16', notes: 'Comes with garlic parmesan fries' },
      { name: 'Tomato Basil Bisque Cup', price: '$5', notes: 'Pairs with any artisan melt' },
    ],
    items86: ['Blueberry Pie', 'Haddock Filets'],
    safetyReminders: [
      'Sanitizer buckets changed every 2 hours (tested 200ppm).',
      'Slip-resistant shoes mandatory on the line.',
    ],
  });

  const [online, setOnline] = useState<boolean>(true);
  const client = useMemo(() => new DisplayClient(), []);

  const loadData = useCallback(async () => {
    try {
      const res = await client.fetchProjection('staff', 'shift', 'culinaryos');
      setData(res);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [client]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle remote view switching
  const handleRemoteCommand = useCallback(
    (cmd: DisplayRemoteCommand) => {
      if (cmd.type === 'navigate' && cmd.mode) {
        if (cmd.mode === 'kitchen') navigate('/kitchen');
        else if (cmd.mode === 'manager') navigate('/manager');
        else if (cmd.mode === 'guest') navigate('/menu');
        else if (cmd.mode === 'pickup') navigate('/pickup');
        else if (cmd.mode === 'marketing') navigate('/promo');
      } else if (cmd.type === 'refresh') {
        window.location.reload();
      }
    },
    [navigate]
  );

  useEffect(() => {
    client.startHeartbeatLoop(15000, handleRemoteCommand);
    return () => client.stopHeartbeatLoop();
  }, [client, handleRemoteCommand]);

  return (
    <DisplayShell
      brand="culinaryos"
      online={online}
      headerProps={{
        title: 'STAFF SHIFT BOARD',
        subtitle: `${data.shiftDate} • BOH / FOH LINE BRIEFING`,
        stationLabel: 'STAFF ONLY',
      }}
      remoteHints={['Updated live from Kitchen Operations Manager', 'Confidential Staff Shift Briefing']}
    >
      <div className="flex-1 grid grid-cols-3 gap-6 font-mono">
        {/* Left: Shift Notes & Daily Specials */}
        <div className="flex flex-col gap-6">
          {/* Shift Notes */}
          <div className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xl font-black text-amber-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
              TODAY'S SHIFT NOTES
            </h3>
            <ul className="space-y-3 font-sans">
              {(data.shiftNotes || []).map((note: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-slate-200 text-base leading-relaxed">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Daily Specials */}
          <div className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-6 shadow-xl flex-1">
            <h3 className="text-xl font-black text-emerald-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
              SERVICE SPECIALS
            </h3>
            <div className="space-y-4">
              {(data.specials || []).map((special: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-white">{special.name}</span>
                    <span className="text-base font-black text-emerald-400">{special.price}</span>
                  </div>
                  {special.notes && (
                    <p className="text-xs text-slate-400 mt-1 font-sans font-medium">{special.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Prep Priorities */}
        <div className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-xl font-black text-white uppercase tracking-wider">
                PREP PRIORITIES
              </h3>
              <span className="text-xs uppercase bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded">
                Active Checklist
              </span>
            </div>

            <div className="space-y-3">
              {(data.prepPriorities || []).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    item.done
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                      : 'bg-[#101726] border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xl ${item.done ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {item.done ? '✓' : '○'}
                    </span>
                    <div>
                      <span className={`text-base font-bold ${item.done ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {item.task}
                      </span>
                      <div className="text-xs text-amber-400 font-bold mt-0.5">
                        Station: {item.station}
                      </div>
                    </div>
                  </div>
                  <StatusChip
                    label={item.done ? 'COMPLETED' : 'IN PROGRESS'}
                    variant={item.done ? 'success' : 'cooking'}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
            <span>RecipeOS Sync</span>
            <span className="text-emerald-400 font-bold">Standardized Batch Specs</span>
          </div>
        </div>

        {/* Right: 86 List & Safety Reminders */}
        <div className="flex flex-col gap-6">
          {/* 86 List */}
          <div className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xl font-black text-rose-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
              86 LIST (DO NOT SELL)
            </h3>
            <div className="space-y-2.5">
              {(data.items86 || []).map((item: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-rose-950/30 border border-rose-900/40">
                  <span className="text-base font-black text-rose-200">{item}</span>
                  <span className="text-xs font-black bg-rose-600 text-white px-2 py-0.5 rounded uppercase">
                    86'D
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety & Compliance Notices */}
          <div className="bg-[#0b121e] border-2 border-slate-800 rounded-3xl p-6 shadow-xl flex-1">
            <h3 className="text-xl font-black text-blue-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
              HEALTH & SAFETY REMINDERS
            </h3>
            <ul className="space-y-3 font-sans">
              {(data.safetyReminders || []).map((rem: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2.5 text-slate-300 text-sm">
                  <span className="text-blue-400 font-bold">🛡</span>
                  <span>{rem}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DisplayShell>
  );
};
