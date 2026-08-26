import { useState } from 'react';
import { useMenu, useAddLineItem } from '../lib/queries';
import { usePOSStore } from '../lib/store';

export function MenuView() {
  const { data: menu, isLoading } = useMenu();
  const { mutate: addItem } = useAddLineItem();
  const { activeOrderId } = usePOSStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeSeat, setActiveSeat] = useState<number>(1);
  
  // Modal State
  const [modifyingItem, setModifyingItem] = useState<any | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, any[]>>({});
  const [itemNotes, setItemNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) return (
    <div className="flex justify-center items-center h-full bg-[#f8f9fa]">
      <div className="w-10 h-10 border-3 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!menu) return <div className="text-center text-[#88888b] mt-20 p-6 font-bold">No active menu found.</div>;

  const sections = menu.sections ?? [];
  const activeS = activeSection ?? sections[0]?.id;
  
  let items: any[] = [];
  if (searchQuery.trim() !== '') {
    items = sections.flatMap((s: any) => s.items || []).filter((i: any) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  } else {
    items = sections.find((s: any) => s.id === activeS)?.items ?? [];
  }

  function openModifierModal(item: any) {
    if (!activeOrderId) { alert('No active order. Go to Tables and open one first.'); return; }
    
    if (item.modifier_groups && item.modifier_groups.length > 0) {
      setModifyingItem(item);
      setItemNotes('');
      setQuantity(1);
      
      // Initialize defaults
      const defaults: Record<string, any[]> = {};
      item.modifier_groups.forEach((g: any) => {
        const defaultMods = g.modifiers?.filter((m: any) => m.is_default) || [];
        defaults[g.id] = defaultMods;
      });
      setSelectedModifiers(defaults);
    } else {
      // Add directly if no modifiers
      addItem({
        order_id: activeOrderId,
        menu_item_id: item.id,
        name: item.name,
        quantity: 1,
        unit_price: item.price,
        station: item.station,
        seat_number: activeSeat,
      });
    }
  }

  function handleSelectModifier(group: any, mod: any) {
    const groupSelected = selectedModifiers[group.id] || [];
    const isAlreadySelected = groupSelected.find((m) => m.id === mod.id);

    if (group.max_selections === 1) {
      setSelectedModifiers({
        ...selectedModifiers,
        [group.id]: isAlreadySelected ? [] : [mod],
      });
    } else {
      if (isAlreadySelected) {
        setSelectedModifiers({
          ...selectedModifiers,
          [group.id]: groupSelected.filter((m) => m.id !== mod.id),
        });
      } else {
        if (groupSelected.length < group.max_selections) {
          setSelectedModifiers({
            ...selectedModifiers,
            [group.id]: [...groupSelected, mod],
          });
        } else {
          alert(`Maximum of ${group.max_selections} selections allowed for ${group.name}.`);
        }
      }
    }
  }

  function submitModifiers() {
    for (const g of modifyingItem.modifier_groups) {
      const selected = selectedModifiers[g.id] || [];
      if (g.required && selected.length < g.min_selections) {
        alert(`Please make a selection for: ${g.name}`);
        return;
      }
    }

    const flatMods = (Object.values(selectedModifiers).flat() as any[]).map((m) => ({
      modifier_id: m.id,
      name: m.name,
      price_adjustment: m.price_adjustment ?? m.price_adjustment_cents ?? 0,
    }));

    addItem({
      order_id: activeOrderId!,
      menu_item_id: modifyingItem.id,
      name: modifyingItem.name,
      quantity,
      unit_price: modifyingItem.price,
      station: modifyingItem.station,
      seat_number: activeSeat,
      notes: itemNotes.trim() || undefined,
      selectedModifiers: flatMods,
    });

    setModifyingItem(null);
  }

  const categoryIcons: Record<string, string> = {
    'Starters': '🥗',
    'Appetizers': '🥟',
    'Mains': '🥩',
    'Entrees': '🍽️',
    'Pizzas': '🍕',
    'Pizza': '🍕',
    'Burgers': '🍔',
    'Sides': '🍟',
    'Desserts': '🍰',
    'Beverages': '🍹',
    'Bar': '🍺',
    'Drinks': '🍷',
  };

  return (
    <div className="flex h-full bg-[#f8f9fa] relative overflow-hidden">
      {/* Category Sidebar */}
      <div className="w-56 bg-white border-r border-[#e5e7eb] p-3 flex flex-col gap-2 shrink-0 shadow-xs">
        <div className="px-2 py-1 text-[11px] font-black text-[#9ca3af] uppercase tracking-wider">Categories</div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sections.map((s: any) => {
            const icon = categoryIcons[s.name] || '🍴';
            const isActive = s.id === activeS && !searchQuery;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  setSearchQuery('');
                }}
                className={`w-full text-left px-4 py-3.5 rounded-xl font-black text-sm tracking-wide transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-[#0f172a] text-white shadow-md scale-[1.02]'
                    : 'text-[#374151] hover:text-[#111827] hover:bg-[#f3f4f6] bg-[#fafafa] border border-[#f3f4f6]'
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="truncate">{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Menu Ordering Canvas */}
      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-5">
        {/* Top Prominent Seat Selection Bar & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-[#e5e7eb] shadow-sm">
          {/* Prominent Seat Selector */}
          <div className="flex items-center gap-1.5 bg-[#f3f4f6] p-1.5 rounded-xl">
            <span className="text-xs font-black text-[#6b7280] uppercase px-3 flex items-center gap-1">
              <span>🪑</span>
              <span>Seat</span>
            </span>
            {[1, 2, 3, 4].map((sNum) => {
              const isSelected = activeSeat === sNum;
              return (
                <button
                  key={sNum}
                  onClick={() => setActiveSeat(sNum)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0f172a] text-white shadow-md scale-105'
                      : 'text-[#4b5563] hover:bg-white hover:text-[#111827]'
                  }`}
                >
                  <span>Seat {sNum}</span>
                </button>
              );
            })}
            <button
              onClick={() => setActiveSeat(0)}
              className={`px-3 py-2.5 rounded-lg text-xs font-black transition-all ${
                activeSeat === 0
                  ? 'bg-[#0f172a] text-white shadow-md scale-105'
                  : 'text-[#4b5563] hover:bg-white hover:text-[#111827]'
              }`}
            >
              <span>Shared</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search all dishes, burgers, drinks..."
              className="w-full h-full bg-[#f8f9fa] border border-[#e5e7eb] focus:border-[#0f172a] focus:bg-white outline-none rounded-xl px-4 py-2.5 text-xs text-[#1f2937] font-bold transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid gap-4.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {items
            .filter((i: any) => i.status !== '86d')
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((item: any) => (
              <button
                key={item.id}
                onClick={() => openModifierModal(item)}
                disabled={item.status === 'unavailable'}
                className={`bg-white rounded-2xl p-4.5 text-left border-2 border-[#e5e7eb] hover:border-[#0f172a] hover:shadow-lg transition-all flex flex-col justify-between h-40 active:scale-[0.98] shadow-xs group ${
                  item.status === 'unavailable' ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-[#1f2937] font-black text-sm leading-snug line-clamp-2 group-hover:text-[#0f172a]">
                      {item.name}
                    </p>
                    <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                      {activeSeat > 0 ? `S${activeSeat}` : 'Shared'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-[#6b7280] text-xs mt-1.5 leading-normal line-clamp-2">{item.description}</p>
                  )}
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-gray-100 mt-2">
                  <span className="text-[#0f172a] font-black font-mono text-base">
                    ${(item.price / 100).toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-gray-400 group-hover:text-slate-900 flex items-center gap-0.5">
                    <span>+ Add</span>
                  </span>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Item Modifier & Customizer Modal */}
      {modifyingItem && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-[#e5e7eb]">
            <div className="border-b border-[#e5e7eb] pb-3 flex justify-between items-start">
              <div>
                <span className="text-xs font-black text-blue-600 uppercase tracking-wider block">
                  Assigning to: {activeSeat > 0 ? `Seat ${activeSeat}` : 'Shared Table'}
                </span>
                <h3 className="text-lg font-black text-[#1f2937] uppercase">{modifyingItem.name}</h3>
                <p className="text-sm font-mono font-bold text-[#0f172a] mt-0.5">
                  ${(modifyingItem.price / 100).toFixed(2)} Base Price
                </p>
              </div>
              <button
                onClick={() => setModifyingItem(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modifier Groups */}
            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
              {modifyingItem.modifier_groups?.map((group: any) => {
                const groupSelected = selectedModifiers[group.id] || [];
                return (
                  <div key={group.id} className="space-y-2 bg-[#f8f9fa] p-3.5 rounded-2xl border border-[#e5e7eb]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-[#1f2937] uppercase tracking-wider">
                        {group.name} {group.required && <span className="text-red-500">*</span>}
                      </span>
                      <span className="text-[10px] font-bold text-[#6b7280]">
                        {group.max_selections === 1 ? 'Choose 1' : `Up to ${group.max_selections}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {group.modifiers?.map((mod: any) => {
                        const isSelected = !!groupSelected.find((m) => m.id === mod.id);
                        const priceAdj = mod.price_adjustment ?? mod.price_adjustment_cents ?? 0;
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => handleSelectModifier(group, mod)}
                            className={`p-3 rounded-xl text-left border-2 font-bold text-xs transition-all flex flex-col justify-between h-16 ${
                              isSelected
                                ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-sm'
                                : 'border-[#e5e7eb] bg-white text-[#374151] hover:border-[#9ca3af]'
                            }`}
                          >
                            <span className="truncate">{mod.name}</span>
                            <span className="text-[10px] font-mono opacity-90">
                              {priceAdj > 0 ? `+$${(priceAdj / 100).toFixed(2)}` : 'Included'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Special Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#1f2937] uppercase tracking-wider block">Special Kitchen Notes</label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g. Allergy alert, dressing on side, extra crispy..."
                  className="w-full bg-[#f8f9fa] border border-[#e5e7eb] focus:border-[#0f172a] focus:bg-white rounded-xl p-3 text-xs text-[#1f2937] font-semibold outline-none shadow-inner"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2 border-t border-[#e5e7eb]">
              <div className="flex items-center gap-1.5 bg-[#f3f4f6] rounded-xl p-1 border border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg bg-white text-base font-black hover:bg-gray-100 flex items-center justify-center shadow-xs"
                >
                  -
                </button>
                <span className="font-mono font-black text-sm px-3">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg bg-white text-base font-black hover:bg-gray-100 flex items-center justify-center shadow-xs"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={submitModifiers}
                className="flex-1 bg-[#0f172a] hover:bg-[#1e293b] text-white font-black rounded-xl py-3 text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Add to Ticket</span>
                <span>•</span>
                <span>Seat {activeSeat > 0 ? activeSeat : 'Shared'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
