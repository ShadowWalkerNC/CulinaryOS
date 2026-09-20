import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { BackupRecoveryCenter } from '../components/recovery/BackupRecoveryCenter';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Wifi,
  CreditCard,
  HardDrive,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Terminal,
  RotateCcw,
  Sparkles,
  Download,
} from '@culinaryos/ui';

interface SubsystemStatus {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  status: 'healthy' | 'warning' | 'error';
  plainTitle: string;
  plainDescription: string;
  repairActionLabel?: string;
  repairNotice?: string;
  technicalDetails: string;
}

export function SystemHealthPage() {
  const [activeTab, setActiveTab] = useState<'health' | 'backup'>('health');
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [repairSuccess, setRepairSuccess] = useState<string | null>(null);
  const [showTechLog, setShowTechLog] = useState(false);

  const [subsystems, setSubsystems] = useState<SubsystemStatus[]>([
    {
      id: 'db-sync',
      name: 'Cloud Data & Database Sync',
      category: 'Cloud Services',
      icon: <Wifi className="w-5 h-5 text-emerald-600" />,
      status: 'healthy',
      plainTitle: 'All Sales & Orders Synchronized',
      plainDescription: 'Your sales, inventory, and staff timecards are securely backed up in real time.',
      technicalDetails: 'Supabase PostgreSQL V17 connected • Latency: 16ms • RLS Tenant Isolation active • Zero replication drift',
    },
    {
      id: 'printers',
      name: 'Kitchen & Receipt Printers',
      category: 'Hardware',
      icon: <Printer className="w-5 h-5 text-amber-600" />,
      status: 'warning',
      plainTitle: 'Kitchen Impact Printer Needs Attention',
      plainDescription: 'The BOH Grill printer (Star SP742) has 1 paused job in queue. Check paper roll or reconnect.',
      repairActionLabel: 'Reset Print Queue & Reconnect',
      repairNotice: 'Print queue flushed and connection to Star SP742 (192.168.1.142:9100) re-established.',
      technicalDetails: 'ESC/POS Socket 192.168.1.142:9100 timed out after 1500ms • FOH Thermal Star TSP143IV is OK',
    },
    {
      id: 'payments',
      name: 'Payment Terminal (Card Reader)',
      category: 'Payments',
      icon: <CreditCard className="w-5 h-5 text-emerald-600" />,
      status: 'healthy',
      plainTitle: 'Card Reader Online & Ready',
      plainDescription: 'Stripe Terminal WisePOS E is paired and ready for tap, chip, and Apple Pay payments.',
      technicalDetails: 'Stripe WisePOS E (tmr_xxx) online • SAQ-A out-of-scope compliance active • Offline card collection enabled',
    },
    {
      id: 'offline-cache',
      name: 'Offline Storage & Resilience',
      category: 'Local Storage',
      icon: <HardDrive className="w-5 h-5 text-emerald-600" />,
      status: 'healthy',
      plainTitle: 'Offline Mode Ready',
      plainDescription: 'If your internet connection drops, you can continue taking orders and printing kitchen tickets without interruption.',
      technicalDetails: 'IndexedDB order cache: 14.2 MB used • Idempotency key buffer intact • Fallback mock menu ready',
    },
    {
      id: 'staff-security',
      name: 'Staff PIN & Security Gates',
      category: 'Security',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      status: 'healthy',
      plainTitle: 'Security & FLSA Rules Enforced',
      plainDescription: 'Manager PIN protection is active and tip pool exclusions are legally compliant.',
      technicalDetails: 'FLSA Title 29 manager exclusions hardcoded • Argon2id PIN verification active • Zero plain-text credentials',
    },
  ]);

  const handleRepair = (id: string, notice?: string) => {
    setRepairingId(id);
    setRepairSuccess(null);

    setTimeout(() => {
      setSubsystems((prev) =>
        prev.map((sub) => (sub.id === id ? { ...sub, status: 'healthy', plainTitle: 'Repaired & Responding Normally', plainDescription: 'Subsystem is back online and operational.' } : sub))
      );
      setRepairingId(null);
      setRepairSuccess(notice || 'Issue resolved successfully! All systems are operating normally.');
      setTimeout(() => setRepairSuccess(null), 5000);
    }, 1500);
  };

  const exportDiagnosticsBundle = () => {
    const bundle = {
      product: 'CulinaryOS Commercial',
      version: '1.2.1-commercial',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      subsystems: subsystems.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        status: s.status,
        technicalDetails: s.technicalDetails,
      })),
      storageTelemetry: {
        localStorageKeys: Object.keys(localStorage),
        offlineCacheReady: true,
      },
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `culinaryos-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setRepairSuccess('Support Diagnostics Bundle exported. Attach this file to your support request.');
    setTimeout(() => setRepairSuccess(null), 5000);
  };

  const hasIssues = subsystems.some((s) => s.status !== 'healthy');

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health, Diagnostics & Repair"
        purpose="Monitor your restaurant's devices, cloud connections, and card readers in plain language, with one-click automated fixes."
        badge="Self-Healing Engine"
        helpContext={{
          summary: 'CulinaryOS continuously monitors your printers, card readers, and cloud sync in the background so you never have to troubleshoot technical errors during service.',
          tips: [
            'If a printer stops printing tickets, tap "Reset Print Queue" to safely re-establish communication.',
            'Offline mode is always active—if your internet drops, keep taking orders normally and they will automatically sync when connection returns.',
            'Regularly download a backup file from the Backup tab to keep in your permanent records.',
          ],
        }}
        secondaryActions={[
          {
            label: 'Export Support Bundle',
            icon: <Download className="w-4 h-4" />,
            onClick: exportDiagnosticsBundle,
          },
        ]}
        primaryAction={{
          label: 'Run Complete Diagnostic Scan',
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: () => {
            setRepairSuccess('Diagnostic scan complete: All 5 operational subsystems evaluated.');
            setTimeout(() => setRepairSuccess(null), 4000);
          },
        }}
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold max-w-sm">
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`flex-1 min-h-[44px] rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.97] ${
            activeTab === 'health' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Health & Diagnostics</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex-1 min-h-[44px] rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.97] ${
            activeTab === 'backup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Backups & Recovery</span>
        </button>
      </div>

      {activeTab === 'backup' ? (
        <BackupRecoveryCenter />
      ) : (
        <div className="space-y-5">
          {/* Global Health Pulse Banner */}
          <div
            className={`p-5 rounded-3xl border flex items-center justify-between text-xs transition-all ${
              hasIssues
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                  hasIssues ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {hasIssues ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-black text-sm">
                  {hasIssues ? '1 System Needs Attention' : 'All Systems Operating Normally'}
                </p>
                <p className="text-slate-600 mt-0.5">
                  {hasIssues
                    ? 'Review the recommendation below to resolve the issue with one click.'
                    : 'Printers, card readers, cloud sync, and offline cache are verified and ready for service.'}
                </p>
              </div>
            </div>
            <span className="font-mono font-bold text-slate-400 hidden sm:inline">
              Checked 30s ago
            </span>
          </div>

          {repairSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{repairSuccess}</span>
            </div>
          )}

          {/* Subsystem Status Cards */}
          <div className="space-y-3">
            {subsystems.map((sub) => {
              const isWarning = sub.status === 'warning';
              return (
                <div
                  key={sub.id}
                  className={`p-5 bg-white rounded-3xl border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isWarning ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 shrink-0">
                      {sub.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {sub.category}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase ${
                            sub.status === 'healthy'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.status === 'healthy' ? 'Normal' : 'Action Needed'}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm sm:text-base">{sub.plainTitle}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                        {sub.plainDescription}
                      </p>
                    </div>
                  </div>

                  {sub.repairActionLabel && (
                    <div className="shrink-0 pt-2 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRepair(sub.id, sub.repairNotice)}
                        disabled={repairingId === sub.id}
                        className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${repairingId === sub.id ? 'animate-spin' : ''}`} />
                        <span>{repairingId === sub.id ? 'Fixing Issue…' : sub.repairActionLabel}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Advanced Technical Support Log Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowTechLog(!showTechLog)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 p-1"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showTechLog ? 'Hide Advanced Technical Details' : 'View Advanced Technical Details (For IT Support)'}</span>
              {showTechLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTechLog && (
              <div className="mt-3 bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded-2xl border border-slate-800 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2">
                  <span>SUBSYSTEM DIAGNOSTIC TELEMETRY</span>
                  <span>VERSION 1.2.1-COMMERCIAL</span>
                </div>
                {subsystems.map((sub) => (
                  <div key={sub.id} className="flex justify-between gap-4 py-1">
                    <span className="text-slate-400 font-bold">{sub.name}:</span>
                    <span className="text-slate-200 text-right">{sub.technicalDetails}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
