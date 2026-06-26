import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const STRIPE_APPEARANCE = {
  theme:     'night' as const,
  variables: {
    colorPrimary:    '#7c6aff',
    colorBackground: '#1a1d27',
    colorText:       '#e8eaf0',
    borderRadius:    '8px',
    fontFamily:      "'Inter', sans-serif",
  },
};

const TIP_PRESETS = [0, 15, 18, 20, 25];

interface CheckoutDrawerProps {
  orderId:    string;
  totalCents: number;
  onSuccess:  () => void;
  onClose:    () => void;
}

function PaymentForm({
  orderId, totalCents, tipCents, onSuccess,
}: {
  orderId: string; totalCents: number; tipCents: number; onSuccess: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy,  setBusy]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed');
      setBusy(false);
      return;
    }

    const res = await fetch(`${API}/v1/payments/capture`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ payment_intent_id: paymentIntent?.id }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? 'Capture failed');
      setBusy(false);
      return;
    }

    setBusy(false);
    onSuccess();
  }

  const chargeCents = totalCents + tipCents;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PaymentElement />
      {error && (
        <div style={{ color: '#ef4444', fontSize: '13px', padding: '8px 12px', background: '#ef444420', borderRadius: '6px' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7299' }}>
        <span>Order total</span><span>${(totalCents / 100).toFixed(2)}</span>
      </div>
      {tipCents > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7299' }}>
          <span>Tip</span><span>${(tipCents / 100).toFixed(2)}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', borderTop: '1px solid #2e3150', paddingTop: '12px' }}>
        <span>Charge total</span><span>${(chargeCents / 100).toFixed(2)}</span>
      </div>
      <button
        type="submit"
        disabled={busy || !stripe}
        style={{
          padding: '14px', borderRadius: '8px', border: 'none',
          background: busy ? '#2e3150' : '#7c6aff',
          color: busy ? '#6b7299' : '#fff',
          fontWeight: 700, fontSize: '15px',
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? 'Processing…' : `Charge $${(chargeCents / 100).toFixed(2)}`}
      </button>
    </form>
  );
}

export function CheckoutDrawer({ orderId, totalCents, onSuccess, onClose }: CheckoutDrawerProps) {
  const [tipPct,       setTipPct]       = useState(20);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [initError,    setInitError]    = useState<string | null>(null);

  const tipCents    = Math.round(totalCents * tipPct / 100);
  const chargeCents = totalCents + tipCents;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`${API}/v1/payments/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ order_id: orderId, tip_cents: tipCents }),
      });
      const body = await res.json();
      if (!res.ok) { setInitError(body.error); setLoading(false); return; }
      setClientSecret(body.data.client_secret);
      setLoading(false);
    })();
  }, [orderId, tipCents]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        style={{ width: '420px', maxWidth: '100vw', background: '#12141f', padding: '28px 24px', height: '100dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e8eaf0' }}>Checkout</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7299', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#6b7299', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Tip</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {TIP_PRESETS.map((pct) => (
              <button
                key={pct}
                onClick={() => setTipPct(pct)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: '6px',
                  border: `1px solid ${tipPct === pct ? '#7c6aff' : '#2e3150'}`,
                  background: tipPct === pct ? '#7c6aff22' : 'transparent',
                  color: tipPct === pct ? '#7c6aff' : '#6b7299',
                  fontWeight: tipPct === pct ? 700 : 400,
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                {pct === 0 ? 'No tip' : `${pct}%`}
              </button>
            ))}
          </div>
          {tipCents > 0 && (
            <div style={{ fontSize: '12px', color: '#6b7299', marginTop: '6px' }}>
              Tip: ${(tipCents / 100).toFixed(2)} · Total: ${(chargeCents / 100).toFixed(2)}
            </div>
          )}
        </div>

        {loading   && <div style={{ color: '#6b7299' }}>Initialising payment…</div>}
        {initError && <div style={{ color: '#ef4444' }}>{initError}</div>}
        {!loading && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
            <PaymentForm orderId={orderId} totalCents={totalCents} tipCents={tipCents} onSuccess={onSuccess} />
          </Elements>
        )}
      </div>
    </div>
  );
}
