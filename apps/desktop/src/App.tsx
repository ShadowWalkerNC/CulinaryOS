import { useState, useEffect } from 'react';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { PairingModal } from './components/PairingModal';

interface SurfaceTab {
  id: string;
  name: string;
  url: string;
  icon: string;
  shortcut: string;
  port: number;
  description: string;
}

const SURFACES: SurfaceTab[] = [
  { id: 'pos', name: 'POS Terminal', url: 'http://localhost:5172', icon: 'point_of_sale', shortcut: 'F1', port: 5172, description: 'Table orders, 3D floor map, checkout' },
  { id: 'kds', name: 'Kitchen KDS', url: 'http://localhost:5173', icon: 'soup_kitchen', shortcut: 'F2', port: 5173, description: 'Ticket aging, bump bar, station routing' },
  { id: 'admin', name: 'Admin Back-Office', url: 'http://localhost:5174', icon: 'admin_panel_settings', shortcut: 'F3', port: 5174, description: 'Pantry inventory, menu editor, staff & tools' },
  { id: 'web', name: 'Storefront', url: 'http://localhost:5176/menu/demo', icon: 'storefront', shortcut: 'F4', port: 5176, description: 'Customer ordering, dietary filters, delivery' },
  { id: 'kitchenkit', name: 'KitchenKit', url: 'http://localhost:5175', icon: 'menu_book', shortcut: 'F5', port: 5175, description: 'Batch scaling, prep planner, vendor POs' },
  { id: 'ops', name: 'CulinaryOps', url: 'http://localhost:5177', icon: 'monitoring', shortcut: 'F6', port: 5177, description: 'Food waste diagnostics, labor, plate economics' },
  { id: 'marketing', name: 'Marketing & Hub', url: 'http://localhost:5176', icon: 'campaign', shortcut: 'F7', port: 5176, description: 'Public marketing landing page, ROI calculator & specs' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isKiosk, setIsKiosk] = useState<boolean>(false);
  const [pinUser] = useState<string>('Server #1234');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isPairingOpen, setIsPairingOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('pos'); }
      if (e.key === 'F2') { e.preventDefault(); setActiveTab('kds'); }
      if (e.key === 'F3') { e.preventDefault(); setActiveTab('admin'); }
      if (e.key === 'F4') { e.preventDefault(); setActiveTab('web'); }
      if (e.key === 'F5') { e.preventDefault(); setActiveTab('kitchenkit'); }
      if (e.key === 'F6') { e.preventDefault(); setActiveTab('ops'); }
      if (e.key === 'F7') { e.preventDefault(); setActiveTab('marketing'); }
      if (e.key === 'F11') { e.preventDefault(); setIsKiosk((k) => !k); }
      if (e.key === 'F9' || (e.altKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        setIsDiagnosticsOpen((d) => !d);
      }
      if (e.key === 'F10' || (e.altKey && e.key.toLowerCase() === 'q')) {
        e.preventDefault();
        setIsPairingOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeSurface = SURFACES.find((s) => s.id === activeTab) || SURFACES[0];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Desktop Master Navigation Bar */}
      <header className="h-13 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-lg gap-3">
        {/* Left: Brand Identity & Active Surface */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center font-black text-base text-white shadow-md shadow-orange-600/20">
              🍽️
            </div>
            <div>
              <span className="font-black text-xs uppercase tracking-wider text-slate-100 block leading-tight">
                CulinaryOS
              </span>
              <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                Restaurant Workstation
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 hidden md:block" />
        </div>

        {/* Center: Surface Tab Strip */}
        <nav className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
          {SURFACES.map((s) => {
            const isSelected = activeTab === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                title={s.description}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
                <span>{s.name}</span>
                <span className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold ${
                  isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {s.shortcut}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right Status & Tools Controls */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          {/* LAN QR Pairing Button */}
          <button
            onClick={() => setIsPairingOpen(true)}
            title="Mobile & Tablet QR Pairing (F10)"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition font-bold text-[11px]"
          >
            <span className="material-symbols-outlined text-[15px] text-orange-400">qr_code_2</span>
            <span className="hidden lg:inline">Pair Mobile</span>
          </button>

          {/* Diagnostics Button */}
          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            title="System Diagnostics & Preflight (F9)"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition font-bold text-[11px]"
          >
            <span className="material-symbols-outlined text-[15px] text-emerald-400">health_and_safety</span>
            <span className="hidden lg:inline">Diagnostics</span>
          </button>

          {/* Active PIN Staff Session */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{pinUser}</span>
          </div>

          {/* Full-screen Kiosk Toggle */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                setIsKiosk(true);
              } else {
                document.exitFullscreen();
                setIsKiosk(false);
              }
            }}
            title="Toggle Kiosk Mode (F11)"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center transition"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isKiosk ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Single Fullscreen View Area */}
      <main className="flex-1 flex overflow-hidden bg-slate-950">
        <iframe
          key={activeSurface.id}
          src={activeSurface.url}
          className="w-full h-full border-none bg-white"
          title={activeSurface.name}
        />
      </main>

      {/* Diagnostics Modal Drawer */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* LAN QR Pairing Modal */}
      <PairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
      />
    </div>
  );
}

export default App;
