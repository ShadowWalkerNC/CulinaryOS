import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
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
  ShieldCheck,
  UserCheck,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  Flame,
  Award,
  RefreshCw,
  SlidersHorizontal,
} from '@culinaryos/ui';

export type ShiftPhase = 'Opening Floor' | 'Food Safety / HACCP' | 'Mid-Shift' | 'Closing';

export interface ChecklistItem {
  id: string;
  category: ShiftPhase;
  task: string;
  station: 'Garde Manger' | 'Line 1' | 'Line 2' | 'Dish Pit' | 'Walk-in & Storage' | 'Front of House';
  assignedTo: string;
  targetTime: string;
  completed: boolean;
  ccpCode?: string | undefined;
  probeId?: string | undefined;
  isTemperatureCheck?: boolean | undefined;
  targetToleranceText?: string | undefined;
  currentValue?: number | undefined;
  unit?: '°F' | 'ppm' | '$' | '%' | 'Bar' | undefined;
  minTolerance?: number | undefined;
  maxTolerance?: number | undefined;
  signedBy?: string | undefined;
  signedAt?: string | undefined;
  correctiveAction?: string | undefined;
}

export interface ApprovalItem {
  id: string;
  type: 'comp' | 'void' | 'overtime';
  requestedBy: string;
  details: string;
  amount?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export function MobileOperationsPage() {
  const { effectiveDevice } = useDevice();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'checklists' | 'approvals' | 'scan'>('checklists');
  const [phaseFilter, setPhaseFilter] = useState<ShiftPhase | 'All'>('All');

  const [checklists, setChecklists] = useState<ChecklistItem[]>([
    {
      id: 'haccp-1',
      category: 'Food Safety / HACCP',
      task: 'Walk-in Cooler #01 Temperature Verification',
      station: 'Walk-in & Storage',
      assignedTo: 'Maria S. (Sous Chef)',
      targetTime: '07:15 AM',
      ccpCode: 'CCP-01',
      probeId: 'Probe-W01 (BT Sync)',
      isTemperatureCheck: true,
      targetToleranceText: '≤ 38°F',
      maxTolerance: 38,
      currentValue: 36.4,
      unit: '°F',
      completed: true,
      signedBy: 'Maria S.',
      signedAt: '07:15 AM',
    },
    {
      id: 'haccp-2',
      category: 'Food Safety / HACCP',
      task: 'Line Hot Holding Well #02 Temp Log',
      station: 'Line 1',
      assignedTo: 'Carlos R. (Lead Line)',
      targetTime: '11:00 AM',
      ccpCode: 'CCP-02',
      probeId: 'Line-SteamWell-B',
      isTemperatureCheck: true,
      targetToleranceText: '≥ 140°F',
      minTolerance: 140,
      currentValue: 148.5,
      unit: '°F',
      completed: true,
      signedBy: 'Carlos R.',
      signedAt: '10m ago',
    },
    {
      id: 'haccp-3',
      category: 'Food Safety / HACCP',
      task: 'Garde Manger Cold Prep Rail Telemetry',
      station: 'Garde Manger',
      assignedTo: 'Maria S. (Sous)',
      targetTime: '07:42 AM',
      ccpCode: 'CCP-03',
      probeId: 'Rail-GMR-04',
      isTemperatureCheck: true,
      targetToleranceText: '≤ 41°F',
      maxTolerance: 41,
      currentValue: 39.2,
      unit: '°F',
      completed: true,
      signedBy: 'Maria S.',
      signedAt: '07:42 AM',
    },
    {
      id: 'haccp-4',
      category: 'Food Safety / HACCP',
      task: 'Raw Poultry Walk-in Lowboy Drawer',
      station: 'Walk-in & Storage',
      assignedTo: 'David C. (Prep Cook)',
      targetTime: '08:00 AM',
      ccpCode: 'CCP-04 HIGH ALERT',
      probeId: 'Sensor Auto-Ping',
      isTemperatureCheck: true,
      targetToleranceText: '≤ 36°F',
      maxTolerance: 36,
      currentValue: 37.8,
      unit: '°F',
      completed: false,
      correctiveAction: 'Defrost cycle detected. Compressor restarted. Must verify below 36°F within 15 mins.',
    },
    {
      id: 'haccp-5',
      category: 'Food Safety / HACCP',
      task: 'Sanitizer Test Strip Concentration Verification',
      station: 'Dish Pit',
      assignedTo: 'Maria S. (Sous)',
      targetTime: '06:55 AM',
      targetToleranceText: '200–400 ppm quat',
      minTolerance: 200,
      maxTolerance: 400,
      currentValue: 300,
      unit: 'ppm',
      isTemperatureCheck: true,
      completed: true,
      signedBy: 'Maria S.',
      signedAt: '06:55 AM',
    },
    {
      id: 'open-1',
      category: 'Opening Floor',
      task: 'Cash Drawer Float Count (Drawer #01 & #02)',
      station: 'Front of House',
      assignedTo: 'Chef Gabriel M. (GM)',
      targetTime: '06:30 AM',
      targetToleranceText: '$300.00 base float',
      completed: true,
      signedBy: 'Gabriel M.',
      signedAt: '06:30 AM',
    },
    {
      id: 'open-2',
      category: 'Opening Floor',
      task: 'POS Terminal & ESC/POS Receipt Hub Online Ping',
      station: 'Front of House',
      assignedTo: 'Auto-Daemon',
      targetTime: '06:02 AM',
      targetToleranceText: '4/4 Peripherals Ready',
      completed: true,
      signedBy: 'System Bus',
      signedAt: '06:02 AM',
    },
    {
      id: 'mid-1',
      category: 'Mid-Shift',
      task: 'Fryer Filtration & Oil Boil-Out Quality Index',
      station: 'Line 2',
      assignedTo: 'Vito K.',
      targetTime: '07:10 AM',
      targetToleranceText: '< 20% TPM',
      maxTolerance: 20,
      currentValue: 14.2,
      unit: '%',
      isTemperatureCheck: true,
      completed: true,
      signedBy: 'Vito K.',
      signedAt: '07:10 AM',
    },
    {
      id: 'mid-2',
      category: 'Mid-Shift',
      task: 'Espresso Group Head Backflush & Pump PSI',
      station: 'Front of House',
      assignedTo: 'Leo M.',
      targetTime: '07:25 AM',
      targetToleranceText: '9.0 ± 0.3 Bar',
      minTolerance: 8.7,
      maxTolerance: 9.3,
      currentValue: 9.2,
      unit: 'Bar',
      isTemperatureCheck: true,
      completed: true,
      signedBy: 'Leo M.',
      signedAt: '07:25 AM',
    },
    {
      id: 'close-1',
      category: 'Closing',
      task: 'KitchenKit Daily Par Batch Prep Confirmation',
      station: 'Line 1',
      assignedTo: 'Chef Gabriel M.',
      targetTime: '10:30 PM',
      targetToleranceText: '3 Batches Flagged',
      completed: false,
    },
  ]);

  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: 'app-1',
      type: 'comp',
      requestedBy: 'Server Jessica T.',
      details: 'Table 4: Anniversary guest complimentary Chocolate Soufflé ($16.00)',
      amount: '$16.00',
      status: 'pending',
      timestamp: '5m ago',
    },
    {
      id: 'app-2',
      type: 'void',
      requestedBy: 'Server Alex M.',
      details: 'Table 12: Guest miscommunication, voided 2x Dry Martini ($36.00)',
      amount: '$36.00',
      status: 'pending',
      timestamp: '14m ago',
    },
    {
      id: 'app-3',
      type: 'overtime',
      requestedBy: 'Chef Marcus',
      details: 'Prep Cook David Chen: 1.5 hrs overtime requested for Sunday banquet butchery',
      status: 'pending',
      timestamp: '32m ago',
    },
  ]);

  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const toggleChecklist = (id: string) => {
    setChecklists((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const willComplete = !c.completed;
        return {
          ...c,
          completed: willComplete,
          signedBy: willComplete ? session?.displayName || 'Supervisor Sign-off' : undefined,
          signedAt: willComplete
            ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined,
        };
      })
    );
  };

  const updateTempValue = (id: string, valStr: string) => {
    const val = parseFloat(valStr);
    setChecklists((prev) =>
      prev.map((c) => (c.id === id ? { ...c, currentValue: isNaN(val) ? undefined : val } : c))
    );
  };

  const handleApproval = (id: string, decision: 'approved' | 'rejected') => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: decision } : a))
    );
  };

  const filteredChecklists = checklists.filter((item) =>
    phaseFilter === 'All' ? true : item.category === phaseFilter
  );

  const completedCount = checklists.filter((c) => c.completed).length;
  const progressPercent = Math.round((completedCount / checklists.length) * 100);
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  const getToleranceStatus = (item: ChecklistItem): 'pass' | 'fail' | 'neutral' => {
    if (item.currentValue === undefined) return 'neutral';
    if (item.maxTolerance !== undefined && item.currentValue > item.maxTolerance) return 'fail';
    if (item.minTolerance !== undefined && item.currentValue < item.minTolerance) return 'fail';
    return 'pass';
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* ============================================================ */}
      {/* TOP HERO STATUS & OPERATIONAL HUD (PRD Spec Exact Container) */}
      {/* ============================================================ */}
      <div className="relative w-full rounded-2xl bg-[#181c24] p-6 border border-slate-800 shadow-xl overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
        <div className="absolute right-64 -bottom-24 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Title & Timeline Details */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-3 text-slate-400">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Live Operational Shift
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE MONITORING
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span className="text-[11px] text-slate-300 font-mono">
                Today • Station Hub 01
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 mt-0.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Morning Opening &amp; Pre-Service Checklists
              </h1>
              <span className="px-2.5 py-1 rounded-md bg-[#262a33] font-mono text-xs text-amber-400 font-bold border border-slate-700/60">
                06:00 — 11:30
              </span>
            </div>

            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Automated HACCP Critical Control Point verification, line equipment calibration, cash audit, and prep par level synchronization for lunch turnaround.
            </p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('checklists')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-slate-100 font-bold text-xs border border-slate-700/60 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
            >
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <span>+ Add Task</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-slate-100 font-bold text-xs border border-slate-700/60 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Scan Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => alert('Exporting HACCP tamper-proof audit log PDF...')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-slate-100 font-bold text-xs border border-slate-700/60 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Export Audit PDF</span>
            </button>
            <button
              type="button"
              onClick={() => alert(`Shift signed off by ${session?.displayName || 'Supervisor'}`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md active:scale-[0.97]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Supervisor Sign-off</span>
            </button>
          </div>
        </div>

        {/* Active Shift Progress Strip & Tab Bar */}
        <div className="mt-5 pt-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#1c2028]/80 p-3 rounded-xl border border-slate-800">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('checklists')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'checklists'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#262a33]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Checklists ({completedCount}/{checklists.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'approvals'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#262a33]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Approvals Required</span>
              {pendingApprovals.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-[10px] font-bold">
                  {pendingApprovals.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'scan'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#262a33]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Invoice OCR</span>
            </button>
          </div>

          {/* Live Shift Completion Meter */}
          <div className="flex items-center gap-4 w-full md:w-72">
            <div className="flex flex-col flex-1">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-400 font-medium">Shift Completion</span>
                <span className="font-mono text-amber-400 font-bold">
                  {completedCount}/{checklists.length} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#31353e] overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-xs bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-md">
              <Clock className="w-3.5 h-3.5" />
              <span>03:12:45</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN DUAL COLUMN WORKSPACE (8 Cols Matrix / 4 Cols Sidebar) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CHECKLIST MATRIX (8 Cols) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Section A: Food Safety & HACCP Critical Control Points */}
          <div className="flex flex-col rounded-2xl bg-[#181c24] p-5 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between pb-3 mb-4 bg-[#0a0e16] p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      Section A: Food Safety &amp; HACCP Critical Control Points
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                      High Priority
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Mandatory daily compliance logs with active probe telemetry sync
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                4/5 Verified
              </span>
            </div>

            {/* Tasks list */}
            <div className="flex flex-col gap-2.5">
              {checklists
                .filter((c) => c.category === 'Food Safety / HACCP')
                .map((item) => {
                  const tolStatus = getToleranceStatus(item);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 border ${
                        tolStatus === 'fail'
                          ? 'bg-[#262a33] border-amber-500/50 shadow-sm'
                          : item.completed
                          ? 'bg-[#1c2028] border-slate-800/80 text-slate-400'
                          : 'bg-[#1c2028] border-slate-700/60 text-white'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleChecklist(item.id)}
                          aria-label={`Toggle task ${item.task}`}
                          className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-[0.92] ${
                            tolStatus === 'fail'
                              ? 'bg-amber-500 text-slate-950'
                              : item.completed
                              ? 'bg-emerald-500 text-slate-950'
                              : 'border border-slate-600 bg-slate-800 hover:border-slate-400'
                          }`}
                        >
                          {item.completed && <Check className="w-4 h-4 stroke-[3]" />}
                          {tolStatus === 'fail' && !item.completed && (
                            <AlertCircle className="w-4 h-4 stroke-[3]" />
                          )}
                        </button>

                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-100">
                              {item.task}
                            </span>
                            {item.ccpCode && (
                              <span className="px-2 py-0.5 rounded bg-[#262a33] text-amber-400 text-[10px] font-mono font-bold border border-slate-700">
                                {item.ccpCode}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-[#262a33] text-slate-400 text-[10px] font-medium border border-slate-700/60">
                              Station: {item.station}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span>
                              Target:{' '}
                              <strong className="text-slate-200 font-mono">
                                {item.targetToleranceText}
                              </strong>
                            </span>
                            {item.probeId && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="font-mono text-slate-500">{item.probeId}</span>
                              </>
                            )}
                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold flex items-center justify-center">
                                MS
                              </span>
                              <span>{item.assignedTo} • {item.targetTime}</span>
                            </span>
                          </div>

                          {item.correctiveAction && (
                            <div className="mt-1 flex items-center gap-2 text-amber-400 text-[11px] bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-md">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.correctiveAction}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Telemetry Pill & State Indicator */}
                      <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0e16] border border-slate-800">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              tolStatus === 'fail'
                                ? 'bg-amber-400 animate-ping'
                                : 'bg-emerald-400 animate-pulse'
                            }`}
                          />
                          <div className="flex flex-col text-right">
                            <span
                              className={`text-sm font-mono font-bold leading-none ${
                                tolStatus === 'fail' ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {item.currentValue} {item.unit}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                              {tolStatus === 'fail' ? 'Over Spec' : 'In-Spec'}
                            </span>
                          </div>
                        </div>

                        {tolStatus === 'fail' ? (
                          <button
                            type="button"
                            onClick={() => updateTempValue(item.id, '35.5')}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-[0.96]"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retest</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleChecklist(item.id)}
                            className="w-8 h-8 rounded-lg bg-[#262a33] hover:bg-[#31353e] text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Section B: Opening Floor & Cash Reconciliation */}
          <div className="flex flex-col rounded-2xl bg-[#181c24] p-5 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between pb-3 mb-4 bg-[#0a0e16] p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">
                    Section B: Opening Floor &amp; Cash Reconciliation
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Terminal boot status, drawer reconciliation, and front-of-house readiness
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                3/3 Complete
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {checklists
                .filter((c) => c.category === 'Opening Floor')
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#1c2028] border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 w-6 h-6 rounded-md bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{item.task}</span>
                          <span className="px-2 py-0.5 rounded bg-[#262a33] text-slate-400 text-[10px] font-medium border border-slate-700/60">
                            Station: {item.station}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>Target: <strong className="text-slate-200 font-mono">{item.targetToleranceText}</strong></span>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className="text-emerald-400 font-semibold font-mono">Reconciled &amp; Sealed</span>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className="text-slate-400">Signed off by {item.signedBy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <span className="px-3 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                        ONLINE
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HACCP COMPLIANCE SCORECARD & SIDEBAR (4 Cols) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* 1. HACCP Compliance Scorecard Card */}
          <div className="flex flex-col rounded-2xl bg-[#181c24] p-5 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-bold text-white">HACCP Compliance Index</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                Tier-1 Pass
              </span>
            </div>

            {/* Donut Gauge Chart & Summary Numbers */}
            <div className="flex items-center gap-5 p-4 rounded-xl bg-[#0a0e16] border border-slate-800">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    className="text-slate-800 fill-none"
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                  />
                  <circle
                    className="text-emerald-400 fill-none transition-all duration-1000"
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeDasharray="251.2"
                    strokeDashoffset="12.5"
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-white font-mono leading-none">98.5</span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">% Spec</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-1 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">Critical Violations</span>
                  <span className="font-mono text-emerald-400 font-bold">0</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">Minor Variances</span>
                  <span className="font-mono text-amber-400 font-bold">1</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">Total Sensor Logs</span>
                  <span className="font-mono text-slate-200 font-bold">128</span>
                </div>
              </div>
            </div>

            {/* Live Sensor Probes Feed */}
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-1">
                <span className="uppercase">Live Sensor Probes (IoT Core)</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE FEED
                </span>
              </div>

              {[
                { name: 'Walk-in Cooler Main', probe: 'Probe #W101 • Target ≤38°F', temp: '36.4°F', status: 'Nominal' },
                { name: 'Deep Freeze Locker', probe: 'Probe #FZ02 • Target ≤0°F', temp: '-2.1°F', status: 'Nominal' },
                { name: 'Line Cold Rail 01', probe: 'Probe #RL01 • Target ≤41°F', temp: '38.8°F', status: 'Nominal' },
                { name: 'Butcher Lowboy Drawer', probe: 'Probe #DR04 • Target ≤36°F', temp: '37.8°F', status: 'Watchlist', isAlert: true },
              ].map((sensor) => (
                <div
                  key={sensor.name}
                  className="p-2.5 rounded-lg bg-[#1c2028] border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-100">{sensor.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{sensor.probe}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono font-bold ${sensor.isAlert ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {sensor.temp}
                    </p>
                    <p className={`text-[9px] font-bold uppercase ${sensor.isAlert ? 'text-amber-400' : 'text-slate-400'}`}>
                      {sensor.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Supervisor Shift Attestation Card */}
          <div className="flex flex-col rounded-2xl bg-[#181c24] p-5 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Supervisor Shift Attestation
              </span>
              <span className="font-mono text-[10px] text-slate-400">Shift 1 of 2</span>
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Digital verification confirms all morning critical control points, oil TPM ratios, and opening cash reconciliations have been completed according to municipal health codes.
            </p>

            <div className="p-3.5 rounded-xl bg-[#0a0e16] border border-slate-800 flex flex-col gap-2 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-slate-950 text-xs">
                    GM
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">Chef Gabriel M.</p>
                    <p className="text-[10px] text-amber-400">Executive Chef &amp; GM</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-400 font-mono text-[11px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                  SIGNED
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-500 flex items-center justify-between">
                <span>Cert Hash: HACCP-092-B7</span>
                <span>07:45:12 AM</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert('Morning log sealed and written to immutable tamper-proof audit trail.')}
              className="w-full py-2.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Finalize &amp; Seal Morning Log</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
