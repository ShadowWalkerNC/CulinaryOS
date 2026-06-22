// Replaces polling version — now uses Realtime push via useOrderStore
import { useOrderStore } from '../lib/useOrderStore';
import { useCreateOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';

const STATUS_COLOR: Record<string, string> = {
  open: '#333333', sent: '#16a34a', 'in-progress': '#f97316', ready: '#3b82f6',
};

export function TablesView() {
  const { orders, loading, error } = useOrderStore();
  const { mutate: createOrder } = useCreateOrder();
  const setActiveOrder = usePOSStore((s) => s.setActiveOrder);

  function openNewOrder() {
    const tableInput = prompt('Table number (or leave blank for takeaway):');
    const coversInput = prompt('Cover count:');
    const covers = parseInt(coversInput ?? '1', 10);
    createOrder(
      { table_number: tableInput || undefined, cover_count: isNaN(covers) ? 1 : covers, server_name: 'Server' },
      { onSuccess: (o: any) => setActiveOrder(o.id) }
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Open Orders</h1>
        <button onClick={openNewOrder}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          + New Order
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center text-red-400 mt-20 text-sm">Connection error: {error}</div>
      ) : orders.length === 0 ? (
        <div className="text-center text-[#444444] mt-20">
          <p className="text-lg">No open orders</p>
          <p className="text-sm mt-2">Start a new order above</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {orders.map((order: any) => (
            <button key={order.id} onClick={() => setActiveOrder(order.id)}
              className="bg-[#111111] rounded-xl p-4 text-left border-2 hover:border-green-600 transition-colors"
              style={{ borderColor: STATUS_COLOR[order.status] ?? '#222222' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-black text-xl">
                  {order.table_number ? `T${order.table_number}` : 'T/A'}
                </span>
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                  style={{ color: STATUS_COLOR[order.status], backgroundColor: (STATUS_COLOR[order.status] ?? '#333') + '22' }}>
                  {order.status}
                </span>
              </div>
              {order.server_name && <p className="text-[#888888] text-xs">{order.server_name}</p>}
              <p className="text-[#888888] text-xs mt-1">{order.items?.length ?? 0} items</p>
              <p className="text-white font-semibold mt-2 text-sm">${((order.total ?? 0) / 100).toFixed(2)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
