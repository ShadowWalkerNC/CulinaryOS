import React, { useState } from 'react';
import type { MenuItem, CartModifier } from '../types';
import { AllergenBadge } from './AllergenBadge';
import { Plus, Check, Utensils, Sparkles, SlidersHorizontal } from '@culinaryos/ui';

interface Props {
  item: MenuItem;
  onAddToCart: (item: MenuItem, mods: CartModifier[], notes?: string, quantity?: number) => void;
  onOpenModal: (item: MenuItem) => void;
}

export function ItemCard({ item, onAddToCart, onOpenModal }: Props) {
  const [justAdded, setJustAdded] = useState(false);
  const hasModifiers = item.modifier_groups && item.modifier_groups.length > 0;

  function handleQuickAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (hasModifiers) {
      onOpenModal(item);
      return;
    }

    onAddToCart(item, [], undefined, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  const isUnavailable = item.status === 'unavailable' || item.status === '86d';

  return (
    <div
      onClick={() => !isUnavailable && onOpenModal(item)}
      className={`group bg-white rounded-2xl border border-slate-200/90 hover:border-slate-400/80 p-4 transition-all duration-200 flex flex-col justify-between hover:shadow-md cursor-pointer relative overflow-hidden select-none ${
        isUnavailable ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      }`}
    >
      {/* Top Section: Photo / Content */}
      <div className="flex gap-3.5 items-start">
        {/* Item Image or Fallback Graphic */}
        {item.image_url ? (
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-xs">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {item.tags?.includes('popular') && (
              <span className="absolute top-1.5 left-1.5 bg-[#0f172a]/90 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span>Popular</span>
              </span>
            )}
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl bg-slate-100/90 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-slate-200/70 transition-colors">
            <Utensils className="w-6 h-6 text-slate-400" />
          </div>
        )}

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-slate-900 leading-snug group-hover:text-[#0f172a] transition-colors line-clamp-2">
              {item.name}
            </h3>
          </div>

          {item.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Allergen & Dietary Badges */}
          {item.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {item.allergens.slice(0, 3).map((a) => (
                <AllergenBadge key={a} allergen={a} />
              ))}
              {item.allergens.length > 3 && (
                <span className="text-[10px] text-slate-400 self-center font-bold">
                  +{item.allergens.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Price & Action CTA */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono font-black text-base text-slate-900">
            ${(item.price / 100).toFixed(2)}
          </span>
          {hasModifiers && (
            <span className="text-[10px] font-semibold text-slate-400">Base</span>
          )}
        </div>

        {/* Quick Add or Customize Button */}
        {hasModifiers ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(item);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#0f172a] text-slate-700 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleQuickAdd}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all shadow-xs ${
              justAdded
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 hover:bg-[#0f172a] text-slate-700 hover:text-white'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
