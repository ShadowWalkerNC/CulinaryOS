import React, { useState } from 'react';
import type { MenuItem, CartModifier, Modifier } from '../types';
import { AllergenBadge } from './AllergenBadge';

interface Props {
  item:        MenuItem;
  onAddToCart: (item: MenuItem, mods: CartModifier[], notes?: string) => void;
}

export function ItemCard({ item, onAddToCart }: Props) {
  const [expanded,   setExpanded]   = useState(false);
  const [selected,   setSelected]   = useState<Record<string, string[]>>({});
  const [notes,      setNotes]      = useState('');
  const [adding,     setAdding]     = useState(false);

  const hasModifiers = item.modifier_groups.length > 0;

  function toggleMod(groupId: string, modId: string, maxSel: number) {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(modId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== modId) };
      }
      if (maxSel === 1) return { ...prev, [groupId]: [modId] };
      if (current.length >= maxSel) return prev;
      return { ...prev, [groupId]: [...current, modId] };
    });
  }

  function handleAdd() {
    // Validate required groups
    for (const group of item.modifier_groups) {
      if (group.required && !(selected[group.id]?.length >= group.min_selections)) return;
    }

    const mods: CartModifier[] = item.modifier_groups.flatMap((g) =>
      (selected[g.id] ?? []).map((modId) => {
        const mod = g.modifiers.find((m) => m.id === modId)!;
        return { modifier_id: modId, name: mod.name, price_adjustment: mod.price_adjustment };
      })
    );

    setAdding(true);
    onAddToCart(item, mods, notes.trim() || undefined);
    setTimeout(() => { setAdding(false); setExpanded(false); setSelected({}); setNotes(''); }, 600);
  }

  const modTotal = item.modifier_groups.flatMap((g) =>
    (selected[g.id] ?? []).map((id) => g.modifiers.find((m) => m.id === id)?.price_adjustment ?? 0)
  ).reduce((s, v) => s + v, 0);

  const displayPrice = item.price + modTotal;

  return (
    <div style={{
      background:   'var(--bg-card)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow:     'hidden',
      transition:   'border-color 0.15s',
    }}>
      {/* Main row */}
      <div
        style={{
          display:       'flex',
          gap:           '14px',
          padding:       '14px',
          cursor:        hasModifiers ? 'pointer' : 'default',
          alignItems:    'flex-start',
        }}
        onClick={() => hasModifiers && setExpanded((v) => !v)}
      >
        {/* Item image */}
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            style={{ width: '72px', height: '72px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>{item.name}</span>
            <span style={{ fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>
              ${(displayPrice / 100).toFixed(2)}
            </span>
          </div>
          {item.description && (
            <p style={{ margin: '4px 0 6px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {item.description}
            </p>
          )}
          {item.allergens.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
              {item.allergens.map((a) => <AllergenBadge key={a} allergen={a} />)}
            </div>
          )}
        </div>

        {/* Add button (no modifiers) or expand chevron */}
        {!hasModifiers ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleAdd(); }}
            style={{
              flexShrink:   0,
              padding:      '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border:       '1px solid var(--accent)',
              background:   adding ? 'var(--accent)' : 'var(--accent-soft)',
              color:        adding ? '#fff' : 'var(--accent)',
              fontWeight:   700,
              fontSize:     '13px',
              transition:   'all 0.15s',
              alignSelf:    'center',
            }}
          >
            {adding ? '✓' : '+ Add'}
          </button>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '18px', alignSelf: 'center', flexShrink: 0 }}>
            {expanded ? '‹' : '›'}
          </span>
        )}
      </div>

      {/* Expanded modifier panel */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          {item.modifier_groups.map((group) => (
            <div key={group.id} style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                {group.name}
                {group.required && <span style={{ color: 'var(--red)', marginLeft: '4px' }}>*</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {group.modifiers.map((mod) => {
                  const isSelected = (selected[group.id] ?? []).includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => toggleMod(group.id, mod.id, group.max_selections)}
                      style={{
                        padding:      '5px 12px',
                        borderRadius: '999px',
                        border:       `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        background:   isSelected ? 'var(--accent-soft)' : 'transparent',
                        color:        isSelected ? 'var(--accent)' : 'var(--text-muted)',
                        fontSize:     '13px',
                        fontWeight:   isSelected ? 600 : 400,
                        transition:   'all 0.12s',
                      }}
                    >
                      {mod.name}
                      {mod.price_adjustment !== 0 && (
                        <span style={{ marginLeft: '4px', fontSize: '11px' }}>
                          {mod.price_adjustment > 0 ? '+' : ''}
                          ${(mod.price_adjustment / 100).toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special instructions */}
          <textarea
            placeholder="Special instructions…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{
              width:        '100%',
              padding:      '8px 10px',
              borderRadius: 'var(--radius-sm)',
              border:       '1px solid var(--border)',
              background:   'var(--bg-elevated)',
              color:        'var(--text)',
              fontSize:     '13px',
              resize:       'none',
              boxSizing:    'border-box',
              marginBottom: '12px',
              fontFamily:   'inherit',
            }}
          />

          <button
            onClick={handleAdd}
            style={{
              width:        '100%',
              padding:      '11px',
              borderRadius: 'var(--radius-sm)',
              border:       'none',
              background:   adding ? 'var(--green)' : 'var(--accent)',
              color:        '#fff',
              fontWeight:   700,
              fontSize:     '14px',
              transition:   'background 0.2s',
            }}
          >
            {adding ? '✓ Added' : `Add to cart — $${(displayPrice / 100).toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  );
}
