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

  if (isLoading) return <div className="flex justify-center mt-20"><div className="w-6 h-6 border-2 border-[#ff5f1f] border-t-transparent rounded-full animate-spin" /></div>;
  if (!menu) return <div className="text-center text-[#88888b] mt-20 p-6">No active menu found.</div>;

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
      price_adjustment: m.price_adjustment,
    }));

    addItem({
      order_id: activeOrderId!,
      menu_item_id: modifyingItem.id,
      name: modifyingItem.name,
      quantity,
      unit_price: modifyingItem.price,
      station: modifyingItem.station,
      notes: itemNotes || undefined,
      selectedModifiers: flatMods,
      seat_number: activeSeat,
    });

    setModifyingItem(null);
  }

  return (
    <div className="flex h-full bg-[#f8f9fa] relative">
      {/* Category Sidebar */}
      <div className="w-44 bg-white border-r border-[#e5e7eb] p-3 flex flex-col gap-1.5 shrink-0">
        {sections.map((s: any) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`text-left px-3 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
              s.id === activeS ? 'bg-[#ff5f1f] text-white' : 'text-[#4b5563] hover:text-[#1f2937] hover:bg-[#f3f4f6]'
            }`}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Grid of Menu Items */}
      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
        {/* Top Controls: Search Bar & Seat Selector */}
        <div className="flex gap-3 shrink-0">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search menu items (e.g. Pizza, Salad, Beer)..."
              className="w-full bg-white border border-[#e5e7eb] focus:border-[#ff5f1f] outline-none rounded-xl p-3 text-xs text-[#1f2937] shadow-sm font-semibold"
            />
          </div>

          {/* Seat Selector Toggle */}
          <div className="flex bg-white border border-[#e5e7eb] rounded-xl p-1 shadow-sm items-center">
            <span className="text-[10px] font-black text-[#6b7280] uppercase px-2">Seat</span>
            {[1, 2, 3, 4].map(sNum => (
              <button key={sNum} onClick={() => setActiveSeat(sNum)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                  activeSeat === sNum ? 'bg-[#ff5f1f] text-white' : 'text-[#4b5563] hover:bg-[#f3f4f6]'
                }`}>
                {sNum}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {items
            .filter((i: any) => i.status !== '86d')
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((item: any) => (
              <button key={item.id} onClick={() => openModifierModal(item)}
                disabled={item.status === 'unavailable'}
                className={`bg-white rounded-xl p-4 text-left border border-[#e5e7eb] hover:border-[#ff5f1f] transition-all flex flex-col justify-between h-32 active:scale-95 shadow-sm ${
                  item.status === 'unavailable' ? 'opacity-40' : ''
                }`}>
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-[#1f2937] font-bold text-xs leading-snug line-clamp-2">{item.name}</p>
                    <span className="text-[9px] font-black bg-[#ff5f1f15] text-[#ff5f1f] px-1.5 py-0.5 rounded">S{activeSeat}</span>
                  </div>
                  {item.description && <p className="text-[#6b7280] text-[10px] mt-1 leading-normal line-clamp-2">{item.description}</p>}
                </div>
                <p className="text-[#ff5f1f] font-extrabold font-mono text-sm">${(item.price / 100).toFixed(2)}</p>
              </button>
            ))}
        </div>
      </div>

      {/* Modifier Modal */}
      {modifyingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-start border-b border-[#e5e7eb] pb-3">
              <div>
                <h3 className="text-base font-black text-[#1f2937] uppercase">{modifyingItem.name}</h3>
                <p className="text-xs text-[#6b7280]">Select options for Seat {activeSeat}</p>
              </div>
              <span className="font-mono font-bold text-[#ff5f1f]">${(modifyingItem.price / 100).toFixed(2)}</span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {modifyingItem.modifier_groups?.map((g: any) => (
                <div key={g.id} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#1f2937] uppercase">{g.name}</span>
                    <span className="text-[#6b7280] text-[10px]">{g.required ? 'Required' : 'Optional'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {g.modifiers?.map((m: any) => {
                      const isSelected = (selectedModifiers[g.id] || []).some(x => x.id === m.id);
                      return (
                        <button key={m.id} onClick={() => handleSelectModifier(g, m)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-colors flex justify-between items-center ${
                            isSelected ? 'border-[#ff5f1f] bg-[#ff5f1f0a] font-bold text-[#ff5f1f]' : 'border-[#e5e7eb] text-[#4b5563]'
                          }`}>
                          <span>{m.name}</span>
                          {m.price_adjustment > 0 && <span className="font-mono text-[10px]">+{m.price_adjustment / 100}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1f2937] uppercase block">Special Instructions</label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g. Allergy, Extra Sauce, Dressing on side"
                  className="w-full border border-[#cbd5e1] rounded-xl p-2.5 text-xs outline-none focus:border-[#ff5f1f]"
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-[#e5e7eb] pt-4">
              <button onClick={() => setModifyingItem(null)}
                className="flex-1 bg-[#f3f4f6] text-[#6b7280] font-bold py-3 rounded-xl text-xs uppercase">
                Cancel
              </button>
              <button onClick={submitModifiers}
                className="flex-1 bg-[#ff5f1f] text-white font-black py-3 rounded-xl text-xs uppercase">
                Add to Ticket (Seat {activeSeat})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
