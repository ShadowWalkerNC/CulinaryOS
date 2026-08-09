import { useState } from 'react';
import { usePOSStore } from '../lib/store';
import { getMockOrders } from '../lib/mockDb';

export function ReportsView() {
  const { setView } = usePOSStore();
  const [orders] = useState<any[]>(() => {
    return getMockOrders().filter(o => o.status === 'paid');
  });

  // Calculate Sales Summary
  const grossSales = orders.reduce((sum, o) => {
    const sub = o.items?.reduce((s: number, i: any) => s + i.line_total, 0) ?? 0;
    return sum + sub;
  }, 0);
  
  const tax = Math.round(grossSales * 0.1);
  const discounts = 0; // future discount value
  const totalRevenue = grossSales + tax;

  // Calculate Product Mix (PM Mix)
  const productMix: Record<string, { qty: number; sales: number }> = {};
  orders.forEach((o) => {
    o.items?.forEach((i: any) => {
      if (!productMix[i.name]) {
        productMix[i.name] = { qty: 0, sales: 0 };
      }
      productMix[i.name].qty += i.quantity;
      productMix[i.name].sales += i.line_total;
    });
  });

  const pmMixList = Object.entries(productMix).map(([name, data]) => ({
    name,
    qty: data.qty,
    sales: data.sales,
  })).sort((a, b) => b.sales - a.sales);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] animate-fadeIn p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e7eb]">
        <div>
          <h1 className="text-lg font-black text-[#1f2937] uppercase tracking-wider">Business Reports</h1>
          <p className="text-xs text-[#6b7280]">Terminal sales performance, product mix, and employee shift hours.</p>
        </div>
        <button onClick={() => setView('dashboard')}
          className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-black px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors border border-[#e5e7eb] shadow-sm">
          Home
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Sales Performance Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between h-full">
          <div className="space-y-4">
            <div className="border-b border-[#e5e7eb] pb-3">
              <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">Sales Summary</h2>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-[#6b7280]"><span>Gross Sales</span><span className="font-mono font-semibold text-[#1f2937]">${(grossSales / 100).toFixed(2)}</span></div>
              <div className="flex justify-between text-[#6b7280]"><span>Discounts</span><span className="font-mono font-semibold text-[#1f2937]">${(discounts / 100).toFixed(2)}</span></div>
              <div className="flex justify-between text-[#6b7280]"><span>Tax Collected (10%)</span><span className="font-mono font-semibold text-[#1f2937]">${(tax / 100).toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-[#e5e7eb] pt-3 text-sm text-[#1f2937] font-black uppercase">
                <span>Net Revenue</span><span className="font-mono text-[#0f172a]">${(totalRevenue / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#f8f9fa] border border-[#e5e7eb] p-4 rounded-xl space-y-2 text-xs">
            <span className="text-[10px] text-[#6b7280] font-black uppercase block tracking-wider">Tender Breakdown</span>
            <div className="flex justify-between text-[#4b5563]"><span>Credit Card</span><span className="font-mono">${(totalRevenue / 100).toFixed(2)}</span></div>
            <div className="flex justify-between text-[#4b5563]"><span>Cash Drawer</span><span className="font-mono">$0.00</span></div>
          </div>
        </div>

        {/* Product Mix (PM Mix) Table */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col h-full overflow-hidden col-span-2">
          <div className="border-b border-[#e5e7eb] pb-3 shrink-0">
            <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">Product Mix (PM Mix)</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[#6b7280] uppercase tracking-wider text-[10px] font-black">
                  <th className="py-2.5">Menu Item</th>
                  <th className="py-2.5 text-center">Qty Sold</th>
                  <th className="py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {pmMixList.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-10 text-[#9ca3af] font-semibold uppercase text-[10px]">
                      No items sold on this shift
                    </td>
                  </tr>
                ) : (
                  pmMixList.map((item, idx) => (
                    <tr key={idx} className="text-[#1f2937] font-medium">
                      <td className="py-3 font-semibold">{item.name}</td>
                      <td className="py-3 text-center font-mono">{item.qty}</td>
                      <td className="py-3 text-right font-mono font-bold text-[#0f172a]">${(item.sales / 100).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
