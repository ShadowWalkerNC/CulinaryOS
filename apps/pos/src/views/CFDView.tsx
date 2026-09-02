import { useState, useEffect } from 'react';
import { useOrderStore } from '../lib/useOrderStore';
import { usePOSStore } from '../lib/store';

export function CFDView() {
  const { activeOrderId } = usePOSStore();
  const { orders } = useOrderStore();
  const [selectedTip, setSelectedTip] = useState<number | null>(18);
  const [customTipDollars, setCustomTipDollars] = useState<string>('');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Active check
  const activeOrder = activeOrderId ? orders[activeOrderId] : null;
  const items = activeOrder?.items ?? [];

  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const taxCents = Math.round(subtotalCents * 0.0825);

  const tipCents = selectedTip !== null
    ? Math.round(subtotalCents * (selectedTip / 100))
    : customTipDollars ? Math.round(parseFloat(customTipDollars) * 100) : 0;

  const totalCents = subtotalCents + taxCents + tipCents;

  // Listen for simulated cross-window postMessage from primary register
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'CFD_PAYMENT_SUCCESS') {
        setShowPaymentSuccess(true);
        setTimeout(() => setShowPaymentSuccess(false), 4000);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="h-screen w-screen bg-[#09090b] text-white font-sans flex flex-col select-none overflow-hidden">
      {/* Top Header */}
      <header className="h-16 px-8 bg-[#121215] border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#E63946] flex items-center justify-center font-black text-white shadow-lg shadow-orange-500/20">
            🍽️
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase">CulinaryOS Guest Display</h1>
            <p className="text-[11px] text-zinc-400 font-medium">Table / Countertop Register</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Synchronized with Register</span>
        </div>
      </header>

      {/* Main Grid: Left Itemized Receipt, Right Tap/Tip Screen */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Column: Line Items */}
        <div className="col-span-7 p-8 border-r border-white/10 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Order Summary</span>
            <span className="text-xs font-bold text-zinc-400">{items.length} item{items.length === 1 ? '' : 's'}</span>
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <span className="text-5xl mb-3">🛒</span>
              <h2 className="text-lg font-bold text-zinc-300">Welcome to Our Dining Room</h2>
              <p className="text-sm mt-1 max-w-sm">Items will appear on this screen as your order is entered by our staff.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {items.map((it, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 font-bold text-xs flex items-center justify-center">
                      {it.quantity}×
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{it.name}</h4>
                      {it.modifiers && it.modifiers.length > 0 && (
                        <p className="text-xs text-zinc-400 mt-0.5">{it.modifiers.join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-black text-zinc-200">
                    ${((it.priceCents * it.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Subtotals Footer */}
          <div className="border-t border-white/10 pt-4 mt-auto space-y-1.5 text-xs text-zinc-400 font-medium">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-zinc-200 font-bold">${(subtotalCents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sales Tax (8.25%)</span>
              <span className="text-zinc-200 font-bold">${(taxCents / 100).toFixed(2)}</span>
            </div>
            {tipCents > 0 && (
              <div className="flex justify-between text-orange-400 font-bold">
                <span>Gratuity</span>
                <span>${(tipCents / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/5">
              <span>Total Due</span>
              <span className="text-orange-400">${(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Tip & Tap Pay Prompt */}
        <div className="col-span-5 p-8 bg-[#0c0c0e] flex flex-col justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-400">Select Gratuity</span>
            <p className="text-xs text-zinc-400 mt-1">Thank you for supporting our culinary and service team!</p>

            <div className="grid grid-cols-4 gap-2.5 mt-5">
              {[15, 18, 20, 25].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    setSelectedTip(pct);
                    setCustomTipDollars('');
                  }}
                  className={`p-3.5 rounded-xl border text-center transition-all ${
                    selectedTip === pct
                      ? 'bg-gradient-to-tr from-[#FF6B35] to-[#E63946] text-white border-orange-500 shadow-lg shadow-orange-500/25 font-black scale-105'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10 font-bold'
                  }`}
                >
                  <div className="text-base">{pct}%</div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    ${((subtotalCents * (pct / 100)) / 100).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setSelectedTip(0);
                  setCustomTipDollars('');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  selectedTip === 0
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-transparent text-zinc-500 border-white/5 hover:text-zinc-300'
                }`}
              >
                No Tip
              </button>
              <button
                onClick={() => {
                  setSelectedTip(null);
                  setCustomTipDollars('5.00');
                }}
                className="flex-1 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10"
              >
                Custom Tip
              </button>
            </div>
          </div>

          {/* Payment Card Reader Prompt */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-2xl animate-bounce">
              💳
            </div>
            <div>
              <h3 className="text-base font-black text-white">Tap, Insert, or Swipe</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Contactless Apple Pay, Google Pay, and Chip Cards</p>
            </div>
            <div className="text-xs font-bold text-emerald-400 pt-1">
              Stripe Terminal Ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
