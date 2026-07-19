import { useOrderStore } from '../lib/useOrderStore';
import { useCreateOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';

const STATUS_COLOR: Record<string, string> = {
  open: '#88888b', sent: '#22c55e', 'in-progress': '#ff5f1f', ready: '#3b82f6',
};

export function TablesView() {
  const { orders, loading, error } = useOrderStore();
  const { mutate: createOrder } = useCreateOrder();
  const setActiveOrder = usePOSStore((s) => s.setActiveOrder);
  const setView = usePOSStore((s) => s.setView);

  function openNewOrder() {
    const tableInput = prompt('Table number (or leave blank for takeaway):');
    const coversInput = prompt('Cover count:');
    const covers = parseInt(coversInput ?? '1', 10);
    createOrder(
      { table_number: tableInput || undefined, cover_count: isNaN(covers) ? 1 : covers, server_name: 'Server' },
      { onSuccess: (o: any) => { setActiveOrder(o.id); setView('menu'); } }
    );
  }

  return (
    <div className="p-6 bg-[#f8f9fa] h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-black text-[#1f2937] uppercase tracking-wider">Open Orders</h1>
        <button onClick={openNewOrder}
          className="bg-[#ff5f1f] hover:bg-[#e04f1a] text-white font-black px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm">
          + New Order
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20">
          <div className="w-6 h-6 border-2 border-[#ff5f1f] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 mt-20 text-xs">Connection error: {error}</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-[#9ca3af] mt-20 p-6 bg-white rounded-xl border border-[#e5e7eb] max-w-sm mx-auto shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider">No active orders</p>
          <p className="text-xs mt-1 text-[#9ca3af]">Open a new table order to begin.</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {orders.map((order: any) => (
            <button key={order.id} onClick={() => { setActiveOrder(order.id); setView('menu'); }}
              className="bg-white rounded-xl p-4 text-left border-2 hover:border-[#ff5f1f] transition-all active:scale-95 flex flex-col justify-between h-28 shadow-sm"
              style={{ borderColor: STATUS_COLOR[order.status] ?? '#e5e7eb' }}>
              <div className="flex justify-between items-center mb-2 w-full">
                <span className="text-[#1f2937] font-black text-lg">
                  {order.table_number ? `T${order.table_number}` : 'T/A'}
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider"
                  style={{ color: STATUS_COLOR[order.status], backgroundColor: (STATUS_COLOR[order.status] ?? '#cbd5e1') + '22' }}>
                  {order.status}
                </span>
              </div>
              <div>
                {order.server_name && <p className="text-[#6b7280] text-[10px]">Server: {order.server_name}</p>}
                <p className="text-[#6b7280] text-[10px]">{order.items?.length ?? 0} items</p>
              </div>
              <p className="text-[#ff5f1f] font-extrabold font-mono text-sm mt-1">${((order.total ?? 0) / 100).toFixed(2)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
