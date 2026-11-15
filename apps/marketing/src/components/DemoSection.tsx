'use client';

import { useEffect, useRef, useState } from 'react';

type MenuItem = { id: string; name: string; station: string; priceCents: number };
type TicketItem = { name: string; station: string; qty: number };
type Ticket = { key: string; number: number; items: TicketItem[]; createdAt: number };

const MENU: MenuItem[] = [
  { id: 'margherita', name: 'Wood-Fired Margherita', station: 'HOT', priceCents: 1800 },
  { id: 'ribeye', name: 'Dry-Aged Ribeye 14oz', station: 'GRILL', priceCents: 4600 },
  { id: 'caesar', name: 'Little Gem Caesar', station: 'COLD', priceCents: 1400 },
  { id: 'negroni', name: 'Barrel-Aged Negroni', station: 'BAR', priceCents: 1600 },
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function newDraftKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function DemoSection() {
  const [quantities, setQuantities] = useState<Record<string, number>>({ margherita: 1, ribeye: 1 });
  const [draftKey, setDraftKey] = useState<string>(() => newDraftKey());
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [ticketCounter, setTicketCounter] = useState(1042);

  const registry = useRef(new Map<string, Ticket>());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const draftItems: TicketItem[] = MENU.filter((m) => (quantities[m.id] ?? 0) > 0).map((m) => ({
    name: m.name,
    station: m.station,
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

    const existing = registry.current.get(draftKey);
    if (existing) {
      setTickets((ts) => (ts.some((t) => t.key === existing.key) ? ts : [existing, ...ts]));
      setDraftKey(newDraftKey());
      return;
    }

    setSending(true);
    const key = draftKey;
    const items = draftItems;
    const number = ticketCounter;

    setTimeout(() => {
      const ticket: Ticket = { key, number, items, createdAt: Date.now() };
      registry.current.set(key, ticket);
      setTickets((ts) => [ticket, ...ts]);
      setTicketCounter((n) => n + 1);
      setDraftKey(newDraftKey());
      setSending(false);
    }, 350);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-3">
            INTERACTIVE TELEMETRY HARNESS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            POS Order Dispatch to KDS Rail
          </h2>
        </div>
        <p className="text-slate-400 text-sm max-w-md font-mono">
          Idempotency key enforcement: duplicate clicks collapse into a single authoritative kitchen chit.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[#12151b] border border-[#232832] p-6">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#232832]">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff6b35] block">SURFACE :5172</span>
              <h3 className="font-bold text-lg text-white">POS Terminal Check Builder</h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#181c24] border border-[#2a303c] text-slate-300">
              IDEM {draftKey.slice(0, 8)}
            </span>
          </div>

          <div className="space-y-3 mb-6">
            {MENU.map((item) => {
              const qty = quantities[item.id] ?? 0;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-[#0e1116] border border-[#1c2029]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181c24] text-slate-300 border border-[#2a303c]">
                        {item.station}
                      </span>
                      <span className="text-sm font-semibold text-white">{item.name}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{formatCents(item.priceCents)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjust(item.id, -1)}
                      disabled={qty === 0 || sending}
                      aria-label={`Remove one ${item.name}`}
                      className="w-12 h-12 min-w-[48px] rounded-lg bg-[#181c24] border border-[#2a303c] text-base font-bold text-slate-200 hover:text-white hover:bg-[#222834] active:scale-[0.97] transition-all duration-75 ease-out disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono text-sm font-bold text-white" aria-live="polite">{qty}</span>
                    <button
                      type="button"
                      onClick={() => adjust(item.id, 1)}
                      disabled={qty >= 9 || sending}
                      aria-label={`Add one ${item.name}`}
                      className="w-12 h-12 min-w-[48px] rounded-lg bg-[#181c24] border border-[#2a303c] text-base font-bold text-slate-200 hover:text-white hover:bg-[#222834] active:scale-[0.97] transition-all duration-75 ease-out disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-[#232832] pt-4 mb-5">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Authoritative Integer Subtotal</span>
            <span className="text-xl font-bold font-mono text-white">{formatCents(draftTotal)}</span>
          </div>

          <button
            type="button"
            onClick={sendToKitchen}
            disabled={sending || draftEmpty}
            className="w-full min-h-[52px] px-6 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-sm uppercase tracking-wider
              active:scale-[0.97] transition-all duration-75 ease-out
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'DISPATCHING TO KDS RAIL...' : 'FIRE ORDER TO KITCHEN (PATCH /v1/orders/:id/send)'}
          </button>
        </div>

        <div className="rounded-xl bg-[#12151b] border border-[#232832] p-6">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#232832]">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">SURFACE :5173</span>
              <h3 className="font-bold text-lg text-white">Kitchen Display Rail</h3>
            </div>
            <span className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              STATION ONLINE
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-[#2a303c] rounded-lg bg-[#0e1116] p-6">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">
                [KDS QUEUE EMPTY]
              </span>
              <p className="text-xs text-slate-400 max-w-xs">
                Fire an order from the POS check builder on the left to inspect real-time station ticket serialization.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {tickets.map((ticket) => {
                const elapsed = now - ticket.createdAt;
                return (
                  <div
                    key={ticket.key}
                    className="rounded-lg border border-[#2a303c] bg-[#0e1116] p-4"
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1c2029]">
                      <span className="font-mono font-bold text-sm text-white">CHIT #{ticket.number} • TABLE 12</span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {formatElapsed(elapsed)}
                      </span>
                    </div>
                    <ul className="space-y-1.5 mb-3">
                      {ticket.items.map((item) => (
                        <li key={item.name} className="text-sm text-slate-200 flex items-center justify-between">
                          <div>
                            <span className="font-mono text-[#ff6b35] font-bold mr-2">{item.qty}x</span>
                            <span>{item.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{item.station}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="text-[11px] font-mono text-slate-400">
                      IDEMPOTENCY KEY: {ticket.key.slice(0, 8)}
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
