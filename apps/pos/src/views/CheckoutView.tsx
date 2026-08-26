import { useState } from 'react';
import { useOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { apiHeaders, getApiBase, enqueueOfflineDelta, flushOfflineQueue, ReceiptPayload } from '@culinaryos/shared';
import { hardwarePrinter } from '../lib/hardware-printer';
import { CheckoutDrawer } from '../components/CheckoutDrawer';
import {
  CreditCard,
  Smartphone,
  QrCode,
  Banknote,
  Gift,
  CheckCircle2,
  Printer,
  Send,
  Check,
  X,
  Mail,
  MessageSquare,
  Split,
  Usb,
  Bluetooth,
  Wifi,
} from '@culinaryos/ui';

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
      alert('Payment failed: ' + (err?.message ?? err));
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

  const [printStatus, setPrintStatus] = useState<string | null>(null);

  function buildReceiptPayload(): ReceiptPayload {
    return {
      restaurantName: 'CulinaryOS Bistro',
      restaurantAddress: '100 Restaurant Row, Suite 100',
      restaurantPhone: '(555) 123-4567',
      restaurantTaxId: 'US-99482104-K',
      receiptNumber: order.id.slice(-8).toUpperCase(),
      orderId: order.id,
      tableNumber: order.table_number || 'Quick Order',
      sectionName: 'Main Dining',
      serverName: order.server_name ?? 'Server',
      guestCount: order.guest_count ?? 1,
      timestamp: new Date(),
      items: filteredItems.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unit_price,
        totalCents: item.line_total,
        seatNumber: item.seat_number,
        modifiers: item.modifiers?.map((m: any) => m.name),
      })),
      subtotalCents: subtotal,
      taxCents: tax,
      tipCents: tipAmount,
      discountCents: discountAmount,
      totalCents: total,
      paymentMethod: method,
      cardLast4: method === 'card' || method === 'tap' ? '4242' : undefined,
      authCode: '994821',
      cashTenderedCents: method === 'cash' ? cashAmount : undefined,
      changeDueCents: method === 'cash' ? changeDue : undefined,
      footerMessage: 'Thank you for dining with us! Please come again.',
      qrCodeData: `https://culinaryos.org/receipt/${order.id}`,
    };
  }

  function handleCloseCheckout() {
    setActiveOrder(null);
    setView('tables');
  }

  async function triggerPrint() {
    setPrintStatus('Sending to receipt printer...');
    const payload = buildReceiptPayload();
    const res = await hardwarePrinter.printReceipt(payload);
    setPrintStatus(res.message);
    setTimeout(() => setPrintStatus(null), 4500);
  }

  if (paid) {
    return (
      <div className="flex h-full bg-[#f8f9fa] p-6 gap-6 animate-fadeIn overflow-y-auto">
        {/* Left Side: Success Message & Options */}
        <div className="flex-1 bg-white border border-[#e5e7eb] rounded-3xl p-8 text-center flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-xl font-black text-[#1f2937] uppercase tracking-wider">
                {selectedSeatFilter ? `Seat ${selectedSeatFilter} Paid` : 'Transaction Approved'}
              </h2>
              <p className="text-xs text-[#6b7280] font-bold">Paid ${(total / 100).toFixed(2)} via {method.toUpperCase()}</p>
            </div>

            {method === 'cash' && cashAmount > 0 && (
              <div className="bg-[#f8f9fa] p-4 rounded-2xl border border-[#e5e7eb] max-w-xs mx-auto">
                <p className="text-[10px] text-[#6b7280] uppercase font-black tracking-wider">Change Due</p>
                <p className="text-3xl font-black text-emerald-600 font-mono mt-1">${(changeDue / 100).toFixed(2)}</p>
              </div>
            )}

            {/* Receipt Options */}
            <div className="space-y-3 text-left border-t border-[#e5e7eb] pt-6 max-w-md mx-auto">
              <span className="text-[10px] text-[#6b7280] font-black tracking-wider uppercase block text-center">
                Select Receipt Output
              </span>
              {!receiptChoice ? (
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => { setReceiptChoice('none'); setReceiptSent(true); }}
                    className="bg-[#f3f4f6] text-[#1f2937] hover:bg-[#e5e7eb] rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all border border-[#e5e7eb] flex flex-col items-center justify-center gap-1 shadow-xs"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                    <span>No Receipt</span>
                  </button>
                  <button
                    onClick={() => setReceiptChoice('email')}
                    className="bg-[#f3f4f6] text-[#1f2937] hover:bg-[#e5e7eb] rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all border border-[#e5e7eb] flex flex-col items-center justify-center gap-1 shadow-xs"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={() => setReceiptChoice('text')}
                    className="bg-[#f3f4f6] text-[#1f2937] hover:bg-[#e5e7eb] rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all border border-[#e5e7eb] flex flex-col items-center justify-center gap-1 shadow-xs"
                  >
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span>SMS/Text</span>
                  </button>
                </div>
              ) : receiptChoice !== 'none' && !receiptSent ? (
                <div className="space-y-2.5 animate-fadeIn">
                  <input
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    placeholder={receiptChoice === 'email' ? 'customer@example.com' : '(555) 000-0000'}
                    className="w-full bg-[#f8f9fa] border-2 border-[#cbd5e1] focus:border-[#0f172a] focus:bg-white outline-none rounded-xl p-3 text-xs text-[#1f2937] font-semibold"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReceiptChoice(null)}
                      className="bg-[#f3f4f6] text-[#6b7280] rounded-xl px-4 py-2.5 text-xs font-bold uppercase"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setReceiptSent(true)}
                      className="flex-1 bg-[#0f172a] text-white rounded-xl py-2.5 text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Receipt</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-2 animate-fadeIn">
                  <Check className="w-4 h-4" />
                  <span>Receipt Dispatched Successfully</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 max-w-md mx-auto w-full mt-8">
            <button
              onClick={triggerPrint}
              className="flex-1 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors border border-[#e5e7eb] flex items-center justify-center gap-2 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={handleCloseCheckout}
              className="flex-1 bg-[#0f172a] hover:bg-[#1e293b] text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
          </div>
        </div>

        {/* Right Side: Virtual Thermal Receipt Roll */}
        <div className="w-96 bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm flex flex-col items-center overflow-hidden h-full shrink-0">
          <div className="w-full flex items-center justify-between mb-3">
            <span className="text-[11px] text-[#6b7280] font-black tracking-wider uppercase flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>Receipt Tape Preview</span>
            </span>
            <span className="text-[9px] font-black uppercase font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
              {hardwarePrinter.getConnectionStatus().transport}
            </span>
          </div>

          {printStatus && (
            <div className="w-full mb-3 p-2.5 bg-slate-900 text-white text-[11px] font-bold rounded-xl text-center animate-fadeIn flex items-center justify-center gap-1.5 shadow-sm">
              <Printer className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>{printStatus}</span>
            </div>
          )}

          <div id="print-area" className="flex-1 w-full bg-[#fdfdfd] border-2 border-dashed border-[#cbd5e1] rounded-2xl p-4 font-mono text-[11px] text-black overflow-y-auto space-y-4 shadow-inner">
            <div className="text-center space-y-1">
              <h3 className="font-black text-sm uppercase tracking-wider">CULINARYOS BISTRO</h3>
              <p className="text-[10px] text-gray-500">100 RESTAURANT ROW</p>
              <p className="text-[10px] text-gray-500">TEL: (555) 123-4567</p>
            </div>
            
            <div className="border-t border-b border-dashed border-gray-400 py-2 space-y-1 text-[10px]">
              <p className="font-bold">CHECK: {order.id.slice(-8).toUpperCase()} {selectedSeatFilter ? `(SEAT ${selectedSeatFilter})` : ''}</p>
              <p>DATE: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p>SERVER: {order.server_name ?? 'Server'}</p>
            </div>

            <div className="space-y-2">
              {filteredItems.map((item: any) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>{item.quantity}x {item.name} (S{item.seat_number ?? 1})</span>
                    <span>${(item.line_total / 100).toFixed(2)}</span>
                  </div>
                  {item.modifiers?.map((m: any) => <p key={m.id} className="text-[10px] pl-3 text-gray-500">— {m.name}</p>)}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400 pt-2 space-y-1.5 text-right">
              <div className="flex justify-between"><span>SUBTOTAL</span><span>${(subtotal/100).toFixed(2)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-rose-600"><span>DISCOUNT</span><span>-${(discountAmount/100).toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>TAX (10%)</span><span>${(tax/100).toFixed(2)}</span></div>
              {tipAmount > 0 && <div className="flex justify-between"><span>TIP</span><span>${(tipAmount/100).toFixed(2)}</span></div>}
              <div className="flex justify-between font-black text-xs border-t border-dashed border-gray-400 pt-1.5">
                <span>TOTAL</span><span>${(total/100).toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center pt-4 space-y-1.5 border-t border-dashed border-gray-400">
              <p className="font-black text-xs">THANK YOU FOR DINING WITH US!</p>
              <p className="text-[9px] text-gray-400">CulinaryOS Cloud POS Platform</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const paymentMethods = [
    { id: 'card', name: 'Credit / Debit', icon: CreditCard, desc: 'Swipe, Insert, Chip' },
    { id: 'tap', name: 'Tap to Pay', icon: Smartphone, desc: 'Apple Pay, Google Pay, NFC' },
    { id: 'scan', name: 'Scan to Pay', icon: QrCode, desc: 'QR Code on Guest Phone' },
    { id: 'cash', name: 'Cash Tender', icon: Banknote, desc: 'Exact & Change Math' },
    { id: 'comp', name: 'Comp / House', icon: Gift, desc: 'Manager Authorized' },
  ];

  return (
    <div className="flex h-full bg-[#f8f9fa] relative">
      {/* Left panel: Bill details */}
      <div className="flex-1 p-6 overflow-y-auto border-r border-[#e5e7eb] flex flex-col justify-between bg-white">
        <div>
          <div className="flex justify-between items-center mb-5 border-b border-[#e5e7eb] pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">
                {selectedSeatFilter ? `Seat ${selectedSeatFilter} Summary` : 'Ticket Summary'}
              </h2>
              {selectedSeatFilter != null && (
                <button onClick={() => setSelectedSeatFilter(null)} className="text-[10px] font-black text-[#0f172a] uppercase underline">
                  Show All Seats
                </button>
              )}
            </div>
            <button
              onClick={() => setShowSplitModal(true)}
              className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#0f172a] border border-[#e5e7eb] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split Check Wizard</span>
            </button>
          </div>

          <div className="space-y-3">
            {filteredItems.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start text-xs border-b border-[#f3f4f6] pb-2.5">
                <div>
                  <p className="text-[#1f2937] font-bold">
                    {item.quantity}x {item.name} <span className="text-[9px] font-extrabold text-[#6b7280] bg-[#f3f4f6] px-1.5 py-0.5 rounded ml-1">S{item.seat_number ?? 1}</span>
                  </p>
                  {item.modifiers?.map((m: any) => <p key={m.id} className="text-[#6b7280] text-[10px] ml-3">— {m.name}</p>)}
                </div>
                <span className="font-mono text-[#1f2937] font-bold">${(item.line_total / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-5 mt-6 space-y-2 text-xs shadow-xs">
          <div className="flex justify-between text-[#6b7280]"><span>Subtotal</span><span className="font-mono">${(subtotal/100).toFixed(2)}</span></div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-500 font-semibold"><span>Discount</span><span className="font-mono">-${(discountAmount/100).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-[#6b7280]"><span>Tax (10%)</span><span className="font-mono">${(tax/100).toFixed(2)}</span></div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-[#6b7280]"><span>Tip Amount</span><span className="font-mono">${(tipAmount/100).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-[#1f2937] font-black text-sm border-t border-[#e5e7eb] pt-2.5 uppercase">
            <span>Total Bill</span><span className="font-mono text-[#0f172a] text-base">${(total/100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Right panel: Payment Dashboard */}
      <div className="w-[480px] p-6 overflow-y-auto space-y-6 bg-white border-l border-[#e5e7eb] flex flex-col justify-between shrink-0 h-full shadow-lg">
        <div className="space-y-6">
          {/* Tender Type Selection */}
          <div className="space-y-3">
            <span className="text-xs font-black text-[#1f2937] tracking-wider uppercase block">
              1. Select Payment Method
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {paymentMethods.map((pm) => {
                const isSelected = method === pm.id;
                const IconComponent = pm.icon;
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
                      <IconComponent className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-700'}`} />
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
              <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Smartphone className="w-7 h-7" />
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
                <QrCode className="w-32 h-32 text-[#0f172a]" />
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
          <Check className="w-5 h-5" />
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
          <div className="bg-white border border-[#e5e7eb] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6">
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
          <div className="bg-white border border-[#e5e7eb] rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-6 text-center">
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
