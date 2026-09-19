import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDevice } from '../../context/DeviceContext';
import { DesktopSidebar } from './DesktopSidebar';
import { TabletHeaderNav } from './TabletHeaderNav';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileQuickActionsSheet } from './MobileQuickActionsSheet';
import { CulinaryAppLauncher, Bell, Sparkles } from '@culinaryos/ui';

interface ResponsiveShellProps {
  children: React.ReactNode;
  onOpenOnboarding?: () => void;
}

export function ResponsiveShell({ children, onOpenOnboarding }: ResponsiveShellProps) {
  const { effectiveDevice, previewMode } = useDevice();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const location = useLocation();

  // Desktop Shell Layout
  if (effectiveDevice === 'desktop') {
    return (
      <div className="flex h-screen bg-[#f8f9fa] text-slate-900 overflow-hidden font-sans antialiased select-none">
        <DesktopSidebar />

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Desktop Top Administrative Header */}
          <header className="bg-white border-b border-slate-200 px-6 h-14 flex items-center justify-between shrink-0 shadow-2xs z-20">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Admin Workspace
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-extrabold text-slate-900 capitalize">
                {location.pathname.replace('/', '') || 'Dashboard'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenOnboarding}
                className="px-3 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-[0.97]"
                title="Open guided first-run setup wizard"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>Setup Assistant</span>
              </button>

              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-xs font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Downtown Location (Store #01)</span>
              </div>

              <CulinaryAppLauncher activeApp="admin" />

              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-200">
                GM
              </div>
            </div>
          </header>

          {/* Desktop Main Content Canvas */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#f8f9fa]">
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
            >
              <Bell className="w-4 h-4" />
            </button>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
          </div>
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
