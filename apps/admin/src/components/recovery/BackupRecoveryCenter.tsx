import React, { useState } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileText,
  Clock,
  Trash2,
  Sparkles,
  ShieldCheck,
} from '@culinaryos/ui';

interface DeletedAuditItem {
  id: string;
  itemType: 'Menu Item' | 'Employee Profile' | 'Pantry Item' | 'Table Layout';
  name: string;
  deletedAt: string;
  deletedBy: string;
}

export function BackupRecoveryCenter() {
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [showDestructiveModal, setShowDestructiveModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const [deletedHistory, setDeletedHistory] = useState<DeletedAuditItem[]>([
    { id: '1', itemType: 'Menu Item', name: 'Maine Lobster Risotto', deletedAt: '24 mins ago', deletedBy: 'Alex (Shift Lead)' },
    { id: '2', itemType: 'Employee Profile', name: 'James Wilson (Server)', deletedAt: '2 hours ago', deletedBy: 'Sarah (GM)' },
    { id: '3', itemType: 'Pantry Item', name: 'Organic Truffle Oil 500ml', deletedAt: 'Yesterday', deletedBy: 'Marcus (Chef)' },
  ]);

  const handleDownloadBackup = () => {
    const backupData = {
      restaurant: 'The Golden Fork Bistro',
      unitId: 'Unit #01 Downtown',
      timestamp: new Date().toISOString(),
      version: '1.2.1-commercial',
      configuration: {
        currency: 'USD',
        taxRate: 8.25,
        tipMethod: 'hours-weighted',
      },
      itemCount: 48,
      staffCount: 14,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CulinaryOS-Backup-GoldenFork-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setBackupSuccess('System snapshot downloaded safely. Keep this file in your records or cloud drive.');
    setTimeout(() => setBackupSuccess(null), 5000);
  };

  const handleRestoreItem = (id: string, name: string) => {
    setDeletedHistory((prev) => prev.filter((item) => item.id !== id));
    setBackupSuccess(`Successfully restored "${name}" back into active catalog.`);
    setTimeout(() => setBackupSuccess(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {backupSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{backupSuccess}</span>
        </div>
      )}

      {/* 1. Automated Backups & Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-base">Download Complete Store Backup</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Creates a secure, portable snapshot containing all menu items, recipes, prices, staff PINs, and system configurations.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between font-medium">
              <span>Automatic Nightly Backup:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Active (03:00 AM)
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shadow-xs active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup Snapshot Now</span>
            </button>
          </div>
        </div>

        {/* 2. Safe Restore Workflow */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-base">Restore from Backup File</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload a previously saved snapshot to restore settings or menus. CulinaryOS verifies the file before making any changes.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-4 text-center text-xs text-slate-500 bg-slate-50/50 cursor-pointer">
              <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1" />
              <p className="font-semibold text-slate-700">Drop backup file here, or click to browse</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Supports .json snapshots</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRestoring(true);
                setTimeout(() => {
                  setRestoring(false);
                  setBackupSuccess('Verified and restored 48 menu items and 14 staff records without downtime.');
                  setTimeout(() => setBackupSuccess(null), 5000);
                }, 1200);
              }}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{restoring ? 'Verifying File & Restoring…' : 'Restore from Sample Backup'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Accidental Mistake Recovery / Undo Log */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-600" />
              <span>Accidental Mistake Recovery</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Items deleted within the last 7 days can be restored with a single click.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 font-mono">
            {deletedHistory.length} recoverable items
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {deletedHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No deleted items. Your catalog and staff roster are fully intact.
            </div>
          ) : (
            deletedHistory.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                    {item.itemType}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                    <p className="text-[11px] text-slate-400">Deleted {item.deletedAt} by {item.deletedBy}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestoreItem(item.id, item.name)}
                  className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 active:scale-[0.97] transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Safety Zone / Reset Protection */}
      <div className="bg-red-50/50 rounded-3xl border border-red-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <h4 className="font-bold text-red-950 text-sm">Protected System Actions</h4>
        </div>
        <p className="text-xs text-red-800 leading-relaxed">
          CulinaryOS prevents accidental data wipes. Resetting test data requires typing confirmation and retains previous sales reports and financial history.
        </p>
        <button
          type="button"
          onClick={() => setShowDestructiveModal(true)}
          className="min-h-[44px] px-4 py-2 bg-white border border-red-300 text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold active:scale-[0.97] transition-all"
        >
          Reset Practice / Demo Orders
        </button>
      </div>

      {/* Safe Confirmation Modal */}
      {showDestructiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Reset Demo Orders?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will clear practice tickets and reset table statuses to available. Your menu items, recipes, staff PINs, and real financial summaries will NOT be affected.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Type <span className="font-mono text-red-600 font-black">RESET</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type RESET"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDestructiveModal(false);
                  setConfirmInput('');
                }}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmInput !== 'RESET'}
                onClick={() => {
                  setShowDestructiveModal(false);
                  setConfirmInput('');
                  setBackupSuccess('Demo tickets reset successfully. Real restaurant data was preserved.');
                  setTimeout(() => setBackupSuccess(null), 5000);
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-40 disabled:pointer-events-none"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
