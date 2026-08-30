import React, { useState } from 'react';

export interface CulinaryHeaderProps {
  activeModule: 'pos' | 'kds' | 'web' | 'admin' | 'kitchenkit' | 'ops' | 'recipeos';
  tenantName?: string;
  serverStatus?: 'connected' | 'offline';
}

export const CulinaryHeader: React.FC<CulinaryHeaderProps> = ({
  activeModule,
  tenantName = 'Main Bistro',
  serverStatus = 'connected'
}) => {
  const [showSaaSHelp, setShowSaaSHelp] = useState(false);

  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : 'localhost';
  const protocol = isBrowser ? window.location.protocol : 'http:';
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\./.test(hostname) || /^10\./.test(hostname);

  const modules = [
    { id: 'web', label: 'Storefront', port: '5176', path: '/menu/demo', desc: 'Customer ordering' },
    { id: 'pos', label: 'POS Terminal', port: '5172', path: '/pos', desc: 'Order & 3D Floor Map' },
    { id: 'kds', label: 'KDS Kitchen', port: '5173', path: '/kds', desc: 'Kitchen tickets & aging' },
    { id: 'admin', label: 'Back Office', port: '5174', path: '/admin', desc: 'Menu, staff & settings' },
    { id: 'kitchenkit', label: 'KitchenKit', port: '5175', path: '/kitchenkit', desc: 'Prep & recipe planner' },
    { id: 'ops', label: 'CulinaryOps', port: '5177', path: '/ops', desc: 'Food cost & waste' },
    { id: 'recipeos', label: 'RecipeOS', port: '5178', path: '/recipeos', desc: 'Recipe vault & scale' },
  ] as const;

  const getModuleUrl = (m: typeof modules[number]) => {
    if (isLocal) {
      return `${protocol}//${hostname}:${m.port}${m.path === '/menu/demo' && m.id === 'web' ? '/menu/demo' : ''}`;
    }
    // In SaaS / Cloud deployment
    if (m.id === 'web') return '/menu/demo';
    return `#${m.id}`;
  };

  return (
    <header className="bg-white border-b border-[#e5e7eb] px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between shadow-xs shrink-0 select-none gap-2">
      {/* Brand Logo & Wordmark (Links to Marketing / Landing Hub) */}
      <a
        href={isLocal ? `${protocol}//${hostname}:5176/` : '/'}
        className="flex items-center gap-2 sm:gap-3 group cursor-pointer shrink-0"
        title="CulinaryOS Platform Home"
      >
        <div className="w-7 h-7 sm:w-8 h-8 bg-[#0f172a] text-white rounded-lg flex items-center justify-center shadow-sm group-hover:bg-amber-500 group-hover:text-black transition-colors shrink-0">
          <span className="material-symbols-outlined filled text-[16px] sm:text-[18px]">skillet</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-black text-xs sm:text-sm text-[#0b1c30] uppercase tracking-wider group-hover:text-amber-600 transition-colors">
              CulinaryOS
            </h1>
            <span className="bg-[#0f172a0d] text-[#0f172a] text-[8px] sm:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full border border-[#0f172a26]">
              {isLocal ? 'LAN' : 'Cloud'}
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-[#6b7280] font-medium hidden xs:block">{tenantName}</p>
        </div>
      </a>

      {/* Cross-Application Module Navigation Tabs (Desktop & Tablet Horizontal Scroller) */}
      <nav className="hidden md:flex items-center gap-1.5 bg-[#f8f9fa] border border-[#e5e7eb] p-1 rounded-xl overflow-x-auto max-w-full">
        {modules.map((m) => {
          const isActive = activeModule === m.id;
          const url = getModuleUrl(m);

          return (
            <a
              key={m.id}
              href={url}
              onClick={(e) => {
                if (!isLocal && m.id !== 'web') {
                  e.preventDefault();
                  setShowSaaSHelp(true);
                }
              }}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-white text-[#0f172a] shadow-xs border border-[#e5e7eb]'
                  : 'text-[#6b7280] hover:text-[#0b1c30] hover:bg-[#e5e7eb50]'
              }`}
            >
              <span>{m.label}</span>
              <span className={`text-[8px] px-1 py-0.5 rounded font-mono ${isActive ? 'bg-[#0f172a0d] text-[#0f172a]' : 'bg-[#e5e7eb] text-[#6b7280]'}`}>
                {isLocal ? `:${m.port}` : 'App'}
              </span>
            </a>
          );
        })}
      </nav>

      {/* Mobile Apps Button & System Status */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={() => setShowSaaSHelp(true)}
          className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#f8f9fa] border border-[#e5e7eb] text-[10px] font-black uppercase text-[#0f172a]"
        >
          <span className="material-symbols-outlined text-[14px]">apps</span>
          <span>Apps</span>
        </button>

        <a
          href={isLocal ? `${protocol}//${hostname}:5176/` : '/'}
          className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#6b7280] hover:text-[#0f172a] transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">home</span>
          <span>Hub</span>
        </a>
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#f8f9fa] border border-[#e5e7eb] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] text-[#6b7280]">
          <span className={`w-2 h-2 rounded-full ${serverStatus === 'connected' ? 'bg-[#22c55e] animate-pulse' : 'bg-red-500'}`} />
          <span className="font-semibold">{isLocal ? 'LAN Active' : 'Cloud Online'}</span>
        </div>
      </div>

      {/* Cloud / SaaS Module Launcher Modal */}
      {showSaaSHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 text-[#1f2937]">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#0f172a]">apps</span>
                <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">
                  CulinaryOS Modular Applications
                </h3>
              </div>
              <button
                onClick={() => setShowSaaSHelp(false)}
                className="text-[#9ca3af] hover:text-[#0f172a]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#4b5563] leading-relaxed">
              In this cloud demo environment, each module is an independent Vite/React service. When running locally via <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">pnpm dev</code>, they run on dedicated ports on your LAN:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {modules.map((m) => (
                <div key={m.id} className="p-2.5 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#0f172a] font-bold">{m.label}</strong>
                    <span className="font-mono text-[9px] bg-white px-1.5 py-0.5 rounded border border-[#e5e7eb]">:{m.port}</span>
                  </div>
                  <p className="text-[10px] text-[#6b7280]">{m.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#e5e7eb] flex items-center justify-between">
              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <span>View Full Setup Guide on GitHub</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
              <button
                onClick={() => setShowSaaSHelp(false)}
                className="px-4 py-2 bg-[#0f172a] text-white font-black text-xs uppercase tracking-wider rounded-xl"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
