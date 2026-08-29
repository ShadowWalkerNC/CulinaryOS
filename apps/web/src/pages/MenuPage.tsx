import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CulinaryHeader } from '@culinaryos/ui';
import { useMenu } from '../hooks/useMenu';
import { MenuSection } from '../components/MenuSection';
import { ItemModal } from '../components/ItemModal';
import { CartDrawer } from '../components/CartDrawer';
import { CheckoutDrawer } from '../components/CheckoutDrawer';
import type { CartItem, CartState, MenuItem, CartModifier, OrderMode } from '../types';
import { nanoid } from '../lib/nanoid';
import {
  ShoppingBag,
  Search,
  X,
  MapPin,
  Clock,
  Sparkles,
  UtensilsCrossed,
  Filter,
  Check,
  ChevronRight,
} from '@culinaryos/ui';

function emptyCart(): CartState {
  return { items: [], total: 0, itemCount: 0 };
}

function cartFrom(items: CartItem[]): CartState {
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, total, itemCount };
}

type DietaryFilter = 'all' | 'popular' | 'vegetarian' | 'vegan' | 'gluten_free';

export function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const menuResult = useMenu(slug ?? 'demo');

  // Cart & Order State
  const [cart, setCart] = useState<CartState>(() => {
    try {
      const saved = localStorage.getItem('culinaryos_active_cart');
      return saved ? JSON.parse(saved) : emptyCart();
    } catch {
      return emptyCart();
    }
  });

  const [orderMode, setOrderMode] = useState<OrderMode>('delivery');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDietary, setActiveDietary] = useState<DietaryFilter>('all');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Sync cart with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('culinaryos_active_cart', JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  // Section scroll-spy
  useEffect(() => {
    if (menuResult.status !== 'success') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [menuResult.status]);

  // Cart Operations
  function addToCart(item: MenuItem, selectedMods: CartModifier[], notes?: string, quantity = 1) {
    const modTotal = selectedMods.reduce((sum, m) => sum + m.price_adjustment, 0);
    const unitPrice = item.price + modTotal;

    const newItem: CartItem = {
      id: nanoid(),
      menu_item_id: item.id,
      name: item.name,
      unit_price: unitPrice,
      quantity,
      modifiers: selectedMods,
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
      cartFrom(prev.items.map((i) => (i.id === cartItemId ? { ...i, quantity: qty } : i)))
    );
  }

  // Filtered Sections based on search query and dietary tags
  const filteredSections = useMemo(() => {
    if (menuResult.status !== 'success') return [];
    const query = searchQuery.trim().toLowerCase();

    return menuResult.data.sections
      .map((section) => {
        const matchingItems = section.menu_items.filter((item) => {
          // Search Match
          const matchesQuery =
            !query ||
            item.name.toLowerCase().includes(query) ||
            (item.description && item.description.toLowerCase().includes(query));

          // Dietary Filter Match
          let matchesDietary = true;
          if (activeDietary === 'popular') {
            matchesDietary = !!item.tags?.includes('popular');
          } else if (activeDietary === 'vegetarian') {
            matchesDietary = item.allergens.includes('vegetarian') || item.allergens.includes('vegan') || !!item.tags?.includes('vegetarian');
          } else if (activeDietary === 'vegan') {
            matchesDietary = item.allergens.includes('vegan') || !!item.tags?.includes('vegan');
          } else if (activeDietary === 'gluten_free') {
            matchesDietary = item.allergens.includes('gluten_free') || !!item.tags?.includes('gluten_free');
          }

          return matchesQuery && matchesDietary;
        });

        return {
          ...section,
          menu_items: matchingItems,
        };
      })
      .filter((section) => section.menu_items.length > 0);
  }, [menuResult, searchQuery, activeDietary]);

  // Loading Skeleton
  if (menuResult.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <CulinaryHeader activeModule="web" tenantName="The Golden Fork" />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
          <div className="h-44 bg-slate-200 rounded-3xl" />
          <div className="h-12 bg-slate-200 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (menuResult.status === 'error') {
    navigate('/404', { replace: true });
    return null;
  }

  const { restaurant, menu, sections } = menuResult.data;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 pb-28 select-none">
      {/* Top Universal CulinaryOS Hub Header */}
      <CulinaryHeader activeModule="web" tenantName={restaurant.name} />

      {/* Restaurant Hero Section */}
      <header className="bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Restaurant Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Open Now</span>
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {restaurant.rating || 4.9} / 5.0 ({restaurant.reviewCount || 428}+ reviews)
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {restaurant.name}
              </h1>

              <p className="text-xs md:text-sm text-slate-500 font-medium max-w-xl">
                {restaurant.tagline || menu.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{restaurant.address || '142 Mercer Street, Soho'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{restaurant.hours || '11:30 AM – 10:30 PM'}</span>
                </span>
              </div>
            </div>

            {/* Order Fulfillment Mode Selector Card */}
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200/90 shrink-0 w-full md:w-64 shadow-xs">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrderMode('delivery')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                    orderMode === 'delivery'
                      ? 'bg-[#0f172a] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200/60'
                  }`}
                >
                  <span className="flex items-center gap-1">Delivery</span>
                  <span className="text-[10px] font-mono opacity-80">25–35 min</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderMode('pickup')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                    orderMode === 'pickup'
                      ? 'bg-[#0f172a] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200/60'
                  }`}
                >
                  <span className="flex items-center gap-1">Pickup</span>
                  <span className="text-[10px] font-mono opacity-80">15–20 min</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Navigation & Search Rail */}
      <nav aria-label="Category Navigation" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-2.5 space-y-2.5">
          {/* Top Bar: Search & Dietary Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all starters, wood-fired pizzas, burgers, drinks..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 font-semibold outline-none transition-all placeholder:text-slate-400 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Dietary Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'popular', label: 'Popular' },
                { id: 'vegetarian', label: 'Vegetarian' },
                { id: 'vegan', label: 'Vegan' },
                { id: 'gluten_free', label: 'Gluten-Free' },
              ].map((df) => {
                const isSelected = activeDietary === df.id;
                return (
                  <button
                    key={df.id}
                    onClick={() => setActiveDietary(df.id as DietaryFilter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {df.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar: Category Anchor Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-100 pt-2">
            {sections.map((sec) => {
              const isActive = activeSection === `section-${sec.id}`;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    document.getElementById(`section-${sec.id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-100 text-[#0f172a] shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {sec.name}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Menu Body */}
      <main className="max-w-4xl mx-auto px-4">
        {filteredSections.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No dishes match your filter</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try searching with another keyword or resetting the dietary filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveDietary('all');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredSections.map((sec) => (
            <MenuSection
              key={sec.id}
              section={sec}
              onAddToCart={addToCart}
              onOpenModal={(item) => setCustomizingItem(item)}
              ref={(el) => {
                sectionRefs.current[`section-${sec.id}`] = el;
              }}
            />
          ))
        )}
      </main>

      {/* Floating Cart Button (Cart FAB) */}
      {cart.itemCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-fadeIn">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-5 py-3.5 rounded-full shadow-2xl border border-slate-700/60 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 group"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-white" />
              <span className="absolute -top-1.5 -right-2 bg-white text-[#0f172a] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cart.itemCount}
              </span>
            </div>
            <span className="text-xs font-black uppercase tracking-wider">
              View Bag
            </span>
            <span className="font-mono font-bold text-sm bg-white/10 px-2 py-0.5 rounded-full">
              ${(cart.total / 100).toFixed(2)}
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Customization Item Modal */}
      {customizingItem && (
        <ItemModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={addToCart}
        />
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          tenantSlug={restaurant.slug}
          orderMode={orderMode}
          onSetOrderMode={setOrderMode}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
        />
      )}

      {/* Checkout Drawer */}
      {checkoutOpen && (
        <CheckoutDrawer
          cart={cart}
          tenantSlug={restaurant.slug}
          initialMode={orderMode}
          onClose={() => setCheckoutOpen(false)}
          onOrderSubmitted={(orderId) => {
            setCart(emptyCart());
            setCheckoutOpen(false);
            setCartOpen(false);
            navigate(`/order-status/${orderId}`);
          }}
        />
      )}
    </div>
  );
}
