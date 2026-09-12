import { useState } from 'react';
import { usePOSStore } from '../lib/store';
import { getMockOrders, saveMockOrders } from '../lib/mockDb';
import { useCreateOrder } from '../lib/queries';
import { Button } from '@culinaryos/ui';

export function TabsView() {
  const { setView, setActiveOrder } = usePOSStore();
  const { mutate: createOrder } = useCreateOrder();
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
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
    setNewTabName('');
    setShowNewTabModal(true);
    return;
  }

  function confirmNewTab() {
    const tabName = newTabName.trim();
    if (!tabName) return;
    setShowNewTabModal(false);
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
          <Button variant="secondary" onClick={() => setView('dashboard')}
            className="px-4 py-2.5 h-auto uppercase tracking-wider">
            Home
          </Button>
          <Button variant="brand" onClick={openNewTab}
            className="px-4 py-2.5 h-auto uppercase tracking-wider">
            + New Tab
          </Button>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {tabs.map((tab: any) => (
          <Button key={tab.id} variant="ghost" onClick={() => { setActiveOrder(tab.id); setView('menu'); }}
            className="bg-white hover:bg-white rounded-xl p-4 h-32 w-full text-left border border-[#e5e7eb] hover:border-[#0f172a] shadow-sm [&>span]:w-full [&>span]:flex-col [&>span]:items-stretch [&>span]:justify-between">
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
              <span className="font-mono text-xs font-black text-[#0f172a]">${((tab.total ?? 0) / 100).toFixed(2)}</span>
            </div>
          </Button>
        ))}
      {showNewTabModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewTabModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">New Bar Tab</h3>
            <input
              autoFocus
              type="text"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="Guest name"
              aria-label="Guest name for new tab"
              onKeyDown={(e) => { if (e.key === 'Enter') confirmNewTab(); if (e.key === 'Escape') setShowNewTabModal(false); }}
              className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-900"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowNewTabModal(false)} className="flex-1 min-h-[48px] rounded-xl border-2 border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">Cancel</button>
              <button type="button" onClick={confirmNewTab} disabled={!newTabName.trim()} className="flex-1 min-h-[48px] rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">Open Tab</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
