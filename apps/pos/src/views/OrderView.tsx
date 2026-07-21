import { useOrder, useFireOrder, useVoidOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import { getMockOrders, saveMockOrders } from '../lib/mockDb';
import { useQueryClient } from '@tanstack/react-query';

export function OrderView() {
  const { activeOrderId, setView, setActiveOrder } = usePOSStore();
  const { data: order, isLoading } = useOrder(activeOrderId);
  const { mutate: fireOrder, isPending: firing } = useFireOrder();
  const { mutate: voidOrder } = useVoidOrder();
  const qc = useQueryClient();

  if (isLoading || !order) return (
    <div className="flex justify-center items-center h-full">
      <div className="w-6 h-6 border-2 border-[#ff5f1f] border-t-transparent rounded-full animate-spin" />
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

  function handleDiscountPrompt() {
    const val = prompt('Select Discount Type:\n1. 10% Senior Discount\n2. $5.00 Off Coupon\n3. Remove Discounts\nEnter option (1, 2, 3):');
    
    // Update local DB
    const allOrders = getMockOrders();
    const dbOrder = allOrders.find(o => o.id === order.id);
    if (dbOrder) {
      if (val === '1') {
        dbOrder.discount_percent = 10;
        dbOrder.discount_flat = 0;
      } else if (val === '2') {
        dbOrder.discount_percent = 0;
        dbOrder.discount_flat = 500;
      } else if (val === '3') {
        dbOrder.discount_percent = 0;
        dbOrder.discount_flat = 0;
      }
      saveMockOrders(allOrders);
    }
    qc.invalidateQueries({ queryKey: ['orders'] });
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Ticket Header */}
      <div className="p-3 border-b border-[#e5e7eb] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">
            {order.table_number ? `Table ${order.table_number}` : 'Takeaway'}
          </h2>
          {order.server_name && <p className="text-[10px] text-[#6b7280] mt-0.5">Server: {order.server_name}</p>}
        </div>
        <button onClick={() => setActiveOrder(null)} className="text-[10px] font-black text-[#ff5f1f] hover:underline uppercase">
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
                <p className="text-[#1f2937] font-bold">
                  {item.quantity > 1 && <span className="text-[#ff5f1f] mr-1">{item.quantity}x</span>}
                  {item.name}
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
            <span>Total</span><span className="font-mono text-[#ff5f1f]">${(total / 100).toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 pt-1">
          {order.status === 'open' && (
            <button
              onClick={() => fireOrder(order.id)}
              disabled={firing || !order.items?.length}
              className="col-span-3 bg-[#ff5f1f] hover:bg-[#e04f1a] text-white font-black rounded-lg py-2.5 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40"
            >
              {firing ? 'Sending...' : 'SEND TO KITCHEN'}
            </button>
          )}

          {['sent','in-progress','ready'].includes(order.status) && (
            <button onClick={() => setView('checkout')} className="col-span-3 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-lg py-2.5 text-[11px] uppercase tracking-wider transition-colors">
              PROCEED TO PAY
            </button>
          )}

          <button
            onClick={() => { if (confirm('Void this order?')) voidOrder({ orderId: order.id }); }}
            className="bg-[#f3f4f6] text-red-600 hover:bg-red-50 rounded-lg py-2 text-[9px] font-black transition-colors uppercase border border-[#e5e7eb]"
          >
            Void
          </button>

          <button
            onClick={handleDiscountPrompt}
            className="bg-[#f3f4f6] text-[#ff5f1f] hover:bg-[#ff5f1f0a] rounded-lg py-2 text-[9px] font-black transition-colors uppercase border border-[#e5e7eb]"
          >
            Promo
          </button>

          <button onClick={() => setView('menu')} className="bg-[#f3f4f6] text-[#1f2937] hover:bg-[#e5e7eb] rounded-lg py-2 text-[9px] font-black transition-colors uppercase border border-[#e5e7eb]">
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
export default OrderView;
