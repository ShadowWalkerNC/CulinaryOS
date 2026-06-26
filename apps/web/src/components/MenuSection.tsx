import React, { forwardRef } from 'react';
import type { MenuSection as MenuSectionType, MenuItem, CartModifier } from '../types';
import { ItemCard } from './ItemCard';

interface Props {
  section:      MenuSectionType;
  onAddToCart:  (item: MenuItem, mods: CartModifier[], notes?: string) => void;
}

export const MenuSection = forwardRef<HTMLElement, Props>(function MenuSection(
  { section, onAddToCart },
  ref
) {
  return (
    <section
      id={`section-${section.id}`}
      className="section-anchor"
      ref={ref}
      style={{ paddingTop: '32px' }}
    >
      <h2 style={{
        fontSize:     '18px',
        fontWeight:   700,
        margin:       '0 0 16px',
        paddingBottom:'10px',
        borderBottom: '1px solid var(--border)',
        color:        'var(--text)',
      }}>
        {section.name}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {section.menu_items.map((item) => (
          <ItemCard key={item.id} item={item} onAddToCart={onAddToCart} />
        ))}
      </div>
    </section>
  );
});
