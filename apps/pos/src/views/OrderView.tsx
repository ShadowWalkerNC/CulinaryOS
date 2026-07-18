import { useOrder, useFireOrder, useVoidOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';

export function OrderView() {
  const { activeOrderId, setView, setActiveOrder } = usePOSStore();
  const { data: order, isLoading } = useOrder(activeOrderId);
  const { mutate: fireOrder, isPending: firing } = useFireOrder();
  const { mutate: voidOrder } = useVoidOrder();

  if (isLoading || !order) return (
    <div className="flex justify-center items-center h-full">
      <div className="w-6 h-6 border-2 border-[#ff5f1f] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const subtotal = order.items?.reduce((s: number, i: any) => s + i.line_total, 0) ?? 0;

  return (
    <div className="flex flex-col h-full bg-[#1a1a1e]">
      {/* Ticket Header */}
      <div className="p-3 border-b border-[#28282e] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            {order.table_number ? `Table ${order.table_number}` : 'Takeaway'}
          </h2>
          {order.server_name && <p className="text-[10px] text-[#88888b] mt-0.5">Server: {order.server_name}</p>}
        </div>
        <button onClick={() => setActiveOrder(null)} className="text-[10px] font-black text-[#ff5f1f] hover:underline uppercase">
          Close
        </button>
      </div>

      {/* Ticket Items (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {order.items?.length === 0 ? (
          <div className="text-center text-[#6b7299] mt-16 p-4">
            <p className="text-xs font-bold uppercase tracking-wider">Ticket Empty</p>
            <p className="text-[10px] text-[#44444a] mt-1 leading-normal">Tap items on the menu grid to add to this ticket.</p>
          </div>
        ) : (
          order.items?.map((item: any) => (
            <div key={item.id} className="border-b border-[#222226] pb-2 flex justify-between items-start text-xs">
              <div>
                <p className="text-[#e8eaf0] font-bold">
                  {item.quantity > 1 && <span className="text-[#ff5f1f] mr-1">{item.quantity}x</span>}
                  {item.name}
                </p>
                {item.modifiers?.map((m: any) => <p key={m.id} className="text-[#88888b] text-[10px] ml-3">— {m.name}</p>)}
                {item.notes && <p className="text-[#f59e0b] text-[10px] ml-3 italic">{item.notes}</p>}
              </div>
              <p className="text-[#e8eaf0] font-bold font-mono">${(item.line_total / 100).toFixed(2)}</p>
            </div>
          ))
        )}
      </div>

      {/* Ticket Totals & Operations */}
      <div className="p-3 border-t border-[#28282e] bg-[#121214] shrink-0 space-y-3">
        <div className="space-y-1 text-[11px] text-[#88888b]">
          <div className="flex justify-between">
            <span>Subtotal</span><span className="font-mono">${(subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (10%)</span><span className="font-mono">${(subtotal * 0.1 / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-white font-black pt-1.5 border-t border-[#222226] uppercase">
            <span>Total</span><span className="font-mono text-[#ff5f1f]">${(subtotal * 1.1 / 100).toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {order.status === 'open' && (
            <button
              onClick={() => fireOrder(order.id)}
              disabled={firing || !order.items?.length}
              className="col-span-2 bg-[#ff5f1f] hover:bg-[#e04f1a] text-white font-black rounded-lg py-2.5 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40"
            >
              {firing ? 'Sending...' : 'SEND TO KITCHEN'}
            </button>
          )}

          {['sent','in-progress','ready'].includes(order.status) && (
            <button onClick={() => setView('checkout')} className="col-span-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-black rounded-lg py-2.5 text-[11px] uppercase tracking-wider transition-colors">
              PROCEED TO PAY
            </button>
          )}

          <button
            onClick={() => { if (confirm('Void this order?')) voidOrder({ orderId: order.id }); }}
            className="bg-[#222226] text-[#ef4444] hover:bg-[#ef444415] rounded-lg py-2 text-[10px] font-bold transition-colors uppercase"
          >
            VOID TICKET
          </button>

          <button onClick={() => setView('menu')} className="bg-[#222226] text-white hover:bg-[#323238] rounded-lg py-2 text-[10px] font-bold transition-colors uppercase">
            ADD ITEMS
          </button>
        </div>
      </div>
    </div>
  );
}
