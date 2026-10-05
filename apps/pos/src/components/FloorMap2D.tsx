import React, { useState, useRef, useMemo } from 'react';
import type { FloorTable, TableStatus, SectionId } from '../views/TablesView';
import {
  Users,
  Clock,
  DollarSign,
  Move,
  RotateCw,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  Grid,
  Maximize2,
  Armchair,
  Layers,
} from 'lucide-react';

interface FloorMap2DProps {
  tables: FloorTable[];
  orders: any[];
  editMode: boolean;
  selectedTableId?: string;
  onSelectTable: (table: FloorTable, activeOrder: any) => void;
  onUpdateTablePosition?: (tableId: string, x: number, y: number) => void;
  onUpdateTableRotation?: (tableId: string, rotation: number) => void;
  onAddTable?: (shape: FloorTable['shape'], sectionId: Exclude<SectionId, 'all'>) => void;
  onDeleteTable?: (tableId: string) => void;
  onUpdateTableCapacity?: (tableId: string, delta: number) => void;
  activeSection: SectionId;
  onSelectSection?: (sectionId: SectionId) => void;
  customPositions?: Record<string, { x: number; z: number; rotation?: number }>;
}

export function FloorMap2D({
  tables,
  orders,
  editMode,
  selectedTableId,
  onSelectTable,
  onUpdateTablePosition,
  onUpdateTableRotation,
  onAddTable,
  onDeleteTable,
  onUpdateTableCapacity,
  activeSection,
  onSelectSection,
  customPositions = {},
}: FloorMap2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);

  // Active table selected inside builder
  const activeSelectedTable = useMemo(() => {
    return tables.find((t) => t.id === selectedTableId);
  }, [tables, selectedTableId]);

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

  // Section configuration metadata
  const sectionMeta: Record<
    Exclude<SectionId, 'all'>,
    { title: string; subtitle: string; icon: string; accent: string; border: string; bg: string }
  > = {
    main: {
      title: 'Main Dining Room',
      subtitle: 'Family Seating, Center 4-Tops & Perimeter Booths',
      icon: '🍽️',
      accent: 'text-slate-200',
      border: 'border-slate-700/60',
      bg: 'bg-slate-900/40',
    },
    bar: {
      title: 'Bar & Cocktail Lounge',
      subtitle: 'High-Top Tables, Stool Counter Rail & Tavern Seating',
      icon: '🍸',
      accent: 'text-amber-300',
      border: 'border-amber-600/40',
      bg: 'bg-amber-950/20',
    },
    patio: {
      title: 'Outdoor Garden Patio',
      subtitle: 'Open-Air Terrace, Planters & Umbrella Round Tables',
      icon: '🌿',
      accent: 'text-emerald-300',
      border: 'border-emerald-600/40',
      bg: 'bg-emerald-950/20',
    },
    vip: {
      title: 'Private VIP Dining Suite',
      subtitle: 'Executive Banquets, Wine Display & Intimate Dining',
      icon: '👑',
      accent: 'text-purple-300',
      border: 'border-purple-600/40',
      bg: 'bg-purple-950/25',
    },
    rooftop: {
      title: 'Skyline Rooftop Deck',
      subtitle: 'Elevated Views & Lounge Sofas',
      icon: '✨',
      accent: 'text-sky-300',
      border: 'border-sky-600/40',
      bg: 'bg-sky-950/20',
    },
  };

  // Filter tables by active section page
  const displayedTables = useMemo(() => {
    if (activeSection === 'all') return tables;
    return tables.filter((t) => t.sectionId === activeSection);
  }, [tables, activeSection]);

  // Drag and drop with magnetic SNAP TO GRID (4% step increments)
  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    if (!editMode || !onUpdateTablePosition) return;
    e.stopPropagation();
    setDraggingId(tableId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const rawY = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      // Magnetic Snap to 4% Grid
      const snapStep = 4;
      const snappedX = Math.max(5, Math.min(93, Math.round(rawX / snapStep) * snapStep));
      const snappedY = Math.max(8, Math.min(90, Math.round(rawY / snapStep) * snapStep));

      onUpdateTablePosition(tableId, snappedX, snappedY);
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Status visual styles
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
      bg: 'bg-emerald-950/50 hover:bg-emerald-900/70',
      border: 'border-emerald-500/80',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      text: 'text-emerald-300',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dot: 'bg-emerald-400',
      label: 'Available',
    },
    occupied: {
      bg: 'bg-amber-950/70 hover:bg-amber-900/90',
      border: 'border-amber-500',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-2 ring-amber-400/40',
      text: 'text-amber-200',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      dot: 'bg-amber-400 animate-pulse',
      label: 'Occupied',
    },
    paying: {
      bg: 'bg-blue-950/70 hover:bg-blue-900/90',
      border: 'border-blue-500',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)] ring-2 ring-blue-400/40',
      text: 'text-blue-200',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      dot: 'bg-blue-400 animate-ping',
      label: 'Check Dropped',
    },
    reserved: {
      bg: 'bg-indigo-950/50 hover:bg-indigo-900/70',
      border: 'border-indigo-500/80',
      glow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]',
      text: 'text-indigo-300',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      dot: 'bg-indigo-400',
      label: 'Reserved',
    },
    dirty: {
      bg: 'bg-slate-800/70 hover:bg-slate-800/95',
      border: 'border-slate-500/70',
      glow: 'shadow-[0_0_10px_rgba(148,163,184,0.2)]',
      text: 'text-slate-400',
      badgeBg: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
      dot: 'bg-slate-400',
      label: 'Dirty / Clear',
    },
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ================= SECTION PAGE HEADER TABS ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {[
            { id: 'all', label: 'All Floor Plan', icon: '🏢' },
            { id: 'main', label: 'Main Dining', icon: '🍽️' },
            { id: 'bar', label: 'Bar & Lounge', icon: '🍸' },
            { id: 'patio', label: 'Outdoor Patio', icon: '🌿' },
            { id: 'vip', label: 'VIP Suite', icon: '👑' },
          ].map((sec) => (
            <button
              key={sec.id}
              onClick={() => onSelectSection && onSelectSection(sec.id as SectionId)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeSection === sec.id
                  ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </div>

        {/* Section Quick Summary Stats */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <span className="font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {displayedTables.length} Tables •{' '}
            {displayedTables.reduce((sum, t) => sum + t.capacity, 0)} Seats
          </span>
          {editMode && (
            <span className="text-[10px] font-mono bg-sky-500/20 text-sky-400 font-bold px-2 py-1 rounded border border-sky-500/40 flex items-center gap-1">
              <Grid className="w-3 h-3" />
              <span>Magnetic Grid: 4% Step</span>
            </span>
          )}
        </div>
      </div>

      {/* ================= MAP BUILDER PALETTE (IN EDIT MODE) ================= */}
      {editMode && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <Sliders className="w-4 h-4" />
              <span>Map Builder Palette:</span>
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { shape: 'square', label: '+ Square (4p)' },
                { shape: 'round', label: '+ Round (4p)' },
                { shape: 'booth', label: '+ Booth (4p)' },
                { shape: 'rectangle', label: '+ Banquet (6p)' },
                { shape: 'bar', label: '+ Stool (1p)' },
              ].map((btn) => (
                <button
                  key={btn.shape}
                  onClick={() =>
                    onAddTable &&
                    onAddTable(
                      btn.shape as FloorTable['shape'],
                      activeSection === 'all' ? 'main' : (activeSection as Exclude<SectionId, 'all'>)
                    )
                  }
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider border border-slate-700 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-sky-400" />
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Table Selected Inspector */}
          {activeSelectedTable && (
            <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="font-bold text-white">
                Selected: <strong className="text-orange-400">{activeSelectedTable.label}</strong>
              </span>

              {/* Rotate Button */}
              <button
                onClick={() => {
                  if (onUpdateTableRotation) {
                    const currentRot = customPositions[activeSelectedTable.id]?.rotation || 0;
                    const nextRot = (currentRot + 90) % 360;
                    onUpdateTableRotation(activeSelectedTable.id, nextRot);
                  }
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white"
                title="Rotate Table 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Capacity Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateTableCapacity && onUpdateTableCapacity(activeSelectedTable.id, -1)}
                  className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center font-black"
                >
                  -
                </button>
                <span className="font-mono font-bold text-slate-200">
                  {activeSelectedTable.capacity} seats
                </span>
                <button
                  onClick={() => onUpdateTableCapacity && onUpdateTableCapacity(activeSelectedTable.id, 1)}
                  className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center font-black"
                >
                  +
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => onDeleteTable && onDeleteTable(activeSelectedTable.id)}
                className="p-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg"
                title="Delete Table"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= ARCHITECTURAL FLOOR CANVAS ================= */}
      <div
        ref={containerRef}
        className="relative w-full h-[640px] sm:h-[680px] lg:h-[720px] bg-slate-950 border-2 border-slate-800 rounded-3xl overflow-hidden select-none shadow-2xl transition-all"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.98) 100%),
            linear-gradient(to right, rgba(51, 65, 85, ${editMode ? '0.35' : '0.12'}) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(51, 65, 85, ${editMode ? '0.35' : '0.12'}) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        }}
      >
        {/* ================= ARCHITECTURAL SECTION OVERLAYS ================= */}
        {activeSection === 'all' ? (
          <>
            {/* Zone 1: Bar & Lounge (Top Left) */}
            <div className="absolute top-3 left-3 w-[58%] h-[24%] border border-dashed border-amber-600/35 rounded-2xl bg-amber-950/10 backdrop-blur-[2px] pointer-events-none p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400/90">
                    Bar & Cocktail Lounge
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-500/70">Wood Counter Rail</span>
              </div>
              <div className="w-[96%] h-3.5 mx-auto rounded-full bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 border border-amber-700/50 shadow-inner" />
            </div>

            {/* Zone 2: Main Dining Room (Center & Bottom Left) */}
            <div className="absolute top-[28%] left-3 w-[58%] h-[68%] border border-dashed border-slate-700/50 rounded-2xl bg-slate-900/20 backdrop-blur-[2px] pointer-events-none p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300/90">
                    Main Dining Room
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Center & Booths</span>
              </div>
            </div>

            {/* Zone 3: Patio & Garden Terrace (Right) */}
            <div className="absolute top-3 right-3 w-[37%] h-[64%] border border-dashed border-emerald-600/35 rounded-2xl bg-emerald-950/10 backdrop-blur-[2px] pointer-events-none p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400/90">
                    Outdoor Garden Patio
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-500/70">Terrace</span>
              </div>
            </div>

            {/* Zone 4: VIP Private Dining Suite (Bottom Right) */}
            <div className="absolute bottom-3 right-3 w-[37%] h-[28%] border border-dashed border-purple-600/45 rounded-2xl bg-purple-950/15 backdrop-blur-[2px] pointer-events-none p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-300/90">
                    Private VIP Dining
                  </span>
                </div>
                <span className="text-[10px] font-mono text-purple-400/70">Executive Banquet</span>
              </div>
            </div>
          </>
        ) : (
          /* Focused Single-Room Section Page View */
          <div
            className={`absolute inset-4 rounded-3xl border-2 border-dashed ${
              sectionMeta[activeSection as Exclude<SectionId, 'all'>]?.border || 'border-slate-700'
            } ${
              sectionMeta[activeSection as Exclude<SectionId, 'all'>]?.bg || 'bg-slate-900/30'
            } pointer-events-none p-4 flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">
                  {sectionMeta[activeSection as Exclude<SectionId, 'all'>]?.icon}
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {sectionMeta[activeSection as Exclude<SectionId, 'all'>]?.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {sectionMeta[activeSection as Exclude<SectionId, 'all'>]?.subtitle}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-black/40 px-2 py-1 rounded text-slate-400">
                Single Room View
              </span>
            </div>

            {activeSection === 'bar' && (
              <div className="w-[90%] h-4 mx-auto rounded-full bg-gradient-to-r from-amber-900 via-amber-700 to-amber-950 border border-amber-600/50 shadow-lg mb-2" />
            )}
          </div>
        )}

        {/* ================= SPATIAL 2D TABLES ================= */}
        {displayedTables.map((table) => {
          const activeOrder = getActiveOrder(table);
          const effStatus = getEffectiveStatus(table, activeOrder);
          const style = statusStyles[effStatus];
          const isSelected = selectedTableId === table.id;
          const rotation = customPositions[table.id]?.rotation || 0;

          // Spatial Coordinates
          const posX = table.x ?? 50;
          const posY = table.y ?? 50;

          // Geometric Shape Dimensions
          let shapeClasses = 'rounded-2xl w-24 h-24';
          if (table.shape === 'round') shapeClasses = 'rounded-full w-24 h-24 aspect-square';
          if (table.shape === 'booth') shapeClasses = 'rounded-2xl w-28 h-20 border-l-[8px] border-l-amber-500';
          if (table.shape === 'rectangle') shapeClasses = 'rounded-2xl w-32 h-20';
          if (table.shape === 'bar') shapeClasses = 'rounded-full w-16 h-16 aspect-square';
          if (table.shape === 'oval') shapeClasses = 'rounded-[32px] w-36 h-22';

          return (
            <div
              key={table.id}
              onMouseDown={(e) => handleMouseDown(e, table.id)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectTable(table, activeOrder);
              }}
              onMouseEnter={() => setHoveredTableId(table.id)}
              onMouseLeave={() => setHoveredTableId(null)}
              style={{
                left: `${posX}%`,
                top: `${posY}%`,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
              className={`
                absolute transition-all duration-200 cursor-pointer
                ${shapeClasses}
                border-2 ${style.border} ${style.bg} ${style.glow}
                backdrop-blur-md flex flex-col items-center justify-center p-2
                ${isSelected ? 'ring-4 ring-orange-500 scale-105 z-30' : 'z-10 hover:scale-105 hover:z-20'}
                ${draggingId === table.id ? 'cursor-grabbing scale-110 z-40 shadow-2xl ring-4 ring-sky-400' : ''}
                group active:scale-95 select-none
              `}
            >
              {/* Table Label & Status LED */}
              <div className="flex items-center gap-1 font-black text-sm tracking-tight text-white drop-shadow-sm">
                <span>{table.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              </div>

              {/* Cover Count */}
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 mt-0.5">
                <Users className="w-3 h-3 text-slate-400" />
                <span>
                  {activeOrder?.cover_count ?? table.capacity}/{table.capacity}
                </span>
              </div>

              {/* Active Order Details */}
              {activeOrder && (
                <div className="mt-1 text-center w-full px-1">
                  <span className="font-mono font-black text-[11px] text-white block bg-black/50 rounded px-1 py-0.5 shadow-xs">
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
              <span>Drag tables to snap onto grid • Click table to rotate</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
