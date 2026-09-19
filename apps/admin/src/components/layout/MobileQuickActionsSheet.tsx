import React, { useState } from 'react';
import {
  X,
  Flame,
  KeyRound,
  Trash2,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from '@culinaryos/ui';

interface MobileQuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileQuickActionsSheet({ isOpen, onClose }: MobileQuickActionsSheetProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [mockItems, setMockItems] = useState([
    { id: '1', name: 'Wagyu Ribeye 12oz', is86: false, category: 'Mains' },
    { id: '2', name: 'Maine Lobster Risotto', is86: true, category: 'Mains' },
    { id: '3', name: 'Truffle Pommes Frites', is86: false, category: 'Sides' },
    { id: '4', name: 'Pacific Oysters (Dozen)', is86: false, category: 'Raw Bar' },
    { id: '5', name: 'Chocolate Soufflé', is86: false, category: 'Desserts' },
  ]);

  if (!isOpen) return null;

  const toggle86 = (id: string, name: string) => {
    setMockItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is86: !item.is86 } : item))
    );
    setStatusMessage(`Updated 86 status for "${name}"`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const triggerDrawerKick = () => {
    setStatusMessage('⚡ Cash Drawer DK Port Kick pulse sent via ESC/POS (Star/Epson)');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const triggerManagerAlert = () => {
    setStatusMessage('🚨 Manager on Duty notified: "Floor assistance requested at Table 14"');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const filteredItems = mockItems.filter((item) =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fadeIn">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Touch Bottom Sheet (Thumb Zone) */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 overflow-hidden max-h-[85vh] flex flex-col z-10 animate-scaleUp">
        {/* Drag Handle Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Quick Operational Actions</h3>
            <p className="text-xs text-slate-500">Fast day-to-day restaurant floor triggers</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors min-h-[36px] min-w-[36px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast inside sheet */}
        {statusMessage && (
          <div className="mx-4 my-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Quick Trigger Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveAction(activeAction === '86' ? null : '86')}
              className={`min-h-[48px] p-3 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.97] ${
                activeAction === '86'
                  ? 'border-red-500 bg-red-50 text-red-950 ring-2 ring-red-300'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-200 text-red-800">
                  Instant
                </span>
              </div>
              <span className="font-bold text-xs">86 / Un-86 Item</span>
              <span className="text-[10px] text-slate-500">Live POS & KDS sync</span>
            </button>

            <button
              type="button"
              onClick={triggerDrawerKick}
              className="min-h-[48px] p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 text-left flex flex-col justify-between transition-all active:scale-[0.97]"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800">
                  Drawer
                </span>
              </div>
              <span className="font-bold text-xs">Kick Cash Drawer</span>
              <span className="text-[10px] text-slate-500">DK Port pulse (24V)</span>
            </button>

            <button
              type="button"
              onClick={triggerManagerAlert}
              className="min-h-[48px] p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 text-left flex flex-col justify-between transition-all active:scale-[0.97]"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-800">
                  Floor
                </span>
              </div>
              <span className="font-bold text-xs">Call Manager</span>
              <span className="text-[10px] text-slate-500">Push to MOD device</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusMessage('Waste logged: 1.5kg Prime Beef Trim logged to Kitchen Waste');
                setTimeout(() => setStatusMessage(null), 3000);
              }}
              className="min-h-[48px] p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 text-left flex flex-col justify-between transition-all active:scale-[0.97]"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800">
                  Waste
                </span>
              </div>
              <span className="font-bold text-xs">Quick Waste Log</span>
              <span className="text-[10px] text-slate-500">Record scrap / spoilage</span>
            </button>
          </div>

          {/* 86ing Search and Toggles */}
          {activeAction === '86' && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Search Menu Items to 86</span>
                <span className="text-[10px] text-slate-500">Tap to toggle availability</span>
              </div>
              <input
                type="text"
                placeholder="Type item name..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-red-400 focus:outline-none"
              />
              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-medium text-slate-900">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block">{item.category}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle86(item.id, item.name)}
                      className={`min-h-[48px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] flex items-center gap-1.5 ${
                        item.is86
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {item.is86 ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>86'd</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Available</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Safety padding for iPhone home indicator */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Audit logged with staff PIN
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold min-h-[48px] active:scale-[0.97]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
