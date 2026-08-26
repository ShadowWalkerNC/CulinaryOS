import { forwardRef } from 'react';
import type { MenuSection as MenuSectionType, MenuItem, CartModifier } from '../types';
import { ItemCard } from './ItemCard';

interface Props {
  section: MenuSectionType;
  onAddToCart: (item: MenuItem, mods: CartModifier[], notes?: string, quantity?: number) => void;
  onOpenModal: (item: MenuItem) => void;
}

export const MenuSection = forwardRef<HTMLElement, Props>(function MenuSection(
  { section, onAddToCart, onOpenModal },
  ref
) {
  if (!section.menu_items || section.menu_items.length === 0) return null;

  return (
    <section
      id={`section-${section.id}`}
      className="section-anchor pt-8 pb-4"
      ref={ref}
    >
      {/* Category Header */}
      <div className="flex items-baseline justify-between border-b border-slate-200/90 pb-3 mb-5">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
            {section.name}
          </h2>
          {section.description && (
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{section.description}</p>
          )}
        </div>
        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          {section.menu_items.length} {section.menu_items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Grid of Dishes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {section.menu_items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onAddToCart={onAddToCart}
            onOpenModal={onOpenModal}
          />
        ))}
      </div>
    </section>
  );
});
