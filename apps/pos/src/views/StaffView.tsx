import { useState, useEffect, useCallback } from 'react';
import { pinLogin } from '@culinaryos/auth';
import { getApiBase } from '@culinaryos/shared';
import { usePOSStore } from '../lib/store';
import { UserCheck, ShieldCheck, Lock } from '@culinaryos/ui';

export function StaffView() {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setEmployee = usePOSStore((s) => s.setEmployee);
  const tenantId = usePOSStore((s) => s.tenantId);

  function handleKeyPress(num: string) {
    if (pin.length < 4) {
      setPin((prev) => (prev.length < 4 ? prev + num : prev));
      setError(null);
    }
  }

  function handleClear() {
    setPin('');
    setError(null);
  }

  const handleLogin = useCallback(async (inputPin?: string) => {
    const targetPin = inputPin || pin;
    if (targetPin.length < 4 || busy) return;
    setBusy(true);
    setError(null);
    const result = await pinLogin({
      pin: targetPin,
      tenantId,
      apiBase: getApiBase(),
    });
    setBusy(false);
    if (!result.ok || !result.session) {
      setError(result.error ?? 'Invalid PIN');
      setPin('');
      return;
    }
    setEmployee({
      name: result.session.displayName ?? 'Staff',
      role: result.session.role,
      userId: result.session.userId,
      accessToken: result.session.accessToken,
      clockedInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }, [pin, busy, tenantId, setEmployee]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      void handleLogin(pin);
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          setPin((prev) => prev + e.key);
          setError(null);
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) void handleLogin(pin);
      } else if (e.key === 'Escape') {
        setPin('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, handleLogin]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#f8f9fa] animate-fadeIn p-6">
      <div className="bg-white border-2 border-[#e5e7eb] rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
        <div>
          <span className="font-black text-xs tracking-wider text-[#0f172a] uppercase block">
            CulinaryOS POS Terminal
          </span>
          <h2 className="text-2xl font-black text-[#1f2937] mt-1">Enter Employee PIN</h2>
          <p className="text-xs text-[#6b7280] mt-1 font-bold">
            Enter your 4-digit security PIN to unlock the station.
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                pin.length > idx ? 'bg-[#0f172a] border-[#0f172a] scale-110 shadow-sm' : 'border-[#cbd5e1] bg-gray-50'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-xs font-bold text-red-600 animate-pulse">{error}</p>}
        {busy && <p className="text-xs font-bold text-slate-700">Verifying credentials…</p>}

        {/* Fast Helper Demo Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleLogin('1234')}
            className="flex-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <UserCheck className="w-4 h-4 text-blue-700" />
            <span>Server (1234)</span>
          </button>
          <button
            type="button"
            onClick={() => void handleLogin('5678')}
            className="flex-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            <span>Manager (5678)</span>
          </button>
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={busy}
              onClick={() => handleKeyPress(num)}
              className="bg-[#f9fafb] border-2 border-[#e5e7eb] hover:border-[#0f172a] hover:bg-white text-[#1f2937] text-2xl font-black h-16 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-xs flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            className="bg-[#f9fafb] border-2 border-[#e5e7eb] hover:border-red-400 hover:bg-red-50 text-red-600 text-xs font-black h-16 rounded-2xl uppercase transition-all active:scale-95 shadow-xs flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleKeyPress('0')}
            className="bg-[#f9fafb] border-2 border-[#e5e7eb] hover:border-[#0f172a] hover:bg-white text-[#1f2937] text-2xl font-black h-16 rounded-2xl transition-all active:scale-95 shadow-xs flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            disabled={busy || pin.length < 4}
            onClick={() => void handleLogin()}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-black h-16 rounded-2xl uppercase transition-all active:scale-95 disabled:opacity-40 shadow-md flex items-center justify-center"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
