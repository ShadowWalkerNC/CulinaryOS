import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDevice } from '../../context/DeviceContext';
import { useAuth } from '../../context/AuthContext';
import { DesktopSidebar } from './DesktopSidebar';
import { TabletHeaderNav } from './TabletHeaderNav';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileQuickActionsSheet } from './MobileQuickActionsSheet';
import { CulinaryAppLauncher, Bell, Sparkles, LogOut, Search } from '@culinaryos/ui';

interface ResponsiveShellProps {
  children: React.ReactNode;
  onOpenOnboarding?: () => void;
}

export function ResponsiveShell({ children, onOpenOnboarding }: ResponsiveShellProps) {
  const { effectiveDevice, previewMode } = useDevice();
  const { session, logout } = useAuth();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const location = useLocation();

  // Desktop Shell Layout
  if (effectiveDevice === 'desktop') {
    return (
      <div className="flex h-screen bg-[#f8f9fa] text-slate-900 overflow-hidden font-sans antialiased select-none">
        <DesktopSidebar />

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Desktop Top Administrative Header */}
          {/* Desktop Top Administrative Header (PRD 1440px+ Workstation Layout) */}
          <header className="bg-[#181c24] border-b border-slate-800 px-6 h-16 flex items-center justify-between shrink-0 shadow-[0_1px_8px_rgba(0,0,0,0.3)] z-20">
            {/* Left: Location & Unit Switcher */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#262a33] border border-slate-700/60 text-left">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    Location
                  </span>
                  <span className="text-xs font-bold text-slate-100 mt-0.5">
                    The Golden Fork — Unit #01 Downtown
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400">Online</span>
                </div>
              </div>
            </div>

            {/* Center: Command Bar Quick Jump (⌘K) */}
            <div className="flex-1 max-w-md mx-6">
              <div className="relative flex items-center w-full">
                <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search apps, recipes, shifts..."
                  className="w-full h-9 pl-9 pr-14 rounded-lg bg-[#0a0e16] border border-slate-800 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-amber-500/80 transition-colors"
                />
                <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-[#1c2028] border border-slate-700 text-slate-400 text-[10px] font-mono font-bold">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Right: Station Mode, Apps Launcher & User Profile */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#262a33] border border-slate-700/60 text-left">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    Station Mode
                  </span>
                  <span className="text-xs font-semibold text-slate-200 mt-0.5">
                    Shift: Lunch Service
                  </span>
                </div>
              </div>

              <CulinaryAppLauncher activeApp="admin" tone="dark" />

              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-100 leading-tight">
                    {session?.displayName || 'Chef Gabriel M.'}
                  </span>
                  <span className="text-[10px] font-semibold text-amber-400 leading-none mt-0.5">
                    {session?.role === 'owner' ? 'Owner / Operator' : 'Executive Chef & GM'}
                  </span>
                </div>
                <div
                  className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center ring-2 ring-amber-400/50 shadow-sm"
                  title={`Signed in as ${session?.displayName || 'Manager'}`}
                >
                  {session?.role === 'owner' ? 'OW' : 'GM'}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700/60 hover:border-red-500/30 transition-all active:scale-[0.96] cursor-pointer"
                title="Sign out of Admin console"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Subheader Breadcrumb & Operational Nav Ribbon */}
          <div className="bg-[#0f131c] border-b border-slate-800/80 px-6 h-12 flex items-center justify-between shrink-0 z-10 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
                Admin Workspace
              </span>
              <span className="text-slate-600">/</span>
              <span className="font-bold text-slate-200 capitalize">
                {location.pathname.replace('/', '') || 'Dashboard'}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenOnboarding}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Setup Assistant</span>
            </button>
          </div>

          {/* Desktop Main Content Canvas */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#0f131c]">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  // Tablet Shell Layout
  if (effectiveDevice === 'tablet') {
    const isSimulated = previewMode === 'tablet';

    const content = (
      <div className="min-h-screen bg-[#f8f9fa] text-slate-900 flex flex-col font-sans antialiased select-none">
        <TabletHeaderNav />
        <main className="flex-1 p-5 md:p-6 max-w-5xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    );

    if (isSimulated) {
      return (
        <div className="min-h-[calc(100vh-38px)] bg-slate-900/40 p-4 md:p-8 flex justify-center items-start overflow-y-auto">
          <div className="w-full max-w-[834px] bg-[#f8f9fa] rounded-3xl shadow-2xl border-4 border-slate-800 overflow-hidden ring-1 ring-slate-700/50 min-h-[900px]">
            {content}
          </div>
        </div>
      );
    }

    return content;
  }

  // Mobile Shell Layout (Thumb-Zone & Jakob's Law)
  const isSimulated = previewMode === 'mobile';

  const mobileContent = (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 flex flex-col font-sans antialiased select-none relative pb-24">
      {/* Mobile Top App Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black shadow-xs">
            <span className="text-xs font-black">OS</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-slate-950">The Golden Fork</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Floor & Shift Pulse</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuickActionsOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold flex items-center gap-1 active:scale-[0.97]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>86 / Ops</span>
          </button>
          <div className="relative">
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-[0.97]"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center active:scale-[0.97] transition-all"
            title="Sign out of Admin console"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Mobile Screen Area */}
      <main className="flex-1 p-3.5 space-y-4 max-w-md mx-auto w-full">
        {children}
      </main>

      {/* Fixed Thumb-Zone Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenQuickActions={() => setQuickActionsOpen(true)}
        pendingApprovalsCount={3}
      />

      {/* Mobile Quick Action Sheet */}
      <MobileQuickActionsSheet
        isOpen={quickActionsOpen}
        onClose={() => setQuickActionsOpen(false)}
      />
    </div>
  );

  if (isSimulated) {
    return (
      <div className="min-h-[calc(100vh-38px)] bg-slate-900/40 p-4 md:p-8 flex justify-center items-start overflow-y-auto">
        <div className="w-full max-w-[390px] bg-[#f8f9fa] rounded-[42px] shadow-2xl border-[6px] border-slate-800 overflow-hidden ring-1 ring-slate-700/50 min-h-[780px]">
          {mobileContent}
        </div>
      </div>
    );
  }

  return mobileContent;
}
