import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenu } from '../hooks/useMenu';
import { MenuSection } from '../components/MenuSection';
import { ItemModal } from '../components/ItemModal';
import { CartDrawer } from '../components/CartDrawer';
import { CheckoutDrawer } from '../components/CheckoutDrawer';
import type { CartItem, CartState, MenuItem, CartModifier, OrderMode } from '../types';
import { nanoid } from '../lib/nanoid';
import { generateSchemaOrg } from '@culinaryos/seo-tools';
import { generateMenuPdf, generateQrDataUrl } from '@culinaryos/pdf-tools';
import type { ProjectSchema, MenuSchema } from '@culinaryos/types';
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
  ArrowLeft,
  Button,
  Printer,
} from '@culinaryos/ui';

function emptyCart(): CartState {
  return { items: [], total: 0, itemCount: 0 };
}

function cartFrom(items: CartItem[]): CartState {
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, total, itemCount };
}

function getSectionIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('pizza')) return 'local_pizza';
  if (n.includes('burger') || n.includes('sandwich')) return 'lunch_dining';
  if (n.includes('drink') || n.includes('beverage') || n.includes('cocktail') || n.includes('bar')) return 'local_bar';
  if (n.includes('dessert') || n.includes('sweet') || n.includes('cake') || n.includes('ice cream')) return 'icecream';
  if (n.includes('salad') || n.includes('starter') || n.includes('appetizer')) return 'tapas';
  if (n.includes('pasta') || n.includes('noodle')) return 'ramen_dining';
  return 'restaurant_menu';
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDietary, setActiveDietary] = useState<DietaryFilter>('all');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Dynamic Schema.org injection into document head
  useEffect(() => {
    if (menuResult.status !== 'success') return;
    const { restaurant, menu } = menuResult.data;
    try {
      const schema = generateSchemaOrg({
        id: slug || 'demo',
        schemaVersion: '1.0',
        businessType: 'restaurant',
        styleTemplate: 'hearth',
        colorTheme: 'terracotta',
        darkMode: false,
        business: {
          name: restaurant.name,
          tagline: restaurant.tagline || menu.description,
          description: menu.description,
          cuisineType: 'Contemporary American',
        },
        locations: [
          {
            id: 'loc-1',
            name: restaurant.name,
            address: {
              street: restaurant.address || '142 Mercer Street',
              city: 'New York',
              state: 'NY',
              zip: '10012',
              country: 'US',
            },
            hours: {
              mon: { open: '11:30', close: '22:30' },
              tue: { open: '11:30', close: '22:30' },
              wed: { open: '11:30', close: '22:30' },
              thu: { open: '11:30', close: '22:30' },
              fri: { open: '11:30', close: '23:30' },
              sat: { open: '10:30', close: '23:30' },
              sun: { open: '10:30', close: '22:00' },
            },
          },
        ],
        primaryLocationIndex: 0,
        seo: {
          siteTitle: `${restaurant.name} | Online Ordering`,
          metaDescription: menu.description,
        },
        deployment: {
          target: 'vercel',
          subdomain: slug || 'demo',
          customDomain: window.location.hostname,
        },
      } as unknown as ProjectSchema);

      const scriptId = 'culinaryos-schema-org-jsonld';
      let el = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!el) {
        el = document.createElement('script');
        el.id = scriptId;
        el.type = 'application/ld+json';
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(schema);
    } catch {
      // ignore in test / degraded environments
    }
  }, [menuResult, slug]);

  async function handleDownloadMenuPdf() {
    if (menuResult.status !== 'success') return;
    const { restaurant, menu, sections } = menuResult.data;
    setDownloadingPdf(true);
    try {
      const qrDataUrl = await generateQrDataUrl(window.location.href, { size: 300 });
      const menuSchema: MenuSchema = {
        categories: sections.map((sec: any, idx: number) => ({
          id: sec.id,
          name: sec.name,
          displayOrder: idx + 1,
          description: sec.description || undefined,
          items: sec.menu_items.map((it: any, itemIdx: number) => ({
            id: it.id,
            name: it.name,
            price: `$${(it.price / 100).toFixed(2)}`,
            description: it.description || undefined,
            available: it.available,
            displayOrder: itemIdx + 1,
            dietaryTags: (it.allergens || []) as any,
          })),
        })),
      };

      const pdfBytes = generateMenuPdf(menuSchema, {
        restaurantName: restaurant.name,
        tagline: restaurant.tagline || menu.description || undefined,
        pageSize: 'letter',
        qrDataUrl,
        qrLabel: 'Scan for Online Ordering',
      });

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${restaurant.name.toLowerCase().replace(/\s+/g, '-')}-menu.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to generate menu PDF:', e);
    } finally {
      setDownloadingPdf(false);
    }
  }

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
    <div className="guest-storefront min-h-screen bg-grid-industrial bg-[#f8f9fa] text-slate-900 pb-28">
      {/* Restaurant Hero Section */}
      <header className="bg-white border-b border-slate-200/90 shadow-xs">
        {/* Top Mini Brand Bar */}
        <div className="border-b border-slate-800 px-4 bg-slate-950 text-white">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-x-4 text-xs">
            <a
              href="/"
              className="min-h-[48px] font-bold text-slate-200 hover:text-white flex items-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>CulinaryOS Platform</span>
            </a>
            <div className="flex items-center gap-3">
              <a
                href="/studio"
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Storefront Studio</span>
              </a>
              <button
                type="button"
                onClick={handleDownloadMenuPdf}
                disabled={downloadingPdf}
                className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Printer className="w-3 h-3 text-slate-400" />
                <span>{downloadingPdf ? 'Exporting...' : 'Print PDF'}</span>
              </button>
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-mono font-semibold text-emerald-300">{slug === 'demo' ? 'Demo menu' : 'Online ordering'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Restaurant Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Open Now</span>
                </span>
                <span className="text-xs font-bold text-slate-500">
                  ⭐ {restaurant.rating || 4.9} ({restaurant.reviewCount || 428}+ orders)
                </span>
              </div>

              <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700">Order Online</p>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
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
                <Button
                  type="button"
                  variant={orderMode === 'delivery' ? 'brand' : 'outline'}
                  onClick={() => setOrderMode('delivery')}
                  className={`h-auto rounded-xl px-3 py-2 text-xs font-bold [&>span]:flex-col [&>span]:gap-0.5 ${
                    orderMode === 'delivery'
                      ? ''
                      : 'border border-slate-200/60 bg-white text-slate-600 shadow-none hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">moped</span>
                    <span>Delivery</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80">25–35 min</span>
                </Button>
                <Button
                  type="button"
                  variant={orderMode === 'pickup' ? 'brand' : 'outline'}
                  onClick={() => setOrderMode('pickup')}
                  className={`h-auto rounded-xl px-3 py-2 text-xs font-bold [&>span]:flex-col [&>span]:gap-0.5 ${
                    orderMode === 'pickup'
                      ? ''
                      : 'border border-slate-200/60 bg-white text-slate-600 shadow-none hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                    <span>Pickup</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80">15–20 min</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Navigation & Search Rail */}
      <nav aria-label="Category Navigation" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 space-y-2.5">
          {/* Top Bar: Search & Dietary Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search menu"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search the menu..."
                className="min-h-[48px] w-full bg-slate-50 border border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900 focus:bg-white rounded-xl pl-9 pr-14 py-2 text-sm text-slate-900 font-semibold outline-none transition-all placeholder:text-slate-500"
              />
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  variant="ghost"
                  className="absolute right-0 top-1/2 min-h-[48px] min-w-[48px] -translate-y-1/2 text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Quick Dietary Filters — Symbol & Icon Forward */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'All Items', icon: 'restaurant' },
                { id: 'popular', label: 'Popular', icon: 'local_fire_department', color: 'text-amber-500' },
                { id: 'vegetarian', label: 'Vegetarian', icon: 'eco', color: 'text-emerald-600' },
                { id: 'vegan', label: 'Vegan', icon: 'nature', color: 'text-green-600' },
                { id: 'gluten_free', label: 'Gluten-Free', icon: 'grain', color: 'text-amber-600' },
              ].map((df) => {
                const isActive = activeDietary === df.id;
                return (
                  <Button
                    key={df.id}
                    variant={isActive ? 'brand' : 'ghost'}
                    size="sm"
                    aria-pressed={isActive}
                    onClick={() => setActiveDietary(df.id as DietaryFilter)}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-bold whitespace-nowrap [&>span]:gap-1.5 ${
                      isActive
                        ? ''
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[15px] ${isActive ? 'text-white' : df.color || 'text-slate-400'}`}>
                      {df.icon}
                    </span>
                    <span>{df.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Bottom Bar: Category Anchor Pills with Food Symbols */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 pt-2">
            {sections.map((sec) => {
              const isActive = activeSection === `section-${sec.id}`;
              const icon = getSectionIcon(sec.name);
              return (
                <Button
                  key={sec.id}
                  variant={isActive ? 'brand' : 'ghost'}
                  size="sm"
                  aria-pressed={isActive}
                  onClick={() => {
                    document.getElementById(`section-${sec.id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap [&>span]:gap-1.5 ${
                    isActive
                      ? ''
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[15px] ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
                    {icon}
                  </span>
                  <span>{sec.name}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Menu Body */}
      <main className="max-w-6xl mx-auto px-4">
        {filteredSections.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No dishes match your filter</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try searching with another keyword or resetting the dietary filters.
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setActiveDietary('all');
              }}
              className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 hover:text-slate-800"
            >
              Reset Filters
            </Button>
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

      {/* Mobile Sticky Thumb-Zone Action Bar & Desktop Floating FAB (Jakob's Law compliant) */}
      {cart.itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:bottom-6 sm:right-6 sm:left-auto sm:p-0 z-40 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-slate-200/80 sm:border-0 shadow-lg sm:shadow-none animate-fadeIn">
          <Button
            type="button"
            variant="brand"
            size="lg"
            onClick={() => setCartOpen(true)}
            className="group min-h-[48px] w-full sm:w-auto rounded-xl sm:rounded-full border border-slate-700/60 px-5 py-3.5 shadow-2xl hover:scale-[1.02] sm:hover:scale-105 active:scale-95 [&>span]:w-full [&>span]:justify-between [&>span]:gap-3 sm:[&>span]:justify-center"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <ShoppingBag className="w-5 h-5 text-white" />
                <span className="absolute -top-1.5 -right-2 bg-amber-400 text-[#0f172a] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.itemCount}
                </span>
              </div>
              <span className="text-xs font-black uppercase tracking-wider">
                View Bag · {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm bg-white/10 px-2.5 py-0.5 rounded-full text-white">
                ${(cart.total / 100).toFixed(2)}
              </span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Button>
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
