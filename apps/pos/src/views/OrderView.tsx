import { useState } from 'react';
import { useOrder, useFireOrder, useVoidOrder, useApplyDiscount } from '../lib/queries';
import { usePOSStore } from '../lib/store';

export function OrderView() {
  const { activeOrderId, setView, setActiveOrder } = usePOSStore();
  const { data: order, isLoading } = useOrder(activeOrderId);
  const { mutate: fireOrder, isPending: firing } = useFireOrder();
  const { mutate: voidOrder } = useVoidOrder();
  const { mutate: applyDiscount } = useApplyDiscount();

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [customPercentInput, setCustomPercentInput] = useState('');
  const [customFlatInput, setCustomFlatInput] = useState('');

  if (isLoading || !order) return (
    <div className="flex justify-center items-center h-full">
      <div className="w-6 h-6 border-2 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const subtotal = order.items?.reduce((s: number, i: any) => s + i.line_total, 0) ?? 0;
  
  // Calculate Discounts
  const discountPercent = order.discount_percent ?? 0;
  const discountFlat = order.discount_flat ?? 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100)) + discountFlat;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(taxableSubtotal * 0.1);
  const total = taxableSubtotal + tax;

  function handleSetDiscount(pct: number, flat: number) {
    if (!order) return;
    applyDiscount({ orderId: order.id, discountPercent: pct, discountFlat: flat });
    setShowDiscountModal(false);
  }

  function handleApplyCustomDiscount() {
    const pct = parseFloat(customPercentInput || '0');
    const flat = Math.round(parseFloat(customFlatInput || '0') * 100);
    handleSetDiscount(isNaN(pct) ? 0 : pct, isNaN(flat) ? 0 : flat);
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Ticket Header */}
      <div className="p-3 border-b border-[#e5e7eb] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">
            {order.table_number ? `Table ${order.table_number}` : 'Takeaway'}
          </h2>
          {order.server_name && <p className="text-[10px] text-[#6b7280] mt-0.5">Server: {order.server_name}</p>}
        </div>
        <button onClick={() => setActiveOrder(null)} className="text-[10px] font-black text-[#0f172a] hover:underline uppercase">
          Close
        </button>
      </div>

      {/* Ticket Items (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-white">
        {order.items?.length === 0 ? (
          <div className="text-center text-[#9ca3af] mt-16 p-4">
            <p className="text-xs font-bold uppercase tracking-wider">Ticket Empty</p>
            <p className="text-[10px] text-[#9ca3af] mt-1 leading-normal">Tap items on the menu grid to add to this ticket.</p>
          </div>
        ) : (
          order.items?.map((item: any) => (
            <div key={item.id} className="border-b border-[#f3f4f6] pb-2 flex justify-between items-start text-xs">
              <div>
                <p className="text-[#1f2937] font-bold flex items-center gap-1">
                  {item.quantity > 1 && <span className="text-[#0f172a]">{item.quantity}x</span>}
                  <span>{item.name}</span>
                  <span className="text-[9px] font-extrabold bg-[#f3f4f6] text-[#6b7280] px-1 py-0.2 rounded ml-1">S{item.seat_number ?? 1}</span>
                </p>
                {item.modifiers?.map((m: any) => <p key={m.id} className="text-[#6b7280] text-[10px] ml-3">— {m.name}</p>)}
                {item.notes && <p className="text-[#f59e0b] text-[10px] ml-3 italic">{item.notes}</p>}
              </div>
              <p className="text-[#1f2937] font-bold font-mono">${(item.line_total / 100).toFixed(2)}</p>
            </div>
          ))
        )}
      </div>

      {/* Ticket Totals & Operations */}
      <div className="p-3 border-t border-[#e5e7eb] bg-[#f8f9fa] shrink-0 space-y-3">
        <div className="space-y-1 text-[11px] text-[#6b7280]">
          <div className="flex justify-between">
            <span>Subtotal</span><span className="font-mono">${(subtotal / 100).toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-500 font-semibold">
              <span>Discounts Applied</span>
              <span className="font-mono">-${(discountAmount / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax (10%)</span><span className="font-mono">${(tax / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-[#1f2937] font-black pt-1.5 border-t border-[#e5e7eb] uppercase">
            <span>Total</span><span className="font-mono text-[#0f172a]">${(total / 100).toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {order.status === 'open' && (
            <button
              onClick={() => fireOrder(order.id)}
              disabled={firing || !order.items?.length}
              className="col-span-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl py-3.5 text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
            >
              <span className="text-lg">🔥</span>
              <span>{firing ? 'Sending to Kitchen...' : 'SEND TO KITCHEN'}</span>
            </button>
          )}

          {['sent', 'in-progress', 'ready'].includes(order.status) && (
            <button
              onClick={() => setView('checkout')}
              className="col-span-3 bg-[#0f172a] hover:bg-[#1e293b] text-white font-black rounded-xl py-3.5 text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
            >
              <span className="text-lg">💳</span>
              <span>PROCEED TO PAY</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm('Void this order?')) voidOrder({ orderId: order.id });
            }}
            className="bg-white text-rose-600 hover:bg-rose-50 rounded-xl py-2.5 text-[11px] font-black transition-all uppercase border-2 border-rose-200 flex flex-col items-center justify-center gap-0.5 shadow-xs"
          >
            <span className="text-base">🗑️</span>
            <span>Void</span>
          </button>

          <button
            onClick={() => setShowDiscountModal(true)}
            className="bg-white text-[#0f172a] hover:bg-blue-50 rounded-xl py-2.5 text-[11px] font-black transition-all uppercase border-2 border-[#e5e7eb] flex flex-col items-center justify-center gap-0.5 shadow-xs"
          >
            <span className="text-base">🏷️</span>
            <span>Promo</span>
          </button>

          <button
            onClick={() => setView('menu')}
            className="bg-white text-[#0f172a] hover:bg-blue-50 rounded-xl py-2.5 text-[11px] font-black transition-all uppercase border-2 border-[#e5e7eb] flex flex-col items-center justify-center gap-0.5 shadow-xs"
          >
            <span className="text-base">📋</span>
            <span>Menu</span>
          </button>
        </div>
      </div>

      {/* Coupon Discounts & Promo Modal */}
      {showDiscountModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl max-w-xs w-full p-5 shadow-2xl space-y-4">
            <div className="border-b border-[#e5e7eb] pb-2 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black text-[#0f172a] uppercase tracking-wider block">Ticket Savings</span>
                <h3 className="text-sm font-black text-[#1f2937] uppercase">Coupon Discounts</h3>
              </div>
              <button onClick={() => setShowDiscountModal(false)} className="text-xs font-bold text-[#9ca3af]">✕</button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-[#6b7280] uppercase block">Preset Promotions</span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => handleSetDiscount(10, 0)}
                  className="w-full bg-[#f8f9fa] hover:bg-[#0f172a0d] border border-[#e5e7eb] hover:border-[#0f172a] p-2.5 rounded-xl text-left flex justify-between items-center transition-colors"
                >
                  <span className="text-xs font-bold text-[#1f2937]">10% Senior / Military Off</span>
                  <span className="text-[10px] font-black text-[#0f172a]">10% OFF</span>
                </button>

                <button
                  onClick={() => handleSetDiscount(0, 500)}
                  className="w-full bg-[#f8f9fa] hover:bg-[#0f172a0d] border border-[#e5e7eb] hover:border-[#0f172a] p-2.5 rounded-xl text-left flex justify-between items-center transition-colors"
                >
                  <span className="text-xs font-bold text-[#1f2937]">$5.00 Off Coupon</span>
                  <span className="text-[10px] font-black text-[#0f172a]">-$5.00</span>
                </button>

                <button
                  onClick={() => handleSetDiscount(15, 0)}
                  className="w-full bg-[#f8f9fa] hover:bg-[#0f172a0d] border border-[#e5e7eb] hover:border-[#0f172a] p-2.5 rounded-xl text-left flex justify-between items-center transition-colors"
                >
                  <span className="text-xs font-bold text-[#1f2937]">15% VIP Patron Discount</span>
                  <span className="text-[10px] font-black text-[#0f172a]">15% OFF</span>
                </button>

                <button
                  onClick={() => handleSetDiscount(20, 0)}
                  className="w-full bg-[#f8f9fa] hover:bg-[#0f172a0d] border border-[#e5e7eb] hover:border-[#0f172a] p-2.5 rounded-xl text-left flex justify-between items-center transition-colors"
                >
                  <span className="text-xs font-bold text-[#1f2937]">20% Happy Hour Special</span>
                  <span className="text-[10px] font-black text-[#0f172a]">20% OFF</span>
                </button>
              </div>
            </div>

            <div className="border-t border-[#e5e7eb] pt-3 space-y-2">
              <span className="text-[10px] font-black text-[#6b7280] uppercase block">Custom Discount Override</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Discount %"
                  value={customPercentInput}
                  onChange={(e) => setCustomPercentInput(e.target.value)}
                  className="w-full bg-[#f9fafb] border border-[#cbd5e1] rounded-lg p-2 text-xs font-mono"
                />
                <input
                  type="number"
                  placeholder="Flat ($)"
                  value={customFlatInput}
                  onChange={(e) => setCustomFlatInput(e.target.value)}
                  className="w-full bg-[#f9fafb] border border-[#cbd5e1] rounded-lg p-2 text-xs font-mono"
                />
              </div>
              <button
                onClick={handleApplyCustomDiscount}
                className="w-full bg-[#1f2937] text-white rounded-lg py-2 text-[10px] font-black uppercase tracking-wider"
              >
                Apply Custom Promo
              </button>
            </div>

            <div className="border-t border-[#e5e7eb] pt-2">
              <button
                onClick={() => handleSetDiscount(0, 0)}
                className="w-full bg-red-50 text-red-600 hover:bg-red-100 rounded-lg py-2 text-[10px] font-bold uppercase"
              >
                Clear / Remove Discounts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default OrderView;
