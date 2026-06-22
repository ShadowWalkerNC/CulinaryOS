import { useOrder, useFireOrder, useVoidOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';

export function OrderView() {
  const { activeOrderId, setView, setActiveOrder } = usePOSStore();
  const { data: order, isLoading } = useOrder(activeOrderId);
  const { mutate: fireOrder, isPending: firing } = useFireOrder();
  const { mutate: voidOrder } = useVoidOrder();

  if (isLoading || !order) return (
    <div className="flex justify-center mt-20">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const subtotal = order.items?.reduce((s: number, i: any) => s + i.line_total, 0) ?? 0;

  return (
    <div className="flex h-full">
      {/* Order items */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setActiveOrder(null)} className="text-green-400 text-sm">← Tables</button>
          <h2 className="text-xl font-bold text-white">
            {order.table_number ? `Table ${order.table_number}` : 'Takeaway'}
            {order.server_name && <span className="text-[#888888] font-normal text-base ml-2">({order.server_name})</span>}
          </h2>
        </div>

        {order.items?.length === 0 ? (
          <div className="text-center text-[#444444] mt-20">
            <p>No items yet</p>
            <button onClick={() => setView('menu')} className="mt-4 text-green-400 text-sm">+ Add from menu</button>
          </div>
        ) : (
          <div className="space-y-2">
            {order.items?.map((item: any) => (
              <div key={item.id} className="bg-[#111111] rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-white font-semibold">{item.quantity > 1 && <span className="text-green-400">{item.quantity}x </span>}{item.name}</p>
                  {item.modifiers?.map((m: any) => <p key={m.id} className="text-[#888888] text-xs ml-2">— {m.name}</p>)}
                  {item.notes && <p className="text-yellow-400 text-xs ml-2">{item.notes}</p>}
                </div>
                <p className="text-white font-bold">${(item.line_total / 100).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-72 bg-[#111111] border-l border-[#1a1a1a] p-5 flex flex-col">
        <h3 className="text-[#888888] text-xs font-bold tracking-widest mb-4">ORDER SUMMARY</h3>
        <div className="flex justify-between text-[#888888] text-sm mb-1">
          <span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[#888888] text-sm mb-3">
          <span>Tax (10%)</span><span>${(subtotal * 0.1 / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-white font-bold text-lg border-t border-[#222222] pt-3 mb-6">
          <span>Total</span><span>${(subtotal * 1.1 / 100).toFixed(2)}</span>
        </div>

        <button onClick={() => setView('menu')} className="w-full bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg py-2.5 text-sm font-semibold mb-2 transition-colors">+ Add Item</button>

        {order.status === 'open' && (
          <button
            onClick={() => fireOrder(order.id)}
            disabled={firing || !order.items?.length}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-black rounded-lg py-3 text-sm transition-colors disabled:opacity-40 mb-2"
          >
            {firing ? 'Firing...' : 'FIRE TO KITCHEN'}
          </button>
        )}

        {['sent','in-progress','ready'].includes(order.status) && (
          <button onClick={() => setView('checkout')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg py-3 text-sm transition-colors mb-2">CHECKOUT</button>
        )}

        <button
          onClick={() => { if (confirm('Void this order?')) voidOrder({ orderId: order.id }); }}
          className="w-full bg-[#1a1a1a] text-red-400 hover:bg-red-950 rounded-lg py-2 text-xs font-bold transition-colors mt-auto"
        >
          VOID ORDER
        </button>
      </div>
    </div>
  );
}
