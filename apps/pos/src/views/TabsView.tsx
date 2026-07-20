import { useState } from 'react';
import { usePOSStore } from '../lib/store';
import { getMockOrders, saveMockOrders } from '../lib/mockDb';
import { useCreateOrder } from '../lib/queries';

export function TabsView() {
  const { setView, setActiveOrder } = usePOSStore();
  const { mutate: createOrder } = useCreateOrder();
  const [tabs, setTabs] = useState<any[]>(() => {
    // Generate some mock bar tabs if none exist
    const orders = getMockOrders();
    const barTabs = orders.filter(o => o.table_number?.toLowerCase().startsWith('bar'));
    if (barTabs.length === 0) {
      const demoTabs = [
        {
          id: 'o-tab1',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          table_number: 'Bar-John',
          status: 'open',
          server_name: 'John Doe',
          cover_count: 1,
          total: 2450,
          preauth_amount: 5000,
          card_last4: '4242',
          items: [
            { id: 'li-t1', name: 'IPD Draft Beer', quantity: 2, unit_price: 700, line_total: 1400, station: 'bar' }
          ]
        },
        {
          id: 'o-tab2',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          table_number: 'Bar-Sarah',
          status: 'open',
          server_name: 'John Doe',
          cover_count: 1,
          total: 1800,
          preauth_amount: 5000,
          card_last4: '9876',
          items: [
            { id: 'li-t2', name: 'Cosmopolitan Cocktail', quantity: 1, unit_price: 1500, line_total: 1500, station: 'bar' }
          ]
        }
      ];
      const updated = [...orders, ...demoTabs];
      saveMockOrders(updated);
      return demoTabs;
    }
    return barTabs;
  });

  function openNewTab() {
    const tabName = prompt('Enter Guest Name / Tab Name:');
    if (!tabName) return;
    createOrder(
      { table_number: `Bar-${tabName}`, cover_count: 1, server_name: 'Bartender' },
      {
        onSuccess: (o: any) => {
          // Initialize mock pre-auth card details
          const all = getMockOrders();
          const saved = all.find(x => x.id === o.id);
          if (saved) {
            saved.preauth_amount = 5000; // $50.00 preauth
            saved.card_last4 = Math.floor(1000 + Math.random() * 9000).toString();
            saveMockOrders(all);
          }
          setActiveOrder(o.id);
          setView('menu');
        }
      }
    );
  }

  return (
    <div className="p-6 bg-[#f8f9fa] h-full overflow-y-auto animate-fadeIn">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e7eb]">
        <div>
          <h1 className="text-lg font-black text-[#1f2937] uppercase tracking-wider">Active Bar Tabs</h1>
          <p className="text-xs text-[#6b7280]">Track bar tabs, guest card pre-authorizations, and bar orders.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('dashboard')}
            className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-bold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-sm">
            Home
          </button>
          <button onClick={openNewTab}
            className="bg-[#ff5f1f] hover:bg-[#e04f1a] text-white font-black px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-sm active:scale-95">
            + New Tab
          </button>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {tabs.map((tab: any) => (
          <button key={tab.id} onClick={() => { setActiveOrder(tab.id); setView('menu'); }}
            className="bg-white rounded-xl p-4 text-left border border-[#e5e7eb] hover:border-[#ff5f1f] transition-all active:scale-95 flex flex-col justify-between h-32 shadow-sm">
            <div className="w-full">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[#1f2937] font-black text-sm uppercase">
                  {tab.table_number}
                </span>
                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-green-50 text-green-600 tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-[10px] text-[#6b7280]">Card: Visa **** {tab.card_last4 ?? '4242'}</p>
              <p className="text-[9px] text-green-600 font-bold mt-1">Pre-Auth: ${(tab.preauth_amount / 100).toFixed(2)}</p>
            </div>
            
            <div className="flex justify-between items-end mt-2 pt-2 border-t border-[#f3f4f6] w-full">
              <span className="text-[9px] text-[#9ca3af]">{tab.items?.length ?? 0} items</span>
              <span className="font-mono text-xs font-black text-[#ff5f1f]">${((tab.total ?? 0) / 100).toFixed(2)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
