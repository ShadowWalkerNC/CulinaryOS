import { useState } from 'react';
import { useMenu, useAddLineItem } from '../lib/queries';
import { usePOSStore } from '../lib/store';

export function MenuView() {
  const { data: menu, isLoading } = useMenu();
  const { mutate: addItem } = useAddLineItem();
  const { activeOrderId } = usePOSStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  // Modal State
  const [modifyingItem, setModifyingItem] = useState<any | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, any[]>>({});
  const [itemNotes, setItemNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  if (isLoading) return <div className="flex justify-center mt-20"><div className="w-6 h-6 border-2 border-[#ff5f1f] border-t-transparent rounded-full animate-spin" /></div>;
  if (!menu) return <div className="text-center text-[#88888b] mt-20 p-6">No active menu found.</div>;

  const sections = menu.sections ?? [];
  const activeS = activeSection ?? sections[0]?.id;
  const items = sections.find((s: any) => s.id === activeS)?.items ?? [];

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
        station: item.station
      });
    }
  }

  function handleSelectModifier(group: any, mod: any) {
    const groupSelected = selectedModifiers[group.id] || [];
    const isAlreadySelected = groupSelected.find((m) => m.id === mod.id);

    if (group.max_selections === 1) {
      // Radio selection behavior
      setSelectedModifiers({
        ...selectedModifiers,
        [group.id]: isAlreadySelected ? [] : [mod],
      });
    } else {
      // Checkbox selection behavior
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
    // Validate required selections
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
      <div className="flex-1 p-5 overflow-y-auto">
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
                  <p className="text-[#1f2937] font-bold text-xs leading-snug line-clamp-2">{item.name}</p>
                  {item.description && <p className="text-[#6b7280] text-[10px] mt-1 leading-normal line-clamp-2">{item.description}</p>}
                </div>
                <p className="text-[#ff5f1f] font-extrabold font-mono text-sm">${(item.price / 100).toFixed(2)}</p>
                {item.status === 'unavailable' && <p className="text-red-500 text-[10px] mt-1">Unavailable</p>}
              </button>
            ))}
        </div>
      </div>

      {/* Toast-style Modifier Selection Modal Overlay */}
      {modifyingItem && (
        <div className="absolute inset-0 bg-[#00000040] backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl w-full max-w-lg flex flex-col max-h-[90%] overflow-hidden shadow-2xl">
            {/* Modal Title */}
            <div className="p-4 border-b border-[#e5e7eb] flex justify-between items-center bg-[#f8f9fa]">
              <div>
                <h3 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">{modifyingItem.name}</h3>
                <p className="text-xs text-[#ff5f1f] font-bold mt-0.5">${(modifyingItem.price / 100).toFixed(2)} Base</p>
              </div>
              <button onClick={() => setModifyingItem(null)} className="text-xs text-[#6b7280] hover:text-[#1f2937] uppercase font-bold">
                Cancel
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white">
              {modifyingItem.modifier_groups?.map((g: any) => {
                const selected = selectedModifiers[g.id] || [];
                return (
                  <div key={g.id} className="space-y-2 bg-[#f8f9fa] p-3.5 rounded-xl border border-[#e5e7eb]">
                    <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-1.5">
                      <span className="text-xs font-black text-[#1f2937] uppercase tracking-wider">{g.name}</span>
                      <span className="text-[10px] font-bold text-[#6b7280]">
                        {g.required ? (
                          <span className="text-[#ff5f1f] font-black mr-1">[REQUIRED]</span>
                        ) : null}
                        {g.max_selections === 1 ? 'Choose 1' : `Max ${g.max_selections}`}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {g.modifiers?.map((m: any) => {
                        const isChecked = !!selected.find((x) => x.id === m.id);
                        return (
                          <button key={m.id} onClick={() => handleSelectModifier(g, m)}
                            className={`flex justify-between items-center p-2.5 rounded-lg border text-left transition-all ${
                              isChecked
                                ? 'bg-[#ff5f1f10] border-[#ff5f1f] text-[#ff5f1f] font-bold'
                                : 'bg-white border-[#e5e7eb] text-[#4b5563] hover:text-[#1f2937] hover:border-[#cbd5e1]'
                            }`}>
                            <span className="text-xs font-semibold">{m.name}</span>
                            {m.price_adjustment > 0 ? (
                              <span className="text-[10px] font-bold text-[#ff5f1f] font-mono">+${(m.price_adjustment / 100).toFixed(2)}</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Special Instructions Notes */}
              <div className="space-y-2 bg-[#f8f9fa] p-3.5 rounded-xl border border-[#e5e7eb]">
                <span className="text-xs font-black text-[#1f2937] uppercase tracking-wider block border-b border-[#e5e7eb] pb-1.5">Special Notes</span>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="E.g., Dressing on the side, extra crispy..."
                  className="w-full bg-white border border-[#d1d5db] rounded-lg p-2.5 text-xs text-[#1f2937] outline-none focus:border-[#ff5f1f] resize-none h-16"
                />
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 border-t border-[#e5e7eb] bg-[#f8f9fa] flex items-center justify-between">
              {/* Quantity Counter */}
              <div className="flex items-center gap-3 border border-[#e5e7eb] rounded-lg p-1 bg-white">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-bold text-sm">-</button>
                <span className="text-xs font-black w-4 text-center text-[#1f2937]">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-bold text-sm">+</button>
              </div>

              <button onClick={submitModifiers}
                className="bg-[#ff5f1f] hover:bg-[#e04f1a] text-white font-black px-6 py-3 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-sm">
                Add To Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
