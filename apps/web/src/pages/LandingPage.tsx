import { useState, useEffect } from 'react';
import {
  MarketingHeader,
  Smartphone,
  Tablet,
  Tv,
  Laptop,
  Printer,
  DollarSign,
  WifiOff,
  CheckCircle2,
  ZoomIn,
  X,
  Send,
  ChefHat,
  Receipt,
  ArrowRight,
  ShieldCheck,
  FileCode,
  Copy,
  Terminal,
  ShoppingBag,
  Button,
  Activity,
  Sparkles,
  Clock,
  Layers,
  Zap,
  Check,
  ExternalLink,
  Flame,
  CreditCard,
  QrCode,
  UtensilsCrossed,
  Package,
} from '@culinaryos/ui';

interface DeviceRole {
  id: string;
  deviceType: 'phone' | 'tablet' | 'tv' | 'computer';
  name: string;
  roleTitle: string;
  port: string;
  badge: string;
  headline: string;
  description: string;
  screenshot: string;
  screenshotAlt: string;
  keyFeatures: string[];
  hardwareCapabilities: string[];
  protocol: string;
  specs: { label: string; value: string }[];
}

export function LandingPage() {
  const [selectedDevice, setSelectedDevice] = useState<string>('phone');
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);
  const [quickstartModal, setQuickstartModal] = useState<{
    title: string;
    port?: string;
    role?: string;
    description?: string;
    screenshot?: string;
  } | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [activeTabStation, setActiveTabStation] = useState<'phone' | 'tablet' | 'tv' | 'computer'>('phone');

  function handleCopyQuickstart() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('git clone https://github.com/ShadowWalkerNC/CulinaryOS.git && cd CulinaryOS && pnpm quickstart');
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2500);
    }
  }

  // Interactive Live POS Simulator State
  const [selectedSeat, setSelectedSeat] = useState<number>(1);
  const [posTicket, setPosTicket] = useState<Array<{ name: string; price: number; seat: number; station: string }>>([
    { name: 'Prime Bistro Burger (Med-Rare)', price: 18.50, seat: 1, station: 'Hot Grill' },
    { name: 'Truffle Parmesan Fries', price: 8.50, seat: 1, station: 'Fry Station' },
    { name: 'Wood-Fired Margherita Pizza', price: 16.50, seat: 2, station: 'Pizza Oven' },
  ]);
  const [ticketFired, setTicketFired] = useState<boolean>(false);
  const [lastFiredId, setLastFiredId] = useState<string | null>(null);
  const [kdsFilter, setKdsFilter] = useState<string>('all');

  const [simulatedKdsTickets, setSimulatedKdsTickets] = useState([
    { id: 'T-101', table: 'Table 4', server: 'John D.', items: ['Prime Bistro Burger (S1)', 'Truffle Fries (S1)'], station: 'Hot Grill', course: 'Course 1', seconds: 195, status: 'cooking' },
    { id: 'T-102', table: 'Table 7', server: 'Jane S.', items: ['Wood-Fired Margherita (S2)'], station: 'Pizza Oven', course: 'Course 1', seconds: 480, status: 'held' },
    { id: 'T-103', table: 'Bar 2', server: 'Alex M.', items: ['2x Smoked Old Fashioned'], station: 'Bar', course: 'Immediate', seconds: 68, status: 'ready' },
  ]);

  // Live 1-second ticker increment for simulated KDS
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedKdsTickets((prev) =>
        prev.map((t) => ({ ...t, seconds: t.seconds + 1 }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getAgingSeverity = (secs: number) => {
    if (secs < 300) return 'normal'; // Under 5 min
    if (secs < 600) return 'warning'; // 5 to 10 min
    return 'critical'; // Over 10 min
  };

  const deviceRoles: DeviceRole[] = [
    {
      id: 'phone',
      deviceType: 'phone',
      name: 'Mobile Handheld POS',
      roleTitle: 'Smartphones & Tableside Handhelds',
      port: '5172',
      badge: 'Front of House · Tableside',
      headline: 'Take orders tableside and fire tickets directly to the cook line.',
      description: 'Turn any iPhone, Android, or mobile handheld terminal into a high-speed point of sale. Waitstaff take orders at the table, assign dishes by seat number, handle allergen cross-contact alerts, and accept mobile payments.',
      screenshot: '/screenshots/pos_menu_modern_cards.png',
      screenshotAlt: 'CulinaryOS Mobile Handheld POS tableside ordering interface',
      protocol: 'WebSocket / Local SQLite Delta Sync',
      specs: [
        { label: 'Ergonomic Target', value: '≥48px Physical Touch Zones' },
        { label: 'Offline Persistence', value: 'Local IndexedDB / SQLite' },
        { label: 'Card Reader Pairing', value: 'Stripe Terminal S700 / WisePOS' },
        { label: 'Allergen Engine', value: 'FDA Top 9 Realtime Matrix' },
      ],
      keyFeatures: [
        'Rapid tableside order entry with seat-by-seat item assignment (S1, S2, S3, S4)',
        '1-tap Send to Kitchen: fires appetizers and automatically holds entrées',
        'Built-in FDA Top 9 Allergen cross-contact and dietary substitution alerts',
        'Split check by seat, item, or custom dollar amounts at the table',
        'Mobile card reader integration with SMS and email digital receipts',
      ],
      hardwareCapabilities: ['Bluetooth Mobile Printers', 'Mobile Card Readers', 'Touch Haptics', 'Offline Local Buffer'],
    },
    {
      id: 'tablet',
      deviceType: 'tablet',
      name: 'Counter Terminal & Floor Map',
      roleTitle: 'Tablets, iPads & Counter Registers',
      port: '5172',
      badge: 'Front of House · Terminal',
      headline: 'Full-featured counter POS with 2D/3D floor layouts and hardware printing.',
      description: 'The primary terminal for host stands, main counter registers, and bar stations. Features interactive 2D and 3D spatial floor mapping, automated cash drawer kick pulses, bar tab pre-authorizations, and direct ESC/POS receipt printing.',
      screenshot: '/screenshots/pos_checkout_receipt.png',
      screenshotAlt: 'CulinaryOS POS Terminal floor map and checkout receipt interface',
      protocol: 'WebUSB / Network IP / Bluetooth BLE',
      specs: [
        { label: 'Display Resolution', value: '1024×768 to 4K Responsive' },
        { label: 'Drawer Kick Solenoid', value: '24V RJ11 / RJ12 Pulse' },
        { label: 'Thermal Spooling', value: 'Raw ESC/POS Byte Buffer' },
        { label: 'Floor Visualization', value: 'WebGL / Three.js 2D & 3D' },
      ],
      keyFeatures: [
        'Interactive 2D & 3D Spatial Dining Floor Map with table timers and occupied badges',
        'Built-in Floor Layout Editor: drag & drop booths, round tables, and custom bar seating',
        'Automatic cash drawer kick trigger on cash checkout settlement',
        'Direct ESC/POS receipt printer spooling (WebUSB, Bluetooth, Serial COM, Network IP)',
        'Pre-authorized bar tabs and fast order recall / reprinting audit history',
      ],
      hardwareCapabilities: ['ESC/POS Thermal Printers (80mm & 58mm)', 'Cash Drawers (RJ11/RJ12)', 'Barcode Scanners', 'Stripe WisePOS E'],
    },
    {
      id: 'tv',
      deviceType: 'tv',
      name: 'Kitchen Display System (KDS)',
      roleTitle: 'Kitchen Touchscreens, Monitors & TV Rails',
      port: '5173',
      badge: 'Back of House · Expediter & Line',
      headline: 'High-visibility kitchen tickets with 1-second aging timers and station routing.',
      description: 'Replace noisy, wasteful paper kitchen printers with digital ticket rails. Automatically route orders to specific cook stations (Grill, Fryer, Cold Prep, Pizza Oven, Bar, and Master Expo Pass) with color-coded aging timers and course hold/fire logic.',
      screenshot: '/screenshots/kds_station_routing.png',
      screenshotAlt: 'CulinaryOS Kitchen Display station board with live aging timers',
      protocol: 'Realtime Server-Sent Events / WebSocket Bridge',
      specs: [
        { label: 'Display Contrast', value: '140% High-Contrast Kitchen Mode' },
        { label: 'Timer Granularity', value: '1-Second Real-Time Ticker' },
        { label: 'Bump Hardware', value: 'USB Bump Bar & Touchscreen' },
        { label: 'Audio Signal', value: '85dB Ticket Arrival Chime' },
      ],
      keyFeatures: [
        'Station routing: Master Expo Pass, Hot Grill, Fryer, Cold Prep, Pizza, Bar',
        'Real-time visual aging badges: Under 5 min Normal, 5 to 10 min Warning, Over 10 min Critical',
        'Course hold & fire logic: holds Entrées until Starters are bumped on the line',
        '140% high-contrast TV / wall-mounted display mode with audio arrival chimes',
        '1-tap bump bar gestures and completed ticket recall history',
      ],
      hardwareCapabilities: ['Wall-Mounted TVs & Monitors', 'Kitchen Bump Bars (USB)', 'Audio Arrival Chimes', 'Cook-Line Touchscreens'],
    },
    {
      id: 'computer',
      deviceType: 'computer',
      name: 'Back-Office Admin, Recipes & Ops',
      roleTitle: 'Office Desktops, Laptops & Workstations',
      port: '5174',
      badge: 'Management · Command Center',
      headline: 'Complete business control: menu catalog, inventory, food costing, and shift reports.',
      description: 'The master command center on your office computer. Manage menu items with 1-click 86 toggles, set staff PINs, scale recipes with baker’s percentages, track inventory par levels with automated PO generation, and audit food waste.',
      screenshot: '/screenshots/admin_pantry_inventory.png',
      screenshotAlt: 'CulinaryOS Back-Office Admin pantry inventory and analytics',
      protocol: 'REST / Hono / PostgreSQL RLS',
      specs: [
        { label: 'Database Isolation', value: 'Row-Level Security (V1-V17)' },
        { label: 'Tip Pool Engine', value: 'FLSA Hours-Weighted Compliant' },
        { label: 'Export Formats', value: 'CSV, JSON, A4 Print Ledger' },
        { label: 'AI Accessories', value: '9 MCP Servers for Claude/Gemini' },
      ],
      keyFeatures: [
        'Menu Catalog Management with 1-click instant 86 availability toggles',
        'Staff Directory & Security PIN management (Server, Bartender, Chef, Manager, Owner)',
        'Inventory Par Levels with 1-click automated supplier Purchase Order generation',
        'RecipeOS Vault: baker’s percentage ratio scaling and culinary unit conversions',
        'CulinaryOps Diagnostics: theoretical vs actual food cost variance and trim waste logs',
      ],
      hardwareCapabilities: ['Standard Office Web Browsers', 'A4 / Letter Report Printers', 'CSV/Excel Export', 'Multi-Monitor Displays'],
    },
  ];

  const currentDevice = deviceRoles.find((d) => d.id === selectedDevice) || deviceRoles[0];

  const handleAddItemToDemo = (item: { name: string; price: number; station: string }) => {
    setPosTicket((prev) => [...prev, { ...item, seat: selectedSeat }]);
    setTicketFired(false);
  };

  const handleRemoveItem = (index: number) => {
    setPosTicket((prev) => prev.filter((_, i) => i !== index));
    setTicketFired(false);
  };

  const handleFireDemoOrder = () => {
    if (posTicket.length === 0) return;
    const ticketNum = `T-${Math.floor(100 + Math.random() * 900)}`;
    setTicketFired(true);
    setLastFiredId(ticketNum);

    const primaryStation = posTicket[0]?.station || 'Hot Grill';
    const newKdsTicket = {
      id: ticketNum,
      table: 'Table 4',
      server: 'John D. (Mobile)',
      items: posTicket.map((it) => `${it.name} (S${it.seat})`),
      station: primaryStation,
      course: 'Course 1 (Fired)',
      seconds: 1,
      status: 'cooking',
    };
    setSimulatedKdsTickets((prev) => [newKdsTicket, ...prev]);
  };

  const handleBumpKdsTicket = (id: string) => {
    setSimulatedKdsTickets((prev) => prev.filter((t) => t.id !== id));
  };

  const subtotal = posTicket.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.08875;
  const total = subtotal + tax;

  const filteredKdsTickets = kdsFilter === 'all'
    ? simulatedKdsTickets
    : simulatedKdsTickets.filter((t) => t.station.toLowerCase().includes(kdsFilter.toLowerCase()));

  const renderDeviceIcon = (type: DeviceRole['deviceType'], className = 'w-4 h-4') => {
    switch (type) {
      case 'phone':
        return <Smartphone className={className} />;
      case 'tablet':
        return <Tablet className={className} />;
      case 'tv':
        return <Tv className={className} />;
      case 'computer':
        return <Laptop className={className} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#090d16] font-sans antialiased selection:bg-[#090d16] selection:text-white flex flex-col">
      {/* 1. INDUSTRIAL TELEMETRY & STATUS STRIP */}
      <div className="bg-[#090d16] text-slate-300 text-[11px] font-mono border-b border-slate-800 py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CULINARYOS ENGINE v1.2.1</span>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-slate-400">STATUS: PRODUCTION MONOREPO</span>
            <span className="hidden lg:inline text-slate-600">|</span>
            <span className="hidden lg:inline text-slate-400">OFFLINE BUS: ZERO CLOUD SINGLE-POINT-OF-FAILURE</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-400" />
              <span>LATENCY: &lt;1.2ms (LAN)</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline text-emerald-400 font-semibold">ESC/POS NATIVE</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="text-slate-200">MIT LICENSE</span>
          </div>
        </div>
      </div>

      {/* 2. UNIVERSAL MARKETING HEADER */}
      <MarketingHeader
        currentPath="/"
        onOpenQuickstart={() =>
          setQuickstartModal({
            title: 'Turnkey Local Restaurant Deployment',
            role: 'Hardware Thermal Printers, Cash Drawers & Kitchen TVs',
            description:
              'Deploy CulinaryOS directly onto tablets, touch terminals, and mobile handhelds in your restaurant with zero cloud dependency. Run on standard commercial hardware over local restaurant Wi-Fi.',
            screenshot: '/screenshots/pos_menu_modern_cards.png',
          })
        }
      />

      {/* 3. HERO SECTION: COMMANDING 2026 ARCHITECTURAL SPLIT */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-12 sm:pb-20 max-w-7xl mx-auto w-full">
        {/* Subtle Background Blueprint Grid */}
        <div className="absolute inset-0 bg-grid-industrial pointer-events-none opacity-60" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Authoritative Editorial Positioning */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-mono tracking-wider font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>SOVEREIGN RESTAURANT OPERATING SYSTEM</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 leading-[1.08]">
              The Operating System <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-800 to-amber-600">
                for High-Volume Restaurants.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
              High-speed tableside ordering, real-time kitchen cook rails, direct ESC/POS receipt spooling, and back-office food costing in one sovereign monorepo.
              <strong className="text-slate-900 font-semibold block mt-1">
                Zero proprietary hardware locks. Zero cloud outage vulnerability. Zero monthly per-terminal software tax.
              </strong>
            </p>

            {/* Tactical CTA Matrix (Strict Jakob's Law & 48px Target Standard) */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-2">
              <a
                href="/menu/demo"
                className="min-h-[48px] px-6 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2.5 active:scale-[0.98]"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>Launch Live Storefront</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </a>

              <a
                href="#demo"
                className="min-h-[48px] px-5 py-3.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
              >
                <ChefHat className="w-4 h-4 text-amber-600" />
                <span>Interactive POS & KDS Rail</span>
              </a>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setQuickstartModal({
                    title: 'Turnkey Local Restaurant Deployment',
                    role: 'Commercial Printers, Cash Drawers & Kitchen TVs',
                    description:
                      'Deploy CulinaryOS directly onto tablets, touch terminals, and mobile handhelds in your restaurant with zero cloud dependency. Run on standard hardware over local Wi-Fi.',
                    screenshot: '/screenshots/pos_menu_modern_cards.png',
                  })
                }
                className="min-h-[48px] rounded-xl border-slate-300 bg-slate-100 px-5 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-xs hover:bg-slate-200 active:scale-[0.98]"
              >
                <Terminal className="w-4 h-4 text-slate-700" />
                <span>Hardware Quickstart</span>
              </Button>

              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-4 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <FileCode className="w-4 h-4 text-slate-500" />
                <span>GitHub Monorepo</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>

            {/* Proof Architecture Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Reliability</p>
                <p className="text-sm font-bold text-slate-950 mt-0.5">100% Offline</p>
                <p className="text-[11px] text-slate-500">Local SQLite delta sync</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Cook-Line</p>
                <p className="text-sm font-bold text-slate-950 mt-0.5">1-Sec Aging</p>
                <p className="text-[11px] text-slate-500">Sub-second ticket pacing</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Peripherals</p>
                <p className="text-sm font-bold text-slate-950 mt-0.5">Raw ESC/POS</p>
                <p className="text-[11px] text-slate-500">WebUSB / BLE / Serial</p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Payments</p>
                <p className="text-sm font-bold text-slate-950 mt-0.5">BYO Stripe</p>
                <p className="text-[11px] text-slate-500">Zero processing markup</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Station Workstation Preview */}
          <div className="lg:col-span-5">
            <div className="bg-[#090d16] text-white rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-slate-200">WORKSTATION HUD</span>
                </div>
                <span className="text-[10px] font-mono bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
                  PORT :{activeTabStation === 'phone' || activeTabStation === 'tablet' ? '5172' : activeTabStation === 'tv' ? '5173' : '5174'}
                </span>
              </div>

              {/* Station Switcher Tabs */}
              <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTabStation('phone')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition-all ${
                    activeTabStation === 'phone' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Handheld
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabStation('tablet')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition-all ${
                    activeTabStation === 'tablet' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Terminal
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabStation('tv')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition-all ${
                    activeTabStation === 'tv' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  KDS Rail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabStation('computer')}
                  className={`py-1.5 px-2 rounded-lg font-bold transition-all ${
                    activeTabStation === 'computer' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admin
                </button>
              </div>

              {/* Active Station Viewport Preview */}
              <div
                className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group cursor-zoom-in"
                onClick={() => {
                  const targetRole = deviceRoles.find((r) => r.id === activeTabStation) || deviceRoles[0];
                  setModalImage({ src: targetRole.screenshot, title: targetRole.name });
                }}
              >
                {activeTabStation === 'phone' && (
                  <img
                    src="/screenshots/pos_menu_modern_cards.png"
                    alt="CulinaryOS Mobile Handheld POS"
                    className="w-full h-56 object-cover object-top group-hover:scale-102 transition-transform duration-300"
                  />
                )}
                {activeTabStation === 'tablet' && (
                  <img
                    src="/screenshots/pos_checkout_receipt.png"
                    alt="CulinaryOS Counter Terminal"
                    className="w-full h-56 object-cover object-top group-hover:scale-102 transition-transform duration-300"
                  />
                )}
                {activeTabStation === 'tv' && (
                  <img
                    src="/screenshots/kds_station_routing.png"
                    alt="CulinaryOS Kitchen Display Rail"
                    className="w-full h-56 object-cover object-top group-hover:scale-102 transition-transform duration-300"
                  />
                )}
                {activeTabStation === 'computer' && (
                  <img
                    src="/screenshots/admin_pantry_inventory.png"
                    alt="CulinaryOS Back-Office Admin"
                    className="w-full h-56 object-cover object-top group-hover:scale-102 transition-transform duration-300"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-3 justify-between">
                  <span className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Click to inspect high-res screen
                  </span>
                  <span className="text-[10px] font-mono bg-slate-900/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900">
                    Live UI Render
                  </span>
                </div>
              </div>

              {/* Station Diagnostic Specs */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">PROTOCOL</span>
                  <span className="text-slate-200 font-semibold truncate block">
                    {activeTabStation === 'phone' ? 'Local IndexedDB Sync' : activeTabStation === 'tablet' ? 'ESC/POS WebUSB' : activeTabStation === 'tv' ? 'WebSocket SSE Rail' : 'Hono REST + RLS'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block">HARDWARE READY</span>
                  <span className="text-slate-200 font-semibold truncate block">
                    {activeTabStation === 'phone' ? 'WisePOS E / S700' : activeTabStation === 'tablet' ? 'Star TSP100 & RJ11' : activeTabStation === 'tv' ? '140% High-Contrast' : 'A4 & CSV Exporters'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE IN-BROWSER RESTAURANT SIMULATOR (POS -> KDS) */}
      <section id="demo" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-200 scroll-mt-20">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-mono font-bold uppercase tracking-wider border border-amber-200">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>Interactive Operational Simulator</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Experience the High-Speed POS to Kitchen Flow
          </h2>
          <p className="text-slate-600 text-sm max-w-2xl mx-auto">
            Build an order on the Front-of-House POS console below and fire it directly to the Back-of-House kitchen rail. Watch real-time 1-second aging timers and bump completed tickets.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* POS Terminal Simulator (Left 6 Cols) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* POS Status Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold">
                    <Receipt className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">POS Terminal · Table 04</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Server: Nathaniel · Dining Room East</p>
                  </div>
                </div>

                {/* Seat Selector (S1, S2, S3, S4) */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-mono text-[11px] mr-1">Seat:</span>
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSeat(s)}
                      className={`min-h-[32px] px-2.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        selectedSeat === s
                          ? 'bg-slate-950 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      S{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Quick-Add Buttons with Station Badges */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Tap to Add to Active Ticket:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { name: 'Prime Bistro Burger', price: 18.50, station: 'Hot Grill' },
                    { name: 'Truffle Parmesan Fries', price: 8.50, station: 'Fry Station' },
                    { name: 'Wood-Fired Margherita', price: 16.50, station: 'Pizza Oven' },
                    { name: 'Smoked Old Fashioned', price: 14.00, station: 'Bar' },
                    { name: 'Cast Iron Ribeye', price: 34.00, station: 'Hot Grill' },
                    { name: 'Burrata Caprese', price: 15.00, station: 'Cold Prep' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddItemToDemo(item)}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-400 hover:shadow-xs text-left transition-all group active:scale-[0.97]"
                    >
                      <p className="text-xs font-bold text-slate-950 truncate group-hover:text-amber-600">
                        {item.name}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[11px] font-mono font-bold text-slate-900">${item.price.toFixed(2)}</span>
                        <span className="text-[9px] font-mono uppercase bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded">
                          {item.station}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Ticket Scroll Area */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-[170px] overflow-y-auto space-y-1.5">
                {posTicket.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6 font-medium font-mono">
                    Ticket is currently empty. Tap menu items above to add.
                  </p>
                ) : (
                  posTicket.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-200/60 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">
                          S{it.seat}
                        </span>
                        <span className="font-semibold text-slate-900">{it.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({it.station})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-950 font-bold">${it.price.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          aria-label="Remove item"
                          className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-200 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Calculations & Fire Button */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center text-xs font-mono text-slate-600">
                <span>Subtotal: ${subtotal.toFixed(2)} · Tax (8.88%): ${tax.toFixed(2)}</span>
                <span className="text-sm font-bold text-slate-950 font-mono">Total: ${total.toFixed(2)}</span>
              </div>

              <button
                type="button"
                onClick={handleFireDemoOrder}
                disabled={posTicket.length === 0}
                className={`min-h-[48px] w-full rounded-xl py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] ${
                  ticketFired
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : posTicket.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-950 hover:bg-slate-800 text-white'
                }`}
              >
                {ticketFired ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Order Fired to Kitchen KDS ({lastFiredId})</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>Send to Kitchen (Fire Order)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Back of House KDS Rail Simulator (Right 6 Cols) */}
          <div className="lg:col-span-6 bg-[#090d16] text-white rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* KDS Rail Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Back-of-House Cook Rail</h3>
                    <p className="text-[11px] text-slate-400 font-mono">Master Expo & Station Demux</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                    {simulatedKdsTickets.length} ACTIVE
                  </span>
                </div>
              </div>

              {/* Station Filter Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-mono">
                {[
                  { id: 'all', label: 'All Stations' },
                  { id: 'grill', label: 'Hot Grill' },
                  { id: 'pizza', label: 'Pizza Oven' },
                  { id: 'bar', label: 'Bar Rail' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setKdsFilter(st.id)}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all shrink-0 ${
                      kdsFilter === st.id
                        ? 'bg-slate-100 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Dynamic KDS Ticket Rail Cards */}
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {filteredKdsTickets.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                    No active tickets for this station.
                  </div>
                ) : (
                  filteredKdsTickets.map((t) => {
                    const severity = getAgingSeverity(t.seconds);
                    const timerBadgeColor =
                      severity === 'critical'
                        ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                        : severity === 'warning'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800';

                    return (
                      <div
                        key={t.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5 transition-all hover:border-slate-700"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">{t.table}</span>
                            <span className="text-[10px] font-mono text-slate-400">({t.id})</span>
                            <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                              {t.course}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${timerBadgeColor}`}>
                              {formatTimer(t.seconds)}
                            </span>
                            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-semibold">
                              {t.station}
                            </span>
                          </div>
                        </div>

                        {/* Ticket Items */}
                        <ul className="text-xs text-slate-300 space-y-1 font-mono">
                          {t.items.map((it, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>{it}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Bump Action Bar */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] text-slate-400 font-mono">Server: {t.server}</span>
                          <button
                            type="button"
                            onClick={() => handleBumpKdsTicket(t.id)}
                            className="min-h-[32px] px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-[0.96]"
                          >
                            Bump Ticket
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Diagnostic Footer */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span>● 1-Sec Dynamic Aging Enabled</span>
              <span>Audio Chime on Arrival: 85dB</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ADAPTIVE STATION ENGINEERING: HARDWARE & INTERFACE MATRIX */}
      <section id="products" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-200 scroll-mt-20">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-900 text-[11px] font-mono font-bold uppercase tracking-wider border border-slate-300">
            <span>Adaptive Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            How CulinaryOS Adapts to Every Device
          </h2>
          <p className="text-slate-600 text-sm max-w-2xl mx-auto">
            One unified codebase, four specialized operational roles. Select a station to inspect physical touch mechanics, communication protocols, and hardware integrations.
          </p>
        </div>

        {/* 4 Station Tab Triggers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-300">
          {deviceRoles.map((d) => {
            const isActive = selectedDevice === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDevice(d.id)}
                className={`min-h-[56px] w-full rounded-xl px-4 py-3 text-left transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-300/80'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-950'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                    isActive ? 'bg-slate-950 text-white' : 'bg-slate-300/70 text-slate-700'
                  }`}
                >
                  {renderDeviceIcon(d.deviceType, 'w-4 h-4')}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold uppercase tracking-wider truncate">{d.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono block truncate">Port :{d.port}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Station Deep-Dive Engineering Canvas */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200 inline-block">
                {currentDevice.badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {currentDevice.roleTitle}
              </h3>
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                {currentDevice.headline}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentDevice.description}
              </p>
            </div>

            {/* Technical Specs Grid */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
              {currentDevice.specs.map((s, idx) => (
                <div key={idx} className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</span>
                  <p className="font-bold text-slate-900 truncate">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Core Capabilities Checklist */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-950 tracking-wider block font-mono">
                Station Workflows:
              </span>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentDevice.keyFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hardware Connected Chips */}
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Certified Hardware Peripherals:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentDevice.hardwareCapabilities.map((hw, i) => (
                  <span key={i} className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                    {hw}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {currentDevice.id === 'phone' && (
                <a
                  href="/menu/demo"
                  className="min-h-[48px] px-5 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>Launch Mobile Storefront</span>
                </a>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setQuickstartModal({
                    title: currentDevice.name,
                    port: currentDevice.port,
                    role: currentDevice.roleTitle,
                    description: currentDevice.description,
                    screenshot: currentDevice.screenshot,
                  })
                }
                className="min-h-[48px] rounded-xl border-slate-300 bg-white px-5 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-xs hover:bg-slate-100"
              >
                <Terminal className="w-4 h-4 text-slate-700" />
                <span>Station Setup Guide</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalImage({ src: currentDevice.screenshot, title: currentDevice.name })}
                className="min-h-[48px] rounded-xl bg-slate-100 px-5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-200"
              >
                <ZoomIn className="w-4 h-4" />
                <span>Fullscreen Screen</span>
              </Button>
            </div>
          </div>

          {/* Screenshot Presentation Canvas */}
          <div
            className="lg:col-span-6 bg-slate-100 border border-slate-200 rounded-2xl p-3 sm:p-4 cursor-zoom-in group shadow-inner"
            onClick={() => setModalImage({ src: currentDevice.screenshot, title: currentDevice.name })}
          >
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-md">
              <img
                src={currentDevice.screenshot}
                alt={currentDevice.screenshotAlt}
                className="w-full h-auto object-cover max-h-[380px] group-hover:scale-101 transition-transform duration-300"
              />
            </div>
            <div className="text-center pt-3 text-[11px] font-mono font-medium text-slate-500 flex items-center justify-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-slate-700" /> Click to Zoom High-Res Interface Screen
            </div>
          </div>
        </div>
      </section>

      {/* 6. HARDWARE BILL OF MATERIALS & ZERO-LOCK-IN MATRIX */}
      <section id="hardware" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-slate-900 text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Hardware Sovereignty
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Plug-and-Play Thermal Printers, Cash Drawers & Readers
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto">
              CulinaryOS speaks direct ESC/POS byte-level thermal protocols and WebUSB/BLE peripheral APIs right inside modern browser runtimes. Zero closed hardware bridges. Zero vendor markups.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold shadow-xs">
                <Printer className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">ESC/POS Thermal Printers</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Native raw byte spooling for Star TSP100 / TSP143IV and Epson TM-m30 / TM-T20 class thermal printers over WebUSB, Network IP, Bluetooth, and Serial COM.
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200">
                Roll Formats: 80mm & 58mm Standard
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold shadow-xs">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">Printer-Driven Cash Drawers</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Auto-fires standard 24V RJ11/RJ12 drawer kick solenoid pulses through the printer DK port on cash settlement. Supports APG, Vasario, and M-S models.
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200">
                Trigger: 24V Solenoid Pulse
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold shadow-xs">
                <CreditCard className="w-5 h-5 text-sky-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">Stripe Terminal Readers</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Countertop WisePOS E and mobile S700 reader integration via Stripe Connect Standard. Card data never touches your servers, ensuring lightest SAQ-A PCI compliance.
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200">
                Compliance: SAQ-A Certified
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold shadow-xs">
                <WifiOff className="w-5 h-5 text-rose-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">Offline Delta Sync Buffer</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                When internet drops during a dinner rush, orders buffer cryptographically in local SQLite and flush with idempotency keys upon link restoration.
              </p>
              <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200">
                Outage Defense: Zero Data Loss
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ALL 7 MONOREPO APPLICATIONS DIRECTORY */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-200">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 text-slate-900 text-[11px] font-mono font-bold uppercase tracking-wider border border-slate-300">
            <span>Unified Monorepo Control Plane</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            All 7 Applications in One Sovereign Repository
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto">
            Everything compiles under a single pnpm + Turborepo workspace. Zero disjointed SaaS vendor subscriptions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. POS Terminal */}
          <div
            onClick={() =>
              setQuickstartModal({
                title: 'POS Terminal & Touch Hardware',
                port: '5172',
                role: 'Point of Sale, 3D Floor Maps & Thermal Printing',
                description: 'Run the POS terminal on tablets, mobile handhelds, or counter registers with ESC/POS receipt printing and cash drawer kick.',
                screenshot: '/screenshots/pos_menu_modern_cards.png',
              })
            }
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-2xs hover:shadow-md transition-all space-y-2.5 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">POS Terminal</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Port :5172</span>
            </div>
            <p className="text-xs text-slate-600">High-speed touch order entry, 2D/3D floor map editor, tableside seat ordering, and ESC/POS thermal printing.</p>
            <span className="text-[11px] font-mono font-semibold text-slate-900 flex items-center gap-1.5 pt-1">
              <Terminal className="w-3.5 h-3.5 text-slate-500" /> Tap to inspect launch guide
            </span>
          </div>

          {/* 2. Kitchen Display KDS */}
          <div
            onClick={() =>
              setQuickstartModal({
                title: 'Kitchen Display System (KDS)',
                port: '5173',
                role: 'Kitchen Tickets & Station Routing',
                description: 'Run the KDS on kitchen screens and TV expo pass with live ticket aging timers and station filtering.',
                screenshot: '/screenshots/kds_station_routing.png',
              })
            }
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-2xs hover:shadow-md transition-all space-y-2.5 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">Kitchen Display (KDS)</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Port :5173</span>
            </div>
            <p className="text-xs text-slate-600">Station-routed kitchen tickets with 1-second aging timers, course holding, and 140% high-contrast TV mode.</p>
            <span className="text-[11px] font-mono font-semibold text-slate-900 flex items-center gap-1.5 pt-1">
              <Terminal className="w-3.5 h-3.5 text-slate-500" /> Tap to inspect launch guide
            </span>
          </div>

          {/* 3. Back-Office Admin */}
          <div
            onClick={() =>
              setQuickstartModal({
                title: 'Back-Office Admin & Settings',
                port: '5174',
                role: 'Menu Editor, Staff & Par Levels',
                description: 'Run the admin dashboard to manage menus, 86ing, inventory par levels, auto-PO, and staff security PINs.',
                screenshot: '/screenshots/admin_pantry_inventory.png',
              })
            }
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-2xs hover:shadow-md transition-all space-y-2.5 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">Back-Office Admin</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Port :5174</span>
            </div>
            <p className="text-xs text-slate-600">Menu catalog editor, 1-click 86 item toggles, staff security PINs, inventory par levels, and station routing.</p>
            <span className="text-[11px] font-mono font-semibold text-slate-900 flex items-center gap-1.5 pt-1">
              <Terminal className="w-3.5 h-3.5 text-slate-500" /> Tap to inspect launch guide
            </span>
          </div>

          {/* 4. KitchenKit Prep Planner */}
          <div
            onClick={() =>
              setQuickstartModal({
                title: 'KitchenKit Prep Planner',
                port: '5175',
                role: 'Station Prep Checklists & Batch Scaling',
                description: 'Manage morning station prep lists, cover count projections, and recipe ratios.',
                screenshot: '/screenshots/kds_station_routing.png',
              })
            }
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-2xs hover:shadow-md transition-all space-y-2.5 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">KitchenKit Prep Planner</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Port :5175</span>
            </div>
            <p className="text-xs text-slate-600">Shift prep checklists, expected cover volume forecasting, perishable FIFO tracking, and vendor directory.</p>
            <span className="text-[11px] font-mono font-semibold text-slate-900 flex items-center gap-1.5 pt-1">
              <Terminal className="w-3.5 h-3.5 text-slate-500" /> Tap to inspect launch guide
            </span>
          </div>

          {/* 5. Online Storefront (Live Production) */}
          <a
            href="/menu/demo"
            className="p-5 rounded-2xl bg-slate-950 text-white border border-slate-800 hover:border-emerald-500 shadow-sm transition-all space-y-2.5 group"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-white group-hover:text-emerald-400 flex items-center gap-1.5">
                <span>Online Storefront</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                Live on Vercel
              </span>
            </div>
            <p className="text-xs text-slate-300">Mobile-first customer ordering with FDA Top 9 allergen filtering, dietary badges, and live prep status tracking.</p>
            <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1 pt-1">
              <span>Launch Live Storefront</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </a>

          {/* 6. CulinaryOps Analytics */}
          <div
            onClick={() =>
              setQuickstartModal({
                title: 'CulinaryOps Analytics',
                port: '5177',
                role: 'Food Cost Variance & Waste Ledger',
                description: 'Monitor actual vs theoretical food cost %, kitchen trim waste logs, and labor hours.',
                screenshot: '/screenshots/admin_waste_analytics.png',
              })
            }
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-2xs hover:shadow-md transition-all space-y-2.5 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">CulinaryOps Analytics</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Port :5177</span>
            </div>
            <p className="text-xs text-slate-600">Theoretical vs actual food cost variance, kitchen trim and spoilage waste logs, and labor hour analytics.</p>
            <span className="text-[11px] font-mono font-semibold text-slate-900 flex items-center gap-1.5 pt-1">
              <Terminal className="w-3.5 h-3.5 text-slate-500" /> Tap to inspect launch guide
            </span>
          </div>
        </div>
      </section>

      {/* 8. DEVELOPER PROTOCOL & EXTENSIBILITY (CLI, REST, 9 MCP SERVERS) */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-200 space-y-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-[11px] font-mono font-bold uppercase tracking-wider border border-orange-200">
            <span>Programmable Restaurant Protocol</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Universal CLI, REST API, 9 MCP Servers & SDK
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto">
            CulinaryOS is an open protocol. Automate restaurant tasks via terminal, orchestrate with REST endpoints, or let AI models manage recipes and inventory via Model Context Protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#090d16] text-slate-100 rounded-2xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm text-white">Universal CLI Tool</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fire orders, bump tickets, 86 ingredients, log trim waste, and run diagnostics directly from terminal.
              </p>
            </div>
            <code className="text-[11px] font-mono bg-slate-900 p-2 rounded text-amber-300 block truncate border border-slate-800">
              culinary pos fire 4 &quot;Burger&quot;
            </code>
          </div>

          <div className="bg-[#090d16] text-slate-100 rounded-2xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-sm text-white">Hono REST API</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sub-millisecond API running on port 3000 for orders, pantry par levels, table floor maps, and realtime events.
              </p>
            </div>
            <code className="text-[11px] font-mono bg-slate-900 p-2 rounded text-cyan-300 block truncate border border-slate-800">
              GET /v1/orders · POST /v1/kds/86
            </code>
          </div>

          <div className="bg-[#090d16] text-slate-100 rounded-2xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-purple-400" />
                <h4 className="font-bold text-sm text-white">9 MCP Servers</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                AI agents (Claude, Gemini, DeepSeek) autonomously manage inventory, prep schedules, menu nutrition, and food cost.
              </p>
            </div>
            <code className="text-[11px] font-mono bg-slate-900 p-2 rounded text-purple-300 block truncate border border-slate-800">
              mcp/recipe-server, kds-server
            </code>
          </div>

          <div className="bg-[#090d16] text-slate-100 rounded-2xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">Shared TypeScript SDK</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                End-to-end type safety with shared ratio scaling engines, dietary filters, and multi-tier tax calculators.
              </p>
            </div>
            <code className="text-[11px] font-mono bg-slate-900 p-2 rounded text-emerald-300 block truncate border border-slate-800">
              @culinaryos/shared, ratio-engine
            </code>
          </div>
        </div>
      </section>

      {/* 9. ECONOMIC SOVEREIGNTY & TRANSPARENT COMPARISON */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full border-t border-slate-200">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-mono font-bold uppercase tracking-wider border border-emerald-200">
            <span>Radical Cost Transparency</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Zero Monthly SaaS Tax. Zero Per-Terminal Licenses.
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto">
            Compare CulinaryOS to the traditional proprietary restaurant software incumbents.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase">
                <th className="py-3 px-4 font-bold">Capability / Cost Factor</th>
                <th className="py-3 px-4 font-bold text-slate-950">CulinaryOS</th>
                <th className="py-3 px-4 font-bold text-slate-400">Toast / Clover / Square</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Software Subscription Fee</td>
                <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">$0/mo (Self-Hosted / Open Source)</td>
                <td className="py-3.5 px-4 font-mono text-slate-500">$69 – $180/mo per terminal</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Payment Processor Model</td>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Bring Your Own Stripe (Standard Connect)</td>
                <td className="py-3.5 px-4 text-slate-500">Locked to vendor (2.49% to 2.99% + $0.15)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Hardware Compatibility</td>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Any tablet, phone, PC, Star/Epson thermal</td>
                <td className="py-3.5 px-4 text-slate-500">Proprietary locked terminals ($799–$999 ea)</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">Cloud Outage Resilience</td>
                <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">100% Offline Local SQLite Buffer</td>
                <td className="py-3.5 px-4 text-slate-500">Floor stalls or degraded offline queue</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-900">License & Code Ownership</td>
                <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">MIT Open Source · You Own the Stack</td>
                <td className="py-3.5 px-4 text-slate-500">Proprietary SaaS Vendor Lock-in</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row justify-center gap-3">
          <a
            href="/menu/demo"
            className="min-h-[48px] px-6 py-3.5 rounded-xl bg-slate-950 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Launch Live Online Ordering Demo</span>
          </a>
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <FileCode className="w-4 h-4 text-slate-700" />
            <span>Clone Repository on GitHub</span>
          </a>
        </div>
      </section>

      {/* QUICKSTART / HARDWARE DEPLOYMENT MODAL */}
      {quickstartModal && (
        <div
          onClick={() => setQuickstartModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            className="max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-7 space-y-5 border border-slate-200 text-left max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    Local Restaurant Deployment
                  </span>
                  {quickstartModal.port && (
                    <span className="text-[10px] font-mono font-bold bg-slate-950 text-white px-2 py-0.5 rounded">
                      Port :{quickstartModal.port}
                    </span>
                  )}
                </div>
                <h3 className="font-black text-lg text-slate-950">{quickstartModal.title}</h3>
                {quickstartModal.role && (
                  <p className="text-xs font-medium text-slate-500">{quickstartModal.role}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setQuickstartModal(null)}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {quickstartModal.description ||
                'This module is designed to run directly on tablets, kitchen displays, and counter terminals communicating with hardware receipt printers and cash drawers over your local restaurant network.'}
            </p>

            {/* Turnkey 1-Command Startup Box */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-900 tracking-wider block">
                1. Local Launch Command (Zero Database Setup Needed):
              </span>
              <div className="bg-[#090d16] text-slate-100 p-3.5 rounded-xl font-mono text-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-inner border border-slate-800">
                <code className="text-emerald-400 text-[11px] select-all overflow-x-auto break-all sm:break-normal">
                  git clone https://github.com/ShadowWalkerNC/CulinaryOS.git &amp;&amp; cd CulinaryOS &amp;&amp; pnpm quickstart
                </code>
                <button
                  type="button"
                  onClick={handleCopyQuickstart}
                  className="min-h-[36px] shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 font-mono text-[11px] font-semibold text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedCommand ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Command</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] font-mono text-slate-500">
                Windows: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold">quickstart.bat</code> · macOS/Linux: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold">./quickstart.sh</code>
              </p>
            </div>

            {/* Local Wi-Fi Pairing Guide */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div className="flex items-center gap-2 font-bold text-slate-950 font-mono">
                <Smartphone className="w-4 h-4 text-slate-800" />
                <span>2. Tableside Tablet & Phone Pairing Over Local Wi-Fi:</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                When started on your host machine, open the host IP on your phone or tablet browser (e.g., <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold border border-slate-200">http://192.168.1.50:5172</code>). Waitstaff can immediately take orders tableside!
              </p>
            </div>

            {/* Actions in Modal */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 border-t border-slate-100">
              <a
                href="/menu/demo"
                className="min-h-[48px] w-full sm:flex-1 px-4 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>Launch Live Storefront</span>
              </a>
              {quickstartModal.screenshot && (
                <button
                  type="button"
                  onClick={() => {
                    const sc = quickstartModal.screenshot!;
                    const t = quickstartModal.title;
                    setQuickstartModal(null);
                    setModalImage({ src: sc, title: t });
                  }}
                  className="min-h-[48px] w-full sm:w-auto rounded-xl bg-slate-100 px-5 text-xs font-bold uppercase tracking-wider text-slate-800 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ZoomIn className="w-4 h-4 text-slate-600" />
                  <span>Inspect Screen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE LIGHTBOX */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="max-w-5xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-2 py-1 border-b border-slate-200">
              <h4 className="font-bold text-xs sm:text-sm text-slate-950 uppercase tracking-wider truncate font-mono">
                {modalImage.title}
              </h4>
              <button
                type="button"
                onClick={() => setModalImage(null)}
                className="p-1.5 text-xs font-semibold text-slate-500 hover:text-slate-950 flex items-center gap-1 rounded hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" /> <span>Close</span>
              </button>
            </div>
            <img src={modalImage.src} alt={modalImage.title} className="w-full h-auto max-h-[80vh] object-contain rounded-xl bg-slate-950" />
          </div>
        </div>
      )}

      {/* 10. INDUSTRIAL TYPOGRAPHIC FOOTER */}
      <footer className="mt-auto bg-[#090d16] text-slate-400 border-t border-slate-800 px-4 sm:px-6 lg:px-8 py-10 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <ChefHat className="w-4 h-4" />
              </div>
              <span className="font-bold text-white tracking-tight text-sm">CulinaryOS</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              The Sovereign Restaurant Operating System. High-speed tableside POS, kitchen display rails, and back-office economics.
            </p>
            <p className="font-mono text-[11px] text-slate-500">MIT License · Open Source Forever</p>
          </div>

          <div className="space-y-2">
            <h5 className="font-mono text-slate-200 uppercase font-bold text-[11px]">Stations & Ports</h5>
            <ul className="space-y-1.5 text-slate-400 font-mono text-[11px]">
              <li>POS Terminal (:5172)</li>
              <li>Kitchen Display KDS (:5173)</li>
              <li>Back-Office Admin (:5174)</li>
              <li>KitchenKit Prep (:5175)</li>
              <li>Online Storefront (:5176)</li>
              <li>CulinaryOps Analytics (:5177)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-mono text-slate-200 uppercase font-bold text-[11px]">Hardware Standards</h5>
            <ul className="space-y-1.5 text-slate-400 font-mono text-[11px]">
              <li>Star TSP100 / TSP143IV</li>
              <li>Epson TM-m30 / TM-T20</li>
              <li>RJ11 / RJ12 24V Cash Drawers</li>
              <li>Stripe WisePOS E &amp; S700</li>
              <li>USB Kitchen Bump Bars</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-mono text-slate-200 uppercase font-bold text-[11px]">Open Ecosystem</h5>
            <ul className="space-y-1.5 text-slate-400 font-mono text-[11px]">
              <li>
                <a href="https://github.com/ShadowWalkerNC/CulinaryOS" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  GitHub Monorepo
                </a>
              </li>
              <li>
                <a href="/jobs" className="hover:text-white transition-colors">
                  Restaurant Careers Board
                </a>
              </li>
              <li>
                <a href="/menu/demo" className="hover:text-white transition-colors">
                  Live Guest Storefront Demo
                </a>
              </li>
              <li>
                <a href="https://culinary-os-marketing.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Production Cloud Instance
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
          <p>© 2026 CulinaryOS Contributors. Free and open source under the MIT License.</p>
          <p>Engineered for high-volume commercial food &amp; beverage operations.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
