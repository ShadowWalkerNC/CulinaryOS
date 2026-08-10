import { useState, useEffect, useCallback } from 'react';
import { pinLogin } from '@culinaryos/auth';
import { getApiBase } from '@culinaryos/shared';
import { usePOSStore } from '../lib/store';

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
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 max-w-sm w-full shadow-lg text-center space-y-6">
        <div>
          <span className="font-black text-sm tracking-tight text-[#0f172a] uppercase block">CulinaryOS POS Terminal</span>
          <h2 className="text-xl font-black text-[#1f2937] mt-1.5">Enter Employee PIN</h2>
          <p className="text-[10px] text-[#6b7280] mt-1 font-bold">
            Demo PINs: 1234 (server) · 5678 (manager). Live tenants use staff_pins + Supabase Auth.
          </p>
        </div>

        <div className="flex justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pin.length > idx ? 'bg-[#0f172a] border-[#0f172a] scale-110' : 'border-[#cbd5e1]'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-bold text-red-600">{error}</p>
        )}
        {busy && (
          <p className="text-xs font-bold text-[#6b7280]">Signing in…</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={busy}
              onClick={() => handleKeyPress(num)}
              className="bg-[#f9fafb] border border-[#e5e7eb] hover:bg-[#f3f4f6] text-[#1f2937] text-lg font-bold py-3.5 rounded-xl transition-colors active:scale-95 disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            className="bg-[#f9fafb] border border-[#e5e7eb] hover:bg-[#f3f4f6] text-red-500 text-xs font-black rounded-xl uppercase transition-colors active:scale-95"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleKeyPress('0')}
            className="bg-[#f9fafb] border border-[#e5e7eb] hover:bg-[#f3f4f6] text-[#1f2937] text-lg font-bold py-3.5 rounded-xl transition-colors active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            disabled={busy || pin.length < 4}
            onClick={() => void handleLogin()}
            className="bg-[#0f172a] text-white text-xs font-black rounded-xl uppercase transition-colors active:scale-95 disabled:opacity-40"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
}
