import { useState } from 'react';
import { useOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const METHODS = ['card', 'cash', 'comp'] as const;

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
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  const qc = useQueryClient();

  if (!order) return null;

  const subtotal = order.items?.reduce((s: number, i: any) => s + i.line_total, 0) ?? 0;
  const tax = Math.round(subtotal * 0.1);
  
  let tipAmount = 0;
  if (tipPercent === 'custom') {
    tipAmount = Math.round(parseFloat(customTip || '0') * 100);
  } else {
    tipAmount = Math.round(subtotal * (tipPercent / 100));
  }
  
  const total = subtotal + tax + tipAmount;
  const cashAmount = parseFloat(cashTendered || '0') * 100;
  const changeDue = Math.max(0, cashAmount - total);

  // Triggers actual payment completion and database write
  async function finalizePayment() {
    setProcessing(true);
    try {
      if (supabase) {
        await supabase.from('payments').insert({
          tenant_id: order.tenant_id, order_id: order.id,
          amount: total, method, tip_amount: tipAmount,
          status: 'completed', processed_at: new Date().toISOString(),
        });
        await supabase.from('pos_orders').update({ status: 'paid', paid_at: new Date().toISOString(), total }).eq('id', order.id);
      } else {
        const mockDb = await import('../lib/mockDb');
        const orders = mockDb.getMockOrders();
        const mockOrder = orders.find(o => o.id === order.id);
        if (mockOrder) {
          mockOrder.status = 'paid';
          mockOrder.paid_at = new Date().toISOString();
          mockOrder.total = total;
          mockDb.saveMockOrders(orders);
        }
      }
      qc.invalidateQueries({ queryKey: ['orders'] });
      setPaid(true);
    } catch (err: any) {
      alert('Payment failed: ' + err.message);
    } finally {
      setProcessing(false);
      setStripeSimState('idle');
    }
  }

  function startPaymentFlow() {
    if (method === 'card') {
      // Open card reader simulator
      setStripeSimState('waiting');
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
              <div className="w-16 h-16 bg-[#22c55e1a] text-[#22c55e] rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
              <h2 className="text-lg font-black text-[#1f2937] uppercase tracking-wider">Transaction Approved</h2>
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
                    className="w-full bg-white border border-[#cbd5e1] focus:border-[#ff5f1f] outline-none rounded-lg p-2.5 text-xs text-[#1f2937]"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setReceiptChoice(null)}
                      className="bg-[#f3f4f6] text-[#6b7280] rounded-lg px-4 py-2 text-[10px] font-bold uppercase">Back</button>
                    <button onClick={() => setReceiptSent(true)}
                      className="flex-1 bg-[#ff5f1f] text-white rounded-lg py-2 text-[10px] font-black uppercase">Send Receipt</button>
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
              className="flex-1 bg-[#ff5f1f] hover:bg-[#e04f1a] text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-colors">
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
              <p>CHECK: {order.id}</p>
              <p>DATE: {new Date().toLocaleDateString()}</p>
              <p>SERVER: {order.server_name ?? 'Server'}</p>
            </div>

            <div className="space-y-2">
              {order.items?.map((item: any) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${(item.line_total / 100).toFixed(2)}</span>
                  </div>
                  {item.modifiers?.map((m: any) => <p key={m.id} className="text-[9px] pl-3">— {m.name}</p>)}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black pt-2 space-y-1.5 text-right">
              <div className="flex justify-between"><span>SUBTOTAL</span><span>${(subtotal/100).toFixed(2)}</span></div>
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
          <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider mb-4 border-b border-[#e5e7eb] pb-2">Ticket Summary</h2>
          <div className="space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start text-xs border-b border-[#f3f4f6] pb-2">
                <div>
                  <p className="text-[#1f2937] font-bold">{item.quantity}x {item.name}</p>
                  {item.modifiers?.map((m: any) => <p key={m.id} className="text-[#6b7280] text-[10px] ml-3">— {m.name}</p>)}
                </div>
                <span className="font-mono text-[#1f2937]">${(item.line_total / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-4 mt-6 space-y-2 text-xs">
          <div className="flex justify-between text-[#6b7280]"><span>Subtotal</span><span className="font-mono">${(subtotal/100).toFixed(2)}</span></div>
          <div className="flex justify-between text-[#6b7280]"><span>Tax (10%)</span><span className="font-mono">${(tax/100).toFixed(2)}</span></div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-[#6b7280]"><span>Tip Amount</span><span className="font-mono">${(tipAmount/100).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-[#1f2937] font-black text-sm border-t border-[#e5e7eb] pt-2 uppercase">
            <span>Total Bill</span><span className="font-mono text-[#ff5f1f]">${(total/100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Right panel: Payment Dashboard */}
      <div className="w-96 p-5 overflow-y-auto space-y-5 bg-white border-l border-[#e5e7eb] flex flex-col justify-between shrink-0 h-full">
        <div className="space-y-5">
          {/* Tender Type Selection */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#6b7280] font-black tracking-wider uppercase block">Select Tender Type</span>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border ${
                    method === m ? 'bg-[#ff5f1f] border-[#ff5f1f] text-white' : 'bg-[#f3f4f6] border-[#e5e7eb] text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#1f2937]'
                  }`}>{m}</button>
              ))}
            </div>
          </div>

          {/* Preset Tips Selection */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#6b7280] font-black tracking-wider uppercase block">Tip Selector</span>
            <div className="grid grid-cols-5 gap-1.5">
              {([0, 15, 18, 20] as const).map((pct) => (
                <button key={pct} onClick={() => setTipPercent(pct)}
                  className={`py-2 rounded text-[10px] font-bold transition-all border ${
                    tipPercent === pct
                      ? 'bg-[#ff5f1f10] border-[#ff5f1f] text-[#ff5f1f] font-black'
                      : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:text-[#1f2937] hover:border-[#cbd5e1]'
                  }`}>
                  {pct === 0 ? 'No Tip' : `${pct}%`}
                </button>
              ))}
              <button onClick={() => setTipPercent('custom')}
                className={`py-2 rounded text-[10px] font-bold transition-all border ${
                  tipPercent === 'custom'
                    ? 'bg-[#ff5f1f10] border-[#ff5f1f] text-[#ff5f1f] font-black'
                    : 'bg-white border-[#e5e7eb] text-[#6b7280] hover:text-[#1f2937] hover:border-[#cbd5e1]'
                }`}>
                Custom
              </button>
            </div>
            {tipPercent === 'custom' && (
              <div className="pt-2 animate-fadeIn">
                <input
                  type="number"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  placeholder="Enter tip ($)"
                  className="w-full bg-white border border-[#cbd5e1] focus:border-[#ff5f1f] outline-none rounded-lg p-2 text-xs text-[#1f2937] font-mono"
                />
              </div>
            )}
          </div>

          {/* Cash calculator helper */}
          {method === 'cash' && (
            <div className="space-y-2 animate-fadeIn bg-[#f8f9fa] p-3 rounded-xl border border-[#e5e7eb]">
              <span className="text-[10px] text-[#6b7280] font-black tracking-wider uppercase block border-b border-[#e5e7eb] pb-1.5">Cash tender hotkeys</span>
              <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                {[total/100, 10, 20, 50, 100].map((amt, idx) => {
                  const val = Math.ceil(amt);
                  return (
                    <button key={idx} onClick={() => setCashTendered(val.toString())}
                      className="bg-white border border-[#e5e7eb] hover:border-[#ff5f1f] text-[#1f2937] font-bold py-2 rounded text-[10px]">
                      {idx === 0 ? 'Exact' : `$${val}`}
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder="Or input cash amount ($)"
                className="w-full bg-white border border-[#cbd5e1] focus:border-[#ff5f1f] outline-none rounded-lg p-2 text-xs text-[#1f2937] mt-3 font-mono"
              />
            </div>
          )}
        </div>

        {/* Charge and Submit */}
        <button onClick={startPaymentFlow} disabled={processing}
          className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-50 active:scale-98 mt-6 shadow-sm">
          {processing ? 'Authorizing...' : `Finalize Charge $${(total/100).toFixed(2)}`}
        </button>
      </div>

      {/* Stripe Terminal Simulator Modal Overlay */}
      {stripeSimState !== 'idle' && (
        <div className="absolute inset-0 bg-[#00000050] backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6 text-center">
            <div className="space-y-2">
              <span className="text-[9px] text-[#ff5f1f] font-black tracking-wider uppercase block">Stripe Terminal Simulator</span>
              {stripeSimState === 'waiting' && (
                <>
                  <h3 className="text-base font-black text-[#1f2937] uppercase">Tap, Insert, or Swipe</h3>
                  <p className="text-xs text-[#6b7280] px-4 leading-relaxed">Please present customer card to the terminal reader.</p>
                  <div className="w-12 h-12 border-4 border-t-transparent border-[#ff5f1f] rounded-full animate-spin mx-auto mt-4" />
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
