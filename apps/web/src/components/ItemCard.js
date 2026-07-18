import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { AllergenBadge } from './AllergenBadge';
export function ItemCard({ item, onAddToCart }) {
    const [expanded, setExpanded] = useState(false);
    const [selected, setSelected] = useState({});
    const [notes, setNotes] = useState('');
    const [adding, setAdding] = useState(false);
    const hasModifiers = item.modifier_groups.length > 0;
    function toggleMod(groupId, modId, maxSel) {
        setSelected((prev) => {
            const current = prev[groupId] ?? [];
            if (current.includes(modId)) {
                return { ...prev, [groupId]: current.filter((id) => id !== modId) };
            }
            if (maxSel === 1)
                return { ...prev, [groupId]: [modId] };
            if (current.length >= maxSel)
                return prev;
            return { ...prev, [groupId]: [...current, modId] };
        });
    }
    function handleAdd() {
        // Validate required groups
        for (const group of item.modifier_groups) {
            if (group.required && !(selected[group.id]?.length >= group.min_selections))
                return;
        }
        const mods = item.modifier_groups.flatMap((g) => (selected[g.id] ?? []).map((modId) => {
            const mod = g.modifiers.find((m) => m.id === modId);
            return { modifier_id: modId, name: mod.name, price_adjustment: mod.price_adjustment };
        }));
        setAdding(true);
        onAddToCart(item, mods, notes.trim() || undefined);
        setTimeout(() => { setAdding(false); setExpanded(false); setSelected({}); setNotes(''); }, 600);
    }
    const modTotal = item.modifier_groups.flatMap((g) => (selected[g.id] ?? []).map((id) => g.modifiers.find((m) => m.id === id)?.price_adjustment ?? 0)).reduce((s, v) => s + v, 0);
    const displayPrice = item.price + modTotal;
    return (_jsxs("div", { style: {
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            transition: 'border-color 0.15s',
        }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    gap: '14px',
                    padding: '14px',
                    cursor: hasModifiers ? 'pointer' : 'default',
                    alignItems: 'flex-start',
                }, onClick: () => hasModifiers && setExpanded((v) => !v), children: [item.image_url && (_jsx("img", { src: item.image_url, alt: item.name, style: { width: '72px', height: '72px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 } })), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: '15px' }, children: item.name }), _jsxs("span", { style: { fontWeight: 700, fontSize: '15px', flexShrink: 0 }, children: ["$", (displayPrice / 100).toFixed(2)] })] }), item.description && (_jsx("p", { style: { margin: '4px 0 6px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }, children: item.description })), item.allergens.length > 0 && (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }, children: item.allergens.map((a) => _jsx(AllergenBadge, { allergen: a }, a)) }))] }), !hasModifiers ? (_jsx("button", { onClick: (e) => { e.stopPropagation(); handleAdd(); }, style: {
                            flexShrink: 0,
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--accent)',
                            background: adding ? 'var(--accent)' : 'var(--accent-soft)',
                            color: adding ? '#fff' : 'var(--accent)',
                            fontWeight: 700,
                            fontSize: '13px',
                            transition: 'all 0.15s',
                            alignSelf: 'center',
                        }, children: adding ? '✓' : '+ Add' })) : (_jsx("span", { style: { color: 'var(--text-muted)', fontSize: '18px', alignSelf: 'center', flexShrink: 0 }, children: expanded ? '‹' : '›' }))] }), expanded && (_jsxs("div", { style: { padding: '0 14px 14px', borderTop: '1px solid var(--border)', paddingTop: '12px' }, children: [item.modifier_groups.map((group) => (_jsxs("div", { style: { marginBottom: '14px' }, children: [_jsxs("div", { style: { fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }, children: [group.name, group.required && _jsx("span", { style: { color: 'var(--red)', marginLeft: '4px' }, children: "*" })] }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }, children: group.modifiers.map((mod) => {
                                    const isSelected = (selected[group.id] ?? []).includes(mod.id);
                                    return (_jsxs("button", { onClick: () => toggleMod(group.id, mod.id, group.max_selections), style: {
                                            padding: '5px 12px',
                                            borderRadius: '999px',
                                            border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                            background: isSelected ? 'var(--accent-soft)' : 'transparent',
                                            color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                                            fontSize: '13px',
                                            fontWeight: isSelected ? 600 : 400,
                                            transition: 'all 0.12s',
                                        }, children: [mod.name, mod.price_adjustment !== 0 && (_jsxs("span", { style: { marginLeft: '4px', fontSize: '11px' }, children: [mod.price_adjustment > 0 ? '+' : '', "$", (mod.price_adjustment / 100).toFixed(2)] }))] }, mod.id));
                                }) })] }, group.id))), _jsx("textarea", { placeholder: "Special instructions\u2026", value: notes, onChange: (e) => setNotes(e.target.value), rows: 2, style: {
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--text)',
                            fontSize: '13px',
                            resize: 'none',
                            boxSizing: 'border-box',
                            marginBottom: '12px',
                            fontFamily: 'inherit',
                        } }), _jsx("button", { onClick: handleAdd, style: {
                            width: '100%',
                            padding: '11px',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            background: adding ? 'var(--green)' : 'var(--accent)',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '14px',
                            transition: 'background 0.2s',
                        }, children: adding ? '✓ Added' : `Add to cart — $${(displayPrice / 100).toFixed(2)}` })] }))] }));
}
