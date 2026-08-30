import { useState, useEffect } from 'react';
import { ThemeCustomizer } from '@culinaryos/ui';

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
  { id: 'web', name: 'Online Storefront', url: 'http://localhost:5176', icon: 'storefront', shortcut: 'F4', port: 5176, description: 'Customer ordering, dietary filters, delivery' },
  { id: 'kitchenkit', name: 'KitchenKit & Recipes', url: 'http://localhost:5175', icon: 'menu_book', shortcut: 'F5', port: 5175, description: 'Batch scaling, prep planner, Dennis vendor POs' },
  { id: 'ops', name: 'CulinaryOps', url: 'http://localhost:5177', icon: 'monitoring', shortcut: 'F6', port: 5177, description: 'Food waste diagnostics, labor, plate economics' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [splitView, setSplitView] = useState<boolean>(false);
  const [secondaryTab, setSecondaryTab] = useState<string>('kds');
  const [isKiosk, setIsKiosk] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [pinUser] = useState<string>('John Doe (Server #1234)');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('pos'); }
      if (e.key === 'F2') { e.preventDefault(); setActiveTab('kds'); }
      if (e.key === 'F3') { e.preventDefault(); setActiveTab('admin'); }
      if (e.key === 'F4') { e.preventDefault(); setActiveTab('web'); }
      if (e.key === 'F5') { e.preventDefault(); setActiveTab('kitchenkit'); }
      if (e.key === 'F6') { e.preventDefault(); setActiveTab('ops'); }
      if (e.key === 'F11') { e.preventDefault(); setIsKiosk((k) => !k); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeSurface = SURFACES.find((s) => s.id === activeTab) || SURFACES[0];
  const secSurface = SURFACES.find((s) => s.id === secondaryTab) || SURFACES[1];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Top Desktop Master Titlebar */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center font-black text-sm text-white shadow-xs">
              🍽️
            </span>
            <div>
              <span className="font-black text-xs uppercase tracking-wider text-slate-100 block">
                CulinaryOS Desktop
              </span>
              <span className="text-[10px] text-slate-400 font-mono -mt-0.5 block">
                Turnkey Restaurant Workstation v1.0
              </span>
            </div>
          </div>

          <span className="text-slate-700">|</span>

          {/* Surface Tab Strip */}
          <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            {SURFACES.map((s) => {
              const isSelected = activeTab === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  title={s.description}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{s.icon}</span>
                  <span>{s.name}</span>
                  <span className="text-[9px] font-mono opacity-60 bg-black/30 px-1 py-0.2 rounded">
                    {s.shortcut}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Status & Kiosk Controls */}
        <div className="flex items-center gap-3 text-xs">
          {/* Split Screen Mode Toggle */}
          <button
            onClick={() => setSplitView(!splitView)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
              splitView
                ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">splitscreen</span>
            <span>{splitView ? 'Dual View Active' : 'Split Screen'}</span>
          </button>

          {/* System Kernel Health */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hono Kernel :3000</span>
          </div>

          {/* Active PIN User */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            <span className="material-symbols-outlined text-[14px] text-orange-400">badge</span>
            <span>{pinUser}</span>
          </div>

          {/* Theme & Palette Customizer Toggle */}
          <button
            onClick={() => setShowThemeModal(true)}
            title="Theme & UI Customizer"
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition text-[10px] font-bold uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[14px] text-orange-400">palette</span>
            <span>Theme</span>
          </button>

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

      {/* Theme Customizer Popup Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowThemeModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
            >
              ✕
            </button>
            <ThemeCustomizer />
          </div>
        </div>
      )}

      {/* Main View Area (Single or Split) */}
      <main className="flex-1 flex overflow-hidden bg-slate-950">
        {splitView ? (
          <div className="w-full h-full flex divide-x divide-slate-800">
            {/* Left Pane */}
            <div className="w-1/2 h-full flex flex-col">
              <div className="h-7 bg-slate-900 px-3 flex items-center justify-between border-b border-slate-800 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1 text-orange-400">
                  <span className="material-symbols-outlined text-[13px]">{activeSurface.icon}</span>
                  {activeSurface.name} (Port :{activeSurface.port})
                </span>
                <span className="font-mono text-slate-500">{activeSurface.url}</span>
              </div>
              <iframe
                src={activeSurface.url}
                className="w-full flex-1 border-none bg-white"
                title={activeSurface.name}
              />
            </div>

            {/* Right Pane */}
            <div className="w-1/2 h-full flex flex-col">
              <div className="h-7 bg-slate-900 px-3 flex items-center justify-between border-b border-slate-800 text-[10px] font-bold text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <span className="material-symbols-outlined text-[13px]">{secSurface.icon}</span>
                    {secSurface.name}
                  </span>
                  <select
                    value={secondaryTab}
                    onChange={(e) => setSecondaryTab(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-[10px] text-slate-200 rounded px-1.5 py-0.5 outline-none font-bold"
                  >
                    {SURFACES.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <span className="font-mono text-slate-500">{secSurface.url}</span>
              </div>
              <iframe
                src={secSurface.url}
                className="w-full flex-1 border-none bg-white"
                title={secSurface.name}
              />
            </div>
          </div>
        ) : (
          <iframe
            key={activeSurface.id}
            src={activeSurface.url}
            className="w-full h-full border-none bg-white"
            title={activeSurface.name}
          />
        )}
      </main>
    </div>
  );
}

export default App;
