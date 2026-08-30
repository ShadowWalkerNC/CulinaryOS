import { useState } from 'react';
import {
  CulinaryHeader,
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
  const [simulatedKdsTickets, setSimulatedKdsTickets] = useState([
    { id: 'T-101', table: 'Table 4', server: 'John D.', items: ['2x Prime Burger (Med-Rare)', '1x Truffle Fries'], station: 'Hot Grill', course: 'Course 1', time: '3:45', status: 'cooking' },
    { id: 'T-102', table: 'Table 7', server: 'Jane S.', items: ['1x Wood-Fired Margherita'], station: 'Pizza Oven', course: 'Course 1', time: '8:20', status: 'held' },
    { id: 'T-103', table: 'Bar 2', server: 'Alex M.', items: ['2x Smoked Old Fashioned'], station: 'Bar', course: 'Immediate', time: '1:10', status: 'ready' },
  ]);

  const deviceRoles: DeviceRole[] = [
    {
      id: 'phone',
      deviceType: 'phone',
      name: 'Mobile Handheld POS',
      roleTitle: 'Smartphones & Mobile Handhelds',
      port: '5172',
      badge: 'Tableside Service',
      headline: 'Take orders tableside and fire tickets directly to the kitchen line.',
      description: 'Turn any iPhone, Android, or handheld terminal into a high-speed point of sale. Waitstaff take orders at the table, assign dishes by seat number, handle allergen notes, and accept mobile checkout.',
      screenshot: '/screenshots/pos_menu_modern_cards.png',
      screenshotAlt: 'CulinaryOS Mobile Handheld POS tableside ordering interface',
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
      name: 'Counter POS Terminal & Floor Map',
      roleTitle: 'Tablets, iPads & Counter Registers',
      port: '5172',
      badge: 'Front of House Terminal',
      headline: 'Full-featured counter POS with 2D/3D floor layouts and hardware printing.',
      description: 'The core terminal for host stands, main counter registers, and bar stations. Features interactive 2D and 3D spatial floor mapping, cash drawer management, bar tabs, and direct ESC/POS receipt printing.',
      screenshot: '/screenshots/pos_checkout_receipt.png',
      screenshotAlt: 'CulinaryOS POS Terminal floor map and checkout receipt interface',
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
      roleTitle: 'Kitchen Touchscreens, Monitors & TVs',
      port: '5173',
      badge: 'Back of House & Expediter',
      headline: 'High-visibility kitchen tickets with 1-second aging timers and station routing.',
      description: 'Replace noisy, wasteful paper kitchen printers with digital ticket screens. Automatically route orders to specific stations (Grill, Fryer, Cold Prep, Pizza Oven, Bar, and Master Expo Pass) with color-coded aging timers.',
      screenshot: '/screenshots/kds_station_routing.png',
      screenshotAlt: 'CulinaryOS Kitchen Display station board with live aging timers',
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
      roleTitle: 'Office Computers, Desktops & Laptops',
      port: '5174',
      badge: 'Management & Operations Hub',
      headline: 'Complete business control: menu catalog, inventory, food costing, and shift reports.',
      description: 'The master command center on your office computer. Manage menu items with 1-click 86 toggles, set staff PINs, scale recipes with baker’s percentages, track inventory par levels with Auto-PO generation, and audit food waste.',
      screenshot: '/screenshots/admin_pantry_inventory.png',
      screenshotAlt: 'CulinaryOS Back-Office Admin pantry inventory and analytics',
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
    setTicketFired(true);
    const newKdsTicket = {
      id: `T-${Math.floor(100 + Math.random() * 900)}`,
      table: 'Table 4',
      server: 'John D. (Mobile)',
      items: posTicket.map((it) => `${it.name} (S${it.seat})`),
      station: 'Hot Grill',
      course: 'Course 1 (Fired)',
      time: '0:01',
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

  const renderDeviceIcon = (type: DeviceRole['deviceType'], className = 'w-5 h-5') => {
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white flex flex-col">
      {/* Universal CulinaryOS Header */}
      <CulinaryHeader activeModule="web" tenantName="CulinaryOS Unified Platform" />

      {/* Hero Section: Simple, Plain-English Value Proposition */}
      <section className="px-4 sm:px-6 pt-10 sm:pt-16 pb-8 sm:pb-12 max-w-5xl mx-auto text-center space-y-5 sm:space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/80 border border-slate-300 text-slate-900 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>One System · One Server · Every Device In Your Restaurant</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 leading-tight">
          The Complete Restaurant POS <br className="hidden sm:inline" />
          <span className="text-slate-900 border-b-2 border-slate-900 inline-block pb-0.5">
            Built for Every Device
          </span>
        </h1>

        <p className="max-w-3xl mx-auto text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed font-normal px-2">
          <strong className="text-slate-900 font-semibold">CulinaryOS is an all-in-one Point of Sale (POS) and restaurant operating system.</strong> One single application and server runs your entire restaurant: mobile phones for tableside ordering, counter terminals for checkout, high-visibility screens for the kitchen, and your computer for deep financial reports.
        </p>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto pt-2">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs text-left space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
              <Smartphone className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Mobile Handhelds</h4>
            <p className="text-xs text-slate-500 font-normal">Phones take orders tableside.</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs text-left space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
              <Tablet className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Counter Terminals</h4>
            <p className="text-xs text-slate-500 font-normal">Floor maps & thermal receipts.</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs text-left space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
              <Tv className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kitchen Screens</h4>
            <p className="text-xs text-slate-500 font-normal">Real-time tickets & aging timers.</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs text-left space-y-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
              <Laptop className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Office Computers</h4>
            <p className="text-xs text-slate-500 font-normal">Menu, inventory & food costing.</p>
          </div>
        </div>

        {/* Hero Actions (Mobile Responsive Stacking) */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2.5 sm:gap-3 pt-2 max-w-2xl mx-auto">
          <a
            href="/menu/demo"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Try Online Storefront (Live Demo)</span>
          </a>

          <a
            href="#demo"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <ChefHat className="w-4 h-4 text-slate-700" />
            <span>Interactive POS & KDS Simulator</span>
          </a>

          <button
            type="button"
            onClick={() => setQuickstartModal({
              title: 'Turnkey Local Restaurant Deployment',
              role: 'Hardware Thermal Printers, Cash Drawers & Kitchen TVs',
              description: 'Deploy CulinaryOS directly onto tablets, touch terminals, and mobile handhelds in your restaurant with zero cloud dependency. Run on standard hardware over local WiFi.',
              screenshot: '/screenshots/pos_menu_modern_cards.png',
            })}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Terminal className="w-4 h-4 text-slate-700" />
            <span>Hardware & Local Setup</span>
          </button>

          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <FileCode className="w-4 h-4 text-slate-700" />
            <span>GitHub Monorepo</span>
          </a>
        </div>
      </section>

      {/* DEVICE ROLES SECTION: Interactive Selector */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-200 w-full">
        <div className="text-center space-y-2 mb-8">
          <span className="text-slate-900 text-xs font-semibold uppercase tracking-wider bg-slate-200/70 px-3 py-1 rounded-full border border-slate-300">
            One Software · Adaptive Hardware Experience
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950">
            How CulinaryOS Adapts to Each Device
          </h2>
          <p className="text-slate-600 text-sm max-w-2xl mx-auto">
            Deploy on standard commercial or off-the-shelf hardware with zero proprietary restrictions. Select a device below to inspect its operational role.
          </p>
        </div>

        {/* 4 Device Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8 bg-slate-200/50 p-1.5 rounded-xl border border-slate-200">
          {deviceRoles.map((d) => {
            const isActive = selectedDevice === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDevice(d.id)}
                className={`py-3 px-4 rounded-lg text-left transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-base ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {renderDeviceIcon(d.deviceType, 'w-4 h-4')}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">{d.name}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">Port :{d.port}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Device Deep-Dive Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          <div className="lg:col-span-6 space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
                {currentDevice.badge}
              </span>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-950">
                {currentDevice.roleTitle}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-900 leading-normal">
                {currentDevice.headline}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentDevice.description}
              </p>
            </div>

            {/* Key Features List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase text-slate-900 tracking-wider block">
                Core Functionality:
              </span>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentDevice.keyFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hardware Compatibility Chips */}
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-1.5">
                Hardware Connected:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentDevice.hardwareCapabilities.map((hw, i) => (
                  <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200">
                    {hw}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
              {currentDevice.id === 'phone' && (
                <a
                  href="/menu/demo"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>Try Mobile Storefront</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setQuickstartModal({
                  title: currentDevice.name,
                  port: currentDevice.port,
                  role: currentDevice.roleTitle,
                  description: currentDevice.description,
                  screenshot: currentDevice.screenshot,
                })}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Terminal className="w-4 h-4 text-slate-700" />
                <span>Hardware & Launch Guide</span>
              </button>

              <button
                type="button"
                onClick={() => setModalImage({ src: currentDevice.screenshot, title: currentDevice.name })}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
                <span>View Full Screen</span>
              </button>
            </div>
          </div>

          {/* Screenshot Preview */}
          <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-2xl p-3 cursor-zoom-in group" onClick={() => setModalImage({ src: currentDevice.screenshot, title: currentDevice.name })}>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
              <img
                src={currentDevice.screenshot}
                alt={currentDevice.screenshotAlt}
                className="w-full h-auto object-cover max-h-[340px] group-hover:scale-101 transition-transform duration-200"
              />
            </div>
            <div className="text-center pt-2 text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
              <ZoomIn className="w-3.5 h-3.5" /> Tap to Zoom High-Res Screen
            </div>
          </div>
        </div>
      </section>

      {/* HARDWARE COMPATIBILITY SECTION */}
      <section className="py-10 sm:py-12 px-4 sm:px-6 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <span className="text-slate-900 text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Universal Hardware Support
            </span>
            <h2 className="text-xl sm:text-3xl font-bold text-slate-950">
              Plug-and-Play Thermal Printers, Cash Drawers & Displays
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto px-2">
              CulinaryOS communicates directly with industry-standard ESC/POS receipt printers and peripherals right through modern browser APIs — zero proprietary printer drivers or paid hardware bridges required.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 font-bold shadow-xs">
                <Printer className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">ESC/POS Printers</h4>
              <p className="text-xs text-slate-600">Supports 80mm standard and 58mm compact thermal rolls via WebUSB, Bluetooth BLE, Serial COM, and Network IP.</p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 font-bold shadow-xs">
                <DollarSign className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">Cash Drawers</h4>
              <p className="text-xs text-slate-600">Auto-fires standard 24V RJ11/RJ12 drawer kick solenoid pulses on cash settlement with audit reconciliations.</p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 font-bold shadow-xs">
                <Tv className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">Kitchen TVs & Displays</h4>
              <p className="text-xs text-slate-600">140% high-contrast TV mode with audio arrival chimes, designed for wall mounts and cook-line touchscreens.</p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 font-bold shadow-xs">
                <WifiOff className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-950">Offline Delta Sync</h4>
              <p className="text-xs text-slate-600">Transactions buffer cryptographically in local storage during internet drops and automatically flush when reconnected.</p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE IN-BROWSER RESTAURANT SIMULATOR */}
      <section id="demo" className="py-10 sm:py-14 px-4 sm:px-6 max-w-6xl mx-auto scroll-mt-6">
        <div className="text-center space-y-2 mb-6 sm:mb-8">
          <span className="text-slate-900 text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-slate-200/80 px-3 py-1 rounded-full border border-slate-300">
            Interactive In-Browser Demo
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-slate-950">
            Experience the POS to Kitchen Flow Live
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto px-2">
            Build an order on the POS below and fire it to the kitchen display rail in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* POS Terminal Simulation (Left 6 Cols) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-900" />
                  <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">POS Order Entry (Table 4)</h3>
                </div>
                {/* Seat Selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium text-[11px]">Seat:</span>
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSeat(s)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${selectedSeat === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      S{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Add Menu Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleAddItemToDemo({ name: 'Prime Bistro Burger', price: 18.50, station: 'Hot Grill' })}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-400 text-left transition-all text-xs font-medium space-y-0.5"
                >
                  <p className="text-slate-950 font-bold truncate">Prime Burger</p>
                  <p className="text-[10px] text-slate-500 font-mono">$18.50 · Grill</p>
                </button>
                <button
                  onClick={() => handleAddItemToDemo({ name: 'Truffle Fries', price: 8.50, station: 'Fry Station' })}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-400 text-left transition-all text-xs font-medium space-y-0.5"
                >
                  <p className="text-slate-950 font-bold truncate">Truffle Fries</p>
                  <p className="text-[10px] text-slate-500 font-mono">$8.50 · Fryer</p>
                </button>
                <button
                  onClick={() => handleAddItemToDemo({ name: 'Margherita Pizza', price: 16.50, station: 'Pizza Oven' })}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-400 text-left transition-all text-xs font-medium space-y-0.5"
                >
                  <p className="text-slate-950 font-bold truncate">Margherita</p>
                  <p className="text-[10px] text-slate-500 font-mono">$16.50 · Pizza</p>
                </button>
              </div>

              {/* Active Ticket List */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-[160px] overflow-y-auto space-y-1.5">
                {posTicket.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6 font-medium">Ticket is empty. Tap items above to build order.</p>
                ) : (
                  posTicket.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-200/60 last:border-0">
                      <span className="font-medium text-slate-800">
                        {it.name} <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">S{it.seat}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-950 font-semibold">${it.price.toFixed(2)}</span>
                        <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-600 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totals & Send Button */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>Subtotal: ${(subtotal).toFixed(2)} · Tax: ${(tax).toFixed(2)}</span>
                <span className="text-sm font-bold text-slate-950 font-mono">Total: ${(total).toFixed(2)}</span>
              </div>
              <button
                onClick={handleFireDemoOrder}
                disabled={posTicket.length === 0}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all ${
                  ticketFired
                    ? 'bg-emerald-600 text-white'
                    : posTicket.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {ticketFired ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Order Fired to Kitchen KDS</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send to Kitchen (Fire Order)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* KDS Station Display Simulation (Right 6 Cols) */}
          <div className="lg:col-span-6 bg-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Live Kitchen Rail (Expo & Grill)</h3>
                </div>
                <span className="text-[10px] font-medium bg-slate-800 text-emerald-400 px-2 py-0.5 rounded">
                  {simulatedKdsTickets.length} Active Tickets
                </span>
              </div>

              {/* KDS Tickets Horizontal Stack */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {simulatedKdsTickets.map((t) => (
                  <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{t.table} ({t.id})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                          {t.time}
                        </span>
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-medium text-slate-300">
                          {t.station}
                        </span>
                      </div>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-0.5">
                      {t.items.map((it, i) => (
                        <li key={i} className="font-normal">• {it}</li>
                      ))}
                    </ul>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 font-medium">Server: {t.server}</span>
                      <button
                        onClick={() => handleBumpKdsTicket(t.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Bump Ticket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Tickets update in real time with 1-second aging timers. When you fire an order on the POS, it immediately appears on the kitchen rail.
            </p>
          </div>
        </div>
      </section>

      {/* ALL 7 MERGED APPLICATIONS DIRECTORY */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-200">
        <div className="text-center space-y-2 mb-6 sm:mb-8">
          <span className="text-slate-900 text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-slate-200/80 px-3 py-1 rounded-full border border-slate-300">
            Monorepo Architecture
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-slate-950">
            All 7 Applications In One Unified Repository
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto px-2">
            Everything runs under a single repo with zero disjointed microservices or paid SaaS dependencies.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* 1. POS Terminal */}
          <div
            onClick={() => setQuickstartModal({
              title: 'POS Terminal & Touch Hardware',
              port: '5172',
              role: 'Point of Sale, 3D Floor Maps & Thermal Printing',
              description: 'Run the POS terminal on tablets, mobile handhelds, or counter registers with ESC/POS receipt printing and cash drawer kick.',
              screenshot: '/screenshots/pos_menu_modern_cards.png',
            })}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-xs transition-all space-y-2 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-slate-950">POS Terminal</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Hardware Node</span>
            </div>
            <p className="text-xs text-slate-600">High-speed touch order entry, 2D/3D floor map editor, tableside seat ordering, and ESC/POS thermal printing.</p>
            <span className="text-[11px] font-semibold text-slate-900 flex items-center gap-1 pt-1">
              <Terminal className="w-3 h-3" /> Tap to view launch & hardware guide
            </span>
          </div>

          {/* 2. Kitchen Display KDS */}
          <div
            onClick={() => setQuickstartModal({
              title: 'Kitchen Display System (KDS)',
              port: '5173',
              role: 'Kitchen Tickets & Station Routing',
              description: 'Run the KDS on kitchen screens and TV expo pass with live ticket aging timers and station filtering.',
              screenshot: '/screenshots/kds_station_routing.png',
            })}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-xs transition-all space-y-2 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-slate-950">Kitchen Display (KDS)</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Kitchen TV / Screen</span>
            </div>
            <p className="text-xs text-slate-600">Station-routed kitchen tickets with 1-second aging timers, course holding, and 140% high-contrast TV mode.</p>
            <span className="text-[11px] font-semibold text-slate-900 flex items-center gap-1 pt-1">
              <Terminal className="w-3 h-3" /> Tap to view launch & hardware guide
            </span>
          </div>

          {/* 3. Back-Office Admin */}
          <div
            onClick={() => setQuickstartModal({
              title: 'Back-Office Admin & Settings',
              port: '5174',
              role: 'Menu Editor, Staff & Par Levels',
              description: 'Run the admin dashboard to manage menus, 86ing, inventory par levels, auto-PO, and staff security PINs.',
              screenshot: '/screenshots/admin_pantry_inventory.png',
            })}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-xs transition-all space-y-2 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-slate-950">Back-Office Admin</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Manager Portal</span>
            </div>
            <p className="text-xs text-slate-600">Menu catalog editor, 1-click 86 item toggles, staff security PINs, inventory par levels, and station routing.</p>
            <span className="text-[11px] font-semibold text-slate-900 flex items-center gap-1 pt-1">
              <Terminal className="w-3 h-3" /> Tap to view launch & hardware guide
            </span>
          </div>

          {/* 4. KitchenKit Prep Planner */}
          <div
            onClick={() => setQuickstartModal({
              title: 'KitchenKit Prep Planner',
              port: '5175',
              role: 'Station Prep Checklists & Batch Scaling',
              description: 'Manage morning station prep lists, cover count projections, and recipe ratios.',
              screenshot: '/screenshots/kds_station_routing.png',
            })}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-xs transition-all space-y-2 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-slate-950">KitchenKit Prep Planner</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Prep Station</span>
            </div>
            <p className="text-xs text-slate-600">Shift prep checklists, expected cover volume forecasting, perishable FIFO tracking, and vendor directory.</p>
            <span className="text-[11px] font-semibold text-slate-900 flex items-center gap-1 pt-1">
              <Terminal className="w-3 h-3" /> Tap to view launch & hardware guide
            </span>
          </div>

          {/* 5. Online Storefront (Works Live on Vercel!) */}
          <a href="/menu/demo" className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 hover:border-emerald-500 shadow-sm transition-all space-y-2 group">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-white group-hover:text-emerald-400 flex items-center gap-1.5">
                <span>Online Storefront</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                Live on Vercel
              </span>
            </div>
            <p className="text-xs text-slate-300">Mobile-first customer ordering with FDA Top 9 allergen filtering, dietary badges, and live prep status tracking.</p>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 pt-1">
              <span>Launch Live Storefront</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </a>

          {/* 6. CulinaryOps Analytics */}
          <div
            onClick={() => setQuickstartModal({
              title: 'CulinaryOps Analytics',
              port: '5177',
              role: 'Food Cost Variance & Waste Ledger',
              description: 'Monitor actual vs theoretical food cost %, kitchen trim waste logs, and labor hours.',
              screenshot: '/screenshots/admin_waste_analytics.png',
            })}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-900 shadow-xs transition-all space-y-2 group cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-slate-900 group-hover:text-slate-950">CulinaryOps Analytics</span>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">Economics Node</span>
            </div>
            <p className="text-xs text-slate-600">Theoretical vs actual food cost variance, kitchen trim and spoilage waste logs, and labor hour analytics.</p>
            <span className="text-[11px] font-semibold text-slate-900 flex items-center gap-1 pt-1">
              <Terminal className="w-3 h-3" /> Tap to view launch & hardware guide
            </span>
          </div>
        </div>
      </section>

      {/* PRICING & SOVEREIGN SELF-HOSTING */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 max-w-4xl mx-auto border-t border-slate-200 text-center space-y-5 sm:space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
          <span>Open Source Forever (MIT License)</span>
        </div>

        <h2 className="text-xl sm:text-3xl font-bold text-slate-950">
          Zero Monthly SaaS Fees. Zero Per-Terminal Licenses.
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed px-2">
          Traditional restaurant POS providers charge substantial monthly fees per terminal plus transaction markup. CulinaryOS is open-source software you own completely. Run it locally on your restaurant WiFi or deploy to your private cloud.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3 max-w-lg mx-auto">
          <a
            href="/menu/demo"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>Try Live Online Ordering Demo</span>
          </a>
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <FileCode className="w-4 h-4 text-slate-700" />
            <span>Clone Repository on GitHub</span>
          </a>
        </div>
      </section>

      {/* Quickstart / Hardware Deployment Modal */}
      {quickstartModal && (
        <div
          onClick={() => setQuickstartModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            className="max-w-xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-5 sm:p-6 space-y-4 sm:space-y-5 animate-fadeIn border border-slate-200 text-left max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    Local & Server Deployment
                  </span>
                  {quickstartModal.port && (
                    <span className="text-[10px] font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                      Port :{quickstartModal.port}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-950">{quickstartModal.title}</h3>
                {quickstartModal.role && (
                  <p className="text-xs font-medium text-slate-500">{quickstartModal.role}</p>
                )}
              </div>
              <button
                onClick={() => setQuickstartModal(null)}
                className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {quickstartModal.description || 'This module is designed to run directly on tablets, kitchen displays, and counter terminals communicating with hardware receipt printers and cash drawers over your local restaurant network.'}
            </p>

            {/* Turnkey 1-Command Startup Box */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-900 tracking-wider block">
                1. Local Restaurant Hardware Launch (Zero DB Setup Needed):
              </span>
              <div className="bg-slate-950 text-slate-100 p-3 sm:p-3.5 rounded-xl font-mono text-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-inner border border-slate-800">
                <code className="text-emerald-400 text-[11px] sm:text-xs select-all overflow-x-auto break-all sm:break-normal">
                  git clone https://github.com/ShadowWalkerNC/CulinaryOS.git && cd CulinaryOS && pnpm quickstart
                </code>
                <button
                  type="button"
                  onClick={handleCopyQuickstart}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-sans font-semibold shrink-0 flex items-center justify-center gap-1.5 transition-colors"
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
              <p className="text-[11px] text-slate-500 font-medium">
                On Windows run <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono font-bold">quickstart.bat</code> · On macOS/Linux run <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono font-bold">./quickstart.sh</code>.
              </p>
            </div>

            {/* Local WiFi / Network Pairing Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-slate-950">
                <Smartphone className="w-4 h-4 text-slate-800" />
                <span>Pair Mobile Phones & Tablets Over Local Restaurant WiFi:</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                When started on your main computer, open the host IP on your phone or tablet browser (e.g. <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold border border-slate-200">http://192.168.1.50:5172</code>). Waitstaff can immediately take orders tableside!
              </p>
            </div>

            {/* Action Buttons in Modal */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 border-t border-slate-100">
              <a
                href="/menu/demo"
                className="w-full sm:flex-1 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>Try Online Storefront (Live on Vercel)</span>
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
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ZoomIn className="w-4 h-4 text-slate-600" />
                  <span>Inspect Screen</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 cursor-zoom-out"
        >
          <div className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-3 sm:p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-2 py-1 border-b border-slate-200">
              <h4 className="font-bold text-xs sm:text-sm text-slate-950 uppercase tracking-wider truncate">{modalImage.title}</h4>
              <button onClick={() => setModalImage(null)} className="text-xs font-medium text-slate-500 hover:text-black flex items-center gap-1 p-1">
                <X className="w-4 h-4" /> <span>Close</span>
              </button>
            </div>
            <img src={modalImage.src} alt={modalImage.title} className="w-full h-auto max-h-[75vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 px-4 sm:px-6 py-6 text-center text-xs text-slate-500 font-medium space-y-1">
        <p className="font-bold text-slate-900">CulinaryOS — The Open Source Point of Sale & Restaurant Operating System</p>
        <p className="text-[11px]">MIT License · Live Production: <a href="https://culinary-os-marketing.vercel.app" className="underline text-slate-700 hover:text-slate-950">culinary-os-marketing.vercel.app</a></p>
      </footer>
    </div>
  );
}

export default LandingPage;
