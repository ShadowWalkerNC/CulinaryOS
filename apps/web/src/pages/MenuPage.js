import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenu } from '../hooks/useMenu';
import { MenuSection } from '../components/MenuSection';
import { CartDrawer } from '../components/CartDrawer';
import { nanoid } from '../lib/nanoid';
function emptyCart() {
    return { items: [], total: 0, itemCount: 0 };
}
function cartFrom(items) {
    const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const itemCount = items.reduce((s, i) => s + i.quantity, 0);
    return { items, total, itemCount };
}
export function MenuPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const menuResult = useMenu(slug ?? '');
    const [cart, setCart] = useState(emptyCart());
    const [cartOpen, setCartOpen] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const sectionRefs = useRef({});
    // ── Redirect on 404 ────────────────────────────────────────────────────
    useEffect(() => {
        if (menuResult.status === 'error')
            navigate('/404', { replace: true });
    }, [menuResult.status, navigate]);
    // ── Section scroll-spy ───────────────────────────────────────────────
    useEffect(() => {
        if (menuResult.status !== 'success')
            return;
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting)
                    setActiveSection(entry.target.id);
            }
        }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
        Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, [menuResult.status]);
    // ── Cart helpers ─────────────────────────────────────────────────────────
    function addToCart(item, selectedMods, notes) {
        const modTotal = selectedMods.reduce((s, m) => s + m.price_adjustment, 0);
        const unitPrice = item.price + modTotal;
        const newItem = {
            id: nanoid(),
            menu_item_id: item.id,
            name: item.name,
            unit_price: unitPrice,
            quantity: 1,
            modifiers: selectedMods,
            notes,
        };
        setCart((prev) => cartFrom([...prev.items, newItem]));
    }
    function removeFromCart(cartItemId) {
        setCart((prev) => cartFrom(prev.items.filter((i) => i.id !== cartItemId)));
    }
    function updateQty(cartItemId, qty) {
        if (qty <= 0)
            return removeFromCart(cartItemId);
        setCart((prev) => cartFrom(prev.items.map((i) => i.id === cartItemId ? { ...i, quantity: qty } : i)));
    }
    // ── Loading skeleton ─────────────────────────────────────────────────────
    if (menuResult.status === 'loading') {
        return (_jsxs("div", { style: { padding: '40px 24px', maxWidth: '720px', margin: '0 auto' }, children: [[1, 2, 3, 4, 5, 6].map((i) => (_jsx("div", { style: {
                        height: '80px', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)', marginBottom: '12px',
                        animation: 'pulse 1.5s ease-in-out infinite',
                        opacity: 1 - i * 0.12,
                    } }, i))), _jsx("style", { children: `@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }` })] }));
    }
    if (menuResult.status === 'error')
        return null; // redirecting
    const { restaurant, menu, sections } = menuResult.data;
    return (_jsxs("div", { style: { minHeight: '100dvh', paddingBottom: cart.itemCount > 0 ? '100px' : '40px' }, children: [_jsxs("header", { style: {
                    padding: '32px 24px 20px',
                    maxWidth: '720px',
                    margin: '0 auto',
                    borderBottom: '1px solid var(--border)',
                }, children: [_jsx("h1", { style: { margin: '0 0 4px', fontSize: '26px', fontWeight: 700 }, children: restaurant.name }), menu.description && (_jsx("p", { style: { margin: 0, color: 'var(--text-muted)', fontSize: '14px' }, children: menu.description }))] }), _jsx("nav", { className: "section-nav", children: sections.map((s) => (_jsx("button", { className: activeSection === `section-${s.id}` ? 'active' : '', onClick: () => {
                        document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth' });
                    }, children: s.name }, s.id))) }), _jsx("main", { style: { maxWidth: '720px', margin: '0 auto', padding: '0 16px' }, children: sections.map((s) => (_jsx(MenuSection, { section: s, onAddToCart: addToCart, ref: (el) => { sectionRefs.current[`section-${s.id}`] = el; } }, s.id))) }), cart.itemCount > 0 && (_jsxs("button", { className: "cart-fab", onClick: () => setCartOpen(true), children: [_jsx("span", { children: "\uD83D\uDED2 View cart" }), _jsx("span", { className: "badge", children: cart.itemCount }), _jsxs("span", { children: ["$", (cart.total / 100).toFixed(2)] })] })), cartOpen && (_jsx(CartDrawer, { cart: cart, tenantSlug: restaurant.slug, onClose: () => setCartOpen(false), onUpdateQty: updateQty, onRemove: removeFromCart }))] }));
}
