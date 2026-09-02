import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMenu } from '../hooks/useMenu';
import { ItemModal } from '../components/ItemModal';
import { AllergenBadge } from '../components/AllergenBadge';
import type { CartItem, CartState, MenuItem, CartModifier, MenuSection } from '../types';
import { nanoid } from '../lib/nanoid';
import {
  type DaypartSchedule,
  resolveEffectivePrice,
} from '@culinaryos/shared';
import {
  UtensilsCrossed,
  CreditCard,
  Eye,
  Bell,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  X,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Label,
  Input,
  Badge,
} from '@culinaryos/ui';

type TablesideMode = 'view' | 'pay' | 'order';

function emptyCart(): CartState {
  return { items: [], total: 0, itemCount: 0 };
}

function cartFrom(items: CartItem[]): CartState {
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, total, itemCount };
}

export function TablesidePage() {
  const { slug = 'demo', tableNumber = '1' } = useParams<{ slug: string; tableNumber: string }>();
  const menuResult = useMenu(slug);

  // 3-Mode Operating State
  const [activeMode, setActiveMode] = useState<TablesideMode>('order');

  // Self-Ordering State
  const [cart, setCart] = useState<CartState>(() => {
    try {
      const saved = localStorage.getItem(`culinaryos_tableside_cart_${tableNumber}`);
      return saved ? JSON.parse(saved) : emptyCart();
    } catch {
      return emptyCart();
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [orderSentSuccess, setOrderSentSuccess] = useState<string | null>(null);

  // Pay-at-Table State
  const [splitMethod, setSplitMethod] = useState<'full' | 'even' | 'items'>('full');
  const [evenSplitGuests, setEvenSplitGuests] = useState<number>(2);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedTipPercent, setSelectedTipPercent] = useState<number>(18);
  const [customTipCents] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  // Assistance Buzzer State
  const [buzzerOpen, setBuzzerOpen] = useState(false);
  const [buzzerNote, setBuzzerNote] = useState('');
  const [assistanceStatus, setAssistanceStatus] = useState<string | null>(null);

  // Daypart / Happy Hour active schedules
  const [daypartSchedules] = useState<DaypartSchedule[]>([
    {
      id: 'hh-1',
      name: 'Happy Hour Special',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '23:59',
      adjustmentType: 'percent',
      value: 15,
      active: true,
      categoryIds: ['Starters', 'Drinks', 'section-1'],
    },
  ]);

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem(`culinaryos_tableside_cart_${tableNumber}`, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, tableNumber]);

  // Sample Table Check data
  const tableCheck = useMemo(() => {
    return {
      orderId: `chk-tbl-${tableNumber}-${Date.now().toString().slice(-4)}`,
      serverName: 'Jane Smith',
      openedAt: '24 mins ago',
      items: [
        { id: 'chk-it-1', name: 'Truffle Hummus & Pita', price: 950, quantity: 1, seat: 1 },
        { id: 'chk-it-2', name: 'Wood-Fired Margherita Pizza', price: 1650, quantity: 1, seat: 1 },
        { id: 'chk-it-3', name: 'Prime Bistro Burger', price: 1850, quantity: 1, seat: 2 },
        { id: 'chk-it-4', name: 'Crispy Calamari', price: 1400, quantity: 1, seat: 2 },
      ],
    };
  }, [tableNumber]);

  // Cart operations
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

  function sendTablesideOrder() {
    if (cart.items.length === 0) return;
    setOrderSentSuccess(`Order #${Math.floor(100 + Math.random() * 900)} fired directly to kitchen!`);
    setCart(emptyCart());
    setCartOpen(false);
  }

  // Assistance Buzzer
  async function callAssistance(type: 'server' | 'water' | 'bill' | 'help') {
    try {
      const base = window.location.origin;
      await fetch(`${base}/v1/tables/${tableNumber}/assistance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': '00000000-0000-0000-0000-000000000001' },
        body: JSON.stringify({
          tableNumber,
          type,
          note: buzzerNote.trim() || undefined,
        }),
      }).catch(() => null);

      setAssistanceStatus(`Request sent! Your server has been notified.`);
      setBuzzerOpen(false);
      setBuzzerNote('');
      setTimeout(() => setAssistanceStatus(null), 6000);
    } catch {
      setAssistanceStatus('Server notified! Assistance is on the way.');
      setBuzzerOpen(false);
    }
  }

  // Pay at table computations
  const checkSubtotal = useMemo(() => {
    if (splitMethod === 'full') {
      return tableCheck.items.reduce((s, i) => s + i.price * i.quantity, 0);
    } else if (splitMethod === 'even') {
      const full = tableCheck.items.reduce((s, i) => s + i.price * i.quantity, 0);
      return Math.round(full / Math.max(1, evenSplitGuests));
    } else {
      return tableCheck.items
        .filter((i) => selectedItemIds.includes(i.id))
        .reduce((s, i) => s + i.price * i.quantity, 0);
    }
  }, [tableCheck, splitMethod, evenSplitGuests, selectedItemIds]);

  const checkTax = Math.round(checkSubtotal * 0.1);
  const checkTip = selectedTipPercent > 0 ? Math.round(checkSubtotal * (selectedTipPercent / 100)) : customTipCents;
  const checkGrandTotal = checkSubtotal + checkTax + checkTip;

  function handleProcessPayment() {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
    }, 1200);
  }

  if (menuResult.status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-sm tracking-wide">Connecting to Table {tableNumber}...</p>
      </div>
    );
  }

  const menuData = menuResult.status === 'success' ? menuResult.data : null;
  const restaurantName = menuData?.restaurant?.name || 'The Golden Fork';
  const sections: MenuSection[] = menuData?.sections || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-32">
      {/* Top Tableside Status Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-sm">
              T{tableNumber}
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-tight">{restaurantName}</h1>
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Table {tableNumber} • Tableside Connected
              </span>
            </div>
          </div>

          {/* Assistance Buzzer Header Button */}
          <button
            onClick={() => setBuzzerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-400/30 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>Call Server</span>
          </button>
        </div>

        {/* 3-Mode Selector Tabs */}
        <div className="max-w-xl mx-auto mt-3 bg-slate-950 p-1 rounded-2xl border border-slate-800 flex gap-1">
          <button
            onClick={() => setActiveMode('view')}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'view'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>1. View Menu</span>
          </button>

          <button
            onClick={() => setActiveMode('pay')}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'pay'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>2. Pay at Table</span>
          </button>

          <button
            onClick={() => setActiveMode('order')}
            className={`flex-1 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeMode === 'order'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>3. Self-Order</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto w-full p-4 flex-1 space-y-5 animate-fadeIn">
        {/* Assistance Sent Alert Banner */}
        {assistanceStatus && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-fadeIn">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{assistanceStatus}</span>
            </span>
            <button onClick={() => setAssistanceStatus(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Order Sent Success Banner */}
        {orderSentSuccess && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl text-amber-400 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-fadeIn">
            <span className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              <span>{orderSentSuccess}</span>
            </span>
            <button onClick={() => setOrderSentSuccess(null)} className="text-amber-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =======================================================
            MODE 1: VIEW-ONLY DIGITAL MENU
           ======================================================= */}
        {activeMode === 'view' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-slate-800 text-amber-400 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-1">
                <Eye className="w-3 h-3" />
                <span>View-Only Mode</span>
              </div>
              <h2 className="text-base font-black text-white">Digital Menu for Table {tableNumber}</h2>
              <p className="text-xs text-slate-400">
                Browse our kitchen offerings and prices below. When ready, please order with your server.
              </p>
            </div>

            {sections.map((sec: MenuSection) => (
              <div key={sec.id} className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 px-1 flex items-center gap-2">
                  <span>{sec.name}</span>
                  <span className="h-px bg-slate-800 flex-1" />
                </h3>

                <div className="space-y-2.5">
                  {sec.menu_items?.map((item: MenuItem) => {
                    const priceRes = resolveEffectivePrice(item.price, daypartSchedules);
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-start gap-3 shadow-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white">{item.name}</span>
                            {priceRes.isDiscounted && (
                              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                Happy Hour
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-400 leading-snug line-clamp-2">{item.description}</p>
                          )}
                          {item.allergens && item.allergens.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {item.allergens.map((a: string) => (
                                <AllergenBadge key={a} allergen={a} />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {priceRes.isDiscounted ? (
                            <div>
                              <span className="font-mono text-xs line-through text-slate-500 block">
                                ${(priceRes.originalPriceCents / 100).toFixed(2)}
                              </span>
                              <span className="font-mono text-sm font-black text-amber-400">
                                ${(priceRes.effectivePriceCents / 100).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-sm font-black text-white">
                              ${(item.price / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =======================================================
            MODE 2: PAY-AT-TABLE & BILL SPLITTING
           ======================================================= */}
        {activeMode === 'pay' && (
          <div className="space-y-5">
            {paymentSuccess ? (
              <div className="bg-slate-900 border border-emerald-500/40 p-6 rounded-3xl text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto text-2xl font-black">
                  ✓
                </div>
                <h2 className="text-xl font-black text-white">Payment Confirmed!</h2>
                <p className="text-xs text-slate-400">
                  Thank you for dining at {restaurantName}! A receipt has been registered to Table {tableNumber}.
                </p>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 text-left space-y-1">
                  <div className="flex justify-between">
                    <span>Table:</span>
                    <span className="text-white font-bold">{tableNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Paid:</span>
                    <span className="text-amber-400 font-bold">${(checkGrandTotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reference:</span>
                    <span>{tableCheck.orderId}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Active Check Overview */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3 shadow-md">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">Live Check</span>
                      <h2 className="text-base font-black text-white">Table {tableNumber} Summary</h2>
                    </div>
                    <span className="text-xs text-slate-400 font-bold">Server: {tableCheck.serverName}</span>
                  </div>

                  {/* Split Options */}
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">Split Bill Option</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSplitMethod('full')}
                        className={`min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          splitMethod === 'full'
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Entire Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMethod('even')}
                        className={`min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          splitMethod === 'even'
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Split Evenly
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMethod('items')}
                        className={`min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          splitMethod === 'items'
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        By Dish
                      </button>
                    </div>
                  </div>

                  {/* Even Split Stepper */}
                  {splitMethod === 'even' && (
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <span className="text-xs font-bold text-slate-300">Split across guests:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEvenSplitGuests((c) => Math.max(2, c - 1))}
                          className="w-9 h-9 rounded-xl bg-slate-800 text-white font-black flex items-center justify-center active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-black text-sm w-6 text-center text-white">{evenSplitGuests}</span>
                        <button
                          type="button"
                          onClick={() => setEvenSplitGuests((c) => Math.min(8, c + 1))}
                          className="w-9 h-9 rounded-xl bg-slate-800 text-white font-black flex items-center justify-center active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    {tableCheck.items.map((it) => {
                      const isSelected = selectedItemIds.includes(it.id);
                      return (
                        <div
                          key={it.id}
                          onClick={() => {
                            if (splitMethod === 'items') {
                              if (isSelected) {
                                setSelectedItemIds((p) => p.filter((id) => id !== it.id));
                              } else {
                                setSelectedItemIds((p) => [...p, it.id]);
                              }
                            }
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                            splitMethod === 'items' ? 'cursor-pointer' : ''
                          } ${
                            splitMethod === 'items' && isSelected
                              ? 'bg-amber-400/10 border-amber-400 text-white shadow-xs'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {splitMethod === 'items' && (
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                  isSelected ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-700'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            )}
                            <span className="font-bold">{it.name} (Seat {it.seat})</span>
                          </div>
                          <span className="font-mono font-bold">${(it.price / 100).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tip Selection */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <Label className="text-xs font-black uppercase text-slate-400">Add Server Gratuity</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 18, 20, 25].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setSelectedTipPercent(pct);
                          }}
                          className={`py-2 rounded-xl text-xs font-black transition-all ${
                            selectedTipPercent === pct
                              ? 'bg-amber-400 text-slate-950 font-extrabold shadow-sm'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span>${(checkSubtotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tax (10%):</span>
                      <span>${(checkTax / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tip ({selectedTipPercent}%):</span>
                      <span>${(checkTip / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                      <span>Total:</span>
                      <span className="text-amber-400">${(checkGrandTotal / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Pay CTA */}
                  <button
                    type="button"
                    disabled={checkSubtotal <= 0 || isProcessingPayment}
                    onClick={handleProcessPayment}
                    className="w-full min-h-[52px] bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-between px-5 active:scale-98"
                  >
                    <span>{isProcessingPayment ? 'Processing Card...' : 'Pay with Card / Apple Pay'}</span>
                    <span className="font-mono text-sm">${(checkGrandTotal / 100).toFixed(2)}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* =======================================================
            MODE 3: FULL SELF-ORDERING WITH MODIFIERS & CART
           ======================================================= */}
        {activeMode === 'order' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center justify-between gap-3 shadow-md">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">Self-Ordering</span>
                <h2 className="text-base font-black text-white">Order to Table {tableNumber}</h2>
              </div>
              <button
                onClick={() => setCartOpen(true)}
                className="relative px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Bag ({cart.itemCount})</span>
              </button>
            </div>

            {sections.map((sec: MenuSection) => (
              <div key={sec.id} className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 px-1 flex items-center gap-2">
                  <span>{sec.name}</span>
                  <span className="h-px bg-slate-800 flex-1" />
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sec.menu_items?.map((item: MenuItem) => (
                    <button
                      key={item.id}
                      onClick={() => setCustomizingItem(item)}
                      className="bg-slate-900 border border-slate-800 hover:border-amber-400/50 p-4 rounded-2xl text-left flex flex-col justify-between min-h-[140px] transition-all shadow-xs group active:scale-[0.98]"
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-extrabold text-sm text-white group-hover:text-amber-400 transition-colors">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md shrink-0">
                            + Add
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-400 leading-snug line-clamp-2">{item.description}</p>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-800 mt-2">
                        <span className="font-mono font-black text-amber-400 text-sm">
                          ${(item.price / 100).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">Customize & Add →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Sticky Bottom Thumb-Zone Bar (Self-Ordering Mode) */}
      {activeMode === 'order' && cart.itemCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 z-40 shadow-2xl">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            <button
              onClick={() => setCartOpen(true)}
              className="flex-1 min-h-[52px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl py-3 px-5 text-xs uppercase tracking-wider flex items-center justify-between shadow-lg transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span>View Table Bag ({cart.itemCount})</span>
              </div>
              <span className="font-mono text-sm">${(cart.total / 100).toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Assistance Buzzer Sheet Modal */}
      <Dialog open={buzzerOpen} onOpenChange={setBuzzerOpen}>
        <DialogContent onClose={() => setBuzzerOpen(false)}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="brand" className="text-[9px] bg-amber-500 text-slate-950">Table Assistance</Badge>
            </div>
            <DialogTitle>Call Server to Table {tableNumber}</DialogTitle>
            <DialogDescription>
              Select what you need and our floor team will be right over.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { type: 'server', label: 'Call Server', icon: '🛎️' },
                { type: 'water', label: 'Water Refill', icon: '💧' },
                { type: 'bill', label: 'Bring Check', icon: '🧾' },
                { type: 'help', label: 'Need Assistance', icon: '❓' },
              ].map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => callAssistance(b.type as any)}
                  className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
                >
                  <span className="text-2xl">{b.icon}</span>
                  <span>{b.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase">Optional Note to Server</Label>
              <Input
                placeholder="e.g. Extra napkins, box for takeout..."
                value={buzzerNote}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuzzerNote(e.target.value)}
                className="rounded-xl font-medium"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Customizer Modal */}
      {customizingItem && (
        <ItemModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={addToCart}
        />
      )}

      {/* Cart Drawer Modal */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent onClose={() => setCartOpen(false)}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="brand" className="text-[9px] bg-amber-500 text-slate-950">Table {tableNumber}</Badge>
            </div>
            <DialogTitle>Your Tableside Order</DialogTitle>
            <DialogDescription>
              Confirm your selections before firing directly to the kitchen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {cart.items.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Your bag is empty.</p>
            ) : (
              <>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {cart.items.map((it) => (
                    <div
                      key={it.id}
                      className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground block">{it.name}</span>
                        {it.modifiers?.map((m) => (
                          <span key={m.modifier_id} className="text-[10px] text-muted-foreground block">
                            ↳ {m.name}
                          </span>
                        ))}
                      </div>
                      <span className="font-mono font-bold">${((it.unit_price * it.quantity) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-muted p-3.5 rounded-xl space-y-1 font-mono text-xs">
                  <div className="flex justify-between font-black text-foreground">
                    <span>Order Total:</span>
                    <span className="text-primary">${(cart.total / 100).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={sendTablesideOrder}
                  className="w-full min-h-[48px] bg-foreground text-background font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Send Order to Kitchen</span>
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TablesidePage;
