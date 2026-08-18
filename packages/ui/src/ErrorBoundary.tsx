import React, { useState, useEffect } from 'react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

export function ErrorBoundary({ children, fallbackTitle, onReset }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    function errorHandler(event: ErrorEvent) {
      console.error('[ErrorBoundary caught error event]:', event.error);
      setError(event.error || new Error(event.message));
      setHasError(true);
    }
    function rejectionHandler(event: PromiseRejectionEvent) {
      console.error('[ErrorBoundary caught unhandled rejection]:', event.reason);
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
      setHasError(true);
    }

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  function handleReset() {
    setHasError(false);
    setError(null);
    if (onReset) {
      onReset();
    } else {
      window.location.reload();
    }
  }

  if (hasError) {
    return (
      <div className="min-h-screen w-full bg-[#f8f9fa] flex items-center justify-center p-6 text-[#1f2937] font-sans">
        <div className="max-w-md w-full bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black text-xl shrink-0">
              !
            </div>
            <div>
              <h2 className="text-base font-black text-[#0f172a] uppercase tracking-wide">
                {fallbackTitle ?? 'Terminal Recovery Mode'}
              </h2>
              <p className="text-xs text-[#6b7280]">
                An unexpected UI error occurred. Service state was preserved.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-[#f3f4f6] rounded-xl p-3 text-[11px] font-mono text-red-700 overflow-x-auto border border-[#e5e7eb]">
              {error.toString()}
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-black py-2.5 rounded-xl uppercase tracking-wider transition-colors shadow-sm"
            >
              Reload & Recover
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('culinaryos_pos_store');
                } catch {}
                window.location.href = '/';
              }}
              className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#4b5563] text-xs font-bold px-3 py-2.5 rounded-xl uppercase transition-colors"
            >
              Reset Cache
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
