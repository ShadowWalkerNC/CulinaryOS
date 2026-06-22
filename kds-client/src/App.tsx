import { useKDSStore } from './lib/store';
import { StationBar } from './components/StationBar';
import { TicketGrid } from './components/TicketGrid';
import type { KitchenStation } from '../../../shared/types';

const STATIONS: { key: KitchenStation | 'all'; label: string }[] = [
  { key: 'all',    label: 'ALL' },
  { key: 'hot',    label: 'HOT' },
  { key: 'cold',   label: 'COLD' },
  { key: 'grill',  label: 'GRILL' },
  { key: 'fry',    label: 'FRY' },
  { key: 'sauce',  label: 'SAUCE' },
  { key: 'pastry', label: 'PASTRY' },
  { key: 'pass',   label: 'PASS' },
  { key: 'bar',    label: 'BAR' },
];

export function App() {
  const { activeStation, setStation } = useKDSStore();

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#111111] border-b border-[#222222]">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg tracking-tight">KDS</span>
          <span className="text-[#444444] text-sm">CulinaryOS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-[#888888] text-xs">LIVE</span>
        </div>
      </header>

      {/* Station bar */}
      <StationBar stations={STATIONS} active={activeStation} onSelect={setStation} />

      {/* Ticket grid */}
      <main className="flex-1 p-4 overflow-auto">
        <TicketGrid station={activeStation} />
      </main>
    </div>
  );
}
