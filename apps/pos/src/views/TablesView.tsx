import { useState, useEffect } from 'react';
import { useOrderStore } from '../lib/useOrderStore';
import { useCreateOrder } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import {
  FloorMap3D,
  type FloorTable3DData,
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
} from '@culinaryos/ui';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty';
export type SectionId = 'all' | 'main' | 'patio' | 'bar' | 'vip';

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

  // VIP Private
  { id: 'tbl-vip1', number: 'VIP1', label: 'VIP Suite', sectionId: 'vip', sectionName: 'Private VIP', capacity: 10, shape: 'oval', defaultStatus: 'reserved' },
];

const STATUS_THEME: Record<TableStatus, { bg: string; border: string; text: string; badge: string; ring: string }> = {
  available: {
    bg: 'bg-emerald-50/80 hover:bg-emerald-100/90',
    border: 'border-emerald-500',
    text: 'text-emerald-900',
    badge: 'bg-emerald-500 text-white',
    ring: 'ring-emerald-400/30',
  },
  occupied: {
    bg: 'bg-amber-50/90 hover:bg-amber-100',
    border: 'border-[#0f172a]',
    text: 'text-amber-950',
    badge: 'bg-[#0f172a] text-white',
    ring: 'ring-[#0f172a]/40',
  },
  reserved: {
    bg: 'bg-indigo-50/80 hover:bg-indigo-100/90',
    border: 'border-indigo-500',
    text: 'text-indigo-900',
    badge: 'bg-indigo-600 text-white',
    ring: 'ring-indigo-400/30',
  },
  dirty: {
    bg: 'bg-rose-50/90 hover:bg-rose-100',
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
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Floor navigation & filter state
  const [activeSection, setActiveSection] = useState<SectionId>('all');
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'all'>('all');

  // Manual status overrides for tables (e.g. Dirty, Reserved, Clean)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TableStatus>>(() => {
    const saved = localStorage.getItem('culinaryos_table_status_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  // Modal State for Opening Order on Available / Dirty / Reserved Table
  const [selectedTable, setSelectedTable] = useState<FloorTable | null>(null);
  const [coverCount, setCoverCount] = useState<number>(2);
  const [serverName, setServerName] = useState<string>(employee?.name || 'Server');

  useEffect(() => {
    localStorage.setItem('culinaryos_table_status_overrides', JSON.stringify(statusOverrides));
  }, [statusOverrides]);

  function getEffectiveStatus(table: FloorTable, activeOrder: any): TableStatus {
    if (activeOrder) return 'occupied';
    return statusOverrides[table.id] ?? table.defaultStatus;
  }

  function handleTableClick(table: FloorTable, activeOrder: any) {
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

  // Filtered table list for 2D Grid
  const filteredTables = DEFAULT_FLOOR_TABLES.filter((t) => {
    if (activeSection !== 'all' && t.sectionId !== activeSection) return false;
    const activeOrder = orders.find(
      (o: any) => String(o.table_number) === String(t.number) || String(o.table_number) === String(t.label)
    );
    const effStatus = getEffectiveStatus(t, activeOrder);
    if (statusFilter !== 'all' && effStatus !== statusFilter) return false;
    return true;
  });

  // Convert tables to 3D Data format for Three.js
  const tables3DData: FloorTable3DData[] = DEFAULT_FLOOR_TABLES.map((t) => {
    const activeOrder = orders.find(
      (o: any) => String(o.table_number) === String(t.number) || String(o.table_number) === String(t.label)
    );
    const effStatus = getEffectiveStatus(t, activeOrder);
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
    };
  });

  // Calculate Floor Statistics
  const tableStats = DEFAULT_FLOOR_TABLES.map((t) => {
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
    <div className="p-6 bg-cos-bg h-full overflow-y-auto flex flex-col gap-6 animate-fadeIn">
      {/* Top Header & Floor Stats Summary */}
      <Card className="p-5 shadow-xs border-border bg-card">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="brand" className="px-2 py-0.5 font-black">
                FOH Floor Plan
              </Badge>
              <h1 className="text-xl font-black text-foreground uppercase tracking-wider">Dining Floor Plan</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Interactive 2D/3D spatial dining room map, guest seating capacity & live check controls.
            </p>
          </div>

          {/* Live Metrics Cards */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="bg-secondary border border-border px-3.5 py-2 rounded-xl text-center flex-1 lg:flex-none min-w-[90px]">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Occupied</span>
              <span className="text-base font-black text-foreground">
                {occupiedCount} <span className="text-[10px] text-muted-foreground font-normal">/ {DEFAULT_FLOOR_TABLES.length}</span>
              </span>
            </div>

            <div className="bg-secondary border border-border px-3.5 py-2 rounded-xl text-center flex-1 lg:flex-none min-w-[90px]">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Available</span>
              <span className="text-base font-black text-emerald-600">{availableCount}</span>
            </div>

            <div className="bg-secondary border border-border px-3.5 py-2 rounded-xl text-center flex-1 lg:flex-none min-w-[90px]">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Reserved</span>
              <span className="text-base font-black text-indigo-600">{reservedCount}</span>
            </div>

            <div className="bg-secondary border border-border px-3.5 py-2 rounded-xl text-center flex-1 lg:flex-none min-w-[90px]">
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

      {/* View Switcher & Filter Controls */}
      <Card className="p-3 shadow-xs border-border bg-card">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 2D / 3D Mode Toggle */}
            <div className="flex bg-muted rounded-lg p-1 border border-border">
              <button
                onClick={() => setViewMode('2d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === '2d'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                2D Grid
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === '3d'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-indigo-600" />
                3D Spatial (Three.js)
              </button>
            </div>

            {/* Section Tabs (2D Mode) */}
            {viewMode === '2d' && (
              <div className="hidden sm:flex bg-muted rounded-lg p-1 gap-1 overflow-x-auto border border-border">
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
                    className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors ${
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
                  className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors border ${
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
        /* Three.js 3D Interactive Spatial Floor Plan */
        <div className="animate-fadeIn space-y-2">
          <FloorMap3D
            tables={tables3DData}
            selectedTableId={selectedTable?.id}
            onSelectTable={(table3D) => {
              const matched = DEFAULT_FLOOR_TABLES.find((t) => t.id === table3D.id);
              if (matched) {
                const activeOrder = orders.find(
                  (o: any) => String(o.table_number) === String(matched.number) || String(o.table_number) === String(matched.label)
                );
                handleTableClick(matched, activeOrder);
              }
            }}
            height="580px"
          />
          <p className="text-[10px] text-muted-foreground text-center font-bold">
            💡 Drag with mouse to orbit & rotate camera • Scroll to zoom • Click any table in 3D to manage check
          </p>
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
                  {/* Top Bar: Table Name, Shape Tag & Status Badge */}
                  <div className="flex justify-between items-start gap-2 w-full">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black text-lg ${theme.text}`}>{table.label}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">({table.sectionName})</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-muted-foreground">
                        <span>👥 {activeOrder?.cover_count ?? table.capacity}/{table.capacity} seats</span>
                        <span className="capitalize">• {table.shape}</span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${theme.badge} shadow-xs tracking-wider`}>
                      {effStatus}
                    </span>
                  </div>

                  {/* Middle / Active Order Content */}
                  {effStatus === 'occupied' && activeOrder ? (
                    <div className="my-2 p-2 bg-white/80 backdrop-blur-xs rounded-xl border border-amber-200 space-y-1">
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

                  {/* Bottom Action Footer Indicator */}
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider pt-1 border-t border-black/5 text-muted-foreground group-hover:text-foreground">
                    <span>{effStatus === 'occupied' ? 'Open Order →' : 'Manage Table →'}</span>
                    <span className="font-mono text-[9px] text-muted-foreground">ID #{table.number}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Order & Status Action Modal (shadcn Dialog) */}
      <Dialog open={!!selectedTable} onOpenChange={(open) => !open && setSelectedTable(null)}>
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
              <div className="space-y-3 bg-secondary/50 p-3.5 rounded-xl border border-border">
                <div className="flex justify-between items-center text-xs">
                  <Label htmlFor="covers" className="text-foreground font-bold">Party Size / Covers</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setCoverCount((c) => Math.max(1, c - 1))}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="font-mono text-sm font-black w-6 text-center">{coverCount}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setCoverCount((c) => Math.min(selectedTable.capacity + 4, c + 1))}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="server" className="text-foreground font-bold">Assigned Server</Label>
                  <Input
                    id="server"
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="font-bold"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="brand"
                size="touch"
                onClick={handleStartOrder}
                className="w-full uppercase tracking-wider"
              >
                <UtensilsCrossed className="w-4 h-4 mr-2" />
                Open Table Ticket
              </Button>
            </div>

            {/* Manual Status Override Options */}
            <div className="border-t border-border pt-4 space-y-2">
              <Label className="block">Quick Table Status Override</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateStatus('available')}
                  className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Available
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateStatus('reserved')}
                  className="bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
                >
                  <Bookmark className="w-3 h-3 mr-1" />
                  Reserved
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateStatus('dirty')}
                  className="bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Dirty
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

export default TablesView;
