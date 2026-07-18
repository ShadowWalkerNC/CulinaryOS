import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate }              from 'react-router-dom';
import { useMenu }                             from '../hooks/useMenu';
import { MenuSection }                         from '../components/MenuSection';
import { CartDrawer }                          from '../components/CartDrawer';
import type { CartItem, CartState, MenuItem, CartModifier } from '../types';
import { nanoid } from '../lib/nanoid';

function emptyCart(): CartState {
  return { items: [], total: 0, itemCount: 0 };
}

function cartFrom(items: CartItem[]): CartState {
  const total     = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  return { items, total, itemCount };
}

export function MenuPage() {
  const { slug }   = useParams<{ slug: string }>();
  const navigate   = useNavigate();
  const menuResult = useMenu(slug ?? '');

  const [cart,           setCart]          = useState<CartState>(emptyCart());
  const [cartOpen,       setCartOpen]      = useState(false);
  const [activeSection,  setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // ── Redirect on 404 ────────────────────────────────────────────────────
  useEffect(() => {
    if (menuResult.status === 'error') navigate('/404', { replace: true });
  }, [menuResult.status, navigate]);

  // ── Section scroll-spy ───────────────────────────────────────────────
  useEffect(() => {
    if (menuResult.status !== 'success') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [menuResult.status]);

  // ── Cart helpers ─────────────────────────────────────────────────────────
  function addToCart(item: MenuItem, selectedMods: CartModifier[], notes?: string) {
    const modTotal  = selectedMods.reduce((s, m) => s + m.price_adjustment, 0);
    const unitPrice = item.price + modTotal;
    const newItem: CartItem = {
      id:           nanoid(),
      menu_item_id: item.id,
      name:         item.name,
      unit_price:   unitPrice,
      quantity:     1,
      modifiers:    selectedMods,
      notes,
    };
    setCart((prev) => cartFrom([...prev.items, newItem]));
  }

  function removeFromCart(cartItemId: string) {
    setCart((prev) => cartFrom(prev.items.filter((i) => i.id !== cartItemId)));
  }

  function updateQty(cartItemId: string, qty: number) {
    if (qty <= 0) return removeFromCart(cartItemId);
    setCart((prev) =>
      cartFrom(prev.items.map((i) => i.id === cartItemId ? { ...i, quantity: qty } : i))
    );
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (menuResult.status === 'loading') {
    return (
      <div style={{ padding: '40px 24px', maxWidth: '720px', margin: '0 auto' }}>
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} style={{
            height: '80px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)', marginBottom: '12px',
            animation: 'pulse 1.5s ease-in-out infinite',
            opacity: 1 - i * 0.12,
          }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
      </div>
    );
  }

  if (menuResult.status === 'error') return null; // redirecting

  const { restaurant, menu, sections } = menuResult.data;

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: cart.itemCount > 0 ? '100px' : '40px' }}>

      {/* Restaurant header */}
      <header style={{
        padding:      '32px 24px 20px',
        maxWidth:     '720px',
        margin:       '0 auto',
        borderBottom: '1px solid var(--border)',
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 700 }}>{restaurant.name}</h1>
        {menu.description && (
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>{menu.description}</p>
        )}
      </header>

      {/* Sticky section nav */}
      <nav className="section-nav">
        {sections.map((s) => (
          <button
            key={s.id}
            className={activeSection === `section-${s.id}` ? 'active' : ''}
            onClick={() => {
              document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {s.name}
          </button>
        ))}
      </nav>

      {/* Menu sections */}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '0 16px' }}>
        {sections.map((s) => (
          <MenuSection
            key={s.id}
            section={s}
            onAddToCart={addToCart}
            ref={(el) => { sectionRefs.current[`section-${s.id}`] = el; }}
          />
        ))}
      </main>

      {/* Cart FAB */}
      {cart.itemCount > 0 && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            View cart
          </span>
          <span className="badge">{cart.itemCount}</span>
          <span>${(cart.total / 100).toFixed(2)}</span>
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          tenantSlug={restaurant.slug}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
        />
      )}
    </div>
  );
}
