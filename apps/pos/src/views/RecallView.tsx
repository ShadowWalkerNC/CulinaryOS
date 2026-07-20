import { useState } from 'react';
import { usePOSStore } from '../lib/store';
import { getMockOrders, saveMockOrders } from '../lib/mockDb';

export function RecallView() {
  const { setView } = usePOSStore();
  const [orders, setOrders] = useState<any[]>(() => {
    return getMockOrders().filter(o => ['paid', 'voided', 'refunded'].includes(o.status));
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  function handleRefund(orderId: string) {
    if (!confirm('Proceed with refunding this order?')) return;
    
    // Update local DB
    const allOrders = getMockOrders();
    const order = allOrders.find(o => o.id === orderId);
    if (order) {
      order.status = 'refunded';
      order.refunded_at = new Date().toISOString();
      saveMockOrders(allOrders);
    }
    
    // Update local state list
    setOrders(getMockOrders().filter(o => ['paid', 'voided', 'refunded'].includes(o.status)));
    alert('Refund processed successfully.');
  }

  return (
    <div className="flex h-full bg-[#f8f9fa] animate-fadeIn">
      {/* List Panel */}
      <div className="w-80 border-r border-[#e5e7eb] bg-white flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#e5e7eb] flex items-center justify-between bg-[#f8f9fa] shrink-0">
          <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">Closed Checks</h2>
          <button onClick={() => setView('dashboard')}
            className="text-[10px] font-black text-[#ff5f1f] hover:underline uppercase">
            Home
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {orders.length === 0 ? (
            <div className="text-center text-[#9ca3af] mt-12 p-4 text-xs font-bold uppercase tracking-wider">
              No historical checks
            </div>
          ) : (
            orders.map((o: any) => (
              <button key={o.id} onClick={() => setSelectedOrderId(o.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between h-20 shadow-sm ${
                  selectedOrderId === o.id
                    ? 'border-[#ff5f1f] bg-[#ff5f1f0a]'
                    : 'border-[#e5e7eb] bg-white hover:border-[#cbd5e1]'
                }`}>
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-black text-[#1f2937]">
                    {o.table_number ? `Table ${o.table_number}` : 'Takeaway'}
                  </span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                    o.status === 'voided' ? 'bg-red-50 text-red-600' : o.status === 'refunded' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex justify-between items-end w-full mt-2">
                  <span className="text-[10px] text-[#6b7280]">{o.id}</span>
                  <span className="font-mono text-xs font-extrabold text-[#1f2937]">${((o.total ?? 0) / 100).toFixed(2)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Details Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedOrder ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 max-w-lg mx-auto shadow-sm space-y-6">
            <div className="border-b border-[#e5e7eb] pb-4 flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">
                  Check Details ({selectedOrder.id})
                </h3>
                <p className="text-xs text-[#6b7280] mt-1">Closed at: {selectedOrder.paid_at || selectedOrder.voided_at}</p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider ${
                selectedOrder.status === 'voided' ? 'bg-red-50 text-red-600' : selectedOrder.status === 'refunded' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
              }`}>
                {selectedOrder.status}
              </span>
            </div>

            {/* Items Summary list */}
            <div className="space-y-3">
              {selectedOrder.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs border-b border-[#f3f4f6] pb-2">
                  <div>
                    <span className="font-bold text-[#1f2937]">{item.quantity}x {item.name}</span>
                    {item.modifiers?.map((m: any) => <p key={m.id} className="text-[#6b7280] text-[10px] ml-3">— {m.name}</p>)}
                  </div>
                  <span className="font-mono text-[#1f2937]">${(item.line_total / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total balance info */}
            <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl p-4 text-xs space-y-1.5">
              <div className="flex justify-between text-[#6b7280]">
                <span>Total Amount</span>
                <span className="font-mono text-[#1f2937] font-semibold">${((selectedOrder.total ?? 0) / 100).toFixed(2)}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-3 border-t border-[#e5e7eb] pt-4">
              <button onClick={() => alert('Receipt queued for printing...')}
                className="flex-1 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm">
                Reprint Receipt
              </button>
              {selectedOrder.status === 'paid' && (
                <button onClick={() => handleRefund(selectedOrder.id)}
                  className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm">
                  Refund Check
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-[#9ca3af]">
            <p className="text-xs font-bold uppercase tracking-wider">No Check Selected</p>
            <p className="text-[10px] mt-1">Select a closed check from the sidebar history.</p>
          </div>
        )}
      </div>
    </div>
  );
}
