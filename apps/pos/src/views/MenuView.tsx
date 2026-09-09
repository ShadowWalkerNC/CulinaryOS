import { useState } from 'react';
import { useMenu, useAddLineItem } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import {
  Button,
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
  ChevronRight,
  Check,
} from '@culinaryos/ui';
import {
  type ModifierGroup,
  type Modifier,
  calculateModifierGroupPrices,
  flattenSelectedModifiers,
} from '@culinaryos/shared';

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
  const [itemCourse, setItemCourse] = useState<number>(1);
  const [quantity, setQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto Course Assignment based on section name / category
  function getDefaultCourseNumber(sectionName?: string, itemName?: string): number {
    const text = `${sectionName || ''} ${itemName || ''}`.toLowerCase();
    if (text.includes('starter') || text.includes('app') || text.includes('soup') || text.includes('salad') || text.includes('chowder') || text.includes('fry') || text.includes('fries') || text.includes('calamari')) return 1;
    if (text.includes('dessert') || text.includes('pie') || text.includes('cake') || text.includes('sweet') || text.includes('ice cream') || text.includes('brownie')) return 3;
    if (text.includes('drink') || text.includes('beverage') || text.includes('beer') || text.includes('wine') || text.includes('soda') || text.includes('bar')) return 1;
    return 2; // Default mains/entrees to Course 2
  }

  // Open Item / Custom Price State
  const [showOpenItemModal, setShowOpenItemModal] = useState(false);
  const [openItemName, setOpenItemName] = useState('');
  const [openItemPriceDollars, setOpenItemPriceDollars] = useState('');
  const [openItemStation, setOpenItemStation] = useState('expo');
  const [openItemNotes, setOpenItemNotes] = useState('');

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

  function initGroupDefaults(groups: ModifierGroup[], target: Record<string, any[]>) {
    groups.forEach((g: any) => {
      let defaultMods = g.modifiers?.filter((m: any) => m.is_default || m.isDefault) || [];
      if (defaultMods.length === 0 && g.required && g.modifiers?.length > 0) {
        defaultMods = [g.modifiers[0]];
      }
      target[g.id] = defaultMods;

      // Check sub-modifiers
      g.modifiers?.forEach((m: any) => {
        if (m.nestedGroups && m.nestedGroups.length > 0) {
          initGroupDefaults(m.nestedGroups, target);
        }
      });
      if (g.nestedGroups && g.nestedGroups.length > 0) {
        initGroupDefaults(g.nestedGroups, target);
      }
    });
  }

  function openModifierModal(item: any) {
    if (!activeOrderId) { alert('No active order. Go to Tables and open one first.'); return; }
    
    const currentSectionName = sections.find((s: any) => s.id === activeS)?.name;
    const defaultCourse = getDefaultCourseNumber(currentSectionName, item.name);

    if (item.modifier_groups && item.modifier_groups.length > 0) {
      setModifyingItem(item);
      setItemNotes('');
      setItemCourse(defaultCourse);
      setQuantity(1);
      setValidationError(null);
      
      const defaults: Record<string, any[]> = {};
      initGroupDefaults(item.modifier_groups, defaults);
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
        course_number: defaultCourse,
      });
    }
  }

  function handleSelectModifier(group: any, mod: any) {
    setValidationError(null);
    const maxSelections = group.max_selections ?? group.maxSelections ?? 1;
    const groupSelected = selectedModifiers[group.id] || [];
    const isAlreadySelected = groupSelected.find((m) => m.id === mod.id);

    if (maxSelections === 1) {
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
        if (groupSelected.length < maxSelections) {
          setSelectedModifiers({
            ...selectedModifiers,
            [group.id]: [...groupSelected, mod],
          });
        } else {
          setValidationError(`Maximum of ${maxSelections} selections allowed for ${group.name}.`);
        }
      }
    }
  }

  // Calculate live item price including nested modifiers and free allowances
  function calculateModifiersTotal(groups: ModifierGroup[]): number {
    let total = 0;
    for (const group of groups) {
      const selectedMods = selectedModifiers[group.id] || [];
      const selectedIds = selectedMods.map((m: any) => m.id);
      const priced = calculateModifierGroupPrices(group, selectedIds);
      for (const p of priced) {
        total += p.effectivePriceCents;
      }

      for (const mod of selectedMods) {
        if (mod.nestedGroups && mod.nestedGroups.length > 0) {
          total += calculateModifiersTotal(mod.nestedGroups);
        }
      }
      if (group.nestedGroups && group.nestedGroups.length > 0) {
        total += calculateModifiersTotal(group.nestedGroups);
      }
    }
    return total;
  }

  function submitModifiers() {
    const finalModifiers: Record<string, any[]> = { ...selectedModifiers };
    const groups: ModifierGroup[] = modifyingItem.modifier_groups ?? [];

    for (const g of groups) {
      const selected = finalModifiers[g.id] || [];
      const minRequired = g.required ? (g.minSelections ?? (g as any).min_selections ?? 1) : 0;
      if (selected.length < minRequired) {
        setValidationError(`Group "${g.name}" requires at least ${minRequired} selection(s).`);
        return;
      }
    }

    const flatMods: any[] = [];

    function collectFlatModifiers(groupList: ModifierGroup[], prefix = '') {
      for (const g of groupList) {
        const selected = finalModifiers[g.id] || [];
        const selectedIds = selected.map((m) => m.id);
        const priced = calculateModifierGroupPrices(g, selectedIds);

        for (let i = 0; i < selected.length; i++) {
          const mod = selected[i];
          const p = priced[i];
          const fullName = prefix ? `${prefix} ↳ ${mod.name}` : mod.name;

          flatMods.push({
            modifier_id: mod.id,
            name: fullName,
            price_adjustment: p.effectivePriceCents,
          });

          if (mod.nestedGroups && mod.nestedGroups.length > 0) {
            collectFlatModifiers(mod.nestedGroups, mod.name);
          }
        }

        if (g.nestedGroups && g.nestedGroups.length > 0) {
          collectFlatModifiers(g.nestedGroups, prefix);
        }
      }
    }

    collectFlatModifiers(groups);

    addItem({
      order_id: activeOrderId!,
      menu_item_id: modifyingItem.id,
      name: modifyingItem.name,
      quantity,
      unit_price: modifyingItem.price,
      station: modifyingItem.station,
      seat_number: activeSeat,
      course_number: itemCourse,
      notes: itemNotes.trim() || undefined,
      selectedModifiers: flatMods,
    });

    setModifyingItem(null);
  }

  // Recursive Modifier Group Card Renderer
  function renderModifierGroups(groups: ModifierGroup[], depth = 0) {
    return groups.map((group: any) => {
      const groupSelected = selectedModifiers[group.id] || [];
      const isSingle = (group.max_selections ?? group.maxSelections) === 1;
      const maxSelections = group.max_selections ?? group.maxSelections ?? 1;
      const freeQuantity = group.free_quantity ?? group.freeQuantity ?? 0;

      // Price calculation
      const priced = calculateModifierGroupPrices(group, groupSelected.map((m: any) => m.id));
      const pricedMap = new Map<string, { effectivePriceCents: number; isFree: boolean }>();
      priced.forEach((p) => pricedMap.set(p.modifierId, { effectivePriceCents: p.effectivePriceCents, isFree: p.isFree }));

      return (
        <div
          key={group.id}
          className={`space-y-2 p-3.5 rounded-2xl border transition-all ${
            depth > 0
              ? 'bg-amber-50/50 border-amber-300/80 ml-3 shadow-xs'
              : 'bg-muted/40 border-border'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              {depth > 0 && <ChevronRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              <span className="text-xs font-black text-foreground uppercase tracking-wider">
                {group.name} {group.required && <span className="text-destructive">*</span>}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {freeQuantity > 0 && (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  {freeQuantity} Free
                </span>
              )}
              <span className="text-[10px] font-bold text-muted-foreground">
                {isSingle ? 'Choose 1' : `Up to ${maxSelections}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {group.modifiers?.map((mod: any) => {
              const isSelected = !!groupSelected.find((m: any) => m.id === mod.id);
              const originalAdj = mod.price_adjustment ?? mod.price_adjustment_cents ?? mod.priceAdjustment ?? 0;
              const calculated = pricedMap.get(mod.id);
              const effectiveAdj = isSelected ? (calculated?.effectivePriceCents ?? originalAdj) : originalAdj;
              const isFreeAllowance = isSelected ? (calculated?.isFree && originalAdj > 0) : false;

              return (
                <div key={mod.id} className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleSelectModifier(group, mod)}
                    className={`min-h-[54px] p-3 h-auto rounded-xl text-left border font-bold text-xs [&>span]:w-full [&>span]:flex-col [&>span]:items-stretch ${
                      isSelected
                        ? 'border-foreground bg-foreground text-background shadow-xs scale-[1.01] hover:bg-foreground hover:text-background'
                        : 'border-border bg-card text-foreground hover:bg-card hover:text-foreground hover:border-foreground/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{mod.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-background" />}
                    </div>
                    <span className="text-[10px] font-mono opacity-90">
                      {isFreeAllowance ? (
                        <span className="text-emerald-400 font-extrabold uppercase">Free ($0.00)</span>
                      ) : effectiveAdj > 0 ? (
                        `+$${(effectiveAdj / 100).toFixed(2)}`
                      ) : (
                        'Included'
                      )}
                    </span>
                  </Button>

                  {/* Render Nested Modifier Groups */}
                  {isSelected && mod.nestedGroups && mod.nestedGroups.length > 0 && (
                    <div className="pl-2 pt-1 animate-fadeIn">
                      {renderModifierGroups(mod.nestedGroups, depth + 1)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {group.nestedGroups && group.nestedGroups.length > 0 && (
            <div className="pt-2">
              {renderModifierGroups(group.nestedGroups, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  const currentModPrice = modifyingItem ? calculateModifiersTotal(modifyingItem.modifier_groups ?? []) : 0;
  const currentTotalItemPrice = modifyingItem ? (modifyingItem.price + currentModPrice) * quantity : 0;

  return (
    <div className="flex h-full bg-[#f8f9fa] relative overflow-hidden">
      {/* Category Sidebar */}
      <aside className="w-64 bg-white border-r-2 border-slate-200 p-4 flex flex-col gap-2 shrink-0 shadow-xs">
        <div className="px-2 py-1 text-[11px] font-black text-slate-500 uppercase tracking-wider">
          Menu Categories
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sections.map((s: any) => {
            const isActive = s.id === activeS && !searchQuery;
            return (
              <Button
                key={s.id}
                variant="ghost"
                onClick={() => {
                  setActiveSection(s.id);
                  setSearchQuery('');
                }}
                className={`w-full justify-start text-left px-3.5 py-3 rounded-xl font-bold text-xs tracking-wide flex items-center gap-3 border-2 ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-[1.01] hover:bg-slate-900 hover:text-white'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50 bg-white border-slate-200/90'
                }`}
              >
                <span className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {getCategoryIcon(s.name)}
                </span>
                <span className="truncate flex-1 font-extrabold">{s.name}</span>
                {s.items && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {s.items.length}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </aside>

      {/* Main Menu Ordering Canvas */}
      <main className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
        {/* Top Prominent Seat Selection Bar & Search Bar */}
        <div className="flex flex-col lg:flex-row gap-3 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
          {/* Prominent Seat Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
            <span className="text-xs font-black text-slate-700 uppercase px-2.5 flex items-center gap-1.5 shrink-0">
              <Armchair className="w-4 h-4 text-slate-600" />
              <span>Seat Assignment</span>
            </span>
            {[1, 2, 3, 4].map((sNum) => {
              const isSelected = activeSeat === sNum;
              return (
                <Button
                  key={sNum}
                  variant="ghost"
                  onClick={() => setActiveSeat(sNum)}
                  className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 shrink-0 border-2 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-105 hover:bg-slate-900 hover:text-white'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900 border-transparent'
                  }`}
                >
                  <span>Seat {sNum}</span>
                </Button>
              );
            })}
            <Button
              variant="ghost"
              onClick={() => setActiveSeat(0)}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 shrink-0 border-2 ${
                activeSeat === 0
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-105 hover:bg-slate-900 hover:text-white'
                  : 'text-slate-700 hover:bg-white hover:text-slate-900 border-transparent'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Shared</span>
            </Button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 relative flex items-center min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, pizzas, steaks, cocktails, desserts..."
              className="w-full bg-muted/40 border border-border focus:border-foreground focus:bg-card outline-none rounded-xl pl-10 pr-9 py-2.5 text-xs text-foreground font-semibold transition-all shadow-inner"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 h-5 w-5 rounded-full"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Quick Open Item / Custom Bakery Special Button */}
          <Button
            variant="warning"
            onClick={() => {
              if (!activeOrderId) { alert('No active order. Go to Tables and open one first.'); return; }
              setOpenItemName('');
              setOpenItemPriceDollars('');
              setOpenItemNotes('');
              setShowOpenItemModal(true);
            }}
            className="px-3.5 py-2 h-auto rounded-xl text-xs font-black gap-1.5 shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950"
            title="Ring up an off-menu item, daily special, or custom price"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>+ Open Item</span>
          </Button>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items
            .filter((i: any) => i.status !== '86d')
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((item: any) => {
              const primaryGroup = item.modifier_groups?.[0];
              const quickModifiers = primaryGroup?.modifiers?.slice(0, 3) ?? [];

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 text-left border-2 border-slate-200/90 hover:border-slate-900 hover:shadow-lg transition-all duration-150 flex flex-col justify-between min-h-[168px] shadow-xs group ${
                    item.status === 'unavailable' ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
                  }`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => openModifierModal(item)}
                    className="text-left w-full h-auto p-0 rounded-none hover:bg-transparent [&>span]:w-full [&>span]:flex-col [&>span]:items-stretch"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-slate-900 font-black text-sm leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                        {item.name}
                      </p>
                      <span className="text-[10px] font-black bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 shrink-0">
                        {activeSeat > 0 ? `Seat ${activeSeat}` : 'Shared'}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-slate-500 text-xs mt-1.5 leading-snug line-clamp-2 font-medium">{item.description}</p>
                    )}
                  </Button>

                  {/* Inline Fast Modifier Chips (Toast Go / M3 Ergonomics) */}
                  {quickModifiers.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 flex flex-wrap gap-1">
                      {quickModifiers.map((qm: any) => (
                        <Button
                          key={qm.id}
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!activeOrderId) { alert('No active order. Open table first.'); return; }
                            addItem({
                              order_id: activeOrderId,
                              menu_item_id: item.id,
                              name: `${item.name} (${qm.name})`,
                              quantity: 1,
                              unit_price: item.price + (qm.price_adjustment || 0),
                              station: item.station,
                              seat_number: activeSeat,
                              selectedModifiers: [{
                                modifier_id: qm.id,
                                name: qm.name,
                                price_adjustment: qm.price_adjustment || 0,
                              }],
                            });
                          }}
                          className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 active:scale-95 flex items-center gap-1"
                          title={`Quick add ${item.name} with ${qm.name}`}
                        >
                          <span>{qm.name}</span>
                          {qm.price_adjustment > 0 && (
                            <span className="font-mono text-slate-400 group-hover:text-slate-300">+${(qm.price_adjustment / 100).toFixed(2)}</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2.5">
                    <span className="text-slate-900 font-black font-mono text-sm">
                      ${(item.price / 100).toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => openModifierModal(item)}
                      className="min-h-[44px] px-4 py-2 text-xs font-black text-slate-900 bg-slate-50 hover:bg-orange-50 hover:text-orange-900 hover:border-orange-500 border-2 border-slate-300 rounded-full shadow-sm"
                    >
                      <Plus className="w-4 h-4 text-orange-600" />
                      <span>{item.modifier_groups?.length > 0 ? 'Customize' : 'Add to Seat'}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
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
                  {currentModPrice > 0 && ` + $${(currentModPrice / 100).toFixed(2)} Modifiers`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModifyingItem(null)}
                aria-label="Close customizer"
                className="h-8 w-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modifier Groups Tree */}
            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
              {renderModifierGroups(modifyingItem.modifier_groups ?? [])}

              {/* Course Assignment Override */}
              <div className="space-y-1.5 bg-muted/40 p-3 rounded-2xl border border-border">
                <label className="text-[11px] font-black text-foreground uppercase tracking-wider block">
                  Course Firing Schedule
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { num: 1, label: 'Course 1 (Apps/Drinks)' },
                    { num: 2, label: 'Course 2 (Mains/Entrees)' },
                    { num: 3, label: 'Course 3 (Desserts)' },
                  ].map((c) => (
                    <Button
                      key={c.num}
                      type="button"
                      variant="ghost"
                      onClick={() => setItemCourse(c.num)}
                      className={`py-2 px-2.5 h-auto rounded-xl text-xs font-black flex-col text-center [&>span]:flex-col [&>span]:items-center [&>span]:gap-0.5 ${
                        itemCourse === c.num
                          ? 'bg-slate-900 text-white shadow-xs hover:bg-slate-900 hover:text-white'
                          : 'bg-card text-foreground hover:bg-muted hover:text-foreground border border-border'
                      }`}
                    >
                      <span>C{c.num}</span>
                      <span className="text-[9px] opacity-75 font-normal">{c.num === 1 ? 'First' : c.num === 2 ? 'Main' : 'Sweet'}</span>
                    </Button>
                  ))}
                </div>
              </div>

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

              {/* Validation Error Banner */}
              {validationError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 bg-muted rounded-xl p-1 border border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-mono font-black text-sm px-3">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={submitModifiers}
                className="flex-1 bg-foreground hover:bg-foreground/90 text-background hover:text-background font-black rounded-xl py-3 h-auto text-xs uppercase tracking-wider shadow-md px-4 [&>span]:w-full [&>span]:justify-between"
              >
                <span>Add to Ticket (Seat {activeSeat > 0 ? activeSeat : 'Shared'})</span>
                <span className="font-mono text-sm">${(currentTotalItemPrice / 100).toFixed(2)}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Open Item / Custom Price Modal */}
      {showOpenItemModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-card rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-border text-foreground">
            <div className="border-b border-border pb-3 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">
                  Quick Service / Off-Menu Special
                </span>
                <h3 className="text-base font-black text-foreground uppercase">Ring Open Custom Item</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowOpenItemModal(false)}
                aria-label="Close open item modal"
                className="h-7 w-7 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Item Description / Name</label>
                <input
                  type="text"
                  value={openItemName}
                  onChange={(e) => setOpenItemName(e.target.value)}
                  placeholder="e.g. Daily Scone, Soup of the Day, Custom Salad..."
                  className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-3 text-xs font-semibold outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Price ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={openItemPriceDollars}
                  onChange={(e) => setOpenItemPriceDollars(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-3 text-sm font-mono font-black outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Prep Station</label>
                  <select
                    value={openItemStation}
                    onChange={(e) => setOpenItemStation(e.target.value)}
                    className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-2.5 text-xs font-semibold outline-none"
                  >
                    <option value="expo">Expo / Counter</option>
                    <option value="grill">Grill</option>
                    <option value="fry">Fryer</option>
                    <option value="cold">Pantry / Salad</option>
                    <option value="bar">Bar</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Seat Assign</label>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs font-bold text-foreground text-center">
                    {activeSeat > 0 ? `Seat ${activeSeat}` : 'Shared'}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Special Kitchen Notes</label>
                <input
                  type="text"
                  value={openItemNotes}
                  onChange={(e) => setOpenItemNotes(e.target.value)}
                  placeholder="e.g. Extra hot, sauce on side, allergy alert..."
                  className="w-full bg-muted/40 border border-border focus:border-foreground rounded-xl p-3 text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOpenItemModal(false)}
                className="flex-1 py-2.5 h-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="warning"
                onClick={() => {
                  const priceCents = Math.round(parseFloat(openItemPriceDollars || '0') * 100);
                  if (!openItemName.trim()) { alert('Item name required'); return; }
                  if (isNaN(priceCents) || priceCents <= 0) { alert('Valid price required'); return; }

                  addItem({
                    order_id: activeOrderId!,
                    menu_item_id: `custom-${Date.now()}`,
                    name: openItemName.trim(),
                    quantity: 1,
                    unit_price: priceCents,
                    station: openItemStation,
                    seat_number: activeSeat,
                    notes: openItemNotes.trim() || undefined,
                  });

                  setShowOpenItemModal(false);
                }}
                className="flex-1 py-2.5 h-auto uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-slate-950"
              >
                Add Open Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuView;
