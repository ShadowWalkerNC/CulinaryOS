import { useState, useEffect, useMemo } from 'react';
import { useOrderStore } from '../lib/useOrderStore';
import { useCreateOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import {
  FloorMap3D,
  type FloorTable3DData,
  type FloorMaterialTheme,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  LayoutGrid,
  Box,
  Users,
  DollarSign,
  Plus,
  Minus,
  UtensilsCrossed,
  CheckCircle2,
  Bookmark,
  AlertCircle,
  Wrench,
  RotateCw,
  RotateCcw,
  Save,
  Trash2,
  Sliders,
  SlidersHorizontal,
  Move,
  Check,
  X,
  Armchair,
  Sparkles,
  Layers,
} from '@culinaryos/ui';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty';
export type SectionId = 'all' | 'main' | 'patio' | 'bar' | 'vip' | 'rooftop';

export interface FloorTable {
  id: string;
  number: string;
  label: string;
  sectionId: Exclude<SectionId, 'all'>;
  sectionName: string;
  capacity: number;
  shape: 'square' | 'round' | 'rectangle' | 'booth' | 'bar' | 'oval';
  defaultStatus: TableStatus;
}

const DEFAULT_FLOOR_TABLES: FloorTable[] = [
  // Main Dining
  { id: 'tbl-1', number: '1', label: 'T1', sectionId: 'main', sectionName: 'Main Dining', capacity: 2, shape: 'square', defaultStatus: 'available' },
  { id: 'tbl-2', number: '2', label: 'T2', sectionId: 'main', sectionName: 'Main Dining', capacity: 4, shape: 'square', defaultStatus: 'available' },
  { id: 'tbl-3', number: '3', label: 'T3', sectionId: 'main', sectionName: 'Main Dining', capacity: 4, shape: 'square', defaultStatus: 'reserved' },
  { id: 'tbl-4', number: '4', label: 'T4', sectionId: 'main', sectionName: 'Main Dining', capacity: 6, shape: 'rectangle', defaultStatus: 'available' },
  { id: 'tbl-5', number: '5', label: 'T5', sectionId: 'main', sectionName: 'Main Dining', capacity: 8, shape: 'rectangle', defaultStatus: 'dirty' },
  { id: 'tbl-b1', number: 'B1', label: 'Booth 1', sectionId: 'main', sectionName: 'Main Dining', capacity: 4, shape: 'booth', defaultStatus: 'available' },
  { id: 'tbl-b2', number: 'B2', label: 'Booth 2', sectionId: 'main', sectionName: 'Main Dining', capacity: 4, shape: 'booth', defaultStatus: 'available' },

  // Patio & Garden
  { id: 'tbl-p1', number: 'P1', label: 'Patio 1', sectionId: 'patio', sectionName: 'Patio & Garden', capacity: 2, shape: 'round', defaultStatus: 'available' },
  { id: 'tbl-p2', number: 'P2', label: 'Patio 2', sectionId: 'patio', sectionName: 'Patio & Garden', capacity: 4, shape: 'round', defaultStatus: 'available' },
  { id: 'tbl-p3', number: 'P3', label: 'Patio 3', sectionId: 'patio', sectionName: 'Patio & Garden', capacity: 4, shape: 'round', defaultStatus: 'reserved' },
  { id: 'tbl-p4', number: 'P4', label: 'Patio 4', sectionId: 'patio', sectionName: 'Patio & Garden', capacity: 6, shape: 'round', defaultStatus: 'available' },

  // Bar & Lounge
  { id: 'tbl-bar1', number: 'BAR1', label: 'Bar 1', sectionId: 'bar', sectionName: 'Bar & Lounge', capacity: 1, shape: 'bar', defaultStatus: 'available' },
  { id: 'tbl-bar2', number: 'BAR2', label: 'Bar 2', sectionId: 'bar', sectionName: 'Bar & Lounge', capacity: 1, shape: 'bar', defaultStatus: 'available' },
  { id: 'tbl-bar3', number: 'BAR3', label: 'Bar 3', sectionId: 'bar', sectionName: 'Bar & Lounge', capacity: 4, shape: 'square', defaultStatus: 'available' },

  // VIP Suite
  { id: 'tbl-vip1', number: 'VIP1', label: 'VIP Suite', sectionId: 'vip', sectionName: 'Private VIP', capacity: 10, shape: 'oval', defaultStatus: 'reserved' },
];

const STATUS_THEME: Record<TableStatus, { bg: string; border: string; text: string; badge: string; ring: string }> = {
  available: {
    bg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
    border: 'border-emerald-500',
    text: 'text-emerald-950',
    badge: 'bg-emerald-600 text-white',
    ring: 'ring-emerald-400/30',
  },
  occupied: {
    bg: 'bg-amber-50/95 hover:bg-amber-100',
    border: 'border-[#0f172a]',
    text: 'text-amber-950',
    badge: 'bg-[#0f172a] text-white',
    ring: 'ring-[#0f172a]/40',
  },
  reserved: {
    bg: 'bg-indigo-50/90 hover:bg-indigo-100/90',
    border: 'border-indigo-500',
    text: 'text-indigo-950',
    badge: 'bg-indigo-600 text-white',
    ring: 'ring-indigo-400/30',
  },
  dirty: {
    bg: 'bg-rose-50/95 hover:bg-rose-100',
    border: 'border-rose-500',
    text: 'text-rose-950',
    badge: 'bg-rose-600 text-white',
    ring: 'ring-rose-400/30',
  },
};

export function TablesView() {
  const { orders, loading, error } = useOrderStore();
  const { mutate: createOrder } = useCreateOrder();
  const setActiveOrder = usePOSStore((s) => s.setActiveOrder);
  const setView = usePOSStore((s) => s.setView);
  const employee = usePOSStore((s) => s.employee);

  // View Mode: 2D Grid vs 3D Spatial Floor Plan
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');

  // Edit Layout Mode State
  const [editMode, setEditMode] = useState<boolean>(false);
  const [showRoomSettings, setShowRoomSettings] = useState<boolean>(false);
  const [showAddTableModal, setShowAddTableModal] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<FloorTable | null>(null);

  // Floor navigation & filter state
  const [activeSection, setActiveSection] = useState<SectionId>('all');
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'all'>('all');

  // Persistent Custom Tables List
  const [floorTables, setFloorTables] = useState<FloorTable[]>(() => {
    const saved = localStorage.getItem('culinaryos_pos_tables');
    return saved ? JSON.parse(saved) : DEFAULT_FLOOR_TABLES;
  });

  // Persistent Custom 3D Table Coordinates & Rotations
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; z: number; rotation?: number }>>(() => {
    const saved = localStorage.getItem('culinaryos_3d_table_positions');
    return saved ? JSON.parse(saved) : {};
  });

  // Persistent Room & Floor Dimensions / Theme
  const [floorTheme, setFloorTheme] = useState<FloorMaterialTheme>(() => {
    return (localStorage.getItem('culinaryos_floor_theme') as FloorMaterialTheme) || 'hardwood';
  });
  const [floorDimensions, setFloorDimensions] = useState<{ width: number; depth: number }>(() => {
    const saved = localStorage.getItem('culinaryos_floor_dimensions');
    return saved ? JSON.parse(saved) : { width: 50, depth: 40 };
  });

  // Manual status overrides for tables (e.g. Dirty, Reserved, Clean)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TableStatus>>(() => {
    const saved = localStorage.getItem('culinaryos_table_status_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  // Modal State for Opening Order on Available / Dirty / Reserved Table
  const [selectedTable, setSelectedTable] = useState<FloorTable | null>(null);
  const [coverCount, setCoverCount] = useState<number>(2);
  const [serverName, setServerName] = useState<string>(employee?.name || 'Server');

  // New Table Form State
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableLabel, setNewTableLabel] = useState('');
  const [newTableSection, setNewTableSection] = useState<Exclude<SectionId, 'all'>>('main');
  const [newTableShape, setNewTableShape] = useState<FloorTable['shape']>('square');
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('culinaryos_pos_tables', JSON.stringify(floorTables));
  }, [floorTables]);

  useEffect(() => {
    localStorage.setItem('culinaryos_3d_table_positions', JSON.stringify(customPositions));
  }, [customPositions]);

  useEffect(() => {
    localStorage.setItem('culinaryos_floor_theme', floorTheme);
  }, [floorTheme]);

  useEffect(() => {
    localStorage.setItem('culinaryos_floor_dimensions', JSON.stringify(floorDimensions));
  }, [floorDimensions]);

  useEffect(() => {
    localStorage.setItem('culinaryos_table_status_overrides', JSON.stringify(statusOverrides));
  }, [statusOverrides]);

  function getEffectiveStatus(table: FloorTable, activeOrder: any): TableStatus {
    if (activeOrder) return 'occupied';
    return statusOverrides[table.id] ?? table.defaultStatus;
  }

  function handleTableClick(table: FloorTable, activeOrder: any) {
    if (editMode) {
      setEditingTable(table);
      return;
    }

    const effStatus = getEffectiveStatus(table, activeOrder);
    if (effStatus === 'occupied' && activeOrder) {
      setActiveOrder(activeOrder.id);
      setView('menu');
    } else {
      setSelectedTable(table);
      setCoverCount(Math.min(2, table.capacity));
      setServerName(employee?.name || 'Server');
    }
  }

  function handleStartOrder() {
    if (!selectedTable) return;
    createOrder(
      { table_number: selectedTable.number, cover_count: coverCount, server_name: serverName },
      {
        onSuccess: (o: any) => {
          setActiveOrder(o.id);
          setView('menu');
          setSelectedTable(null);
        },
      }
    );
  }

  function handleUpdateStatus(newStatus: TableStatus) {
    if (!selectedTable) return;
    setStatusOverrides((prev) => ({
      ...prev,
      [selectedTable.id]: newStatus,
    }));
    setSelectedTable(null);
  }

  // 3D Table Drag Position Callback
  const handleUpdateTablePosition = (tableId: string, x: number, z: number, rotation?: number) => {
    setCustomPositions((prev) => ({
      ...prev,
      [tableId]: {
        x,
        z,
        rotation: rotation ?? prev[tableId]?.rotation ?? 0,
      },
    }));
  };

  // Add New Table
  const handleAddTable = () => {
    if (!newTableLabel.trim()) return;
    const sectionNames: Record<string, string> = {
      main: 'Main Dining',
      patio: 'Patio & Garden',
      bar: 'Bar & Lounge',
      vip: 'Private VIP',
      rooftop: 'Rooftop Lounge',
    };

    const newId = `tbl-custom-${Date.now()}`;
    const newTbl: FloorTable = {
      id: newId,
      number: newTableNumber.trim() || String(floorTables.length + 1),
      label: newTableLabel.trim(),
      sectionId: newTableSection,
      sectionName: sectionNames[newTableSection] || 'Main Dining',
      capacity: newTableCapacity,
      shape: newTableShape,
      defaultStatus: 'available',
    };

    // Position near center
    const posX = (Math.random() - 0.5) * 10;
    const posZ = (Math.random() - 0.5) * 10;

    setFloorTables((prev) => [...prev, newTbl]);
    setCustomPositions((prev) => ({ ...prev, [newId]: { x: posX, z: posZ, rotation: 0 } }));
    setShowAddTableModal(false);
    setNewTableLabel('');
    setNewTableNumber('');
  };

  // Delete Table
  const handleDeleteTable = (id: string) => {
    setFloorTables((prev) => prev.filter((t) => t.id !== id));
    setCustomPositions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditingTable(null);
  };

  // Reset Layout to Factory Defaults
  const handleResetLayout = () => {
    if (window.confirm('Reset all table positions and floor layout to factory defaults?')) {
      setFloorTables(DEFAULT_FLOOR_TABLES);
      setCustomPositions({});
      setFloorTheme('hardwood');
      setFloorDimensions({ width: 50, depth: 40 });
      localStorage.removeItem('culinaryos_pos_tables');
      localStorage.removeItem('culinaryos_3d_table_positions');
      localStorage.removeItem('culinaryos_floor_dimensions');
      localStorage.removeItem('culinaryos_floor_theme');
    }
  };

  // Filtered table list for 2D Grid
  const filteredTables = floorTables.filter((t) => {
    if (activeSection !== 'all' && t.sectionId !== activeSection) return false;
    const activeOrder = orders.find(
      (o: any) => String(o.table_number) === String(t.number) || String(o.table_number) === String(t.label)
    );
    const effStatus = getEffectiveStatus(t, activeOrder);
    if (statusFilter !== 'all' && effStatus !== statusFilter) return false;
    return true;
  });

  // Convert tables to 3D Data format for Three.js
  const tables3DData: FloorTable3DData[] = useMemo(() => {
    return floorTables.map((t) => {
      const activeOrder = orders.find(
        (o: any) => String(o.table_number) === String(t.number) || String(o.table_number) === String(t.label)
      );
      const effStatus = getEffectiveStatus(t, activeOrder);
      const custom = customPositions[t.id];
      return {
        id: t.id,
        number: t.number,
        label: t.label,
        sectionId: t.sectionId,
        sectionName: t.sectionName,
        capacity: t.capacity,
        shape: t.shape,
        status: effStatus,
        orderTotal: activeOrder?.total,
        covers: activeOrder?.cover_count ?? t.capacity,
        serverName: activeOrder?.server_name,
        position: custom ? [custom.x, custom.z] : undefined,
        rotation: custom?.rotation ?? 0,
      };
    });
  }, [floorTables, orders, statusOverrides, customPositions]);

  // Calculate Floor Statistics
  const tableStats = floorTables.map((t) => {
    const activeOrder = orders.find(
      (o: any) => String(o.table_number) === String(t.number) || String(o.table_number) === String(t.label)
    );
    return { table: t, status: getEffectiveStatus(t, activeOrder), order: activeOrder };
  });

  const occupiedCount = tableStats.filter((x) => x.status === 'occupied').length;
  const availableCount = tableStats.filter((x) => x.status === 'available').length;
  const reservedCount = tableStats.filter((x) => x.status === 'reserved').length;
  const dirtyCount = tableStats.filter((x) => x.status === 'dirty').length;
  const totalActiveRevenue = orders.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);

  function getShapeBadge(shape: FloorTable['shape']) {
    switch (shape) {
      case 'round':
        return 'rounded-full';
      case 'booth':
        return 'rounded-2xl border-dashed border-2';
      case 'bar':
        return 'rounded-lg';
      case 'oval':
        return 'rounded-3xl';
      default:
        return 'rounded-xl';
    }
  }

  return (
    <div className="p-6 bg-cos-bg h-full overflow-y-auto flex flex-col gap-5 animate-fadeIn">
      {/* Top Header & Floor Stats Summary */}
      <Card className="p-5 shadow-xs border-border bg-card">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Badge variant="brand" className="px-2.5 py-0.5 font-black text-xs">
                FOH SPATIAL FLOOR
              </Badge>
              <h1 className="text-xl font-black text-foreground uppercase tracking-wider">
                Spatial Floor & Table Map
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Interactive 3D table editor, drag-to-position spatial blueprint & live seating check controls.
            </p>
          </div>

          {/* Live Metrics Cards */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="bg-secondary/70 border border-border px-3.5 py-2 rounded-xl text-center flex-1 lg:flex-none min-w-[85px]">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Occupied</span>
              <span className="text-base font-black text-foreground">
                {occupiedCount} <span className="text-[10px] text-muted-foreground font-normal">/ {floorTables.length}</span>
              </span>
            </div>

            <div className="bg-secondary/70 border border-border px-3.5 py-2 rounded-xl text-center flex-1 lg:flex-none min-w-[85px]">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Available</span>
              <span className="text-base font-black text-emerald-600">{availableCount}</span>
            </div>

            <div className="bg-secondary/70 border border-border px-3.5 py-2 rounded-xl text-center flex-1 lg:flex-none min-w-[85px]">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Reserved</span>
              <span className="text-base font-black text-indigo-600">{reservedCount}</span>
            </div>

            <div className="bg-secondary/70 border border-border px-3.5 py-2 rounded-xl text-center flex-1 lg:flex-none min-w-[85px]">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Dirty</span>
              <span className="text-base font-black text-rose-600">{dirtyCount}</span>
            </div>

            <div className="bg-primary/5 border border-primary/20 px-4 py-2 rounded-xl text-center flex-1 lg:flex-none min-w-[120px]">
              <span className="text-[9px] font-black text-primary uppercase tracking-wider block">Open Revenue</span>
              <span className="text-base font-black font-mono text-primary">
                ${(totalActiveRevenue / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* View Switcher, Layout Editor Toggle & Filter Controls */}
      <Card className="p-3.5 shadow-xs border-border bg-card">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 2D / 3D Mode Toggle */}
            <div className="flex bg-muted rounded-xl p-1 border border-border">
              <button
                onClick={() => setViewMode('3d')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === '3d'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Box className="w-4 h-4 text-sky-600" />
                3D Spatial Map
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === '2d'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                2D Grid
              </button>
            </div>

            {/* Layout Editor Button */}
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border shadow-xs ${
                editMode
                  ? 'bg-sky-600 text-white border-sky-500 ring-2 ring-sky-400/40 animate-pulse'
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{editMode ? 'Finish Editing' : 'Edit Floor Layout'}</span>
            </button>

            {/* Editor Action Buttons when active */}
            {editMode && (
              <div className="flex items-center gap-1.5 animate-fadeIn">
                <button
                  onClick={() => setShowAddTableModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Table</span>
                </button>

                <button
                  onClick={() => setShowRoomSettings(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-secondary text-foreground hover:bg-muted border border-border transition-all shadow-xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Room & Theme</span>
                </button>

                <button
                  onClick={handleResetLayout}
                  title="Reset to Factory Layout"
                  className="p-2 rounded-xl text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Section Tabs (2D Mode) */}
            {viewMode === '2d' && (
              <div className="hidden sm:flex bg-muted rounded-xl p-1 gap-1 overflow-x-auto border border-border">
                {[
                  { id: 'all', label: 'All Floor' },
                  { id: 'main', label: 'Main' },
                  { id: 'patio', label: 'Patio' },
                  { id: 'bar', label: 'Bar' },
                  { id: 'vip', label: 'VIP' },
                ].map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id as SectionId)}
                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
                      activeSection === sec.id
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter / Legend Options */}
          {viewMode === '2d' && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider px-1">Filter:</span>
              {(['all', 'available', 'occupied', 'reserved', 'dirty'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border ${
                    statusFilter === st
                      ? 'border-foreground bg-foreground text-background shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Main Floor Layout Surface */}
      {loading ? (
        <div className="flex justify-center mt-20">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center text-destructive mt-20 text-xs font-bold">Connection error: {error}</div>
      ) : viewMode === '3d' ? (
        /* Three.js 3D Interactive Spatial Floor Plan & Layout Editor */
        <div className="animate-fadeIn space-y-2">
          <FloorMap3D
            tables={tables3DData}
            selectedTableId={editingTable?.id || selectedTable?.id}
            editMode={editMode}
            floorTheme={floorTheme}
            floorDimensions={floorDimensions}
            customPositions={customPositions}
            onUpdateTablePosition={handleUpdateTablePosition}
            onSelectTable={(table3D) => {
              const matched = floorTables.find((t) => t.id === table3D.id);
              if (matched) {
                const activeOrder = orders.find(
                  (o: any) => String(o.table_number) === String(matched.number) || String(o.table_number) === String(matched.label)
                );
                handleTableClick(matched, activeOrder);
              }
            }}
            height="620px"
          />

          <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground font-bold px-2">
            <span>
              {editMode
                ? '🛠️ Edit Mode Active: Drag tables in 3D to reposition • Click to edit properties • Grid snaps to 0.5m'
                : '💡 Orbit with mouse drag • Scroll to zoom • Click any table to seat guests or view active ticket'}
            </span>
            <span className="font-mono text-[10px]">
              Theme: <span className="uppercase text-foreground font-black">{floorTheme}</span> • Room: {floorDimensions.width}x{floorDimensions.depth}m
            </span>
          </div>
        </div>
      ) : filteredTables.length === 0 ? (
        <Card className="text-center text-muted-foreground mt-16 p-8 max-w-sm mx-auto shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider">No matching tables</p>
          <p className="text-xs mt-1 text-muted-foreground">Adjust section or status filter criteria.</p>
        </Card>
      ) : (
        /* 2D Grid View */
        <div className="bg-secondary/40 border-2 border-dashed border-border rounded-3xl p-6 shadow-inner relative min-h-[420px]">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredTables.map((table) => {
              const activeOrder = orders.find(
                (o: any) => String(o.table_number) === String(table.number) || String(o.table_number) === String(table.label)
              );
              const effStatus = getEffectiveStatus(table, activeOrder);
              const theme = STATUS_THEME[effStatus];
              const shapeStyle = getShapeBadge(table.shape);
              const itemCount = activeOrder?.items?.length ?? 0;
              const orderTotal = activeOrder?.total ?? 0;

              return (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(table, activeOrder)}
                  className={`border-2 ${theme.border} ${theme.bg} ${shapeStyle} p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-98 relative flex flex-col justify-between min-h-[145px] group`}
                >
                  {/* Top Bar */}
                  <div className="flex justify-between items-start gap-2 w-full">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black text-lg ${theme.text}`}>{table.label}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">({table.sectionName})</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold text-muted-foreground">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>{activeOrder?.cover_count ?? table.capacity}/{table.capacity} seats</span>
                        <span className="capitalize">• {table.shape}</span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${theme.badge} shadow-xs tracking-wider`}>
                      {effStatus}
                    </span>
                  </div>

                  {/* Middle Active Order */}
                  {effStatus === 'occupied' && activeOrder ? (
                    <div className="my-2 p-2 bg-white/90 backdrop-blur-xs rounded-xl border border-amber-200 space-y-1">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-foreground truncate">
                          {activeOrder.server_name ? `Server: ${activeOrder.server_name}` : 'Active Ticket'}
                        </span>
                        <Badge variant="secondary" className="text-[9px] font-black uppercase px-1.5 py-0.2">
                          {activeOrder.status}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                        <span className="font-mono text-foreground font-black text-xs">
                          ${(orderTotal / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="my-2 py-2 text-[11px] font-semibold text-muted-foreground italic">
                      {effStatus === 'available' && 'Tap to seat guests & open order'}
                      {effStatus === 'reserved' && 'Reserved for upcoming party'}
                      {effStatus === 'dirty' && 'Table needs busing & cleaning'}
                    </div>
                  )}

                  {/* Bottom Action Indicator */}
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider pt-1 border-t border-black/5 text-muted-foreground group-hover:text-foreground">
                    <span>{editMode ? 'Edit Table ⚙️' : effStatus === 'occupied' ? 'Open Order →' : 'Manage Table →'}</span>
                    <span className="font-mono text-[9px] text-muted-foreground">ID #{table.number}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Order & Status Action Modal */}
      <Dialog open={!editMode && !!selectedTable} onOpenChange={(open) => !open && setSelectedTable(null)}>
        {selectedTable && (
          <DialogContent onClose={() => setSelectedTable(null)}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="brand" className="text-[9px]">Table Check</Badge>
              </div>
              <DialogTitle>{selectedTable.label} — {selectedTable.sectionName}</DialogTitle>
              <DialogDescription>
                Seating capacity: {selectedTable.capacity} Guests • Layout: {selectedTable.shape}
              </DialogDescription>
            </DialogHeader>

            {/* Start New Order Flow */}
            <div className="space-y-4 py-2">
              <div className="space-y-3 bg-[#f8f9fa] p-4 rounded-2xl border-2 border-[#e5e7eb]">
                <div className="flex justify-between items-center text-xs">
                  <Label htmlFor="covers" className="text-foreground font-black uppercase tracking-wider">Party Size / Covers</Label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="w-11 h-11 rounded-xl bg-white border-2 border-[#e5e7eb] hover:border-[#0f172a] font-black text-lg flex items-center justify-center shadow-xs active:scale-95"
                      onClick={() => setCoverCount((c) => Math.max(1, c - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-base font-black w-8 text-center">{coverCount}</span>
                    <button
                      type="button"
                      className="w-11 h-11 rounded-xl bg-white border-2 border-[#e5e7eb] hover:border-[#0f172a] font-black text-lg flex items-center justify-center shadow-xs active:scale-95"
                      onClick={() => setCoverCount((c) => Math.min(selectedTable.capacity + 4, c + 1))}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="server" className="text-foreground font-black uppercase tracking-wider text-xs">Assigned Server</Label>
                  <Input
                    id="server"
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="font-bold h-11 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartOrder}
                className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-black h-14 rounded-2xl text-sm uppercase tracking-wider transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <UtensilsCrossed className="w-5 h-5" />
                <span>Start Order & Seat Guests</span>
              </button>
            </div>

            {/* Manual Status Override Options */}
            <div className="border-t border-border pt-4 space-y-2.5">
              <Label className="block text-xs font-black uppercase tracking-wider text-[#6b7280]">
                Quick Table Status Override
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('available')}
                  className="bg-emerald-50 text-emerald-800 border-2 border-emerald-300 hover:bg-emerald-100 h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Available</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('reserved')}
                  className="bg-indigo-50 text-indigo-800 border-2 border-indigo-300 hover:bg-indigo-100 h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Reserved</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('dirty')}
                  className="bg-rose-50 text-rose-800 border-2 border-rose-300 hover:bg-rose-100 h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Dirty</span>
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Table Property Inspector Modal (Edit Mode) */}
      <Dialog open={editMode && !!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
        {editingTable && (
          <DialogContent onClose={() => setEditingTable(null)}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="brand" className="text-[9px] bg-sky-600 text-white">Table Inspector</Badge>
              </div>
              <DialogTitle>Configure {editingTable.label}</DialogTitle>
              <DialogDescription>
                Customize spatial geometry, section assignment, and guest capacity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase">Table Label</Label>
                  <Input
                    value={editingTable.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingTable((t) => (t ? { ...t, label: val } : null));
                      setFloorTables((prev) =>
                        prev.map((t) => (t.id === editingTable.id ? { ...t, label: val } : t))
                      );
                    }}
                    className="font-bold rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase">Table Number</Label>
                  <Input
                    value={editingTable.number}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingTable((t) => (t ? { ...t, number: val } : null));
                      setFloorTables((prev) =>
                        prev.map((t) => (t.id === editingTable.id ? { ...t, number: val } : t))
                      );
                    }}
                    className="font-bold rounded-xl"
                  />
                </div>
              </div>

              {/* Table Shape Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase">3D Table Shape</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['square', 'round', 'rectangle', 'booth', 'bar', 'oval'] as const).map((sh) => (
                    <button
                      key={sh}
                      type="button"
                      onClick={() => {
                        setEditingTable((t) => (t ? { ...t, shape: sh } : null));
                        setFloorTables((prev) =>
                          prev.map((t) => (t.id === editingTable.id ? { ...t, shape: sh } : t))
                        );
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-black capitalize transition-all ${
                        editingTable.shape === sh
                          ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                          : 'bg-muted border-border text-muted-foreground hover:bg-background'
                      }`}
                    >
                      {sh}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity & Section */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase">Capacity (Seats)</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="w-10 h-10 rounded-xl bg-muted border border-border font-black flex items-center justify-center"
                      onClick={() => {
                        const newCap = Math.max(1, editingTable.capacity - 1);
                        setEditingTable((t) => (t ? { ...t, capacity: newCap } : null));
                        setFloorTables((prev) =>
                          prev.map((t) => (t.id === editingTable.id ? { ...t, capacity: newCap } : t))
                        );
                      }}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-base font-black w-8 text-center">{editingTable.capacity}</span>
                    <button
                      type="button"
                      className="w-10 h-10 rounded-xl bg-muted border border-border font-black flex items-center justify-center"
                      onClick={() => {
                        const newCap = editingTable.capacity + 1;
                        setEditingTable((t) => (t ? { ...t, capacity: newCap } : null));
                        setFloorTables((prev) =>
                          prev.map((t) => (t.id === editingTable.id ? { ...t, capacity: newCap } : t))
                        );
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase">Floor Section</Label>
                  <select
                    value={editingTable.sectionId}
                    onChange={(e) => {
                      const secId = e.target.value as Exclude<SectionId, 'all'>;
                      const names: Record<string, string> = {
                        main: 'Main Dining',
                        patio: 'Patio & Garden',
                        bar: 'Bar & Lounge',
                        vip: 'Private VIP',
                        rooftop: 'Rooftop Lounge',
                      };
                      setEditingTable((t) => (t ? { ...t, sectionId: secId, sectionName: names[secId] } : null));
                      setFloorTables((prev) =>
                        prev.map((t) => (t.id === editingTable.id ? { ...t, sectionId: secId, sectionName: names[secId] } : t))
                      );
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background font-bold text-xs"
                  >
                    <option value="main">Main Dining</option>
                    <option value="patio">Patio & Garden</option>
                    <option value="bar">Bar & Lounge</option>
                    <option value="vip">Private VIP</option>
                    <option value="rooftop">Rooftop Lounge</option>
                  </select>
                </div>
              </div>

              {/* Delete Table Action */}
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleDeleteTable(editingTable.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-foreground text-background hover:opacity-90 shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Add New Table Modal */}
      <Dialog open={showAddTableModal} onOpenChange={setShowAddTableModal}>
        <DialogContent onClose={() => setShowAddTableModal(false)}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="brand" className="text-[9px] bg-emerald-600 text-white">New Spatial Element</Badge>
            </div>
            <DialogTitle>Add Table to Floor Map</DialogTitle>
            <DialogDescription>
              Create and position a new table on the 3D canvas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase">Table Label *</Label>
                <Input
                  placeholder="e.g. T6, Booth 3, Patio 5"
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  className="font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-black uppercase">Table Number</Label>
                <Input
                  placeholder="e.g. 6"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="font-bold rounded-xl"
                />
              </div>
            </div>

            {/* Shape */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase">3D Table Shape</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['square', 'round', 'rectangle', 'booth', 'bar', 'oval'] as const).map((sh) => (
                  <button
                    key={sh}
                    type="button"
                    onClick={() => setNewTableShape(sh)}
                    className={`py-2 px-3 rounded-xl border text-xs font-black capitalize transition-all ${
                      newTableShape === sh
                        ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                        : 'bg-muted border-border text-muted-foreground hover:bg-background'
                    }`}
                  >
                    {sh}
                  </button>
                ))}
              </div>
            </div>

            {/* Capacity & Section */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase">Capacity</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-10 h-10 rounded-xl bg-muted border border-border font-black flex items-center justify-center"
                    onClick={() => setNewTableCapacity((c) => Math.max(1, c - 1))}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-base font-black w-8 text-center">{newTableCapacity}</span>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-xl bg-muted border border-border font-black flex items-center justify-center"
                    onClick={() => setNewTableCapacity((c) => c + 1)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-black uppercase">Section</Label>
                <select
                  value={newTableSection}
                  onChange={(e) => setNewTableSection(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background font-bold text-xs"
                >
                  <option value="main">Main Dining</option>
                  <option value="patio">Patio & Garden</option>
                  <option value="bar">Bar & Lounge</option>
                  <option value="vip">Private VIP</option>
                  <option value="rooftop">Rooftop Lounge</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddTable}
              disabled={!newTableLabel.trim()}
              className="w-full h-13 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Spawn Table on Floor</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Dimensions & Material Theme Modal */}
      <Dialog open={showRoomSettings} onOpenChange={setShowRoomSettings}>
        <DialogContent onClose={() => setShowRoomSettings(false)}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="brand" className="text-[9px] bg-slate-800 text-white">Spatial Environment</Badge>
            </div>
            <DialogTitle>Room Dimensions & Floor Material</DialogTitle>
            <DialogDescription>
              Customize architectural room footprint and 3D floor materials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Floor Theme Materials */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase">Floor Texture / Material</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'hardwood', label: 'Oak Hardwood' },
                  { id: 'marble', label: 'Carrara Marble' },
                  { id: 'slate', label: 'Charcoal Slate' },
                  { id: 'deck', label: 'Patio Wood Deck' },
                  { id: 'minimal', label: 'Clean Studio White' },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setFloorTheme(th.id as FloorMaterialTheme)}
                    className={`p-3 rounded-xl border text-xs font-black text-left flex items-center justify-between transition-all ${
                      floorTheme === th.id
                        ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                        : 'bg-muted border-border text-foreground hover:bg-background'
                    }`}
                  >
                    <span>{th.label}</span>
                    {floorTheme === th.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Dimensions */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-black">
                  <span>Room Width</span>
                  <span className="font-mono text-sky-600">{floorDimensions.width} meters</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="80"
                  step="5"
                  value={floorDimensions.width}
                  onChange={(e) => setFloorDimensions((prev) => ({ ...prev, width: Number(e.target.value) }))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-black">
                  <span>Room Depth</span>
                  <span className="font-mono text-sky-600">{floorDimensions.depth} meters</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="60"
                  step="5"
                  value={floorDimensions.depth}
                  onChange={(e) => setFloorDimensions((prev) => ({ ...prev, depth: Number(e.target.value) }))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRoomSettings(false)}
              className="w-full h-12 rounded-xl bg-foreground text-background font-black text-xs uppercase tracking-wider shadow-xs hover:opacity-90 transition-all"
            >
              Apply Environment Settings
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TablesView;
