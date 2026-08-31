import React, { useState } from 'react';
import {
  Tablet,
  Tv,
  Laptop,
  ChefHat,
  ShoppingBag,
  TrendingUp,
  X,
  ExternalLink,
  Grid,
} from 'lucide-react';

export interface CulinaryHeaderProps {
  activeModule: 'pos' | 'kds' | 'web' | 'admin' | 'kitchenkit' | 'ops' | 'recipeos';
  tenantName?: string;
  serverStatus?: 'connected' | 'offline';
}

export const CulinaryHeader: React.FC<CulinaryHeaderProps> = ({
  activeModule,
  tenantName = 'The Golden Fork',
  serverStatus = 'connected',
}) => {
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);

  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : 'localhost';
  const protocol = isBrowser ? window.location.protocol : 'http:';
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname.endsWith('.local');

  const modules = [
    { id: 'pos', label: 'POS Terminal', port: '5172', path: '/pos', desc: 'Point of sale, 2D/3D floor map & checkout', icon: Tablet },
    { id: 'kds', label: 'KDS Kitchen', port: '5173', path: '/kds', desc: 'Kitchen tickets, station filters & aging timers', icon: Tv },
    { id: 'admin', label: 'Back-Office Admin', port: '5174', path: '/admin', desc: 'Menu editor, staff PINs, auto-PO & settings', icon: Laptop },
    { id: 'kitchenkit', label: 'KitchenKit', port: '5175', path: '/kitchenkit', desc: 'Shift prep lists, recipe ratios & shelf life', icon: ChefHat },
    { id: 'web', label: 'Guest Storefront', port: '5176', path: '/menu/demo', desc: 'Online customer ordering & live order tracker', icon: ShoppingBag },
    { id: 'ops', label: 'CulinaryOps', port: '5177', path: '/ops', desc: 'Theoretical vs actual food cost & waste ledger', icon: TrendingUp },
  ] as const;

  const currentModule = modules.find((m) => m.id === activeModule) || modules[0];

  const getModuleUrl = (m: typeof modules[number]) => {
    if (isLocal) {
      return `${protocol}//${hostname}:${m.port}${m.path === '/menu/demo' && m.id === 'web' ? '/menu/demo' : ''}`;
    }
    if (m.id === 'web') return '/menu/demo';
    return `#${m.id}`;
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-13 flex items-center justify-between shadow-xs shrink-0 select-none gap-3">
      {/* Left: Brand Identity & Current Context */}
      <div className="flex items-center gap-3 min-w-0">
        <a
          href={isLocal ? `${protocol}//${hostname}:5176/` : '/'}
          className="flex items-center gap-2.5 group cursor-pointer shrink-0"
          title="CulinaryOS Platform Home"
        >
          <div className="w-7 h-7 bg-[#0f172a] text-white rounded-lg flex items-center justify-center shadow-xs group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shrink-0">
            <span className="material-symbols-outlined filled text-[16px]">skillet</span>
          </div>
          <span className="font-black text-xs text-slate-950 uppercase tracking-wider group-hover:text-amber-600 transition-colors hidden sm:inline">
            CulinaryOS
          </span>
        </a>

        <div className="h-4 w-px bg-slate-200 shrink-0" />

        {/* Current Active Module Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-900 truncate">
            {currentModule.label}
          </span>
          <span className="text-[11px] text-slate-400 font-medium hidden md:inline truncate">
            · {tenantName}
          </span>
        </div>
      </div>

      {/* Right: App Switcher Launcher & Connection Indicator */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* App Switcher Button */}
        <button
          type="button"
          onClick={() => setShowAppSwitcher(!showAppSwitcher)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
            showAppSwitcher
              ? 'bg-[#0f172a] text-white border-[#0f172a]'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title="Switch CulinaryOS Applications"
        >
          <Grid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Apps</span>
        </button>

        {/* Connection Status Dot */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-600">
          <span
            className={`w-2 h-2 rounded-full ${
              serverStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="hidden sm:inline">{serverStatus === 'connected' ? 'Connected' : 'Offline'}</span>
        </div>
      </div>

      {/* App Switcher Modal / Dropdown */}
      {showAppSwitcher && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowAppSwitcher(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-900 animate-slideIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0f172a] text-white flex items-center justify-center">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    CulinaryOS Applications
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Switch between restaurant surfaces</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAppSwitcher(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Application Links Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {modules.map((m) => {
                const Icon = m.icon;
                const isActive = activeModule === m.id;
                const url = getModuleUrl(m);

                return (
                  <a
                    key={m.id}
                    href={url}
                    onClick={() => setShowAppSwitcher(false)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-xs'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-950'}`}>
                          {m.label}
                        </p>
                        {isActive && (
                          <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] line-clamp-1 mt-0.5 ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                        {m.desc}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <a
                href={isLocal ? `${protocol}//${hostname}:5176/` : '/'}
                className="font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1"
              >
                <span>Platform Home</span>
              </a>
              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <span>GitHub Monorepo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
