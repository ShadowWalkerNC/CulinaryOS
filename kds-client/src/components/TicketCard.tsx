import { useState, useEffect } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { useBumpTicket, useRecallTicket } from '../lib/queries';
import type { KitchenTicket } from '../../../../shared/types';

const STATION_COLORS: Record<string, string> = {
  hot:    '#ef4444',
  cold:   '#3b82f6',
  grill:  '#f97316',
  fry:    '#eab308',
  sauce:  '#8b5cf6',
  pastry: '#ec4899',
  pass:   '#10b981',
  bar:    '#06b6d4',
};

const WARN_SECONDS  = 600;   // 10 min — yellow
const DANGER_SECONDS = 900;  // 15 min — red

function useElapsed(firedAt?: string): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!firedAt) return;
    const start = new Date(firedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [firedAt]);
  return elapsed;
}

function timerClass(elapsed: number): string {
  if (elapsed >= DANGER_SECONDS) return 'timer-danger';
  if (elapsed >= WARN_SECONDS)   return 'timer-warn';
  return 'timer-ok';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props { ticket: KitchenTicket; }

export function TicketCard({ ticket }: Props) {
  const elapsed = useElapsed(ticket.firedAt ?? ticket.createdAt);
  const { mutate: bump, isPending: bumping } = useBumpTicket();
  const { mutate: recall } = useRecallTicket();
  const stationColor = STATION_COLORS[ticket.station] ?? '#888888';
  const isRush = ticket.priority === 'rush';
  const isBumped = ticket.status === 'bumped';

  return (
    <div
      className={`rounded-xl border-2 bg-[#111111] flex flex-col overflow-hidden ${
        isRush ? 'ticket-rush' : ''
      }`}
      style={{ borderColor: isRush ? '#ef4444' : stationColor + '66' }}
    >
      {/* Ticket header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: stationColor + '22' }}>
        <div className="flex items-center gap-2">
          <span className="font-black text-white text-lg">#{ticket.orderNumber}</span>
          {ticket.tableNumber && (
            <span className="text-xs text-[#888888]">Table {ticket.tableNumber}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRush && <span className="text-xs font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded">RUSH</span>}
          {ticket.priority === 'allergy' && <span className="text-xs font-bold text-yellow-400 bg-yellow-950 px-2 py-0.5 rounded">ALLERGY</span>}
          <span
            className={`font-mono text-sm font-bold ${isBumped ? 'text-[#444444]' : timerClass(elapsed)}`}
          >
            {isBumped ? 'DONE' : formatTime(elapsed)}
          </span>
        </div>
      </div>

      {/* Station badge */}
      <div className="px-3 pt-2 pb-1">
        <span
          className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded"
          style={{ color: stationColor, backgroundColor: stationColor + '22' }}
        >
          {ticket.station.toUpperCase()}
        </span>
        {ticket.coverCount && (
          <span className="text-[10px] text-[#555555] ml-2">{ticket.coverCount} covers</span>
        )}
      </div>

      {/* Items */}
      <div className="px-3 py-2 flex-1">
        {ticket.items.map((item, i) => (
          <div key={i} className="py-1 border-b border-[#1a1a1a] last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">
                {item.quantity > 1 && <span className="text-green-400 mr-1">{item.quantity}x</span>}
                {item.name}
              </span>
            </div>
            {item.modifiers.map((mod, j) => (
              <div key={j} className="text-[#888888] text-xs ml-2 mt-0.5">— {mod}</div>
            ))}
            {item.notes && (
              <div className="text-yellow-400 text-xs ml-2 mt-0.5 font-medium">{item.notes}</div>
            )}
          </div>
        ))}
        {ticket.notes && (
          <div className="mt-2 text-yellow-300 text-xs bg-yellow-950 rounded px-2 py-1">{ticket.notes}</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-t border-[#1a1a1a]">
        {isBumped ? (
          <button
            onClick={() => recall(ticket.id)}
            className="flex-1 py-2 rounded text-xs font-bold bg-[#1a1a1a] text-[#888888] hover:bg-[#222222] hover:text-white transition-colors"
          >
            RECALL
          </button>
        ) : (
          <button
            onClick={() => bump({ ticketId: ticket.id, cookTimeSeconds: elapsed })}
            disabled={bumping}
            className="flex-1 py-2.5 rounded text-sm font-black bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
          >
            {bumping ? '...' : 'BUMP'}
          </button>
        )}
      </div>
    </div>
  );
}
