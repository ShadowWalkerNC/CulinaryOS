import React, { useState, useEffect, useCallback } from 'react';
import { pinLogin, Session } from '@culinaryos/auth';
import { getApiBase, getTenantId } from '@culinaryos/shared';
import { ShieldCheck, Lock, AlertCircle, RefreshCw } from '@culinaryos/ui';

interface AdminLoginViewProps {
  onSuccess: (session: Session) => void;
  requiredRoleNotice?: string | null;
}

export function AdminLoginView({ onSuccess, requiredRoleNotice }: AdminLoginViewProps) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(requiredRoleNotice ?? null);

  const tenantId = getTenantId();

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !busy) {
      setPin((prev) => (prev.length < 4 ? prev + num : prev));
      setError(null);
    }
  };

  const handleClear = () => {
    if (!busy) {
      setPin('');
      setError(null);
    }
  };

  const handleLogin = useCallback(
    async (inputPin?: string) => {
      const targetPin = inputPin || pin;
      if (targetPin.length < 4 || busy) return;

      setBusy(true);
      setError(null);

      try {
        const result = await pinLogin({
          pin: targetPin,
          tenantId,
          apiBase: getApiBase(),
        });

        if (!result.ok || !result.session) {
          setError(result.error ?? 'Invalid security PIN');
          setPin('');
          return;
        }

        // Verify role privilege: only owner or manager can access Admin
        const role = result.session.role;
        if (role !== 'owner' && role !== 'manager') {
          setError(`Role "${role}" does not have manager authorization to access the Admin console.`);
          setPin('');
          return;
        }

        onSuccess(result.session);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setPin('');
      } finally {
        setBusy(false);
      }
    },
    [pin, busy, tenantId, onSuccess]
  );

  // Auto-submit when 4 digits are keyed in
  useEffect(() => {
    if (pin.length === 4) {
      void handleLogin(pin);
    }
  }, [pin, handleLogin]);

  // Physical keyboard support
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4 && !busy) {
          setPin((prev) => (prev.length < 4 ? prev + e.key : prev));
          setError(null);
        }
      } else if (e.key === 'Backspace') {
        if (!busy) setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length >= 4 && !busy) void handleLogin(pin);
      } else if (e.key === 'Escape') {
        if (!busy) setPin('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, busy, handleLogin]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100 antialiased select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-radial-[at_top_right] from-orange-500/10 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center space-y-6">
        {/* Shield Header */}
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="text-center space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-orange-400">
            CulinaryOS Security Gate
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Manager & Owner Access</h1>
          <p className="text-xs text-slate-400 font-medium">
            Enter your 4-digit manager or owner PIN to unlock the back-office console.
          </p>
        </div>

        {/* PIN Dots (Apple HIG style feedback) */}
        <div className="flex justify-center gap-4 py-2" role="status" aria-label={`Entered ${pin.length} digits`}>
          {[0, 1, 2, 3].map((idx) => {
            const filled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  filled
                    ? 'bg-orange-500 border-orange-400 scale-110 shadow-sm shadow-orange-500/50'
                    : 'border-slate-700 bg-slate-800/80'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Alert notice */}
        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5 text-left text-xs font-semibold text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Busy Indicator */}
        {busy && (
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Verifying manager credentials…</span>
          </div>
        )}

        {/* Numeric Keypad: strict Apple HIG 48px touch targets */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={busy}
              onClick={() => handleKeyPress(digit)}
              className="min-h-[56px] rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-700 active:scale-[0.96] text-xl font-bold text-white border border-slate-700/60 transition-all duration-75 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={busy || pin.length === 0}
            onClick={handleClear}
            className="min-h-[56px] rounded-2xl bg-slate-800/40 hover:bg-red-500/20 active:bg-red-500/30 active:scale-[0.96] text-xs font-bold uppercase tracking-wider text-red-400 border border-slate-700/40 transition-all duration-75 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleKeyPress('0')}
            className="min-h-[56px] rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-700 active:scale-[0.96] text-xl font-bold text-white border border-slate-700/60 transition-all duration-75 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            0
          </button>
          <button
            type="button"
            disabled={busy || pin.length < 4}
            onClick={() => void handleLogin()}
            className="min-h-[56px] rounded-2xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 active:scale-[0.96] text-xs font-black uppercase tracking-wider text-white border border-orange-500 transition-all duration-75 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 shadow-md shadow-orange-600/30"
          >
            Unlock
          </button>
        </div>

        {/* Security telemetry notice */}
        <div className="pt-2 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Tenant Isolated & RBAC Protected</span>
        </div>
      </div>
    </div>
  );
}
