import { useState, useEffect } from 'react';
import { Button } from '@culinaryos/ui';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { PairingModal } from './components/PairingModal';
import {
  CompactNavigation,
  getCulinaryAppModule,
  resolveCulinaryAppHref,
  type CompactNavigationItem,
} from '@culinaryos/ui';

interface SurfaceTab {
  id: string;
  name: string;
  url: string;
  icon: string;
  shortcut: string;
  port: number;
  description: string;
}

const SURFACE_DETAILS = [
  { id: 'pos', icon: 'point_of_sale', shortcut: 'F1' },
  { id: 'kds', icon: 'soup_kitchen', shortcut: 'F2' },
  { id: 'admin', icon: 'admin_panel_settings', shortcut: 'F3' },
  { id: 'web', icon: 'storefront', shortcut: 'F4' },
  { id: 'kitchenkit', icon: 'menu_book', shortcut: 'F5' },
  { id: 'ops', icon: 'monitoring', shortcut: 'F6' },
  { id: 'recipeos', icon: 'book_4', shortcut: 'F7' },
] as const;

const SURFACES: SurfaceTab[] = SURFACE_DETAILS.map((detail) => {
  const app = getCulinaryAppModule(detail.id);
  const url = resolveCulinaryAppHref(detail.id);
  return {
    id: detail.id,
    name: app.label,
    url: detail.id === 'web' ? `${url}menu/demo` : url,
    icon: detail.icon,
    shortcut: detail.shortcut,
    port: app.port,
    description: app.description,
  };
});

export function App() {
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isKiosk, setIsKiosk] = useState<boolean>(false);
  const [pinUser] = useState<string>('Server #1234');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isPairingOpen, setIsPairingOpen] = useState<boolean>(false);
  const workstationNavigation: CompactNavigationItem[] = SURFACES.map((surface, index) => ({
    id: surface.id,
    label: surface.name,
    primary: index < 4,
    icon: <span className="material-symbols-outlined text-[17px]">{surface.icon}</span>,
  }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const matchingSurface = SURFACES.find((surface) => surface.shortcut === e.key);
      if (matchingSurface) {
        e.preventDefault();
        setActiveTab(matchingSurface.id);
      }
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
      <header className="min-h-16 py-2 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex flex-wrap items-center justify-between shrink-0 shadow-lg gap-2">
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

        <div className="min-w-0 flex-1 flex justify-center">
          <CompactNavigation
            items={workstationNavigation}
            activeId={activeTab}
            onSelect={setActiveTab}
            label="Workstation surfaces"
            tone="dark"
          />
        </div>

        {/* Right Status & Tools Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
          {/* LAN QR Pairing Button */}
          <Button
            onClick={() => setIsPairingOpen(true)}
            title="Mobile & Tablet QR Pairing (F10)"
            className="min-h-[48px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition font-bold text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <span className="material-symbols-outlined text-[15px] text-orange-400">qr_code_2</span>
            <span className="hidden lg:inline">Pair Mobile</span>
          </Button>

          {/* Diagnostics Button */}
          <Button
            onClick={() => setIsDiagnosticsOpen(true)}
            title="System Diagnostics & Preflight (F9)"
            className="min-h-[48px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition font-bold text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <span className="material-symbols-outlined text-[15px] text-emerald-400">health_and_safety</span>
            <span className="hidden lg:inline">Diagnostics</span>
          </Button>

          {/* Active PIN Staff Session */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{pinUser}</span>
          </div>

          {/* Full-screen Kiosk Toggle */}
          <Button
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
            className="min-h-[48px] min-w-[48px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isKiosk ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </Button>
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
