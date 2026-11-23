'use client';

import { useEffect, useRef, useState } from 'react';

type MenuItem = { id: string; name: string; station: string; priceCents: number };
type TicketItem = { name: string; station: string; qty: number };
type TicketStatus = 'cooking' | 'ready' | 'bumped';
type Ticket = {
  key: string;
  number: number;
  table: string;
  items: TicketItem[];
  createdAt: number;
  status: TicketStatus;
  bumpedAt?: number;
};

const MENUS: Record<string, { label: string; items: MenuItem[] }> = {
  bistro: {
    label: 'Artisan Bistro',
    items: [
      { id: 'margherita', name: 'Wood-Fired Margherita', station: 'HOT', priceCents: 1800 },
      { id: 'ribeye', name: 'Dry-Aged Ribeye 14oz', station: 'GRILL', priceCents: 4600 },
      { id: 'caesar', name: 'Little Gem Caesar', station: 'COLD', priceCents: 1400 },
      { id: 'negroni', name: 'Barrel-Aged Negroni', station: 'BAR', priceCents: 1600 },
    ],
  },
  fastcasual: {
    label: 'Fast-Casual & Tacos',
    items: [
      { id: 'birria', name: 'Smoked Birria Tacos (3x)', station: 'HOT', priceCents: 1550 },
      { id: 'carnitas', name: 'Crispy Carnitas Bowl', station: 'GRILL', priceCents: 1400 },
      { id: 'guac', name: 'House Guacamole & Chips', station: 'COLD', priceCents: 850 },
      { id: 'horchata', name: 'Fresh Horchata Cold Brew', station: 'BAR', priceCents: 600 },
    ],
  },
};

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
  const [activeMenuKey, setActiveMenuKey] = useState<'bistro' | 'fastcasual'>('bistro');
  const currentMenu = MENUS[activeMenuKey].items;

  const [quantities, setQuantities] = useState<Record<string, number>>({
    [currentMenu[0].id]: 1,
    [currentMenu[1].id]: 1,
  });
  const [draftKey, setDraftKey] = useState<string>(() => newDraftKey());
  const [sending, setSending] = useState(false);
  const [cashDrawerKicked, setCashDrawerKicked] = useState(false);
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('ALL');
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      key: 'seed-ticket-01',
      number: 1041,
      table: 'T-04',
      items: [
        { name: currentMenu[0].name, station: currentMenu[0].station, qty: 1 },
        { name: currentMenu[2].name, station: currentMenu[2].station, qty: 1 },
      ],
      createdAt: Date.now() - 145000,
      status: 'cooking',
    },
  ]);
  const [now, setNow] = useState(() => Date.now());
  const [ticketCounter, setTicketCounter] = useState(1042);

  const registry = useRef(new Map<string, Ticket>());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const draftItems: TicketItem[] = currentMenu
    .filter((m) => (quantities[m.id] ?? 0) > 0)
    .map((m) => ({
      name: m.name,
      station: m.station,
      qty: quantities[m.id] ?? 0,
    }));

  const draftTotal = currentMenu.reduce(
    (sum, m) => sum + m.priceCents * (quantities[m.id] ?? 0),
    0
  );
  const draftEmpty = draftItems.length === 0;

  function adjust(id: string, delta: number) {
    setQuantities((q) => {
      const next = Math.max(0, Math.min(9, (q[id] ?? 0) + delta));
      return { ...q, [id]: next };
    });
  }

  function handleMenuSwitch(key: 'bistro' | 'fastcasual') {
    setActiveMenuKey(key);
    const newItems = MENUS[key].items;
    setQuantities({
      [newItems[0].id]: 1,
      [newItems[1].id]: 1,
    });
    setDraftKey(newDraftKey());
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
      const ticket: Ticket = {
        key,
        number,
        table: `T-${(number % 12) + 1}`,
        items,
        createdAt: Date.now(),
        status: 'cooking',
      };
      registry.current.set(key, ticket);
      setTickets((ts) => [ticket, ...ts]);
      setTicketCounter((n) => n + 1);
      setDraftKey(newDraftKey());
      setSending(false);
    }, 280);
  }

  function bumpTicket(key: string) {
    setTickets((ts) =>
      ts.map((t) =>
        t.key === key
          ? {
              ...t,
              status: t.status === 'cooking' ? 'ready' : 'bumped',
              bumpedAt: Date.now(),
            }
          : t
      )
    );
  }

  function handleSettleCash() {
    setCashDrawerKicked(true);
    setTimeout(() => setCashDrawerKicked(false), 2000);
  }

  const visibleTickets = tickets
    .filter((t) => t.status !== 'bumped')
    .filter((t) => {
      if (selectedStationFilter === 'ALL') return true;
      return t.items.some((i) => i.station === selectedStationFilter);
    });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-3">
            INTERACTIVE RUNTIME SANDBOX (ZERO-INSTALL DEMO)
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Live POS Dispatch & KDS Kitchen Rail
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Preset:</span>
          <button
            type="button"
            onClick={() => handleMenuSwitch('bistro')}
            className={`min-h-[44px] px-3.5 rounded-lg text-xs font-bold transition-all ${
              activeMenuKey === 'bistro'
                ? 'bg-[#ff6b35] text-white shadow'
                : 'bg-[#181c24] text-slate-300 border border-[#2a303c] hover:bg-[#222834]'
            }`}
          >
            Artisan Bistro
          </button>
          <button
            type="button"
            onClick={() => handleMenuSwitch('fastcasual')}
            className={`min-h-[44px] px-3.5 rounded-lg text-xs font-bold transition-all ${
              activeMenuKey === 'fastcasual'
                ? 'bg-[#ff6b35] text-white shadow'
                : 'bg-[#181c24] text-slate-300 border border-[#2a303c] hover:bg-[#222834]'
            }`}
          >
            Fast-Casual Tacos
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* POS Panel */}
        <div className="rounded-xl bg-[#12151b] border border-[#232832] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#232832]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff6b35] block">
                  SURFACE :5172 • POS TERMINAL
                </span>
                <h3 className="font-bold text-lg text-white">Check Builder & Register</h3>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#181c24] border border-[#2a303c] text-slate-300">
                IDEM {draftKey.slice(0, 8)}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              {currentMenu.map((item) => {
                const qty = quantities[item.id] ?? 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-[#0e1116] border border-[#1c2029]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181c24] text-slate-300 border border-[#2a303c]">
                          {item.station}
                        </span>
                        <span className="text-sm font-semibold text-white">{item.name}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        {formatCents(item.priceCents)}
                      </div>
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
                      <span className="w-6 text-center font-mono text-sm font-bold text-white" aria-live="polite">
                        {qty}
                      </span>
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
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Authoritative Integer Subtotal
              </span>
              <span className="text-xl font-bold font-mono text-white">
                {formatCents(draftTotal)}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
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

            <button
              type="button"
              onClick={handleSettleCash}
              className="w-full min-h-[48px] px-4 rounded-lg bg-[#141820] hover:bg-[#1c222d] border border-[#2a303c] text-slate-200 hover:text-white font-mono text-xs uppercase tracking-wider
                active:scale-[0.97] transition-all duration-75 ease-out flex items-center justify-center gap-2"
            >
              <span>{cashDrawerKicked ? '⚡ CASH DRAWER KICKED (ESC/POS 24V RJ11DK)' : 'SIMULATE CASH DRAWER KICK (POST /v1/drawers/open)'}</span>
            </button>
          </div>
        </div>

        {/* KDS Panel */}
        <div className="rounded-xl bg-[#12151b] border border-[#232832] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#232832]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                  SURFACE :5173 • KDS EXPEDITE RAIL
                </span>
                <h3 className="font-bold text-lg text-white">Kitchen Display Station</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  RUST ENGINE ACTIVE
                </span>
              </div>
            </div>

            {/* Station Filter Tabs */}
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
              {['ALL', 'GRILL', 'HOT', 'COLD', 'BAR'].map((station) => (
                <button
                  key={station}
                  type="button"
                  onClick={() => setSelectedStationFilter(station)}
                  className={`min-h-[36px] px-3 rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-colors ${
                    selectedStationFilter === station
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-[#181c24] text-slate-400 border border-[#2a303c] hover:text-white'
                  }`}
                >
                  {station}
                </button>
              ))}
            </div>

            {visibleTickets.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-[#2a303c] rounded-lg bg-[#0e1116] p-6">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">
                  [KDS RAIL ALL CLEAR]
                </span>
                <p className="text-xs text-slate-400 max-w-xs">
                  Fire an order from the POS check builder on the left to see live real-time kitchen chits routed by station.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                {visibleTickets.map((ticket) => {
                  const elapsed = now - ticket.createdAt;
                  const isLongWait = elapsed > 180000;
                  const isReady = ticket.status === 'ready';

                  return (
                    <div
                      key={ticket.key}
                      className={`rounded-lg border p-4 transition-all duration-150 ${
                        isReady
                          ? 'border-emerald-500/50 bg-emerald-950/20'
                          : isLongWait
                          ? 'border-amber-500/50 bg-amber-950/20'
                          : 'border-[#2a303c] bg-[#0e1116]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1c2029]">
                        <span className="font-mono font-bold text-sm text-white">
                          CHIT #{ticket.number} • {ticket.table}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                              isReady
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isLongWait
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {formatElapsed(elapsed)}
                          </span>
                          <span
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                              isReady
                                ? 'bg-emerald-500 text-black'
                                : 'bg-slate-700 text-slate-200'
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                      </div>

                      <ul className="space-y-1.5 mb-3">
                        {ticket.items.map((item) => (
                          <li
                            key={item.name}
                            className="text-sm text-slate-200 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-mono text-[#ff6b35] font-bold mr-2">
                                {item.qty}x
                              </span>
                              <span>{item.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.station}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex items-center justify-between pt-2 border-t border-[#1c2029]">
                        <span className="text-[10px] font-mono text-slate-500">
                          KEY: {ticket.key.slice(0, 8)}
                        </span>
                        <button
                          type="button"
                          onClick={() => bumpTicket(ticket.key)}
                          className={`min-h-[40px] px-4 rounded font-mono text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ${
                            isReady
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                              : 'bg-[#ff6b35] hover:bg-[#e85d2a] text-white'
                          }`}
                        >
                          {isReady ? 'SERVE & BUMP TICKET' : 'MARK READY (BUMP)'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#232832] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>FLSA TIP POOL: HOURS-WEIGHTED</span>
            <span>ESC/POS DRIVERS: STAR & EPSON</span>
          </div>
        </div>
      </div>
    </div>
  );
}
