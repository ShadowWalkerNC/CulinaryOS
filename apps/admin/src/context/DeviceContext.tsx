import React, { createContext, useContext, useEffect, useState } from 'react';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';
export type PreviewMode = 'auto' | 'desktop' | 'tablet' | 'mobile';

interface DeviceContextValue {
  actualDevice: DeviceMode;
  previewMode: PreviewMode;
  effectiveDevice: DeviceMode;
  setPreviewMode: (mode: PreviewMode) => void;
  viewportWidth: number;
}

const DeviceContext = createContext<DeviceContextValue | undefined>(undefined);

function getDeviceFromWidth(width: number): DeviceMode {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>('auto');

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const actualDevice = getDeviceFromWidth(viewportWidth);
  const effectiveDevice = previewMode === 'auto' ? actualDevice : previewMode;

  return (
    <DeviceContext.Provider
      value={{
        actualDevice,
        previewMode,
        effectiveDevice,
        setPreviewMode,
        viewportWidth,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}
