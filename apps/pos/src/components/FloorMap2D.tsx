import React, { useState, useRef } from 'react';
import type { FloorTable, TableStatus } from '../views/TablesView';
import { Users, Clock, DollarSign, Move, CheckCircle2 } from 'lucide-react';

interface FloorMap2DProps {
  tables: FloorTable[];
  orders: any[];
  editMode: boolean;
  selectedTableId?: string;
  onSelectTable: (table: FloorTable, activeOrder: any) => void;
  onUpdateTablePosition?: (tableId: string, x: number, y: number) => void;
  activeSection: string;
}

export function FloorMap2D({
  tables,
  orders,
  editMode,
  selectedTableId,
  onSelectTable,
  onUpdateTablePosition,
  activeSection,
}: FloorMap2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const getActiveOrder = (table: FloorTable) => {
    return orders.find(
      (o: any) =>
        String(o.table_number) === String(table.number) ||
        String(o.table_number) === String(table.label)
    );
  };

  const getEffectiveStatus = (table: FloorTable, activeOrder: any): TableStatus => {
    if (activeOrder) {
      if (activeOrder.status === 'paying' || activeOrder.status === 'billed') return 'paying';
      return 'occupied';
    }
    return table.defaultStatus;
  };

  // Drag and drop handler for Edit Mode
  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    if (!editMode || !onUpdateTablePosition) return;
    e.stopPropagation();
    setDraggingId(tableId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const rawY = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      // Clamp between 5% and 92%
      const clampedX = Math.max(5, Math.min(92, Math.round(rawX)));
      const clampedY = Math.max(8, Math.min(90, Math.round(rawY)));

      onUpdateTablePosition(tableId, clampedX, clampedY);
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Status visual configurations
  const statusStyles: Record<
    TableStatus,
    {
      bg: string;
      border: string;
      glow: string;
      text: string;
      badgeBg: string;
      dot: string;
      label: string;
    }
  > = {
    available: {
      bg: 'bg-emerald-950/40 hover:bg-emerald-900/60',
      border: 'border-emerald-500/70',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      text: 'text-emerald-300',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dot: 'bg-emerald-400',
      label: 'Available',
    },
    occupied: {
      bg: 'bg-amber-950/60 hover:bg-amber-900/80',
      border: 'border-amber-500',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/30',
      text: 'text-amber-200',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      dot: 'bg-amber-400 animate-pulse',
      label: 'Occupied',
    },
    paying: {
      bg: 'bg-blue-950/60 hover:bg-blue-900/80',
      border: 'border-blue-500',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.35)] ring-2 ring-blue-400/30',
      text: 'text-blue-200',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      dot: 'bg-blue-400 animate-ping',
      label: 'Check Dropped',
    },
    reserved: {
      bg: 'bg-indigo-950/40 hover:bg-indigo-900/60',
      border: 'border-indigo-500/70',
      glow: 'shadow-[0_0_15px_rgba(99,102,241,0.25)]',
      text: 'text-indigo-300',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      dot: 'bg-indigo-400',
      label: 'Reserved',
    },
    dirty: {
      bg: 'bg-slate-800/60 hover:bg-slate-800/90',
      border: 'border-slate-500/60',
      glow: 'shadow-[0_0_10px_rgba(148,163,184,0.15)]',
      text: 'text-slate-400',
      badgeBg: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
      dot: 'bg-slate-400',
      label: 'Dirty / Clear',
    },
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[640px] sm:h-[680px] lg:h-[720px] bg-slate-950 border-2 border-slate-800 rounded-3xl overflow-hidden select-none shadow-2xl transition-all"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%),
          linear-gradient(to right, rgba(51, 65, 85, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(51, 65, 85, 0.15) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
      }}
    >
      {/* ================= ARCHITECTURAL ZONE OVERLAYS ================= */}

      {/* Zone 1: Bar & Lounge (Top Left) */}
      <div className="absolute top-3 left-3 w-[58%] h-[24%] border border-dashed border-amber-600/30 rounded-2xl bg-amber-950/10 backdrop-blur-[2px] pointer-events-none p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400/80">
              Bar & Cocktail Lounge
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-500/60">Tavern Counter Rail</span>
        </div>
        {/* Visual Wooden Bar Counter */}
        <div className="w-[96%] h-3.5 mx-auto rounded-full bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 border border-amber-700/50 shadow-inner" />
      </div>

      {/* Zone 2: Main Dining Room (Center & Bottom Left) */}
      <div className="absolute top-[28%] left-3 w-[58%] h-[68%] border border-dashed border-slate-700/40 rounded-2xl bg-slate-900/20 backdrop-blur-[2px] pointer-events-none p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300/80">
              Main Dining Room
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Booths & Family Seating</span>
        </div>
      </div>

      {/* Zone 3: Patio & Garden Terrace (Right) */}
      <div className="absolute top-3 right-3 w-[37%] h-[64%] border border-dashed border-emerald-600/30 rounded-2xl bg-emerald-950/10 backdrop-blur-[2px] pointer-events-none p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400/80">
              Outdoor Garden Patio
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-500/60">Terrace</span>
        </div>
      </div>

      {/* Zone 4: VIP Private Dining Suite (Bottom Right) */}
      <div className="absolute bottom-3 right-3 w-[37%] h-[28%] border border-dashed border-purple-600/40 rounded-2xl bg-purple-950/15 backdrop-blur-[2px] pointer-events-none p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-300/80">
              Private VIP Dining
            </span>
          </div>
          <span className="text-[10px] font-mono text-purple-400/60">Banquet</span>
        </div>
      </div>

      {/* ================= 2D TABLES RENDERED SPATIALLY ================= */}
      {tables.map((table) => {
        const activeOrder = getActiveOrder(table);
        const effStatus = getEffectiveStatus(table, activeOrder);
        const style = statusStyles[effStatus];
        const isSelected = selectedTableId === table.id;
        const isDimmed = activeSection !== 'all' && table.sectionId !== activeSection;

        // Coordinates (percentage based)
        const posX = table.x ?? 50;
        const posY = table.y ?? 50;

        // Shape geometric styling
        let shapeClasses = 'rounded-2xl w-24 h-24';
        if (table.shape === 'round') shapeClasses = 'rounded-full w-24 h-24 aspect-square';
        if (table.shape === 'booth') shapeClasses = 'rounded-2xl w-28 h-20 border-l-[6px] border-l-amber-500';
        if (table.shape === 'rectangle') shapeClasses = 'rounded-2xl w-32 h-20';
        if (table.shape === 'bar') shapeClasses = 'rounded-full w-16 h-16 aspect-square';
        if (table.shape === 'oval') shapeClasses = 'rounded-[32px] w-36 h-22';

        return (
          <div
            key={table.id}
            onMouseDown={(e) => handleMouseDown(e, table.id)}
            onClick={(e) => {
              if (editMode) return;
              e.stopPropagation();
              onSelectTable(table, activeOrder);
            }}
            style={{
              left: `${posX}%`,
              top: `${posY}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`
              absolute transition-all duration-200 cursor-pointer
              ${shapeClasses}
              border-2 ${style.border} ${style.bg} ${style.glow}
              backdrop-blur-md flex flex-col items-center justify-center p-2
              ${isSelected ? 'ring-4 ring-orange-500 scale-105 z-30' : 'z-10 hover:scale-105 hover:z-20'}
              ${isDimmed ? 'opacity-30 pointer-events-none' : 'opacity-100'}
              ${draggingId === table.id ? 'cursor-grabbing scale-110 z-40 shadow-2xl ring-4 ring-sky-400' : ''}
              group active:scale-95
            `}
          >
            {/* Table Number & Section */}
            <div className="flex items-center gap-1 font-black text-sm tracking-tight text-white drop-shadow-sm">
              <span>{table.label}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            </div>

            {/* Capacity or Active Cover Count */}
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 mt-0.5">
              <Users className="w-3 h-3 text-slate-400" />
              <span>
                {activeOrder?.cover_count ?? table.capacity}/{table.capacity}
              </span>
            </div>

            {/* Active Order Details (Total & Server) */}
            {activeOrder && (
              <div className="mt-1 text-center w-full px-1">
                <span className="font-mono font-black text-[11px] text-white block bg-black/40 rounded px-1 py-0.5 shadow-xs">
                  ${((activeOrder.total || 0) / 100).toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-300 truncate block max-w-full font-semibold">
                  {activeOrder.server_name || 'Staff'}
                </span>
              </div>
            )}

            {/* Drag Handle in Edit Mode */}
            {editMode && (
              <div className="absolute -top-2 -right-2 bg-sky-500 text-white rounded-full p-1 shadow-md animate-bounce">
                <Move className="w-3 h-3" />
              </div>
            )}
          </div>
        );
      })}

      {/* Map Legend Footer */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-4 text-xs backdrop-blur-md shadow-lg pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-bold text-slate-300">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-300">Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span className="text-[11px] font-bold text-slate-300">Paying</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
          <span className="text-[11px] font-bold text-slate-300">Reserved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span className="text-[11px] font-bold text-slate-400">Dirty</span>
        </div>
        {editMode && (
          <div className="border-l border-slate-700 pl-3 text-sky-400 font-bold text-[11px] flex items-center gap-1">
            <Move className="w-3.5 h-3.5" />
            <span>Drag tables to reposition layout</span>
          </div>
        )}
      </div>
    </div>
  );
}
