import { useState } from 'react';
import { useMenu, useAddLineItem } from '../lib/queries';
import { usePOSStore } from '../lib/store';

export function MenuView() {
  const { data: menu, isLoading } = useMenu();
  const { mutate: addItem } = useAddLineItem();
  const { activeOrderId, setView } = usePOSStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center mt-20"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!menu) return <div className="text-center text-[#444444] mt-20 p-6">No active menu found.</div>;

  const sections = menu.sections ?? [];
  const activeS = activeSection ?? sections[0]?.id;
  const items = sections.find((s: any) => s.id === activeS)?.items ?? [];

  function addToOrder(item: any) {
    if (!activeOrderId) { alert('No active order. Go to Tables and open one first.'); return; }
    addItem({ order_id: activeOrderId, menu_item_id: item.id, name: item.name, quantity: 1, unit_price: item.price, station: item.station },
      { onSuccess: () => setView('order') });
  }

  return (
    <div className="flex h-full">
      {/* Section nav */}
      <div className="w-44 bg-[#111111] border-r border-[#1a1a1a] p-3 flex flex-col gap-1">
        {sections.map((s: any) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`text-left px-3 py-2.5 rounded text-sm font-semibold transition-colors ${
              s.id === activeS ? 'bg-green-600 text-white' : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
            }`}>
            {s.name}
          </button>
        ))}
      </div>
      {/* Items grid */}
      <div className="flex-1 p-5 overflow-auto">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {items
            .filter((i: any) => i.status !== '86d')
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((item: any) => (
              <button key={item.id} onClick={() => addToOrder(item)}
                disabled={item.status === 'unavailable'}
                className={`bg-[#111111] rounded-xl p-4 text-left border border-[#1a1a1a] hover:border-green-600 transition-colors ${
                  item.status === 'unavailable' ? 'opacity-40' : ''
                }`}>
                <p className="text-white font-semibold text-sm leading-tight">{item.name}</p>
                {item.description && <p className="text-[#666666] text-xs mt-1 leading-tight line-clamp-2">{item.description}</p>}
                <p className="text-green-400 font-bold mt-2">${(item.price / 100).toFixed(2)}</p>
                {item.status === 'unavailable' && <p className="text-red-400 text-xs mt-1">Unavailable</p>}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
