import React, { useState } from 'react';
import type { CartState, OrderMode, CustomerInfo, OnlineOrder } from '../types';
import { nanoid } from '../lib/nanoid';
import { saveOrder } from '../lib/orderStore';

interface Props {
  cart: CartState;
  tenantSlug: string;
  onClose: () => void;
  onOrderSubmitted: (orderId: string) => void;
}

type TipMode = '15' | '18' | '20' | '0' | 'custom';

export function CheckoutDrawer({ cart, tenantSlug, onClose, onOrderSubmitted }: Props) {
  const [mode, setMode] = useState<OrderMode>('delivery');

  // Customer Contact State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Mode Specific State
  const [address, setAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [pickupTime, setPickupTime] = useState('ASAP (15-20 mins)');

  // Tip Selector State
  const [tipMode, setTipMode] = useState<TipMode>('18');
  const [customTipDollars, setCustomTipDollars] = useState('');

  // Submission / Validation State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Financial Calculations
  const subtotal = cart.total; // in cents
  const tax = Math.round(subtotal * 0.08875); // ~8.875% tax rate
  const deliveryFee = mode === 'delivery' ? 399 : 0; // $3.99 for delivery in cents

  let tip = 0; // in cents
  if (tipMode === '15') tip = Math.round(subtotal * 0.15);
  else if (tipMode === '18') tip = Math.round(subtotal * 0.18);
  else if (tipMode === '20') tip = Math.round(subtotal * 0.20);
  else if (tipMode === '0') tip = 0;
  else if (tipMode === 'custom') {
    const parsed = parseFloat(customTipDollars);
    tip = !isNaN(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
  }

  const grandTotal = subtotal + tax + deliveryFee + tip;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a phone number for order updates.');
      return;
    }
    if (mode === 'delivery' && !address.trim()) {
      setError('Please enter a delivery address.');
      return;
    }

    setSubmitting(true);

    try {
      const orderId = `ord_${nanoid()}`;
      const orderNumber = Math.floor(1000 + Math.random() * 9000);

      const customer: CustomerInfo = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: mode === 'delivery' ? address.trim() : undefined,
        deliveryNotes: mode === 'delivery' && deliveryNotes.trim() ? deliveryNotes.trim() : undefined,
        pickupTime: mode === 'pickup' ? pickupTime : undefined,
      };

      const estimatedTime = mode === 'delivery' ? '25-35 mins' : '15-20 mins';

      const newOrder: OnlineOrder = {
        id: orderId,
        tenantSlug: tenantSlug || 'demo',
        orderNumber,
        mode,
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '460px',
          maxWidth: '100vw',
          background: 'var(--bg-card)',
          padding: '24px',
          height: '100dvh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Checkout</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Pickup vs Delivery Mode Toggle */}
          <div>
            <label style={sectionLabel}>Order Mode</label>
            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
              <button
                type="button"
                onClick={() => setMode('delivery')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: mode === 'delivery' ? 'var(--accent)' : 'transparent',
                  color: mode === 'delivery' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                🚴 Delivery
              </button>
              <button
                type="button"
                onClick={() => setMode('pickup')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: mode === 'pickup' ? 'var(--accent)' : 'transparent',
                  color: mode === 'pickup' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                🛍️ Pickup
              </button>
            </div>
          </div>

          {/* Customer Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={sectionLabel}>Contact Information</label>
            <input
              type="text"
              placeholder="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
            <input
              type="tel"
              placeholder="Phone Number (for order updates) *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />
            <input
              type="email"
              placeholder="Email Address (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Delivery Address or Pickup Time */}
          {mode === 'delivery' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={sectionLabel}>Delivery Details</label>
              <input
                type="text"
                placeholder="Delivery Address (Street, Apt/Suite, City) *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={inputStyle}
              />
              <textarea
                placeholder="Delivery instructions (e.g. Ring bell, leave at door)"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={sectionLabel}>Pickup Time</label>
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                style={inputStyle}
              >
                <option value="ASAP (15-20 mins)">ASAP (approx 15-20 mins)</option>
                <option value="In 30 mins">In 30 mins</option>
                <option value="In 45 mins">In 45 mins</option>
                <option value="In 60 mins">In 60 mins</option>
              </select>
            </div>
          )}

          {/* Tip Selector */}
          <div>
            <label style={sectionLabel}>Add a Tip for the Team</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {(['15', '18', '20', 'custom', '0'] as TipMode[]).map((tMode) => {
                const label = tMode === '0' ? 'No Tip' : tMode === 'custom' ? 'Custom' : `${tMode}%`;
                const isSelected = tipMode === tMode;
                return (
                  <button
                    key={tMode}
                    type="button"
                    onClick={() => setTipMode(tMode)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      color: isSelected ? 'var(--accent)' : 'var(--text)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {tipMode === 'custom' && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Custom tip amount"
                  value={customTipDollars}
                  onChange={(e) => setCustomTipDollars(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            )}
          </div>

          {/* Summary Breakdown */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
              Order Summary
            </div>

            {/* Item list */}
            {cart.items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text)' }}>
                <span>
                  {item.quantity}x {item.name}
                  {item.modifiers.length > 0 && (
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.modifiers.map((m) => m.name).join(', ')}
                    </span>
                  )}
                </span>
                <span>${((item.unit_price * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: '6px', paddingTop: '6px' }} />

            <div style={rowStyle}>
              <span>Subtotal</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>

            <div style={rowStyle}>
              <span>Estimated Tax</span>
              <span>${(tax / 100).toFixed(2)}</span>
            </div>

            {mode === 'delivery' && (
              <div style={rowStyle}>
                <span>Delivery Fee</span>
                <span>${(deliveryFee / 100).toFixed(2)}</span>
              </div>
            )}

            <div style={rowStyle}>
              <span>Tip</span>
              <span>${(tip / 100).toFixed(2)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: '16px',
                color: 'var(--text)',
                paddingTop: '6px',
                borderTop: '1px dashed var(--border)',
              }}
            >
              <span>Total</span>
              <span>${(grandTotal / 100).toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid var(--red)',
                color: 'var(--red)',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: submitting ? 'var(--border)' : 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '16px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {submitting ? 'Placing Order…' : `Place Order • ${(grandTotal / 100).toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--bg-elevated)',
  color: 'var(--text)',
  fontSize: '14px',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  color: 'var(--text-muted)',
};
