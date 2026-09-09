'use client';

import { useEffect, useRef, useState } from 'react';

type MenuItem = { id: string; name: string; priceCents: number };
type TicketItem = { name: string; qty: number };
type Ticket = { key: string; number: number; items: TicketItem[]; createdAt: number };

const MENU: MenuItem[] = [
  { id: 'margherita', name: 'Margherita Pizza', priceCents: 1499 },
  { id: 'brisket', name: 'Smoked Brisket Plate', priceCents: 2499 },
  { id: 'caesar', name: 'Charred Caesar Salad', priceCents: 1199 },
  { id: 'tiramisu', name: 'Espresso Tiramisu', priceCents: 899 },
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function newDraftKey(): string {
  // Client-generated idempotency key: one per ticket draft, minted once.
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Interactive POS -> KDS demo. Simulated in the browser (no real orders).
 *
 * Duplicate-send protection, two layers:
 * 1. The button is disabled while a submission is in flight, so rapid
 *    double-clicks cannot fire a second request.
 * 2. Each ticket draft carries a client-generated idempotency key. The send
 *    path refuses to create a second ticket for the same key, so even a
 *    retry / double event collapses to the original ticket.
 */
export default function DemoSection() {
  const [quantities, setQuantities] = useState<Record<string, number>>({ margherita: 1, brisket: 1 });
  const [draftKey, setDraftKey] = useState<string>(() => newDraftKey());
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [ticketCounter, setTicketCounter] = useState(1042);

  // Idempotency registry: key -> ticket. Survives re-renders via ref.
  const registry = useRef(new Map<string, Ticket>());

  // Tick the KDS timers once a second.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const draftItems: TicketItem[] = MENU.filter((m) => (quantities[m.id] ?? 0) > 0).map((m) => ({
    name: m.name,
    qty: quantities[m.id] ?? 0,
  }));
  const draftTotal = MENU.reduce((sum, m) => sum + m.priceCents * (quantities[m.id] ?? 0), 0);
  const draftEmpty = draftItems.length === 0;

  function adjust(id: string, delta: number) {
    setQuantities((q) => {
      const next = Math.max(0, Math.min(9, (q[id] ?? 0) + delta));
      return { ...q, [id]: next };
    });
  }

  function sendToKitchen() {
    if (sending || draftEmpty) return;

    // Layer 2 (idempotency): a retry for the same draft key returns the
    // original ticket instead of creating a duplicate.
    const existing = registry.current.get(draftKey);
    if (existing) {
      setTickets((ts) => (ts.some((t) => t.key === existing.key) ? ts : [existing, ...ts]));
      setDraftKey(newDraftKey());
      return;
    }

    // Layer 1 (in-flight guard): disable the button for the whole round trip.
    setSending(true);
    const key = draftKey;
    const items = draftItems;
    const number = ticketCounter;

    // Simulated network round trip.
    setTimeout(() => {
      const ticket: Ticket = { key, number, items, createdAt: Date.now() };
      registry.current.set(key, ticket);
      setTickets((ts) => [ticket, ...ts]);
      setTicketCounter((n) => n + 1);
      // Fresh draft => fresh idempotency key for the next ticket.
      setDraftKey(newDraftKey());
      setSending(false);
    }, 800);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <span className="inline-block px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-semibold uppercase tracking-widest mb-4">
          Interactive demo
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Try the <span className="gradient-text">POS → KDS</span> flow
        </h2>
        <p className="text-white/50 text-lg max-w-2xl mx-auto">
          Build a ticket, send it to the kitchen, and watch it land on the KDS rail —
          with duplicate-send protection built in. Simulated in your browser; no real orders.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── POS side ── */}
        <div className="glass rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg">Point of Sale</h3>
            <span className="text-xs font-mono text-white/60">draft key {draftKey.slice(0, 8)}…</span>
          </div>

          <div className="space-y-3 mb-6">
            {MENU.map((item) => {
              const qty = quantities[item.id] ?? 0;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-white/60">{formatCents(item.priceCents)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjust(item.id, -1)}
                      disabled={qty === 0 || sending}
                      aria-label={`Remove one ${item.name}`}
                      className="w-10 h-10 min-w-[40px] rounded-lg glass border border-white/10 text-lg font-bold text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-mono text-sm" aria-live="polite">{qty}</span>
                    <button
                      type="button"
                      onClick={() => adjust(item.id, 1)}
                      disabled={qty >= 9 || sending}
                      aria-label={`Add one ${item.name}`}
                      className="w-10 h-10 min-w-[40px] rounded-lg glass border border-white/10 text-lg font-bold text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-4 mb-5">
            <span className="text-sm text-white/50">Total</span>
            <span className="text-xl font-bold">{formatCents(draftTotal)}</span>
          </div>

          {/* 6-state button: idle / hover / focus-visible / active / loading / disabled */}
          <button
            type="button"
            onClick={sendToKitchen}
            disabled={sending || draftEmpty}
            className="w-full min-h-[56px] px-8 rounded-2xl gradient-bg text-white font-bold text-lg
              hover:opacity-90 active:scale-[0.97] transition-all duration-75 ease-out
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50
              shadow-lg shadow-brand-orange/20"
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
                Sending to kitchen…
              </span>
            ) : (
              'SEND TO KITCHEN'
            )}
          </button>
          <p className="mt-3 text-xs text-white/50 text-center">
            {sending
              ? 'Submission in flight — the button stays disabled until it lands.'
              : 'Double-click all you want: in-flight guard + idempotency key = one ticket.'}
          </p>
        </div>

        {/* ── KDS side ── */}
        <div className="glass rounded-2xl border border-white/10 p-6 bg-black/30">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg">Kitchen Display</h3>
            <span className="flex items-center gap-2 text-xs text-green-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-xl">
              <div className="text-4xl mb-3">🧾</div>
              <p className="text-sm text-white/60 max-w-[220px]">
                No tickets yet. Send one from the POS and it lands here instantly.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {tickets.map((ticket) => {
                const elapsed = now - ticket.createdAt;
                const urgent = elapsed > 10 * 60 * 1000;
                const warn = elapsed > 5 * 60 * 1000;
                return (
                  <div
                    key={ticket.key}
                    className={`rounded-xl border p-4 transition-colors ${
                      urgent
                        ? 'border-brand-red/60 bg-brand-red/5'
                        : warn
                          ? 'border-brand-orange/50 bg-brand-orange/5'
                          : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm">#{ticket.number}</span>
                      <span
                        className={`font-mono text-sm font-bold ${
                          urgent ? 'text-brand-red' : warn ? 'text-brand-orange' : 'text-green-400'
                        }`}
                      >
                        {formatElapsed(elapsed)}
                      </span>
                    </div>
                    <ul className="space-y-1 mb-2">
                      {ticket.items.map((item) => (
                        <li key={item.name} className="text-sm text-white/70">
                          <span className="font-mono text-white font-bold mr-2">{item.qty}×</span>
                          {item.name}
                        </li>
                      ))}
                    </ul>
                    <div className="text-[11px] font-mono text-white/60">
                      idem-key {ticket.key.slice(0, 8)}… · retries collapse to this ticket
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
