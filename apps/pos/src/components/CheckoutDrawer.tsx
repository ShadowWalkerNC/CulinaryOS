import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiHeaders, getApiBase, isPlaceholderSecret } from '@culinaryos/shared';
import { usePOSStore } from '../lib/store';
import { Button } from '@culinaryos/ui';

const rawKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const isLiveStripe = !isPlaceholderSecret(rawKey);
const stripePromise = isLiveStripe ? loadStripe(rawKey!) : null;
const API = getApiBase();

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

export type CheckoutCompletion = { mode: 'stripe' | 'demo' };

interface CheckoutDrawerProps {
  orderId:    string;
  totalCents: number;
  onSuccess:  (completion: CheckoutCompletion) => void;
  onClose:    () => void;
}

function PaymentForm({
  orderId, totalCents, tipCents, onSuccess, tenantId,
}: {
  orderId: string;
  totalCents: number;
  tipCents: number;
  onSuccess: (completion: CheckoutCompletion) => void;
  tenantId: string;
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

    if (!paymentIntent?.id) {
      setError('PaymentIntent missing after confirmation');
      setBusy(false);
      return;
    }

    const res = await fetch(`${API}/v1/payments/capture`, {
      method:  'POST',
      headers: apiHeaders(tenantId),
      body:    JSON.stringify({ payment_intent_id: paymentIntent.id }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error?.message ?? body.error ?? 'Capture failed');
      setBusy(false);
      return;
    }

    setBusy(false);
    onSuccess({ mode: 'stripe' });
  }

  const chargeCents = totalCents + tipCents;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error && (
        <div className="text-[#ef4444] text-[13px] px-3 py-2 bg-[#ef444420] rounded-md">
          {error}
        </div>
      )}
      <div className="flex justify-between text-[13px] text-[#6b7299]">
        <span>Order total</span><span>${(totalCents / 100).toFixed(2)}</span>
      </div>
      {tipCents > 0 && (
        <div className="flex justify-between text-[13px] text-[#6b7299]">
          <span>Tip</span><span>${(tipCents / 100).toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-base border-t border-[#2e3150] pt-3">
        <span>Charge total</span><span>${(chargeCents / 100).toFixed(2)}</span>
      </div>
      <Button
        type="submit"
        variant="brand"
        isLoading={busy}
        disabled={!stripe}
        className={`w-full min-h-[48px] py-3.5 px-5 rounded-lg font-bold text-[15px] ${
          busy
            ? 'bg-[#2e3150] text-[#6b7299] cursor-not-allowed'
            : 'bg-[#7c6aff] text-white hover:bg-[#6b5ce7] cursor-pointer'
        }`}
      >
        {`Charge $${(chargeCents / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}

export function CheckoutDrawer({ orderId, totalCents, onSuccess, onClose }: CheckoutDrawerProps) {
  const tenantId = usePOSStore((s) => s.tenantId);
  const [tipPct,       setTipPct]       = useState(20);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [initError,    setInitError]    = useState<string | null>(null);

  const tipCents    = Math.round(totalCents * tipPct / 100);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  const chargeCents = totalCents + tipCents;

  useEffect(() => {
    // Placeholder keys are a preview-only state. Do not create a mock
    // PaymentIntent or let the UI imply that money was captured.
    if (!isLiveStripe) {
      setInitError(null);
      setClientSecret('demo-preview');
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`${API}/v1/payments/checkout`, {
        method:  'POST',
        headers: apiHeaders(tenantId),
        body:    JSON.stringify({ order_id: orderId, tip_cents: tipCents }),
      });
      const body = await res.json();
      if (!res.ok) { setInitError(body.error?.message ?? body.error ?? 'Checkout failed'); setLoading(false); return; }
      setClientSecret(body.data.client_secret);
      setLoading(false);
    })();
    }, 400);
    return () => clearTimeout(timer);
  }, [orderId, tipCents, tenantId]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-[440px] max-w-[100vw] bg-[#12141f]/95 backdrop-blur-xl border-l border-white/10 px-6 py-7 h-dvh overflow-y-auto flex flex-col gap-6 shadow-2xl text-[#e8eaf0]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-400 block">Payment Tender</span>
            <h2 className="m-0 text-xl font-bold tracking-tight text-white">Checkout</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close checkout"
            className="min-w-[48px] min-h-[48px] rounded-full p-0 text-neutral-400 hover:text-white hover:bg-white/10 active:scale-[0.95] transition-all cursor-pointer"
          >
            <span className="text-xl leading-none">✕</span>
          </Button>
        </div>

        <div>
          <label className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block mb-2.5">Tip Gratuity</label>
          <div className="flex gap-2">
            {TIP_PRESETS.map((pct) => (
              <Button
                key={pct}
                variant="outline"
                aria-pressed={tipPct === pct}
                onClick={() => setTipPct(pct)}
                className={`flex-1 min-h-[48px] px-2 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all active:scale-[0.96] ${
                  tipPct === pct
                    ? 'border-[#7c6aff] bg-[#7c6aff]/25 text-[#a294ff] font-bold shadow-xs hover:bg-[#7c6aff]/35 hover:text-white'
                    : 'border-white/10 bg-white/5 text-neutral-400 font-medium hover:bg-white/10 hover:text-neutral-200'
                }`}
              >
                {pct === 0 ? 'No Tip' : `${pct}%`}
              </Button>
            ))}
          </div>
          {tipCents > 0 && (
            <div className="text-xs text-neutral-400 mt-2 flex justify-between font-medium">
              <span>Tip Amount: ${(tipCents / 100).toFixed(2)}</span>
              <span className="text-neutral-300 font-semibold">Total: ${(chargeCents / 100).toFixed(2)}</span>
            </div>
          )}
        </div>

        {loading   && <div className="text-neutral-400 text-sm animate-pulse">Initialising payment gateway…</div>}
        {initError && <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{initError}</div>}
        {!loading && clientSecret && (
          isLiveStripe && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
              <PaymentForm orderId={orderId} totalCents={totalCents} tipCents={tipCents} tenantId={tenantId} onSuccess={onSuccess} />
            </Elements>
          ) : (
            <div className="flex flex-col gap-4 bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10">
              <div className="text-xs text-neutral-300 leading-relaxed">
                <span className="inline-block bg-[#7c6aff]/20 text-[#a294ff] px-2 py-0.5 rounded-full font-bold text-[10px] tracking-wide mr-1.5 border border-[#7c6aff]/30">DEMO TENDER</span>
                Stripe is unconfigured. This is a checkout preview only; no card is charged or recorded.
              </div>
              <div className="flex justify-between text-xs text-neutral-400 pt-1">
                <span>Order subtotal</span><span className="tabular-nums font-medium text-neutral-200">${(totalCents / 100).toFixed(2)}</span>
              </div>
              {tipCents > 0 && (
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Selected tip</span><span className="tabular-nums font-medium text-neutral-200">${(tipCents / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-white/10 pt-3 text-white">
                <span>Charge total</span><span className="tabular-nums text-lg font-black">${(chargeCents / 100).toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={() => onSuccess({ mode: 'demo' })}
                className="w-full min-h-[48px] py-3.5 px-5 rounded-xl bg-[#7c6aff] text-white font-bold text-sm cursor-pointer hover:bg-[#6b5ce7] active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c6aff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#12141f] shadow-lg shadow-[#7c6aff]/25"
              >
                Finish Demo Preview — No Charge
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
