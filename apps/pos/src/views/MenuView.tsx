import { useState } from 'react';
import { useMenu, useAddLineItem } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import {
  Salad,
  Beef,
  Utensils,
  Wine,
  Coffee,
  CakeSlice,
  Search,
  Plus,
  Minus,
  X,
  Armchair,
  Users,
  Card,
  Badge,
  Button,
} from '@culinaryos/ui';

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('starter') || lower.includes('salad') || lower.includes('appetizer')) return <Salad className="w-4 h-4 text-emerald-600" />;
  if (lower.includes('main') || lower.includes('entree') || lower.includes('steak') || lower.includes('burger')) return <Beef className="w-4 h-4 text-amber-600" />;
  if (lower.includes('pizza')) return <Utensils className="w-4 h-4 text-orange-600" />;
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('cake')) return <CakeSlice className="w-4 h-4 text-rose-500" />;
  if (lower.includes('drink') || lower.includes('bar') || lower.includes('wine') || lower.includes('beverage')) return <Wine className="w-4 h-4 text-indigo-500" />;
  return <Utensils className="w-4 h-4 text-slate-500" />;
}

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
    <div className="flex justify-center items-center h-full bg-background">
      <div className="w-10 h-10 border-3 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!menu) return <div className="text-center text-muted-foreground mt-20 p-6 font-bold">No active menu found.</div>;

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
        let defaultMods = g.modifiers?.filter((m: any) => m.is_default) || [];
        if (defaultMods.length === 0 && g.required && g.modifiers?.length > 0) {
          defaultMods = [g.modifiers[0]];
        }
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
        [group.id]: [mod],
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
    const finalModifiers: Record<string, any[]> = { ...selectedModifiers };
    for (const g of modifyingItem.modifier_groups) {
      const selected = finalModifiers[g.id] || [];
      if (g.required && selected.length < (g.min_selections ?? 1)) {
        if (g.modifiers && g.modifiers.length > 0) {
          finalModifiers[g.id] = [g.modifiers[0]];
        }
      }
    }

    const flatMods = (Object.values(finalModifiers).flat() as any[]).map((m) => ({
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

  return (
    <div className="flex h-full bg-background relative overflow-hidden">
      {/* Category Sidebar */}
      <aside className="w-60 bg-card border-r border-border p-3.5 flex flex-col gap-2 shrink-0 shadow-xs">
        <div className="px-2.5 py-1 text-[11px] font-black text-muted-foreground uppercase tracking-wider">
          Menu Categories
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sections.map((s: any) => {
            const isActive = s.id === activeS && !searchQuery;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  setSearchQuery('');
                }}
                className={`w-full text-left px-3.5 py-3 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-foreground text-background shadow-sm scale-[1.01]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 bg-card border border-border/50'
                }`}
              >
                <span className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-background/20 text-background' : 'bg-muted text-foreground'}`}>
                  {getCategoryIcon(s.name)}
                </span>
                <span className="truncate flex-1 font-extrabold">{s.name}</span>
                {s.items && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-black ${isActive ? 'bg-background/25 text-background' : 'bg-muted text-muted-foreground'}`}>
                    {s.items.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Menu Ordering Canvas */}
      <main className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
        {/* Top Prominent Seat Selection Bar & Search Bar */}
        <div className="flex flex-col lg:flex-row gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
          {/* Prominent Seat Selector */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border/50 overflow-x-auto">
            <span className="text-xs font-black text-muted-foreground uppercase px-2.5 flex items-center gap-1.5 shrink-0">
              <Armchair className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Seat</span>
            </span>
            {[1, 2, 3, 4].map((sNum) => {
              const isSelected = activeSeat === sNum;
              return (
                <button
                  key={sNum}
                  onClick={() => setActiveSeat(sNum)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-foreground text-background shadow-xs scale-105'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground'
                  }`}
                >
                  <span>Seat {sNum}</span>
                </button>
              );
            })}
            <button
              onClick={() => setActiveSeat(0)}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                activeSeat === 0
                  ? 'bg-foreground text-background shadow-xs scale-105'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
              }`}
            >
              <Users className="w-3 h-3 text-muted-foreground" />
              <span>Shared</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 relative flex items-center min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, pizzas, steaks, cocktails, desserts..."
              className="w-full bg-muted/40 border border-border focus:border-foreground focus:bg-card outline-none rounded-xl pl-10 pr-9 py-2.5 text-xs text-foreground font-semibold transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {items
            .filter((i: any) => i.status !== '86d')
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((item: any) => (
              <button
                key={item.id}
                onClick={() => openModifierModal(item)}
                disabled={item.status === 'unavailable'}
                className={`bg-card rounded-2xl p-4 text-left border border-border/80 hover:border-foreground/40 hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[148px] active:scale-[0.98] shadow-xs group ${
                  item.status === 'unavailable' ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-foreground font-extrabold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {item.name}
                    </p>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                      {activeSeat > 0 ? `S${activeSeat}` : 'Shared'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground text-xs mt-1.5 leading-snug line-clamp-2">{item.description}</p>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-border/60 mt-2">
                  <span className="text-foreground font-black font-mono text-sm">
                    ${(item.price / 100).toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground bg-muted/60 group-hover:bg-foreground group-hover:text-background px-2.5 py-1 rounded-lg transition-all flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </span>
                </div>
              </button>
            ))}
        </div>
      </main>

      {/* Item Modifier & Customizer Modal */}
      {modifyingItem && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-card rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-border text-foreground">
            <div className="border-b border-border pb-3 flex justify-between items-start">
              <div>
                <span className="text-xs font-black text-primary uppercase tracking-wider block">
                  Assigning to: {activeSeat > 0 ? `Seat ${activeSeat}` : 'Shared Table'}
                </span>
                <h3 className="text-lg font-black text-foreground uppercase">{modifyingItem.name}</h3>
                <p className="text-sm font-mono font-bold text-muted-foreground mt-0.5">
                  ${(modifyingItem.price / 100).toFixed(2)} Base Price
                </p>
              </div>
              <button
                onClick={() => setModifyingItem(null)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modifier Groups */}
            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
              {modifyingItem.modifier_groups?.map((group: any) => {
                const groupSelected = selectedModifiers[group.id] || [];
                return (
                  <div key={group.id} className="space-y-2 bg-muted/40 p-3.5 rounded-2xl border border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-foreground uppercase tracking-wider">
                        {group.name} {group.required && <span className="text-destructive">*</span>}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground">
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
                            className={`p-3 rounded-xl text-left border font-bold text-xs transition-all flex flex-col justify-between h-16 ${
                              isSelected
                                ? 'border-foreground bg-foreground text-background shadow-xs'
                                : 'border-border bg-card text-foreground hover:border-foreground/40'
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
                <label className="text-xs font-black text-foreground uppercase tracking-wider block">Special Kitchen Notes</label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g. Allergy alert, dressing on side, extra crispy..."
                  className="w-full bg-muted/40 border border-border focus:border-foreground focus:bg-card rounded-xl p-3 text-xs text-foreground font-semibold outline-none shadow-inner"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 bg-muted rounded-xl p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg bg-card text-base font-black hover:bg-muted/80 flex items-center justify-center shadow-xs"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono font-black text-sm px-3">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg bg-card text-base font-black hover:bg-muted/80 flex items-center justify-center shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={submitModifiers}
                className="flex-1 bg-foreground hover:bg-foreground/90 text-background font-black rounded-xl py-3 text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
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

export default MenuView;
