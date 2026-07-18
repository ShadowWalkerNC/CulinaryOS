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

  async function processPayment() {
    if (!order) return;
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
    }
  }

  function handleCloseCheckout() {
    setActiveOrder(null);
    setView('tables');
  }

  if (paid) {
    return (
      <div className="max-w-md mx-auto p-6 bg-[#1a1a1e] border border-[#28282e] rounded-2xl mt-12 text-center space-y-6">
        <div className="space-y-2">
          <div className="w-16 h-16 bg-[#22c55e1a] text-[#22c55e] rounded-full flex items-center justify-center mx-auto text-3xl">✓</div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Transaction Approved</h2>
          <p className="text-xs text-[#88888b]">Paid ${(total / 100).toFixed(2)} via {method.toUpperCase()}</p>
        </div>

        {method === 'cash' && cashAmount > 0 && (
          <div className="bg-[#121214] p-4 rounded-xl border border-[#28282e]">
            <p className="text-[10px] text-[#88888b] uppercase font-bold tracking-wider">Change Due</p>
            <p className="text-2xl font-black text-[#22c55e] font-mono mt-1">${(changeDue / 100).toFixed(2)}</p>
          </div>
        )}

        {/* Receipt Options */}
        <div className="space-y-3 text-left border-t border-[#28282e] pt-5">
          <span className="text-[10px] text-[#88888b] font-black tracking-wider uppercase block">Select Receipt Output</span>
          {!receiptChoice ? (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { setReceiptChoice('none'); setReceiptSent(true); }}
                className="bg-[#222226] text-white hover:bg-[#28282e] rounded-lg py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors">
                No Receipt
              </button>
              <button onClick={() => setReceiptChoice('email')}
                className="bg-[#222226] text-white hover:bg-[#28282e] rounded-lg py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors">
                Email
              </button>
              <button onClick={() => setReceiptChoice('text')}
                className="bg-[#222226] text-white hover:bg-[#28282e] rounded-lg py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors">
                SMS/Text
              </button>
            </div>
          ) : receiptChoice !== 'none' && !receiptSent ? (
            <div className="space-y-2 animate-fadeIn">
              <input
                value={contactInput}
                onChange={(e) => setContactInput(e.target.value)}
                placeholder={receiptChoice === 'email' ? 'customer@example.com' : '(555) 000-0000'}
                className="w-full bg-[#121214] border border-[#28282e] focus:border-[#ff5f1f] outline-none rounded-lg p-2.5 text-xs text-white"
              />
              <div className="flex gap-2">
                <button onClick={() => setReceiptChoice(null)}
                  className="bg-[#222226] text-[#88888b] rounded-lg px-4 py-2 text-[10px] font-bold uppercase">Back</button>
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

        <button onClick={handleCloseCheckout}
          className="w-full bg-[#ff5f1f] hover:bg-[#e04f1a] text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-colors">
          Return to Dining Map
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#121214]">
      {/* Left panel: Bill details */}
      <div className="flex-1 p-5 overflow-y-auto border-r border-[#28282e] flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4 border-b border-[#28282e] pb-2">Ticket Summary</h2>
          <div className="space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start text-xs border-b border-[#222226] pb-2">
                <div>
                  <p className="text-white font-bold">{item.quantity}x {item.name}</p>
                  {item.modifiers?.map((m: any) => <p key={m.id} className="text-[#88888b] text-[10px] ml-3">— {m.name}</p>)}
                </div>
                <span className="font-mono text-[#e8eaf0]">${(item.line_total / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a1e] border border-[#28282e] rounded-xl p-4 mt-6 space-y-2 text-xs">
          <div className="flex justify-between text-[#88888b]"><span>Subtotal</span><span className="font-mono">${(subtotal/100).toFixed(2)}</span></div>
          <div className="flex justify-between text-[#88888b]"><span>Tax (10%)</span><span className="font-mono">${(tax/100).toFixed(2)}</span></div>
          {tipAmount > 0 && (
            <div className="flex justify-between text-[#88888b]"><span>Tip Amount</span><span className="font-mono">${(tipAmount/100).toFixed(2)}</span></div>
          )}
          <div className="flex justify-between text-white font-black text-sm border-t border-[#28282e] pt-2 uppercase">
            <span>Total Bill</span><span className="font-mono text-[#ff5f1f]">${(total/100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Right panel: Payment Dashboard */}
      <div className="w-96 p-5 overflow-y-auto space-y-5 bg-[#1a1a1e] flex flex-col justify-between shrink-0 h-full">
        <div className="space-y-5">
          {/* Tender Type Selection */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#88888b] font-black tracking-wider uppercase block">Select Tender Type</span>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button key={m} onClick={() => setMethod(m)}
                  className={`py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                    method === m ? 'bg-[#ff5f1f] text-white' : 'bg-[#222226] text-[#88888b] hover:bg-[#28282e] hover:text-white'
                  }`}>{m}</button>
              ))}
            </div>
          </div>

          {/* Preset Tips Selection */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#88888b] font-black tracking-wider uppercase block">Tip Selector</span>
            <div className="grid grid-cols-5 gap-1.5">
              {([0, 15, 18, 20] as const).map((pct) => (
                <button key={pct} onClick={() => setTipPercent(pct)}
                  className={`py-2 rounded text-[10px] font-bold transition-all border ${
                    tipPercent === pct
                      ? 'bg-[#ff5f1f1a] border-[#ff5f1f] text-white font-black'
                      : 'bg-[#121214] border-[#222226] text-[#88888b] hover:text-white'
                  }`}>
                  {pct === 0 ? 'No Tip' : `${pct}%`}
                </button>
              ))}
              <button onClick={() => setTipPercent('custom')}
                className={`py-2 rounded text-[10px] font-bold transition-all border ${
                  tipPercent === 'custom'
                    ? 'bg-[#ff5f1f1a] border-[#ff5f1f] text-white font-black'
                    : 'bg-[#121214] border-[#222226] text-[#88888b] hover:text-white'
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
                  className="w-full bg-[#121214] border border-[#28282e] focus:border-[#ff5f1f] outline-none rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>
            )}
          </div>

          {/* Cash calculator helper */}
          {method === 'cash' && (
            <div className="space-y-2 animate-fadeIn bg-[#121214] p-3 rounded-xl border border-[#222226]">
              <span className="text-[10px] text-[#88888b] font-black tracking-wider uppercase block border-b border-[#28282e] pb-1.5">Cash tender hotkeys</span>
              <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                {[total/100, 10, 20, 50, 100].map((amt, idx) => {
                  const val = Math.ceil(amt);
                  return (
                    <button key={idx} onClick={() => setCashTendered(val.toString())}
                      className="bg-[#1a1a1e] border border-[#28282e] hover:border-[#ff5f1f] text-white font-bold py-2 rounded text-[10px]">
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
                className="w-full bg-[#1a1a1e] border border-[#28282e] focus:border-[#ff5f1f] outline-none rounded-lg p-2 text-xs text-white mt-3 font-mono"
              />
            </div>
          )}
        </div>

        {/* Charge and Submit */}
        <button onClick={processPayment} disabled={processing}
          className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-colors disabled:opacity-50 active:scale-98 mt-6">
          {processing ? 'Authorizing...' : `Finalize Charge $${(total/100).toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
