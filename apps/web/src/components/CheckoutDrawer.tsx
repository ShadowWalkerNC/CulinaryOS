import React, { useState, useEffect } from 'react';
import type { CartState, OrderMode, CustomerInfo, OnlineOrder, PaymentMethod } from '../types';
import { nanoid } from '../lib/nanoid';
import { saveOrder } from '../lib/orderStore';
import { X, CreditCard, Smartphone, Store, ShieldCheck, CheckCircle2, Lock, ArrowRight } from '@culinaryos/ui';

interface Props {
  cart: CartState;
  tenantSlug: string;
  initialMode?: OrderMode;
  onClose: () => void;
  onOrderSubmitted: (orderId: string) => void;
}

type TipOption = '15' | '18' | '20' | '0' | 'custom';

export function CheckoutDrawer({
  cart,
  tenantSlug,
  initialMode = 'delivery',
  onClose,
  onOrderSubmitted,
}: Props) {
  const [mode, setMode] = useState<OrderMode>(initialMode);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Contact Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Mode Specific Info
  const [address, setAddress] = useState('');
  const [aptSuite, setAptSuite] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [pickupTime, setPickupTime] = useState('ASAP (15-20 mins)');

  // Tip Selection
  const [tipOption, setTipOption] = useState<TipOption>('18');
  const [customTipDollars, setCustomTipDollars] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Financial Calculations
  const subtotal = cart.total;
  const tax = Math.round(subtotal * 0.08875);
  const deliveryFee = mode === 'delivery' ? 399 : 0;

  let tip = 0;
  if (tipOption === '15') tip = Math.round(subtotal * 0.15);
  else if (tipOption === '18') tip = Math.round(subtotal * 0.18);
  else if (tipOption === '20') tip = Math.round(subtotal * 0.20);
  else if (tipOption === '0') tip = 0;
  else if (tipOption === 'custom') {
    const val = parseFloat(customTipDollars);
    tip = !isNaN(val) && val > 0 ? Math.round(val * 100) : 0;
  }

  const grandTotal = subtotal + tax + deliveryFee + tip;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please provide a contact phone number.');
      return;
    }
    if (mode === 'delivery' && !address.trim()) {
      setError('Please enter a delivery street address.');
      return;
    }

    setSubmitting(true);

    try {
      const orderId = `ord_${nanoid()}`;
      const orderNumber = Math.floor(1000 + Math.random() * 9000);

      const fullAddress = aptSuite.trim() ? `${address.trim()}, ${aptSuite.trim()}` : address.trim();

      const customer: CustomerInfo = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        ...(mode === 'delivery' ? { address: fullAddress, aptSuite: aptSuite.trim() } : {}),
        ...(mode === 'delivery' && deliveryNotes.trim() ? { deliveryNotes: deliveryNotes.trim() } : {}),
        ...(mode === 'pickup' ? { pickupTime } : {}),
      };

      const estimatedTime = mode === 'delivery' ? '25-35 mins' : '15-20 mins';

      const newOrder: OnlineOrder = {
        id: orderId,
        tenantSlug: tenantSlug || 'demo',
        orderNumber,
        mode,
        paymentMethod,
        customer,
        items: cart.items,
        subtotal,
        tax,
        deliveryFee,
        tip,
        total: grandTotal,
        status: 'received',
        createdAt: new Date().toISOString(),
        estimatedTime,
      };

      await saveOrder(newOrder);
      setSubmitting(false);
      onOrderSubmitted(orderId);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col relative animate-slideIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-black text-base text-slate-900 uppercase tracking-wide">
                Secure Checkout
              </h2>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>CulinaryOS Encrypted Gateway</span>
              </p>
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

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Order Mode Pill Switcher */}
          <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setMode('delivery')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'delivery'
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🚴 Delivery</span>
                <span className="text-[10px] font-mono opacity-80">(+$3.99)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('pickup')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'pickup'
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🛍️ Store Pickup</span>
                <span className="text-[10px] font-mono opacity-80">(Free)</span>
              </button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              1. Contact Information
            </label>
            <div className="space-y-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name *"
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white focus:ring-1 focus:ring-[#0f172a] rounded-xl p-3 text-xs text-slate-900 font-semibold outline-none transition-all placeholder:text-slate-400"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (for live SMS updates) *"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white focus:ring-1 focus:ring-[#0f172a] rounded-xl p-3 text-xs text-slate-900 font-semibold outline-none transition-all placeholder:text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Receipt (optional)"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white focus:ring-1 focus:ring-[#0f172a] rounded-xl p-3 text-xs text-slate-900 font-semibold outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Fulfillment Details (Address or Pickup Time) */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              2. {mode === 'delivery' ? 'Delivery Address' : 'Pickup Time'}
            </label>

            {mode === 'delivery' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street Address (e.g. 142 Mercer St) *"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white focus:ring-1 focus:ring-[#0f172a] rounded-xl p-3 text-xs text-slate-900 font-semibold outline-none transition-all placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={aptSuite}
                  onChange={(e) => setAptSuite(e.target.value)}
                  placeholder="Apt, Suite, Floor (optional)"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white focus:ring-1 focus:ring-[#0f172a] rounded-xl p-3 text-xs text-slate-900 font-semibold outline-none transition-all placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Delivery instructions (e.g. Call upon arrival, leave at door)"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white focus:ring-1 focus:ring-[#0f172a] rounded-xl p-3 text-xs text-slate-900 font-semibold outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white focus:ring-1 focus:ring-[#0f172a] rounded-xl p-3 text-xs text-slate-900 font-bold outline-none transition-all cursor-pointer"
                >
                  <option value="ASAP (15-20 mins)">⚡ ASAP (approx 15-20 mins)</option>
                  <option value="In 30 mins">🕒 In 30 mins</option>
                  <option value="In 45 mins">🕒 In 45 mins</option>
                  <option value="In 60 mins">🕒 In 60 mins</option>
                </select>
                <p className="text-[11px] text-slate-500 font-medium">
                  Collect your order at the counter: <strong>142 Mercer Street, Soho</strong>
                </p>
              </div>
            )}
          </div>

          {/* Tip Selection */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                3. Add Tip for the Culinary Crew
              </label>
              <span className="text-[11px] text-slate-500 font-semibold">100% goes to staff</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {(['15', '18', '20', 'custom', '0'] as TipOption[]).map((opt) => {
                const isSelected = tipOption === opt;
                const percentVal = opt === '15' ? 0.15 : opt === '18' ? 0.18 : opt === '20' ? 0.20 : 0;
                const dollarAmount = opt !== 'custom' && opt !== '0' ? (subtotal * percentVal) / 100 : null;

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTipOption(opt)}
                    className={`py-2 px-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-black">
                      {opt === '0' ? 'None' : opt === 'custom' ? 'Custom' : `${opt}%`}
                    </span>
                    {dollarAmount !== null && (
                      <span
                        className={`text-[10px] font-mono font-medium ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        ${dollarAmount.toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {tipOption === 'custom' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono font-bold text-slate-500">$</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  placeholder="Custom tip in USD"
                  value={customTipDollars}
                  onChange={(e) => setCustomTipDollars(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#0f172a] focus:bg-white rounded-xl p-2.5 text-xs text-slate-900 font-bold outline-none"
                />
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              4. Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-bold">Credit Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('apple_pay')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                  paymentMethod === 'apple_pay'
                    ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-xs font-bold">Apple Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('pay_at_counter')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                  paymentMethod === 'pay_at_counter'
                    ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Store className="w-5 h-5" />
                <span className="text-xs font-bold">
                  {mode === 'delivery' ? 'Cash on Deliv.' : 'At Counter'}
                </span>
              </button>
            </div>
          </div>

          {/* Order Summary Review */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-xs font-black text-slate-900 uppercase">
              <span>Order Summary</span>
              <span>{cart.itemCount} Items</span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-slate-700">
                  <span className="truncate pr-2">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-mono font-semibold shrink-0">
                    ${((item.unit_price * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-bold">${(subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-mono font-bold">${(tax / 100).toFixed(2)}</span>
              </div>
              {mode === 'delivery' && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-mono font-bold">${(deliveryFee / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Crew Tip</span>
                <span className="font-mono font-bold">${(tip / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-dashed border-slate-300 font-black text-sm text-slate-900">
                <span>Grand Total</span>
                <span className="font-mono text-base">${(grandTotal / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-black py-4 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-between shadow-lg transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <span>{submitting ? 'Confirming Order…' : 'Authorize & Place Order'}</span>
            <span className="flex items-center gap-1 font-mono text-sm">
              ${(grandTotal / 100).toFixed(2)}
              <ArrowRight className="w-4 h-4 ml-1" />
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
