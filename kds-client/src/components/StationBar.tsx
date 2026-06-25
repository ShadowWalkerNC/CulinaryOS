import type { KitchenStation } from '../../../../shared/types';

interface Props {
  stations: { key: KitchenStation | 'all'; label: string }[];
  active: KitchenStation | 'all';
  onSelect: (s: KitchenStation | 'all') => void;
}

export function StationBar({ stations, active, onSelect }: Props) {
  return (
    <div className="flex gap-2 px-6 py-3 bg-[#111111] border-b border-[#1a1a1a] overflow-x-auto">
      {stations.map((s) => (
        <button
          key={s.key}
          onClick={() => onSelect(s.key)}
          className={`px-4 py-1.5 rounded text-xs font-bold tracking-widest transition-colors ${
            active === s.key
              ? 'bg-green-600 text-white'
              : 'bg-[#1a1a1a] text-[#888888] hover:bg-[#222222] hover:text-white'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
