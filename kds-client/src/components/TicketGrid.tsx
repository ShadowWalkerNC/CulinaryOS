// Replaces polling version — now uses Realtime push via useTicketStore
import { useTicketStore } from '../lib/useTicketStore';
import { TicketCard } from './TicketCard';
import type { KitchenStation } from '../../../../shared/types';

interface Props {
  station: KitchenStation | 'all';
}

export function TicketGrid({ station }: Props) {
  const { tickets, loading, error } = useTicketStore(station);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-400">
      <p className="text-sm">Connection error: {error}</p>
    </div>
  );

  if (tickets.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-[#333333]">
      <span className="text-5xl mb-4">✓</span>
      <p className="text-lg font-semibold">All clear</p>
      <p className="text-sm mt-1">No active tickets</p>
    </div>
  );

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
