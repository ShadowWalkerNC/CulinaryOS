import React, { useState, useEffect } from 'react';
import type { MenuItem, CartModifier } from '../types';
import { AllergenBadge } from './AllergenBadge';
import { Plus, Minus, X, Check, ChevronRight } from '@culinaryos/ui';
import {
  type ModifierGroup,
  type Modifier,
  calculateModifierGroupPrices,
} from '@culinaryos/shared';

interface Props {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, mods: CartModifier[], notes?: string, quantity?: number) => void;
}

export function ItemModal({ item, onClose, onAddToCart }: Props) {
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize defaults on item change
  useEffect(() => {
    if (!item) return;
    setQuantity(1);
    setNotes('');
    setValidationError(null);

    const initial: Record<string, string[]> = {};

    function initGroupDefaults(groups: ModifierGroup[]) {
      groups.forEach((group) => {
        const defaultMods = group.modifiers.filter((m) => m.isDefault || (m as any).is_default).map((m) => m.id);
        if (defaultMods.length > 0) {
          initial[group.id] = defaultMods;
        } else if (group.required && group.modifiers.length > 0) {
          initial[group.id] = [group.modifiers[0].id];
        } else {
          initial[group.id] = [];
        }

        // Check defaults for nested modifier groups
        group.modifiers.forEach((m) => {
          if (m.nestedGroups && m.nestedGroups.length > 0) {
            initGroupDefaults(m.nestedGroups);
          }
        });
        if (group.nestedGroups && group.nestedGroups.length > 0) {
          initGroupDefaults(group.nestedGroups);
        }
      });
    }

    initGroupDefaults(item.modifier_groups as any || []);
    setSelectedModifiers(initial);
  }, [item]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  function toggleModifier(groupId: string, modId: string, maxSelections: number) {
    setValidationError(null);
    setSelectedModifiers((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(modId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modId) };
      }
      if (maxSelections === 1) {
        return { ...prev, [groupId]: [modId] };
      }
      if (current.length >= maxSelections) {
        return prev;
      }
      return { ...prev, [groupId]: [...current, modId] };
    });
  }

  // Recursive calculation of modifier totals honoring freeQuantity
  function calculateTotalModifierPrice(groups: ModifierGroup[]): number {
    let total = 0;
    for (const group of groups) {
      const selectedIds = selectedModifiers[group.id] ?? [];
      const priced = calculateModifierGroupPrices(group, selectedIds);
      for (const p of priced) {
        total += p.effectivePriceCents;
      }

      // Check submodifiers for selected items
      for (const modId of selectedIds) {
        const mod = group.modifiers.find((m) => m.id === modId);
        if (mod?.nestedGroups && mod.nestedGroups.length > 0) {
          total += calculateTotalModifierPrice(mod.nestedGroups);
        }
      }

      if (group.nestedGroups && group.nestedGroups.length > 0) {
        total += calculateTotalModifierPrice(group.nestedGroups);
      }
    }
    return total;
  }

  const modifierTotal = calculateTotalModifierPrice(item.modifier_groups as any || []);
  const unitPrice = item.price + modifierTotal;
  const totalPrice = unitPrice * quantity;

  function validateGroups(groups: ModifierGroup[]): string | null {
    for (const group of groups) {
      const selected = selectedModifiers[group.id] ?? [];
      const minRequired = group.required ? (group.minSelections || (group as any).min_selections || 1) : (group.minSelections || 0);

      if (selected.length < minRequired) {
        return `Please select at least ${minRequired} option(s) for "${group.name}".`;
      }

      // Validate active nested groups
      for (const modId of selected) {
        const mod = group.modifiers.find((m) => m.id === modId);
        if (mod?.nestedGroups && mod.nestedGroups.length > 0) {
          const nestedErr = validateGroups(mod.nestedGroups);
          if (nestedErr) return nestedErr;
        }
      }

      if (group.nestedGroups && group.nestedGroups.length > 0) {
        const nestedErr = validateGroups(group.nestedGroups);
        if (nestedErr) return nestedErr;
      }
    }
    return null;
  }

  function handleAdd() {
    const errorMsg = validateGroups(item!.modifier_groups as any || []);
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }

    const flatMods: CartModifier[] = [];

    function collectModifiers(groups: ModifierGroup[], prefix = '') {
      for (const group of groups) {
        const selectedIds = selectedModifiers[group.id] ?? [];
        const priced = calculateModifierGroupPrices(group, selectedIds);

        for (let i = 0; i < selectedIds.length; i++) {
          const modId = selectedIds[i];
          const p = priced[i];
          const mod = group.modifiers.find((m) => m.id === modId);
          if (!mod) continue;

          const fullName = prefix ? `${prefix} ↳ ${mod.name}` : mod.name;

          flatMods.push({
            modifier_id: modId,
            name: fullName,
            price_adjustment: p.effectivePriceCents,
          });

          if (mod.nestedGroups && mod.nestedGroups.length > 0) {
            collectModifiers(mod.nestedGroups, mod.name);
          }
        }

        if (group.nestedGroups && group.nestedGroups.length > 0) {
          collectModifiers(group.nestedGroups, prefix);
        }
      }
    }

    collectModifiers(item!.modifier_groups as any || []);
    onAddToCart(item!, flatMods, notes.trim() || undefined, quantity);
    onClose();
  }

  // Recursive Modifier Group Renderer
  function renderModifierGroups(groups: ModifierGroup[], depth = 0) {
    return groups.map((group) => {
      const currentSelected = selectedModifiers[group.id] ?? [];
      const isSingle = (group.maxSelections || (group as any).max_selections) === 1;
      const maxSelections = group.maxSelections || (group as any).max_selections || 1;
      const freeQty = group.freeQuantity ?? 0;

      // Price calculation for badges
      const priced = calculateModifierGroupPrices(group, currentSelected);
      const pricedMap = new Map<string, { effectivePriceCents: number; isFree: boolean }>();
      priced.forEach((p) => pricedMap.set(p.modifierId, { effectivePriceCents: p.effectivePriceCents, isFree: p.isFree }));

      return (
        <div
          key={group.id}
          className={`p-4 rounded-2xl border space-y-3 transition-all ${
            depth > 0
              ? 'bg-amber-50/40 border-amber-200/80 ml-3 sm:ml-4 shadow-xs'
              : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                {depth > 0 && <ChevronRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  {group.name}
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {isSingle
                  ? group.required
                    ? 'Select 1 (Required)'
                    : 'Select 1 (Optional)'
                  : `Choose up to ${maxSelections}${group.required ? ' (Required)' : ''}`}
                {freeQty > 0 && (
                  <span className="text-emerald-700 font-bold ml-1.5 bg-emerald-100/70 px-1.5 py-0.5 rounded text-[10px]">
                    First {freeQty} Free!
                  </span>
                )}
              </p>
            </div>
            {group.required && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                Required
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.modifiers.map((mod) => {
              const isSelected = currentSelected.includes(mod.id);
              const originalAdj = mod.priceAdjustmentCents ?? (mod as any).price_adjustment ?? mod.priceAdjustment ?? 0;
              const calculated = pricedMap.get(mod.id);
              const effectiveAdj = isSelected ? (calculated?.effectivePriceCents ?? originalAdj) : originalAdj;
              const isFreeAllowance = isSelected ? (calculated?.isFree && originalAdj > 0) : false;

              return (
                <div key={mod.id} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => toggleModifier(group.id, mod.id, maxSelections)}
                    className={`min-h-[48px] p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-sm scale-[1.01]'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 ${isSingle ? 'rounded-full' : 'rounded-md'} border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white text-[#0f172a] border-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold truncate">{mod.name}</span>
                    </div>

                    <span
                      className={`text-[11px] font-mono font-bold shrink-0 ${
                        isSelected ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {isFreeAllowance ? (
                        <span className="text-emerald-400 font-extrabold uppercase text-[10px]">Free ($0.00)</span>
                      ) : effectiveAdj > 0 ? (
                        `+$${(effectiveAdj / 100).toFixed(2)}`
                      ) : effectiveAdj < 0 ? (
                        `-$${(Math.abs(effectiveAdj) / 100).toFixed(2)}`
                      ) : (
                        'Included'
                      )}
                    </span>
                  </button>

                  {/* Render Nested Modifier Groups for Selected Modifier */}
                  {isSelected && mod.nestedGroups && mod.nestedGroups.length > 0 && (
                    <div className="pl-2 pt-1 animate-fadeIn">
                      {renderModifierGroups(mod.nestedGroups, depth + 1)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Group-level Nested Groups */}
          {group.nestedGroups && group.nestedGroups.length > 0 && (
            <div className="pt-2">
              {renderModifierGroups(group.nestedGroups, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl md:rounded-3xl max-w-lg w-full max-h-[90dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image or Gradient Banner */}
        {item.image_url ? (
          <div className="relative h-48 w-full shrink-0 bg-slate-100 overflow-hidden">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <span className="text-xs font-mono font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-white">
                {item.station?.toUpperCase()} STATION
              </span>
              <h2 className="text-xl font-black mt-1 leading-tight text-white drop-shadow-sm">
                {item.name}
              </h2>
            </div>
          </div>
        ) : (
          <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                {item.station?.toUpperCase()} STATION
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1 leading-tight">{item.name}</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Description & Dietary Tags */}
          <div>
            {item.description && (
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {item.description}
              </p>
            )}
            {item.allergens && item.allergens.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {item.allergens.map((a) => (
                  <AllergenBadge key={a} allergen={a} />
                ))}
              </div>
            )}
          </div>

          {/* Hierarchical Modifier Groups */}
          {item.modifier_groups && item.modifier_groups.length > 0 && (
            <div className="space-y-4">
              {renderModifierGroups(item.modifier_groups as any)}
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Special Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dressing on the side, extra crispy, allergy notice..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white focus:ring-1 focus:ring-[#0f172a] rounded-xl p-3 text-xs text-slate-800 outline-none transition-all resize-none font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Bar (Thumb Zone) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-mono font-bold text-sm text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart CTA */}
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 min-h-[48px] bg-[#0f172a] hover:bg-[#1e293b] text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-between shadow-md transition-all active:scale-[0.98]"
          >
            <span>Add to Order</span>
            <span className="font-mono text-sm">${(totalPrice / 100).toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ItemModal;
