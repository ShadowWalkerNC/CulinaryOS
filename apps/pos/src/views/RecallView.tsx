import { useState } from 'react';
import { usePOSStore } from '../lib/store';
import { getMockOrders, saveMockOrders } from '../lib/mockDb';
import { hardwarePrinter } from '../lib/hardware-printer';
import { ReceiptPayload } from '@culinaryos/shared';
import { Printer, RotateCcw, CheckCircle2, Card, Badge, Button } from '@culinaryos/ui';

export function RecallView() {
  const { setView } = usePOSStore();
  const [orders, setOrders] = useState<any[]>(() => {
    return getMockOrders().filter((o) => ['paid', 'voided', 'refunded'].includes(o.status));
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reprintStatus, setReprintStatus] = useState<string | null>(null);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  async function handleReprintReceipt(order: any) {
    setReprintStatus('Reprinting receipt...');
    const items = (order.items || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unit_price,
      totalCents: item.line_total,
      seatNumber: item.seat_number,
      modifiers: item.modifiers?.map((m: any) => m.name),
    }));

    const subtotal = items.reduce((s: number, i: any) => s + i.totalCents, 0);
    const tax = Math.round(subtotal * 0.1);
    const total = order.total || subtotal + tax;
    const tip = Math.max(0, total - (subtotal + tax));

    const payload: ReceiptPayload = {
      restaurantName: 'CulinaryOS Bistro',
      restaurantAddress: '100 Restaurant Row, Suite 100',
      restaurantPhone: '(555) 123-4567',
      restaurantTaxId: 'US-99482104-K',
      receiptNumber: order.id.slice(-8).toUpperCase(),
      orderId: order.id,
      tableNumber: order.table_number || 'Bar / Quick Check',
      serverName: order.server_name ?? 'Server',
      timestamp: order.closed_at || order.created_at || new Date(),
      items,
      subtotalCents: subtotal,
      taxCents: tax,
      tipCents: tip,
      totalCents: total,
      paymentMethod: order.payment_method || 'CARD',
      cardLast4: '4242',
      authCode: 'REPRINT-99841',
      footerMessage: '*** REPRINT COPY ***\nThank you for dining with us!',
    };

    const res = await hardwarePrinter.printReceipt(payload);
    setReprintStatus(`Reprint: ${res.message}`);
    setTimeout(() => setReprintStatus(null), 4500);
  }

  function handleRefund(orderId: string) {
    if (!confirm('Proceed with refunding this order?')) return;
    
    // Update local DB
    const allOrders = getMockOrders();
    const order = allOrders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'refunded';
      order.refunded_at = new Date().toISOString();
      saveMockOrders(allOrders);
    }
    
    // Update local state list
    setOrders(getMockOrders().filter((o) => ['paid', 'voided', 'refunded'].includes(o.status)));
    setReprintStatus('Refund processed successfully.');
    setTimeout(() => setReprintStatus(null), 3000);
  }

  return (
    <div className="flex h-full bg-background animate-fadeIn">
      {/* List Panel */}
      <div className="w-80 border-r border-border bg-card flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div>
            <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Closed Checks</h2>
            <p className="text-[10px] text-muted-foreground font-semibold">Audit & Reprint History</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('dashboard')}
            className="text-[10px] font-black uppercase tracking-wider rounded-lg h-7 px-2.5"
          >
            Exit
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-semibold">
              No historical checks found.
            </div>
          ) : (
            orders.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={`w-full text-left p-4 transition-all flex flex-col gap-1.5 ${
                  selectedOrderId === o.id
                    ? 'bg-foreground text-background font-bold shadow-xs'
                    : 'hover:bg-muted/60 text-foreground'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-black">#{o.id.slice(-8).toUpperCase()}</span>
                  <span className="font-mono font-black">${((o.total ?? 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] opacity-80">
                  <span>Table {o.table_number || 'Bar Tab'}</span>
                  <span className="uppercase font-bold tracking-wider">{o.status}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto">
        {selectedOrder ? (
          <div className="space-y-6 max-w-lg mx-auto w-full bg-card border border-border rounded-2xl p-6 shadow-sm">
            {reprintStatus && (
              <div className="p-3 bg-slate-900 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-fadeIn shadow-sm">
                <Printer className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>{reprintStatus}</span>
              </div>
            )}

            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                  Check Details
                </span>
                <h2 className="text-lg font-black font-mono text-foreground">
                  #{selectedOrder.id.slice(-8).toUpperCase()}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Table {selectedOrder.table_number || 'Bar Tab'} • {new Date(selectedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                selectedOrder.status === 'paid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {selectedOrder.status}
              </span>
            </div>

            {/* Items Summary list */}
            <div className="space-y-3">
              {selectedOrder.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs border-b border-border/50 pb-2">
                  <div>
                    <span className="font-bold text-foreground">{item.quantity}x {item.name}</span>
                    {item.modifiers?.map((m: any) => <p key={m.id} className="text-muted-foreground text-[10px] ml-3">— {m.name}</p>)}
                  </div>
                  <span className="font-mono text-foreground font-semibold">${(item.line_total / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total balance info */}
            <div className="bg-muted/40 border border-border rounded-xl p-4 text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span className="font-bold">Total Amount Paid</span>
                <span className="font-mono text-foreground font-black text-base">${((selectedOrder.total ?? 0) / 100).toFixed(2)}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-3 border-t border-border pt-4">
              <Button
                onClick={() => handleReprintReceipt(selectedOrder)}
                className="flex-1 bg-foreground text-background hover:bg-foreground/90 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Reprint Receipt</span>
              </Button>
              {selectedOrder.status === 'paid' && (
                <Button
                  variant="outline"
                  onClick={() => handleRefund(selectedOrder.id)}
                  className="flex-1 text-rose-600 hover:bg-rose-50 border-rose-200 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Refund Check</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-muted-foreground">
            <Printer className="w-12 h-12 stroke-[1.2] opacity-30 mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider">No Check Selected</p>
            <p className="text-[10px] mt-1">Select a closed check from the sidebar history to view and reprint.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecallView;
