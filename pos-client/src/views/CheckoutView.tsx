import { useState } from 'react';
import { useOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const METHODS = ['cash','card','split','comp'] as const;

export function CheckoutView() {
  const { activeOrderId, setActiveOrder } = usePOSStore();
  const { data: order } = useOrder(activeOrderId);
  const [method, setMethod] = useState<string>('card');
  const [tip, setTip] = useState('0');
  const [processing, setProcessing] = useState(false);
  const qc = useQueryClient();

  if (!order) return null;

  const subtotal = order.items?.reduce((s: number, i: any) => s + i.line_total, 0) ?? 0;
  const tax = Math.round(subtotal * 0.1);
  const tipAmount = Math.round(parseFloat(tip || '0') * 100);
  const total = subtotal + tax + tipAmount;

  async function processPayment() {
    if (!order) return;
    setProcessing(true);
    try {
      await supabase.from('payments').insert({
        tenant_id: order.tenant_id, order_id: order.id,
        amount: total, method, tip_amount: tipAmount,
        status: 'completed', processed_at: new Date().toISOString(),
      });
      await supabase.from('pos_orders').update({ status: 'paid', paid_at: new Date().toISOString(), total }).eq('id', order.id);
      qc.invalidateQueries({ queryKey: ['orders'] });
      setActiveOrder(null);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Checkout</h2>
      <div className="bg-[#111111] rounded-xl p-5 mb-5 space-y-2">
        <div className="flex justify-between text-[#888888] text-sm"><span>Subtotal</span><span>${(subtotal/100).toFixed(2)}</span></div>
        <div className="flex justify-between text-[#888888] text-sm"><span>Tax (10%)</span><span>${(tax/100).toFixed(2)}</span></div>
        <div className="flex justify-between text-[#888888] text-sm items-center">
          <span>Tip ($)</span>
          <input value={tip} onChange={(e) => setTip(e.target.value)} type="number" min="0"
            className="bg-[#1a1a1a] text-white rounded px-2 py-1 w-20 text-right text-sm" />
        </div>
        <div className="flex justify-between text-white font-bold text-xl border-t border-[#222222] pt-3">
          <span>Total</span><span>${(total/100).toFixed(2)}</span>
        </div>
      </div>

      <p className="text-[#888888] text-xs font-bold tracking-widest mb-3">PAYMENT METHOD</p>
      <div className="flex gap-2 mb-6">
        {METHODS.map((m) => (
          <button key={m} onClick={() => setMethod(m)}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
              method === m ? 'bg-green-600 text-white' : 'bg-[#1a1a1a] text-[#888888] hover:bg-[#222222] hover:text-white'
            }`}>{m}</button>
        ))}
      </div>

      <button onClick={processPayment} disabled={processing}
        className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl text-lg transition-colors disabled:opacity-50">
        {processing ? 'Processing...' : `Charge $${(total/100).toFixed(2)}`}
      </button>
    </div>
  );
}
