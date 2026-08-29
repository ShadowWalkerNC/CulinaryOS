import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CulinaryHeader } from '@culinaryos/ui';

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
  icon: string;
  keyFeatures: string[];
  hardwareCapabilities: string[];
}

export function LandingPage() {
  const [selectedDevice, setSelectedDevice] = useState<string>('phone');
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);

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

  // Recipe Scaler Interactive State
  const [scaleFlourGrams, setScaleFlourGrams] = useState<number>(1000);

  const deviceRoles: DeviceRole[] = [
    {
      id: 'phone',
      deviceType: 'phone',
      name: 'Mobile Handheld POS',
      roleTitle: '📱 Smartphones & Handheld Terminals',
      port: '5172',
      badge: 'Tableside & Line Busting',
      headline: 'Take orders tableside and fire tickets directly to the kitchen line.',
      description: 'Turn any iPhone, Android, or mobile handheld into a high-speed point-of-sale. Servers take orders at the table, assign dishes by seat number, handle food allergen notes, and take payments on the move.',
      screenshot: '/screenshots/pos_menu_modern_cards.png',
      screenshotAlt: 'CulinaryOS Mobile Handheld POS tableside ordering interface',
      icon: 'smartphone',
      keyFeatures: [
        'Rapid tableside order entry with seat-by-seat item assignment (S1, S2, S3)',
        '1-tap Send to Kitchen: fires appetizers and holds entrées automatically',
        'Built-in FDA Top 9 Allergen cross-contact & dietary substitution alerts',
        'Split check by seat, item, or even dollar amounts directly at the table',
        'Mobile card reader integration & digital receipt texting/emailing',
      ],
      hardwareCapabilities: ['Bluetooth Mobile Printers', 'Mobile Card Readers', 'Touch Haptics', 'Offline Local Buffer'],
    },
    {
      id: 'tablet',
      deviceType: 'tablet',
      name: 'Counter POS Terminal & Floor Map',
      roleTitle: '📟 Tablets, iPads & Counter Registers',
      port: '5172',
      badge: 'Front of House Terminal',
      headline: 'Full-featured counter POS with 2D/3D floor layouts and hardware printing.',
      description: 'The core terminal for host stands, main counter registers, and bartending stations. Features interactive 2D and 3D spatial floor mapping, cash drawer management, bar tabs, and direct ESC/POS receipt printing.',
      screenshot: '/screenshots/pos_checkout_receipt.png',
      screenshotAlt: 'CulinaryOS POS Terminal floor map and checkout receipt interface',
      icon: 'tablet',
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
      roleTitle: '📺 Kitchen Touchscreens, Monitors & TVs',
      port: '5173',
      badge: 'Back of House & Expediter',
      headline: 'High-visibility kitchen tickets with 1-second aging timers and station routing.',
      description: 'Replace noisy, wasteful paper kitchen printers with digital ticket screens. Automatically route orders to specific stations (Grill, Fryer, Cold Prep, Pizza Oven, Bar, and Master Expo Pass) with color-coded aging timers.',
      screenshot: '/screenshots/kds_station_routing.png',
      screenshotAlt: 'CulinaryOS Kitchen Display station board with live aging timers',
      icon: 'tv',
      keyFeatures: [
        'Station tabs: Master Expo Pass, Hot Grill, Fryer, Cold Salad, Pizza, Bar, Pastry',
        'Real-time visual aging badges: <5 min Green, 5–10 min Amber, >10 min Flashing Red',
        'Course hold & fire logic: holds Entrées until Starters are bumped on the line',
        '140% high-contrast TV / wall-mounted display mode with audible arrival chimes',
        '1-tap bump bar gestures and completed ticket recall history',
      ],
      hardwareCapabilities: ['Wall-Mounted TVs & Monitors', 'Kitchen Bump Bars (USB)', 'Audio Arrival Chimes', 'Touch Displays'],
    },
    {
      id: 'computer',
      deviceType: 'computer',
      name: 'Back-Office Admin, Recipes & Reports',
      roleTitle: '💻 Office Computers, Desktops & Laptops',
      port: '5174',
      badge: 'Management & Financial Hub',
      headline: 'Complete business control: menu catalog, inventory, food costing, and shift reports.',
      description: 'The master command center on your office computer. Manage menu items with 1-click 86 toggles, set staff PINs, scale recipes with baker’s percentages, track inventory par levels with Auto-PO generation, and audit food waste.',
      screenshot: '/screenshots/admin_pantry_inventory.png',
      screenshotAlt: 'CulinaryOS Back-Office Admin pantry inventory and analytics',
      icon: 'laptop_mac',
      keyFeatures: [
        'Menu Catalog Management with 1-click instant 86 availability toggles',
        'Staff Directory & Security PIN management (Server, Bartender, Chef, Manager, Owner)',
        'Inventory Par Levels with 1-click automated supplier Purchase Order generation',
        'RecipeOS Vault: baker’s percentage ratio scaling and culinary unit conversions',
        'CulinaryOps Diagnostics: theoretical vs actual food cost % and trim waste logs',
      ],
      hardwareCapabilities: ['Standard Office Web Browsers', 'A4 / Letter Report Printers', 'CSV/Excel Export', 'Multi-Monitor Support'],
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

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1f2937] font-sans antialiased selection:bg-[#0f172a] selection:text-white flex flex-col">
      {/* Universal CulinaryOS Header */}
      <CulinaryHeader activeModule="web" tenantName="CulinaryOS Unified Platform" />

      {/* Hero Section: Simple, Plain-English Value Proposition */}
      <section className="px-6 pt-16 pb-12 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0f172a0d] border border-[#0f172a26] text-[#0f172a] text-xs font-black uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>One System · One Server · Every Device In Your Restaurant</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#0b1c30] leading-[1.1]">
          The Complete Restaurant POS <br />
          <span className="text-[#0f172a] underline decoration-amber-400 decoration-wavy decoration-2">
            Built for Every Device
          </span>.
        </h1>

        <p className="max-w-3xl mx-auto text-base sm:text-xl text-[#4b5563] leading-relaxed">
          <strong className="text-[#0b1c30]">CulinaryOS is an all-in-one Point of Sale (POS) and restaurant operating system.</strong> One simple application and server runs your entire restaurant: mobile phones for tableside ordering, counter terminals for checkout, high-visibility screens for the kitchen, and your computer for deep financial reports.
        </p>

        {/* 4 Core Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto pt-2">
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs text-left space-y-1">
            <span className="text-xl">📱</span>
            <h4 className="text-xs font-black text-[#0b1c30] uppercase tracking-wider">Mobile Handhelds</h4>
            <p className="text-[11px] text-[#6b7280]">Phones take orders at the table.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs text-left space-y-1">
            <span className="text-xl">📟</span>
            <h4 className="text-xs font-black text-[#0b1c30] uppercase tracking-wider">Counter Terminals</h4>
            <p className="text-[11px] text-[#6b7280]">3D floor maps & thermal receipts.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs text-left space-y-1">
            <span className="text-xl">📺</span>
            <h4 className="text-xs font-black text-[#0b1c30] uppercase tracking-wider">Kitchen Screens</h4>
            <p className="text-[11px] text-[#6b7280]">Real-time tickets with aging timers.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs text-left space-y-1">
            <span className="text-xl">💻</span>
            <h4 className="text-xs font-black text-[#0b1c30] uppercase tracking-wider">Office Computers</h4>
            <p className="text-[11px] text-[#6b7280]">Menu, inventory & food costing.</p>
          </div>
        </div>

        {/* Hero Quick Launch Buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href="http://localhost:5172"
            className="px-6 py-3.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
            <span>Launch POS Terminal (:5172)</span>
          </a>
          <a
            href="http://localhost:5173"
            className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#f3f4f6] border border-[#e5e7eb] text-[#0b1c30] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">soup_kitchen</span>
            <span>Kitchen Display KDS (:5173)</span>
          </a>
          <a
            href="http://localhost:5174"
            className="px-6 py-3.5 rounded-xl bg-white hover:bg-[#f3f4f6] border border-[#e5e7eb] text-[#0b1c30] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            <span>Back-Office Admin (:5174)</span>
          </a>
        </div>
      </section>

      {/* DEVICE ROLES SECTION: Interactive Selector */}
      <section className="py-14 px-6 max-w-6xl mx-auto border-t border-[#e5e7eb]">
        <div className="text-center space-y-2 mb-8">
          <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
            One Software · Adaptive Hardware Experience
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b1c30]">
            How CulinaryOS Adapts to Each Device
          </h2>
          <p className="text-[#6b7280] text-sm max-w-2xl mx-auto">
            Deploy on any hardware with zero special proprietary tablets required. Select a device below to see its exact role in your operation.
          </p>
        </div>

        {/* 4 Device Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8 bg-[#f1f5f9] p-1.5 rounded-2xl border border-[#e2e8f0]">
          {deviceRoles.map((d) => {
            const isActive = selectedDevice === d.id;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDevice(d.id)}
                className={`py-3 px-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                  isActive
                    ? 'bg-white text-[#0f172a] shadow-sm border border-[#cbd5e1]'
                    : 'text-[#64748b] hover:text-[#0f172a] hover:bg-white/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base ${isActive ? 'bg-[#0f172a] text-white' : 'bg-[#e2e8f0] text-[#64748b]'}`}>
                  <span className="material-symbols-outlined text-lg">{d.icon}</span>
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">{d.name}</h4>
                  <span className="text-[10px] text-[#94a3b8] font-mono">Port :{d.port}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Device Deep-Dive Card */}
        <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] bg-[#0f172a0d] px-2.5 py-1 rounded border border-[#0f172a26]">
                {currentDevice.badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#0b1c30]">
                {currentDevice.roleTitle}
              </h3>
              <p className="text-sm font-semibold text-[#0f172a] leading-normal">
                {currentDevice.headline}
              </p>
              <p className="text-xs text-[#6b7280] leading-relaxed">
                {currentDevice.description}
              </p>
            </div>

            {/* Key Features List */}
            <div className="space-y-2 pt-2 border-t border-[#f1f5f9]">
              <span className="text-[11px] font-black uppercase text-[#0b1c30] tracking-wider block">
                Core Functionality:
              </span>
              <ul className="space-y-2 text-xs text-[#374151]">
                {currentDevice.keyFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5 shrink-0">check_circle</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hardware Compatibility Chips */}
            <div className="pt-2">
              <span className="text-[10px] font-black uppercase text-[#6b7280] tracking-wider block mb-1.5">
                Hardware Connected:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentDevice.hardwareCapabilities.map((hw, i) => (
                  <span key={i} className="text-[10px] font-bold bg-[#f8f9fa] text-[#0f172a] px-2.5 py-1 rounded-md border border-[#e5e7eb]">
                    🔌 {hw}
                  </span>
                ))}
              </div>
            </div>

            {/* Direct Open Button */}
            <div className="pt-3 flex gap-3">
              <a
                href={`http://localhost:${currentDevice.port}`}
                className="px-5 py-2.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Open {currentDevice.name}</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            </div>
          </div>

          {/* Screenshot Preview */}
          <div className="lg:col-span-6 bg-[#f8f9fa] border border-[#e5e7eb] rounded-2xl p-3 cursor-zoom-in group" onClick={() => setModalImage({ src: currentDevice.screenshot, title: currentDevice.name })}>
            <div className="rounded-xl overflow-hidden border border-[#e5e7eb] bg-white shadow-xs">
              <img
                src={currentDevice.screenshot}
                alt={currentDevice.screenshotAlt}
                className="w-full h-auto object-cover max-h-[340px] group-hover:scale-102 transition-transform duration-200"
              />
            </div>
            <div className="text-center pt-2 text-[10px] font-bold text-[#6b7280] flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-xs">zoom_in</span> Click to Zoom Screen
            </div>
          </div>
        </div>
      </section>

      {/* HARDWARE COMPATIBILITY SECTION */}
      <section className="py-12 px-6 bg-white border-y border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
              Universal Hardware Support
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0b1c30]">
              Plug-and-Play Thermal Printers, Cash Drawers & Displays
            </h2>
            <p className="text-[#6b7280] text-xs sm:text-sm max-w-2xl mx-auto">
              CulinaryOS communicates directly with industry-standard ESC/POS receipt printers and peripherals right through modern browser APIs — no proprietary printer drivers or paid hardware bridges required.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#f8f9fa] border border-[#e5e7eb] space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e7eb] flex items-center justify-center text-[#0f172a] font-bold shadow-xs">
                <span className="material-symbols-outlined text-xl">print</span>
              </div>
              <h4 className="text-sm font-black text-[#0b1c30]">ESC/POS Printers</h4>
              <p className="text-xs text-[#6b7280]">Supports 80mm standard and 58mm compact thermal rolls via WebUSB, Bluetooth BLE, Serial COM, and Network IP.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f8f9fa] border border-[#e5e7eb] space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e7eb] flex items-center justify-center text-[#0f172a] font-bold shadow-xs">
                <span className="material-symbols-outlined text-xl">payments</span>
              </div>
              <h4 className="text-sm font-black text-[#0b1c30]">Cash Drawers</h4>
              <p className="text-xs text-[#6b7280]">Auto-fires standard 24V RJ11/RJ12 drawer kick solenoid pulses on cash settlement with audit reconciliations.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f8f9fa] border border-[#e5e7eb] space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e7eb] flex items-center justify-center text-[#0f172a] font-bold shadow-xs">
                <span className="material-symbols-outlined text-xl">tv</span>
              </div>
              <h4 className="text-sm font-black text-[#0b1c30]">Kitchen TVs & Displays</h4>
              <p className="text-xs text-[#6b7280]">140% high-contrast TV mode with audio arrival chimes, designed for wall mounts and cook-line touchscreens.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#f8f9fa] border border-[#e5e7eb] space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e7eb] flex items-center justify-center text-[#0f172a] font-bold shadow-xs">
                <span className="material-symbols-outlined text-xl">wifi_off</span>
              </div>
              <h4 className="text-sm font-black text-[#0b1c30]">Offline Delta Sync</h4>
              <p className="text-xs text-[#6b7280]">Transactions buffer cryptographically in local storage during internet drops and automatically flush when reconnected.</p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE IN-BROWSER RESTAURANT SIMULATOR */}
      <section id="demo" className="py-14 px-6 max-w-6xl mx-auto">
        <div className="text-center space-y-2 mb-8">
          <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
            Interactive In-Browser Demo
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b1c30]">
            Experience the POS ➔ Kitchen Flow Live
          </h2>
          <p className="text-[#6b7280] text-sm max-w-2xl mx-auto">
            Try taking an order at Table 4 below and firing it to the kitchen display in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* POS Terminal Simulation (Left 6 Cols) */}
          <div className="lg:col-span-6 bg-white border border-[#e5e7eb] rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0f172a]">point_of_sale</span>
                  <h3 className="text-sm font-black text-[#0b1c30] uppercase">POS Order Entry (Table 4)</h3>
                </div>
                {/* Seat Selector */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[#6b7280] font-bold text-[10px]">Seat:</span>
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSeat(s)}
                      className={`px-2 py-0.5 rounded text-xs font-bold ${selectedSeat === s ? 'bg-[#0f172a] text-white' : 'bg-[#f3f4f6] text-[#6b7280]'}`}
                    >
                      S{s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Add Menu Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAddItemToDemo({ name: 'Prime Bistro Burger', price: 18.50, station: 'Hot Grill' })}
                  className="p-2.5 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] hover:bg-white hover:border-[#0f172a] text-left transition-all text-xs font-bold space-y-0.5"
                >
                  <p className="text-[#0b1c30] font-extrabold truncate">🍔 Prime Burger</p>
                  <p className="text-[10px] text-[#6b7280] font-mono">$18.50 · Grill</p>
                </button>
                <button
                  onClick={() => handleAddItemToDemo({ name: 'Truffle Fries', price: 8.50, station: 'Fry Station' })}
                  className="p-2.5 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] hover:bg-white hover:border-[#0f172a] text-left transition-all text-xs font-bold space-y-0.5"
                >
                  <p className="text-[#0b1c30] font-extrabold truncate">🍟 Truffle Fries</p>
                  <p className="text-[10px] text-[#6b7280] font-mono">$8.50 · Fryer</p>
                </button>
                <button
                  onClick={() => handleAddItemToDemo({ name: 'Margherita Pizza', price: 16.50, station: 'Pizza Oven' })}
                  className="p-2.5 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] hover:bg-white hover:border-[#0f172a] text-left transition-all text-xs font-bold space-y-0.5"
                >
                  <p className="text-[#0b1c30] font-extrabold truncate">🍕 Margherita</p>
                  <p className="text-[10px] text-[#6b7280] font-mono">$16.50 · Pizza</p>
                </button>
              </div>

              {/* Active Ticket List */}
              <div className="border border-[#e5e7eb] rounded-xl p-3 bg-[#f8f9fa] max-h-[160px] overflow-y-auto space-y-1.5">
                {posTicket.length === 0 ? (
                  <p className="text-center text-xs text-[#9ca3af] py-6 font-semibold">Ticket is empty. Tap items above to build order.</p>
                ) : (
                  posTicket.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-[#e5e7eb]/60 last:border-0">
                      <span className="font-bold text-[#1f2937]">
                        {it.name} <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-[#e5e7eb] text-[#6b7280]">S{it.seat}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#0b1c30]">${it.price.toFixed(2)}</span>
                        <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 font-bold text-xs">✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totals & Send Button */}
            <div className="space-y-3 pt-2 border-t border-[#e5e7eb]">
              <div className="flex justify-between text-xs font-bold text-[#6b7280]">
                <span>Subtotal: ${(subtotal).toFixed(2)} · Tax (8.875%): ${(tax).toFixed(2)}</span>
                <span className="text-sm font-black text-[#0b1c30]">Total: ${(total).toFixed(2)}</span>
              </div>
              <button
                onClick={handleFireDemoOrder}
                disabled={posTicket.length === 0}
                className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all ${
                  ticketFired
                    ? 'bg-emerald-600 text-white'
                    : posTicket.length === 0
                    ? 'bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed'
                    : 'bg-[#0f172a] hover:bg-[#1e293b] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {ticketFired ? 'check_circle' : 'send'}
                </span>
                <span>{ticketFired ? 'Order Fired to Kitchen KDS!' : 'Send to Kitchen (Fire Order)'}</span>
              </button>
            </div>
          </div>

          {/* KDS Station Display Simulation (Right 6 Cols) */}
          <div className="lg:col-span-6 bg-[#0f172a] text-white rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">soup_kitchen</span>
                  <h3 className="text-sm font-black uppercase text-white">Live Kitchen Rail (Expo & Grill)</h3>
                </div>
                <span className="text-[10px] font-bold bg-[#1e293b] text-emerald-400 px-2 py-0.5 rounded">
                  {simulatedKdsTickets.length} Active Tickets
                </span>
              </div>

              {/* KDS Tickets Horizontal Stack */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {simulatedKdsTickets.map((t) => (
                  <div key={t.id} className="bg-[#1e293b] border border-[#334155] rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-amber-400">{t.table} ({t.id})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                          ⏱ {t.time}
                        </span>
                        <span className="text-[10px] bg-[#0f172a] px-2 py-0.5 rounded font-bold text-slate-300">
                          {t.station}
                        </span>
                      </div>
                    </div>
                    <ul className="text-xs text-slate-200 space-y-0.5">
                      {t.items.map((it, i) => (
                        <li key={i} className="font-semibold">• {it}</li>
                      ))}
                    </ul>
                    <div className="flex justify-between items-center pt-1 border-t border-[#334155]">
                      <span className="text-[10px] text-slate-400 font-medium">Server: {t.server}</span>
                      <button
                        onClick={() => handleBumpKdsTicket(t.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded transition-colors"
                      >
                        Bump Ticket ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              Tickets update in real time with 1-second aging timers. When you fire an order on the POS, it immediately appears on the kitchen rail.
            </p>
          </div>
        </div>
      </section>

      {/* ALL 7 MERGED APPLICATIONS DIRECTORY */}
      <section className="py-14 px-6 max-w-6xl mx-auto border-t border-[#e5e7eb]">
        <div className="text-center space-y-2 mb-8">
          <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
            Monorepo Architecture
          </span>
          <h2 className="text-3xl font-black text-[#0b1c30]">
            All 7 Applications In One Sovereign Codebase
          </h2>
          <p className="text-[#6b7280] text-sm max-w-2xl mx-auto">
            Everything runs under a single repo with zero disjointed microservices or paid SaaS dependencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="http://localhost:5172" className="p-5 rounded-2xl bg-white border border-[#e5e7eb] hover:border-[#0f172a] shadow-xs transition-all space-y-2 group">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#0b1c30] group-hover:text-amber-600">POS Terminal</span>
              <span className="text-[10px] font-mono font-bold bg-[#f1f5f9] px-2 py-0.5 rounded text-[#0f172a]">:5172</span>
            </div>
            <p className="text-xs text-[#6b7280]">High-speed touch order entry, 2D/3D floor map editor, tableside seat ordering, and ESC/POS thermal printing.</p>
          </a>

          <a href="http://localhost:5173" className="p-5 rounded-2xl bg-white border border-[#e5e7eb] hover:border-[#0f172a] shadow-xs transition-all space-y-2 group">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#0b1c30] group-hover:text-amber-600">Kitchen Display (KDS)</span>
              <span className="text-[10px] font-mono font-bold bg-[#f1f5f9] px-2 py-0.5 rounded text-[#0f172a]">:5173</span>
            </div>
            <p className="text-xs text-[#6b7280]">Station-routed kitchen tickets with 1-second aging timers, course holding, and 140% high-contrast TV mode.</p>
          </a>

          <a href="http://localhost:5174" className="p-5 rounded-2xl bg-white border border-[#e5e7eb] hover:border-[#0f172a] shadow-xs transition-all space-y-2 group">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#0b1c30] group-hover:text-amber-600">Back-Office Admin</span>
              <span className="text-[10px] font-mono font-bold bg-[#f1f5f9] px-2 py-0.5 rounded text-[#0f172a]">:5174</span>
            </div>
            <p className="text-xs text-[#6b7280]">Menu catalog editor, 1-click 86 item toggles, staff security PINs, inventory par levels, and station routing.</p>
          </a>

          <a href="http://localhost:5175" className="p-5 rounded-2xl bg-white border border-[#e5e7eb] hover:border-[#0f172a] shadow-xs transition-all space-y-2 group">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#0b1c30] group-hover:text-amber-600">KitchenKit Prep Planner</span>
              <span className="text-[10px] font-mono font-bold bg-[#f1f5f9] px-2 py-0.5 rounded text-[#0f172a]">:5175</span>
            </div>
            <p className="text-xs text-[#6b7280]">Shift prep checklists, expected cover volume forecasting, perishable FIFO tracking, and vendor directory.</p>
          </a>

          <a href="http://localhost:5176" className="p-5 rounded-2xl bg-white border border-[#e5e7eb] hover:border-[#0f172a] shadow-xs transition-all space-y-2 group">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#0b1c30] group-hover:text-amber-600">Online Storefront</span>
              <span className="text-[10px] font-mono font-bold bg-[#f1f5f9] px-2 py-0.5 rounded text-[#0f172a]">:5176</span>
            </div>
            <p className="text-xs text-[#6b7280]">Mobile-first customer ordering with FDA Top 9 allergen filtering, vegan badges, and live prep status tracking.</p>
          </a>

          <a href="http://localhost:5177" className="p-5 rounded-2xl bg-white border border-[#e5e7eb] hover:border-[#0f172a] shadow-xs transition-all space-y-2 group">
            <div className="flex justify-between items-center">
              <span className="font-black text-sm text-[#0b1c30] group-hover:text-amber-600">CulinaryOps Analytics</span>
              <span className="text-[10px] font-mono font-bold bg-[#f1f5f9] px-2 py-0.5 rounded text-[#0f172a]">:5177</span>
            </div>
            <p className="text-xs text-[#6b7280]">Theoretical vs actual food cost % variance, kitchen trim/spoilage waste logs, and labor hour analytics.</p>
          </a>
        </div>
      </section>

      {/* PRICING & SOVEREIGN SELF-HOSTING */}
      <section className="py-14 px-6 max-w-4xl mx-auto border-t border-[#e5e7eb] text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
          <span>100% Free & Open Source Forever (MIT)</span>
        </div>

        <h2 className="text-3xl font-black text-[#0b1c30]">
          Zero Monthly SaaS Fees. Zero Per-Terminal Licenses.
        </h2>

        <p className="text-sm text-[#4b5563] max-w-2xl mx-auto leading-relaxed">
          Traditional restaurant POS providers charge \$100–\$300/month per terminal plus transaction markup. CulinaryOS is open-source software you own completely. Run it locally on your restaurant WiFi or deploy to your private cloud.
        </p>

        <div className="pt-2 flex justify-center gap-3">
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-[#0f172a] text-white text-xs font-black uppercase tracking-wider hover:bg-[#1e293b] transition-colors shadow-xs"
          >
            Clone Repository on GitHub
          </a>
        </div>
      </section>

      {/* Image Zoom Modal */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-2 border-b border-[#e5e7eb]">
              <h4 className="font-black text-sm text-[#0b1c30] uppercase">{modalImage.title}</h4>
              <button onClick={() => setModalImage(null)} className="text-xs font-bold text-[#6b7280] hover:text-black">✕ Close</button>
            </div>
            <img src={modalImage.src} alt={modalImage.title} className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-[#e5e7eb] px-6 py-6 text-center text-xs text-[#6b7280] font-medium space-y-1">
        <p className="font-bold text-[#0b1c30]">CulinaryOS — The Open Source Point of Sale & Restaurant Operating System</p>
        <p className="text-[11px]">MIT License · 100% Free · Universal ESC/POS Hardware Support</p>
      </footer>
    </div>
  );
}

export default LandingPage;
