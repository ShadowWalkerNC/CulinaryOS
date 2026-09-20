import React from 'react';
import { useDevice, type PreviewMode } from '../context/DeviceContext';
import { Laptop, Tablet, Smartphone, Sparkles } from '@culinaryos/ui';

export function DevicePreviewBar() {
  const { previewMode, effectiveDevice, setPreviewMode, viewportWidth } = useDevice();
  const [isDismissed, setIsDismissed] = React.useState(() => {
    return localStorage.getItem('culinaryos_hide_preview_bar') === 'true';
  });

  const toggleDismiss = () => {
    const next = !isDismissed;
    setIsDismissed(next);
    localStorage.setItem('culinaryos_hide_preview_bar', next ? 'true' : 'false');
  };

  const previewOptions: { id: PreviewMode; label: string; widthLabel: string; icon: React.ReactNode }[] = [
    {
      id: 'auto',
      label: 'Auto (Fluid)',
      widthLabel: `${viewportWidth}px`,
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
    },
    {
      id: 'desktop',
      label: 'Desktop',
      widthLabel: '1440px · Workstation',
      icon: <Laptop className="w-3.5 h-3.5" />,
    },
    {
      id: 'tablet',
      label: 'Tablet',
      widthLabel: '834px · iPad / Floor',
      icon: <Tablet className="w-3.5 h-3.5" />,
    },
    {
      id: 'mobile',
      label: 'Mobile',
      widthLabel: '390px · iPhone / Line',
      icon: <Smartphone className="w-3.5 h-3.5" />,
    },
  ];

  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={toggleDismiss}
        title="Open Viewport Testing Switcher"
        className="fixed bottom-20 right-4 z-40 bg-slate-950/90 hover:bg-slate-900 text-slate-300 hover:text-white px-3 py-1.5 rounded-full border border-slate-700 shadow-xl backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all"
      >
        <Sparkles className="w-3.5 h-3.5 text-orange-400" />
        <span>Test Devices ({effectiveDevice.toUpperCase()})</span>
      </button>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-200 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between text-xs z-50 sticky top-0 select-none shadow-md">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white uppercase tracking-wider">Viewport Engine</span>
        </span>
        <span className="text-slate-400 hidden sm:inline text-[11px]">
          Target: <strong className="text-slate-200 uppercase">{effectiveDevice}</strong> ({previewMode === 'auto' ? 'Dynamic Media Queries' : 'Simulated Viewport'})
        </span>
      </div>

      {/* Segmented Device Selector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          {previewOptions.map((opt) => {
            const isActive = previewMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPreviewMode(opt.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={`Switch viewport to ${opt.label} (${opt.widthLabel})`}
              >
                {opt.icon}
                <span>{opt.label}</span>
                <span className={`text-[10px] hidden md:inline opacity-75 ${isActive ? 'text-orange-100' : 'text-slate-500'}`}>
                  {opt.widthLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hide Bar Button */}
        <button
          type="button"
          onClick={toggleDismiss}
          title="Minimize Viewport Bar"
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 text-[11px] font-semibold"
        >
          Hide
        </button>
      </div>
    </div>
  );
}
