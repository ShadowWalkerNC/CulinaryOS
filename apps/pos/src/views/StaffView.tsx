import { useState, useEffect, useCallback } from 'react';
import { usePOSStore } from '../lib/store';

const EMPLOYEES = [
  { pin: '1234', name: 'John Doe', role: 'Server' },
  { pin: '5678', name: 'Jane Smith', role: 'Manager' },
];

export function StaffView() {
  const [pin, setPin] = useState('');
  const setEmployee = usePOSStore((s) => s.setEmployee);

  function handleKeyPress(num: string) {
    if (pin.length < 4) {
      setPin((prev) => (prev.length < 4 ? prev + num : prev));
    }
  }

  function handleClear() {
    setPin('');
  }

  const handleLogin = useCallback((inputPin?: string) => {
    const targetPin = inputPin || pin;
    const emp = EMPLOYEES.find((e) => e.pin === targetPin);
    if (emp) {
      setEmployee({
        name: emp.name,
        role: emp.role,
        clockedInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      alert('Invalid PIN code. Try 1234 (Server) or 5678 (Manager).');
      setPin('');
    }
  }, [pin, setEmployee]);

  // Physical keyboard listener for fast touch/keypad entry
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          const nextPin = pin + e.key;
          setPin(nextPin);
        }
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length === 4) {
          handleLogin(pin);
        }
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
          <span className="font-black text-sm tracking-tight text-[#ff5f1f] uppercase block">CulinaryOS POS Terminal</span>
          <h2 className="text-xl font-black text-[#1f2937] mt-1.5">Enter Employee PIN</h2>
          <p className="text-[10px] text-[#6b7280] mt-1 font-bold">Try PIN: 1234 (Server) or 5678 (Manager)</p>
        </div>

        {/* PIN display */}
        <div className="flex justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pin.length > idx ? 'bg-[#ff5f1f] border-[#ff5f1f] scale-110' : 'border-[#cbd5e1]'
              }`}
            />
          ))}
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="bg-[#f9fafb] border border-[#e5e7eb] hover:bg-[#f3f4f6] text-[#1f2937] text-lg font-bold py-3.5 rounded-xl transition-colors active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="bg-[#f9fafb] border border-[#e5e7eb] hover:bg-[#f3f4f6] text-red-500 text-xs font-black rounded-xl uppercase transition-colors active:scale-95"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="bg-[#f9fafb] border border-[#e5e7eb] hover:bg-[#f3f4f6] text-[#1f2937] text-lg font-bold py-3.5 rounded-xl transition-colors active:scale-95"
          >
            0
          </button>
          <button
            onClick={() => handleLogin()}
            disabled={pin.length < 4}
            className="bg-[#ff5f1f] hover:bg-[#e04f1a] disabled:opacity-40 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-colors shadow-sm active:scale-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
export default StaffView;
