import React, { useEffect } from 'react';
import type { CartState, OrderMode } from '../types';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, Clock, Sparkles } from '@culinaryos/ui';

interface Props {
  cart: CartState;
  tenantSlug: string;
  orderMode: OrderMode;
  onSetOrderMode: (mode: OrderMode) => void;
  onClose: () => void;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onCheckout?: () => void;
}

export function CartDrawer({
  cart,
  orderMode,
  onSetOrderMode,
  onClose,
  onUpdateQty,
  onRemove,
  onCheckout,
}: Props) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const subtotal = cart.total;
  const tax = Math.round(subtotal * 0.08875);
  const deliveryFee = orderMode === 'delivery' ? 399 : 0;
  const grandTotal = subtotal + tax + deliveryFee;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col relative animate-slideIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base text-slate-900 uppercase tracking-wide">
                  Your Bag
                </h2>
                <span className="text-xs font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                  {cart.itemCount}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Review your selections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fulfillment Mode Toggle */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex gap-1.5 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => onSetOrderMode('delivery')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                orderMode === 'delivery'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Delivery</span>
              <span className="text-[10px] font-mono opacity-80">(25-35m)</span>
            </button>
            <button
              type="button"
              onClick={() => onSetOrderMode('pickup')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                orderMode === 'pickup'
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pickup</span>
              <span className="text-[10px] font-mono opacity-80">(15-20m)</span>
            </button>
          </div>
        </div>

        {/* Item List or Empty State */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Your bag is empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Explore our chef-crafted menu and add your favorite dishes to begin.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-[#0f172a] text-white rounded-xl text-xs font-bold hover:bg-[#1e293b] transition-all"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm space-y-2.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{item.name}</h4>
                    {item.modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.modifiers.map((m) => (
                          <span
                            key={m.modifier_id}
                            className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                          >
                            + {m.name}
                            {m.price_adjustment > 0 && ` ($${(m.price_adjustment / 100).toFixed(2)})`}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-amber-700 bg-amber-50/70 border border-amber-200/80 px-2 py-1 rounded-md mt-1.5 italic font-medium">
                        Note: "{item.notes}"
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-black text-sm text-slate-900 shrink-0">
                    ${((item.unit_price * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>

                {/* Bottom Row: Stepper & Remove */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="text-slate-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>

                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-md bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-xs transition-all"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-mono font-bold text-xs text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-md bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center shadow-xs transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary Breakdown & Checkout CTA */}
        {cart.items.length > 0 && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs text-slate-600 font-medium">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-800">
                  ${(subtotal / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (8.875%)</span>
                <span className="font-mono font-bold text-slate-800">
                  ${(tax / 100).toFixed(2)}
                </span>
              </div>
              {orderMode === 'delivery' ? (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-mono font-bold text-slate-800">
                    ${(deliveryFee / 100).toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Pickup Fulfillment</span>
                  <span>Free</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 font-black text-sm text-slate-900">
                <span>Estimated Total</span>
                <span className="font-mono text-base">
                  ${(grandTotal / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={onCheckout}
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-black py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-between shadow-md transition-all active:scale-[0.99]"
            >
              <span>Proceed to Checkout</span>
              <span className="flex items-center gap-1 font-mono text-sm">
                ${(grandTotal / 100).toFixed(2)}
                <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
