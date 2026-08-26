import { useState } from 'react';
import { useOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { apiHeaders, getApiBase, enqueueOfflineDelta, flushOfflineQueue } from '@culinaryos/shared';
import { CheckoutDrawer } from '../components/CheckoutDrawer';

const METHODS = ['card', 'tap', 'scan', 'cash', 'comp'] as const;

export function CheckoutView() {
  const { activeOrderId, setActiveOrder, setView } = usePOSStore();
  const { data: order } = useOrder(activeOrderId);
  const [method, setMethod] = useState<string>('card');
  const [tipPercent, setTipPercent] = useState<number | 'custom'>(0);
  const [customTip, setCustomTip] = useState('0');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);
  const [receiptChoice, setReceiptChoice] = useState<'none' | 'email' | 'text' | null>(null);
  const [contactInput, setContactInput] = useState('');
  
  // Stripe Terminal Simulator State
  const [stripeSimState, setStripeSimState] = useState<'idle' | 'waiting' | 'authorizing' | 'declined' | 'timeout'>('idle');
  
  // Split Check Wizard Modal State
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showCardCheckout, setShowCardCheckout] = useState(false);
  const [selectedSeatFilter, setSelectedSeatFilter] = useState<number | null>(null);

  const qc = useQueryClient();

  if (!order) return null;

  const rawItems = order.items ?? [];
  const filteredItems = selectedSeatFilter != null 
    ? rawItems.filter((i: any) => (i.seat_number ?? 1) === selectedSeatFilter)
    : rawItems;

  const subtotal = filteredItems.reduce((s: number, i: any) => s + i.line_total, 0);
  const discountPercent = order.discount_percent ?? 0;
  const discountFlat = selectedSeatFilter == null ? (order.discount_flat ?? 0) : 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100)) + discountFlat;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(taxableSubtotal * 0.1);
  
  let tipAmount = 0;
  if (tipPercent === 'custom') {
    tipAmount = Math.round(parseFloat(customTip || '0') * 100);
  } else {
    tipAmount = Math.round(taxableSubtotal * (tipPercent / 100));
  }
  
  const total = taxableSubtotal + tax + tipAmount;
  const cashAmount = parseFloat(cashTendered || '0') * 100;
  const changeDue = Math.max(0, cashAmount - total);

  // Group items by seat for Split by Seat breakdown
  const seatTotals: Record<number, number> = {};
  rawItems.forEach((item: any) => {
    const s = item.seat_number ?? 1;
    seatTotals[s] = (seatTotals[s] ?? 0) + item.line_total;
  });

  async function finalizePayment() {
    setProcessing(true);
    const tenantId = order.tenant_id ?? usePOSStore.getState().tenantId;
    const API = getApiBase();
    const headers = apiHeaders(tenantId);

    const payload = {
      amount: total,
      method,
      tip_amount: tipAmount,
      tip_cents: tipAmount,
      total,
    };

    try {
      if (!navigator.onLine || !supabase) {
        enqueueOfflineDelta({
          tenant_id: tenantId,
          order_id: order.id,
          action: 'finalize_payment',
          payload: { ...payload, allow_offline_card: method === 'card' },
        });
        const mockDb = await import('../lib/mockDb');
        const orders = mockDb.getMockOrders();
        const mockOrder = orders.find((o: any) => o.id === order.id);
        if (mockOrder) {
          mockOrder.status = 'paid';
          mockOrder.paid_at = new Date().toISOString();
          mockOrder.total = total;
          mockDb.saveMockOrders(orders);
        }
        qc.invalidateQueries({ queryKey: ['orders'] });
        setPaid(true);
        return;
      }

      // Online cash/comp: server is source of truth via sync-deltas
      const delta = enqueueOfflineDelta({
        tenant_id: tenantId,
        order_id: order.id,
        action: 'finalize_payment',
        payload,
      });

      const synced = await flushOfflineQueue(API, headers);
      if (synced === 0) {
        const res = await fetch(`${API}/v1/pos/sync-deltas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ deltas: [delta] }),
        });
        if (!res.ok) throw new Error('Payment sync failed');
      }

      qc.invalidateQueries({ queryKey: ['orders'] });
      setPaid(true);
    } catch (err: any) {
      try {
        enqueueOfflineDelta({
          tenant_id: tenantId,
          order_id: order.id,
          action: 'finalize_payment',
          payload: { ...payload, allow_offline_card: true },
        });
        setPaid(true);
      } catch {
        alert('Payment failed: ' + (err?.message ?? err));
      }
    } finally {
      setProcessing(false);
      setStripeSimState('idle');
    }
  }

  function startPaymentFlow() {
    if (method === 'card') {
      // Real Stripe Elements checkout (confirm → capture)
      setShowCardCheckout(true);
    } else {
      finalizePayment();
    }
  }

  function handleCloseCheckout() {
    setActiveOrder(null);
    setView('tables');
  }

  function triggerPrint() {
    window.print();
  }

  if (paid) {
    return (
      <div className="flex h-full bg-[#f8f9fa] p-6 gap-6 animate-fadeIn">
        {/* Left Side: Success Message & Options */}
        <div className="flex-1 bg-white border border-[#e5e7eb] rounded-2xl p-8 text-center flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="w-16 h-16 bg-[#22c55e1a] text-[#22c55e] rounded-full flex items-center justify-center mx-auto text-3xl font-black">✓</div>
              <h2 className="text-lg font-black text-[#1f2937] uppercase tracking-wider">
                {selectedSeatFilter ? `Seat ${selectedSeatFilter} Paid` : 'Transaction Approved'}
              </h2>
              <p className="text-xs text-[#6b7280]">Paid ${(total / 100).toFixed(2)} via {method.toUpperCase()}</p>
            </div>

            {method === 'cash' && cashAmount > 0 && (
              <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e5e7eb] max-w-xs mx-auto">
                <p className="text-[10px] text-[#6b7280] uppercase font-bold tracking-wider">Change Due</p>
                <p className="text-2xl font-black text-[#22c55e] font-mono mt-1">${(changeDue / 100).toFixed(2)}</p>
              </div>
            )}

            {/* Receipt Options */}
            <div className="space-y-3 text-left border-t border-[#e5e7eb] pt-6 max-w-sm mx-auto">
              <span className="text-[10px] text-[#6b7280] font-black tracking-wider uppercase block">Select Receipt Output</span>
              {!receiptChoice ? (
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setReceiptChoice('none'); setReceiptSent(true); }}
                    className="bg-[#f3f4f6] text-[#1f2937] hover:bg-[#e5e7eb] rounded-lg py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors border border-[#e5e7eb]">
                    No Receipt
                  </button>
                  <button onClick={() => setReceiptChoice('email')}
                    className="bg-[#f3f4f6] text-[#1f2937] hover:bg-[#e5e7eb] rounded-lg py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors border border-[#e5e7eb]">
                    Email
                  </button>
                  <button onClick={() => setReceiptChoice('text')}
                    className="bg-[#f3f4f6] text-[#1f2937] hover:bg-[#e5e7eb] rounded-lg py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors border border-[#e5e7eb]">
                    SMS/Text
                  </button>
                </div>
              ) : receiptChoice !== 'none' && !receiptSent ? (
                <div className="space-y-2 animate-fadeIn">
                  <input
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    placeholder={receiptChoice === 'email' ? 'customer@example.com' : '(555) 000-0000'}
                    className="w-full bg-white border border-[#cbd5e1] focus:border-[#0f172a] outline-none rounded-lg p-2.5 text-xs text-[#1f2937]"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setReceiptChoice(null)}
                      className="bg-[#f3f4f6] text-[#6b7280] rounded-lg px-4 py-2 text-[10px] font-bold uppercase">Back</button>
                    <button onClick={() => setReceiptSent(true)}
                      className="flex-1 bg-[#0f172a] text-white rounded-lg py-2 text-[10px] font-black uppercase">Send Receipt</button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#22c55e15] border border-[#22c55e30] rounded-xl text-center text-xs font-bold text-[#22c55e] animate-fadeIn">
                  Receipt Dispatched Successfully
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 max-w-sm mx-auto w-full mt-8">
            <button onClick={triggerPrint}
              className="flex-1 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors border border-[#e5e7eb]">
              Print Guest Receipt
            </button>
            <button onClick={handleCloseCheckout}
              className="flex-1 bg-[#0f172a] hover:bg-[#1e293b] text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-colors">
              Done
            </button>
          </div>
        </div>

        {/* Right Side: Virtual Thermal Receipt Roll */}
        <div className="w-80 bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col items-center overflow-hidden h-full shrink-0">
          <span className="text-[10px] text-[#6b7280] font-black tracking-wider uppercase block mb-4">Receipt Tape Roll</span>
          <div id="print-area" className="flex-1 w-full bg-[#fdfdfd] border border-dashed border-[#cbd5e1] p-4 font-mono text-[10px] text-black overflow-y-auto space-y-4 shadow-inner">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-xs uppercase tracking-wider">CULINARYOS BISTRO</h3>
              <p>100 RESTAURANT ROW</p>
              <p>TEL: (555) 123-4567</p>
            </div>
            
            <div className="border-t border-b border-dashed border-black py-2 space-y-1">
              <p>CHECK: {order.id} {selectedSeatFilter ? `(SEAT ${selectedSeatFilter})` : ''}</p>
              <p>DATE: {new Date().toLocaleDateString()}</p>
              <p>SERVER: {order.server_name ?? 'Server'}</p>
            </div>

            <div className="space-y-2">
              {filteredItems.map((item: any) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>{item.quantity}x {item.name} (S{item.seat_number ?? 1})</span>
                    <span>${(item.line_total / 100).toFixed(2)}</span>
                  </div>
                  {item.modifiers?.map((m: any) => <p key={m.id} className="text-[9px] pl-3">— {m.name}</p>)}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black pt-2 space-y-1.5 text-right">
              <div className="flex justify-between"><span>SUBTOTAL</span><span>${(subtotal/100).toFixed(2)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between"><span>DISCOUNT</span><span>-${(discountAmount/100).toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>TAX (10%)</span><span>${(tax/100).toFixed(2)}</span></div>
              {tipAmount > 0 && <div className="flex justify-between"><span>TIP</span><span>${(tipAmount/100).toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-xs border-t border-dashed border-black pt-1">
                <span>TOTAL</span><span>${(total/100).toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center pt-4 space-y-2 border-t border-dashed border-black">
              <p className="font-bold">THANK YOU FOR DINING WITH US!</p>
              <p className="text-[8px] text-[#888]">CulinaryOS Cloud POS platform</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#f8f9fa] relative">
      {/* Left panel: Bill details */}
      <div className="flex-1 p-5 overflow-y-auto border-r border-[#e5e7eb] flex flex-col justify-between bg-white">
        <div>
          <div className="flex justify-between items-center mb-4 border-b border-[#e5e7eb] pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">
                {selectedSeatFilter ? `Seat ${selectedSeatFilter} Summary` : 'Ticket Summary'}
              </h2>
              {selectedSeatFilter != null && (
                <button onClick={() => setSelectedSeatFilter(null)} className="text-[9px] font-black text-[#0f172a] uppercase underline">
                  Show All Seats
                </button>
              )}
            </div>
            <button onClick={() => setShowSplitModal(true)}
              className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#0f172a] border border-[#e5e7eb] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm">
              Split Check Wizard
            </button>
          </div>

          <div className="space-y-3">
            {filteredItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start text-xs border-b border-[#f3f4f6] pb-2">
                <div>
                  <p className="text-[#1f2937] font-bold">
                    {item.quantity}x {item.name} <span className="text-[9px] font-extrabold text-[#6b7280] bg-[#f3f4f6] px-1 py-0.5 rounded ml-1">S{item.seat_number ?? 1}</span>
                  </p>
                  {item.modifiers?.map((m: any) => <p key={m.id} className="text-[#6b7280] text-[10px] ml-3">— {m.name}</p>)}
                </div>
                <span className="font-mono text-[#1f2937]">${(item.line_total / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-4 mt-6 space-y-2 text-xs">
          <div className="flex justify-between text-[#6b7280]"><span>Subtotal</span><span className="font-mono">${(subtotal/100).toFixed(2)}</span></div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-500 font-semibold"><span>Discount</span><span className="font-mono">-${(discountAmount/100).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-[#6b7280]"><span>Tax (10%)</span><span className="font-mono">${(tax/100).toFixed(2)}</span></div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-[#6b7280]"><span>Tip Amount</span><span className="font-mono">${(tipAmount/100).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-[#1f2937] font-black text-sm border-t border-[#e5e7eb] pt-2 uppercase">
            <span>Total Bill</span><span className="font-mono text-[#0f172a]">${(total/100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Right panel: Payment Dashboard */}
      <div className="w-[460px] p-6 overflow-y-auto space-y-6 bg-white border-l border-[#e5e7eb] flex flex-col justify-between shrink-0 h-full shadow-lg">
        <div className="space-y-6">
          {/* Tender Type Selection */}
          <div className="space-y-3">
            <span className="text-xs font-black text-[#1f2937] tracking-wider uppercase block">
              1. Select Payment Method
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'card', name: 'Credit / Debit', icon: '💳', desc: 'Swipe, Insert, Chip' },
                { id: 'tap', name: 'Tap to Pay', icon: '📱', desc: 'Apple Pay, Google Pay, NFC' },
                { id: 'scan', name: 'Scan to Pay', icon: '📷', desc: 'QR Code on Guest Phone' },
                { id: 'cash', name: 'Cash Tender', icon: '💵', desc: 'Exact & Change Math' },
                { id: 'comp', name: 'Comp / House', icon: '🎁', desc: 'Manager Authorized' },
              ].map((pm) => {
                const isSelected = method === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setMethod(pm.id as any)}
                    className={`p-3.5 rounded-2xl text-left border-2 transition-all flex flex-col justify-between h-20 ${
                      isSelected
                        ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-md scale-[1.02]'
                        : 'border-[#e5e7eb] bg-[#f8f9fa] text-[#1f2937] hover:border-[#9ca3af] hover:bg-white'
                    } ${pm.id === 'comp' ? 'col-span-2' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{pm.icon}</span>
                      <span className="font-black text-xs uppercase tracking-wide truncate">{pm.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-gray-300' : 'text-[#6b7280]'}`}>
                      {pm.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tap to Pay NFC Card / Phone Flow */}
          {method === 'tap' && (
            <div className="space-y-3 animate-fadeIn bg-gradient-to-b from-blue-50/50 to-white p-5 rounded-2xl border-2 border-blue-200 text-center shadow-xs">
              <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto text-3xl animate-pulse">
                📱
              </div>
              <div>
                <h4 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">Contactless / Tap to Pay</h4>
                <p className="text-xs text-[#6b7280] mt-1">Hold Apple Pay, Google Pay, or contactless chip card near the terminal.</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 py-2 px-4 rounded-xl border border-emerald-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                NFC Contactless Sensor Active
              </div>
            </div>
          )}

          {/* Scan to Pay QR Code Flow */}
          {method === 'scan' && (
            <div className="space-y-3 animate-fadeIn bg-gradient-to-b from-[#f8f9fa] to-white p-5 rounded-2xl border-2 border-[#e5e7eb] text-center shadow-xs">
              <div className="bg-white p-3.5 border border-[#e5e7eb] rounded-2xl inline-block shadow-inner">
                {/* Visual QR Code SVG Representation */}
                <svg className="w-32 h-32 mx-auto" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100" height="100" fill="white"/>
                  <rect x="10" y="10" width="24" height="24" fill="#0f172a"/>
                  <rect x="14" y="14" width="16" height="16" fill="white"/>
                  <rect x="18" y="18" width="8" height="8" fill="#0f172a"/>
                  <rect x="66" y="10" width="24" height="24" fill="#0f172a"/>
                  <rect x="70" y="14" width="16" height="16" fill="white"/>
                  <rect x="74" y="18" width="8" height="8" fill="#0f172a"/>
                  <rect x="10" y="66" width="24" height="24" fill="#0f172a"/>
                  <rect x="14" y="70" width="16" height="16" fill="white"/>
                  <rect x="18" y="74" width="8" height="8" fill="#0f172a"/>
                  <rect x="42" y="12" width="6" height="6" fill="#0f172a"/>
                  <rect x="52" y="18" width="6" height="6" fill="#0f172a"/>
                  <rect x="42" y="28" width="6" height="6" fill="#0f172a"/>
                  <rect x="12" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="22" y="48" width="6" height="6" fill="#0f172a"/>
                  <rect x="38" y="42" width="12" height="12" fill="#0f172a"/>
                  <rect x="56" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="68" y="48" width="6" height="6" fill="#0f172a"/>
                  <rect x="82" y="42" width="6" height="6" fill="#0f172a"/>
                  <rect x="42" y="64" width="6" height="6" fill="#0f172a"/>
                  <rect x="54" y="70" width="10" height="6" fill="#0f172a"/>
                  <rect x="72" y="68" width="14" height="6" fill="#0f172a"/>
                  <rect x="42" y="82" width="8" height="8" fill="#0f172a"/>
                  <rect x="60" y="82" width="6" height="6" fill="#0f172a"/>
                  <rect x="76" y="80" width="10" height="10" fill="#0f172a"/>
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">Scan to Pay QR</h4>
                <p className="text-xs text-[#6b7280] mt-1">Guest scans QR code using phone camera, Apple Pay, or Cash App.</p>
              </div>
              <p className="text-xs font-mono font-bold text-[#0f172a] bg-[#f3f4f6] py-1.5 px-3 rounded-lg border border-[#e5e7eb]">
                pay.culinaryos.com/o/{order.id.slice(-6)}
              </p>
            </div>
          )}

          {/* Preset Tips Selection */}
          <div className="space-y-2.5">
            <span className="text-xs font-black text-[#1f2937] tracking-wider uppercase block">
              2. Add Gratuity / Tip
            </span>
            <div className="grid grid-cols-5 gap-2">
              {([0, 15, 18, 20] as const).map((pct) => {
                const tipCents = pct === 0 ? 0 : Math.round(taxableSubtotal * (pct / 100));
                const isSelected = tipPercent === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTipPercent(pct)}
                    className={`py-3 px-1.5 rounded-xl font-bold transition-all border-2 flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-[#0f172a] border-[#0f172a] text-white shadow-md scale-105'
                        : 'bg-[#f8f9fa] border-[#e5e7eb] text-[#4b5563] hover:border-[#9ca3af] hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-black">{pct === 0 ? 'No Tip' : `${pct}%`}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-gray-300' : 'text-[#6b7280]'}`}>
                      ${(tipCents / 100).toFixed(2)}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setTipPercent('custom')}
                className={`py-3 px-1.5 rounded-xl font-bold transition-all border-2 flex flex-col items-center justify-center ${
                  tipPercent === 'custom'
                    ? 'bg-[#0f172a] border-[#0f172a] text-white shadow-md scale-105'
                    : 'bg-[#f8f9fa] border-[#e5e7eb] text-[#4b5563] hover:border-[#9ca3af] hover:bg-white'
                }`}
              >
                <span className="text-xs font-black">Custom</span>
                <span className="text-[10px] font-mono opacity-80">$$</span>
              </button>
            </div>
            {tipPercent === 'custom' && (
              <div className="pt-2 animate-fadeIn">
                <input
                  type="number"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  placeholder="Enter custom tip in dollars ($)"
                  className="w-full bg-[#f8f9fa] border-2 border-[#cbd5e1] focus:border-[#0f172a] focus:bg-white outline-none rounded-xl p-3 text-xs text-[#1f2937] font-mono font-bold shadow-inner"
                />
              </div>
            )}
          </div>

          {/* Cash calculator helper */}
          {method === 'cash' && (
            <div className="space-y-3 animate-fadeIn bg-[#f8f9fa] p-4 rounded-2xl border-2 border-[#e5e7eb]">
              <span className="text-xs font-black text-[#1f2937] tracking-wider uppercase block border-b border-[#e5e7eb] pb-2">
                Fast Cash Tender Hotkeys
              </span>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[total / 100, 20, 50, 100].map((amt, idx) => {
                  const val = Math.ceil(amt);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashTendered(val.toString())}
                      className="bg-white border-2 border-[#e5e7eb] hover:border-[#0f172a] hover:bg-[#0f172a] hover:text-white text-[#1f2937] font-black py-2.5 rounded-xl text-xs transition-all shadow-xs"
                    >
                      {idx === 0 ? 'Exact' : `$${val}`}
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder="Or input custom cash amount ($)"
                className="w-full bg-white border-2 border-[#cbd5e1] focus:border-[#0f172a] outline-none rounded-xl p-3 text-xs text-[#1f2937] font-mono font-bold shadow-inner"
              />
              {cashAmount > 0 && (
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#e5e7eb]">
                  <span className="text-xs font-bold text-[#6b7280]">Change to return:</span>
                  <span className="text-base font-black font-mono text-emerald-600">
                    ${(changeDue / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Charge and Submit */}
        <button
          type="button"
          onClick={startPaymentFlow}
          disabled={processing}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4.5 rounded-2xl text-sm uppercase tracking-wider transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 mt-6 flex items-center justify-center gap-2"
        >
          <span className="text-lg">✓</span>
          <span>
            {processing
              ? 'Authorizing Transaction...'
              : method === 'tap'
              ? `Tap Terminal • $${(total / 100).toFixed(2)}`
              : method === 'scan'
              ? `Confirm QR Paid • $${(total / 100).toFixed(2)}`
              : `Finalize Payment • $${(total / 100).toFixed(2)}`}
          </span>
        </button>
      </div>

      {/* Stripe Elements card checkout */}
      {showCardCheckout && (
        <CheckoutDrawer
          orderId={order.id}
          totalCents={taxableSubtotal + tax}
          onSuccess={() => {
            setShowCardCheckout(false);
            setPaid(true);
            qc.invalidateQueries({ queryKey: ['orders'] });
          }}
          onClose={() => setShowCardCheckout(false)}
        />
      )}

      {/* Split Checks Wizard Modal */}
      {showSplitModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6">
            <div className="border-b border-[#e5e7eb] pb-3">
              <span className="text-[10px] text-[#0f172a] font-black tracking-wider uppercase block">Checkout Wizard</span>
              <h3 className="text-base font-black text-[#1f2937] uppercase mt-0.5">Split Check Options</h3>
              <p className="text-xs text-[#6b7280] mt-1">Split check evenly or pay individual seat checks.</p>
            </div>

            <div className="space-y-4">
              {/* Split Evenly */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-[#1f2937] uppercase block">Split Evenly</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[2, 3, 4].map(num => (
                    <div key={num} className="bg-[#f8f9fa] border border-[#e5e7eb] p-3 rounded-xl">
                      <span className="text-[10px] text-[#6b7280] font-bold block">{num}-Way Split</span>
                      <span className="font-mono text-xs font-black text-[#0f172a] mt-1 block">
                        ${((total / num) / 100).toFixed(2)} / ea
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Split By Seat */}
              <div className="space-y-2 border-t border-[#e5e7eb] pt-4">
                <span className="text-[10px] font-black text-[#1f2937] uppercase block">Pay By Seat Check</span>
                <div className="space-y-2">
                  {Object.entries(seatTotals).map(([seatNumStr, seatSubtotal]) => {
                    const seatNum = parseInt(seatNumStr, 10);
                    const seatTax = Math.round(seatSubtotal * 0.1);
                    const seatTotal = seatSubtotal + seatTax;
                    return (
                      <button key={seatNum}
                        onClick={() => { setSelectedSeatFilter(seatNum); setShowSplitModal(false); }}
                        className="w-full bg-white border border-[#e5e7eb] hover:border-[#0f172a] p-3 rounded-xl flex justify-between items-center text-xs transition-colors">
                        <span className="font-black text-[#1f2937]">Seat {seatNum} Check</span>
                        <span className="font-mono font-bold text-[#0f172a]">${(seatTotal / 100).toFixed(2)} →</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-[#e5e7eb] pt-4">
              <button onClick={() => { setSelectedSeatFilter(null); setShowSplitModal(false); }}
                className="w-full bg-[#f3f4f6] text-[#1f2937] rounded-xl py-3 text-xs font-black uppercase">
                Reset to Full Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Terminal Simulator Modal Overlay */}
      {stripeSimState !== 'idle' && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6 text-center">
            <div className="space-y-2">
              <span className="text-[9px] text-[#0f172a] font-black tracking-wider uppercase block">Stripe Terminal Simulator</span>
              {stripeSimState === 'waiting' && (
                <>
                  <h3 className="text-base font-black text-[#1f2937] uppercase">Tap, Insert, or Swipe</h3>
                  <p className="text-xs text-[#6b7280] px-4 leading-relaxed">Please present customer card to the terminal reader.</p>
                  <div className="w-12 h-12 border-4 border-t-transparent border-[#0f172a] rounded-full animate-spin mx-auto mt-4" />
                </>
              )}
              {stripeSimState === 'authorizing' && (
                <>
                  <h3 className="text-base font-black text-[#1f2937] uppercase">Authorizing Charge</h3>
                  <p className="text-xs text-[#6b7280]">Connecting to Stripe processing networks...</p>
                  <div className="w-12 h-12 border-4 border-t-transparent border-[#22c55e] rounded-full animate-spin mx-auto mt-4" />
                </>
              )}
              {stripeSimState === 'declined' && (
                <>
                  <h3 className="text-base font-black text-red-600 uppercase">Card Declined</h3>
                  <p className="text-xs text-[#6b7280] px-4 leading-relaxed">The bank returned a decline code. Try another tender method.</p>
                </>
              )}
              {stripeSimState === 'timeout' && (
                <>
                  <h3 className="text-base font-black text-yellow-600 uppercase">Reader Timeout</h3>
                  <p className="text-xs text-[#6b7280] px-4 leading-relaxed">No card was presented in time. Try triggering checkout again.</p>
                </>
              )}
            </div>

            {/* Simulating control buttons */}
            <div className="space-y-2 pt-4 border-t border-[#e5e7eb]">
              {stripeSimState === 'waiting' && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setStripeSimState('authorizing'); setTimeout(finalizePayment, 1500); }}
                    className="bg-[#22c55e] hover:bg-[#16a34a] text-white text-[10px] font-black rounded-lg py-2.5 uppercase transition-colors">
                    Simulate Success
                  </button>
                  <button onClick={() => setStripeSimState('declined')}
                    className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg py-2.5 uppercase transition-colors">
                    Simulate Decline
                  </button>
                  <button onClick={() => setStripeSimState('timeout')}
                    className="col-span-2 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#6b7280] text-[10px] font-bold rounded-lg py-2.5 uppercase transition-colors">
                    Simulate Timeout
                  </button>
                </div>
              )}
              {['declined', 'timeout'].includes(stripeSimState) && (
                <button onClick={() => setStripeSimState('idle')}
                  className="w-full bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] text-xs font-black rounded-lg py-2.5 uppercase transition-colors">
                  Cancel Checkout
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
