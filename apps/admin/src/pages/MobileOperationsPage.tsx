import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  Clock,
  DollarSign,
  Check,
  X,
  Sparkles,
} from '@culinaryos/ui';

interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  completed: boolean;
}

interface ApprovalItem {
  id: string;
  type: 'comp' | 'void' | 'overtime';
  requestedBy: string;
  details: string;
  amount?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function MobileOperationsPage() {
  const { effectiveDevice } = useDevice();
  const [activeTab, setActiveTab] = useState<'checklists' | 'approvals' | 'scan'>('checklists');

  const [checklists, setChecklists] = useState<ChecklistItem[]>([
    { id: '1', category: 'Opening Floor', task: 'Walk-in Cooler temp verification (&le; 38°F)', completed: true },
    { id: '2', category: 'Opening Floor', task: 'Sanitizer test strip verification (200-400 ppm quat)', completed: true },
    { id: '3', category: 'Opening Floor', task: 'Cash drawer float count ($300 base)', completed: true },
    { id: '4', category: 'Food Safety', task: 'Line Hot Holding Well temp log (&ge; 140°F)', completed: false },
    { id: '5', category: 'Food Safety', task: 'Garde Manger cold prep rail temp (&le; 41°F)', completed: false },
    { id: '6', category: 'Closing', task: 'Fryer filtration & oil boil-out', completed: false },
    { id: '7', category: 'Closing', task: 'POS batch settlement & safe drop deposit', completed: false },
  ]);

  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: 'app-1',
      type: 'comp',
      requestedBy: 'Server Jessica T.',
      details: 'Table 4: Anniversary guest complimentary Chocolate Soufflé ($16.00)',
      amount: '$16.00',
      status: 'pending',
    },
    {
      id: 'app-2',
      type: 'void',
      requestedBy: 'Server Alex M.',
      details: 'Table 12: Guest miscommunication, voided 2x Dry Martini ($36.00)',
      amount: '$36.00',
      status: 'pending',
    },
    {
      id: 'app-3',
      type: 'overtime',
      requestedBy: 'Chef Marcus',
      details: 'Prep Cook David Chen: 1.5 hrs overtime requested for Sunday banquet butchery',
      status: 'pending',
    },
  ]);

  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const toggleChecklist = (id: string) => {
    setChecklists((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
  };

  const handleApproval = (id: string, decision: 'approved' | 'rejected') => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: decision } : a))
    );
  };

  const completedCount = checklists.filter((c) => c.completed).length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Top Segmented Tab Switcher (Touch Targets >= 48px) */}
      <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('checklists')}
          className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 ${
            activeTab === 'checklists' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Checklists ({completedCount}/{checklists.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 relative ${
            activeTab === 'approvals' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approvals</span>
          {pendingApprovals.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 ${
            activeTab === 'scan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Scan Invoice</span>
        </button>
      </div>

      {/* 1. CHECKLISTS TAB */}
      {activeTab === 'checklists' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Shift Tasks</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {Math.round((completedCount / checklists.length) * 100)}% Complete
            </span>
          </div>

          <div className="space-y-2">
            {checklists.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] flex items-start justify-between gap-3 ${
                  item.completed
                    ? 'bg-slate-50 border-slate-200/80 text-slate-400'
                    : 'bg-white border-slate-200 shadow-xs text-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 min-w-[24px] rounded-lg border flex items-center justify-center transition-all mt-0.5 ${
                      item.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {item.completed && <Check className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      {item.category}
                    </span>
                    <p className={`text-xs font-semibold mt-0.5 ${item.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {item.task}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. APPROVALS TAB */}
      {activeTab === 'approvals' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Manager Authorization Queue</span>
            <span className="text-xs font-mono font-bold text-slate-500">{pendingApprovals.length} pending</span>
          </div>

          {approvals.map((app) => (
            <div key={app.id} className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  app.type === 'comp'
                    ? 'bg-purple-100 text-purple-800'
                    : app.type === 'void'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {app.type} request
                </span>
                <span className="text-slate-400 text-[10px]">Submitted 5m ago</span>
              </div>

              <div>
                <p className="font-bold text-slate-900 text-sm">{app.requestedBy}</p>
                <p className="text-slate-600 text-[11px] mt-0.5">{app.details}</p>
              </div>

              {app.status === 'pending' ? (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleApproval(app.id, 'rejected')}
                    className="min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.97]"
                  >
                    <X className="w-4 h-4 text-red-600" />
                    <span>Decline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproval(app.id, 'approved')}
                    className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.97]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Authorize</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-400">Decision:</span>
                  <span className={`font-bold capitalize ${app.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {app.status}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. SCAN & UPLOAD TAB */}
      {activeTab === 'scan' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Delivery Invoice Snapshot</h3>
              <p className="text-xs text-slate-500 mt-0.5">Snap paper invoices from US Foods, Sysco, or Dennis Foodservice</p>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-2">
              <Upload className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">Tap to open phone camera or upload photo</p>
              <button
                type="button"
                onClick={() => {
                  setUploadNotice('Simulated OCR processed: US Foods Invoice #84920 ($1,420.50) matched to PO #1084.');
                  setTimeout(() => setUploadNotice(null), 4500);
                }}
                className="min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-950 text-white font-bold text-xs active:scale-[0.97] transition-all"
              >
                Snap Invoice Photo
              </button>
            </div>

            {uploadNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadNotice}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
