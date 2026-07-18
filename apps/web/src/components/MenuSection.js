import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { ItemCard } from './ItemCard';
export const MenuSection = forwardRef(function MenuSection({ section, onAddToCart }, ref) {
    return (_jsxs("section", { id: `section-${section.id}`, className: "section-anchor", ref: ref, style: { paddingTop: '32px' }, children: [_jsx("h2", { style: {
                    fontSize: '18px',
                    fontWeight: 700,
                    margin: '0 0 16px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text)',
                }, children: section.name }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: section.menu_items.map((item) => (_jsx(ItemCard, { item: item, onAddToCart: onAddToCart }, item.id))) })] }));
});
