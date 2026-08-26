import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CulinaryHeader } from '@culinaryos/ui';

interface AppSurface {
  id: string;
  name: string;
  sourceRepo: string;
  packagePath: string;
  port: string;
  badge: string;
  summary: string;
  screenshot: string;
  screenshotAlt: string;
  workflow: string[];
  engines: string[];
  mcpTools: string[];
  icon: string;
}

export function LandingPage() {
  const [selectedSurface, setSelectedSurface] = useState<string>('pos');
  const [activeArchLayer, setActiveArchLayer] = useState<'clients' | 'eventbus' | 'server' | 'database' | 'mcp' | 'engines'>('clients');
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);

  // Interactive In-Browser Live Demo Playground State
  const [demoCovers, setDemoCovers] = useState<number>(12);
  const [simulatedTickets, setSimulatedTickets] = useState([
    { id: 'T-101', table: 'Table 4', server: 'John D.', items: ['2x Prime Burger (Med-Rare)', '1x Truffle Fries'], station: 'Hot Grill', course: 'Course 1 (Starters)', time: '3:45', status: 'cooking' },
    { id: 'T-102', table: 'Table 7', server: 'Jane S.', items: ['1x Wood-Fired Margherita', '1x Burrata Salad'], station: 'Pizza Oven', course: 'Course 1 (Starters)', time: '8:20', status: 'held' },
    { id: 'T-103', table: 'Bar 2', server: 'Alex M.', items: ['2x Smoked Old Fashioned', '1x Draft IPA'], station: 'Bar', course: 'Immediate (Drinks)', time: '1:10', status: 'ready' },
  ]);

  const handleBumpTicket = (id: string) => {
    setSimulatedTickets((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetTickets = () => {
    setSimulatedTickets([
      { id: 'T-101', table: 'Table 4', server: 'John D.', items: ['2x Prime Burger (Med-Rare)', '1x Truffle Fries'], station: 'Hot Grill', course: 'Course 1 (Starters)', time: '3:45', status: 'cooking' },
      { id: 'T-102', table: 'Table 7', server: 'Jane S.', items: ['1x Wood-Fired Margherita', '1x Burrata Salad'], station: 'Pizza Oven', course: 'Course 1 (Starters)', time: '8:20', status: 'held' },
      { id: 'T-103', table: 'Bar 2', server: 'Alex M.', items: ['2x Smoked Old Fashioned', '1x Draft IPA'], station: 'Bar', course: 'Immediate (Drinks)', time: '1:10', status: 'ready' },
    ]);
  };

  const surfaces: AppSurface[] = [
    {
      id: 'pos',
      name: 'POS Terminal',
      sourceRepo: 'CulinaryOS Core',
      packagePath: 'apps/pos',
      port: '5172',
      badge: 'Front of House & Floor Map',
      summary: 'High-speed touch order entry with 2D/3D spatial floor mapping, multi-seat ordering, and direct ESC/POS thermal printing.',
      screenshot: '/screenshots/pos_ticket_menu.png',
      screenshotAlt: 'CulinaryOS POS Terminal order ticket and menu matrix',
      icon: 'point_of_sale',
      workflow: [
        'PIN authentication (1234 Server, 5678 Manager) with role-based permissions',
        '3D Floor map editor: drag & drop booths, round tables, bar seats, and room architectural themes',
        'Seat-by-seat guest ordering with FDA Top 9 allergen cross-contact warnings',
        'Universal ESC/POS hardware printer hub: WebUSB, Bluetooth BLE, Serial COM, and Network IP',
        'Offline delta queue buffer: stores signed transactions locally during network drops',
      ],
      engines: ['@culinaryos/shared (printer & offline-sync)', '@culinaryos/ui (3D Three.js canvas)'],
      mcpTools: ['pos-server (create_pos_order, split_check, apply_discount, fire_order)'],
    },
    {
      id: 'kds',
      name: 'Kitchen Display System (KDS)',
      sourceRepo: 'KitchenKit & Core',
      packagePath: 'apps/kds',
      port: '5173',
      badge: 'Back of House & Expediter',
      summary: 'Real-time kitchen ticket management with 1-second aging timers, station routing, course hold/fire, and 140% TV wall mode.',
      screenshot: '/screenshots/kds_station_board.png',
      screenshotAlt: 'CulinaryOS Kitchen Display station board with live aging timers',
      icon: 'soup_kitchen',
      workflow: [
        'Station tabs: Expo Master Pass, Hot Grill, Fryer/Sauté, Cold Prep, Pizza Oven, Bar, Pastry',
        'Course hold & fire automation: automatic delay timers between Starters and Entrées',
        'Live visual aging thresholds: <5 min Green, 5–10 min Amber, >10 min Flashing Red',
        'High-contrast OLED dark theme for hot kitchen line visibility',
        'One-tap bump bar gestures and audible arrival chimes',
      ],
      engines: ['@culinaryos/event-bus (kds:ticket:bumped)', '@culinaryos/shared (station mapper)'],
      mcpTools: ['kds-server (get_active_tickets, bump_ticket, fire_course, hold_ticket)'],
    },
    {
      id: 'admin',
      name: 'Back-Office Admin & Settings',
      sourceRepo: 'CulinaryOS Core',
      packagePath: 'apps/admin',
      port: '5174',
      badge: 'Management & Routing',
      summary: 'Command center for catalog management, 1-click 86ing, staff PINs, auto-PO par levels, and full station routing.',
      screenshot: '/screenshots/admin_pantry_inventory.png',
      screenshotAlt: 'Admin Back-Office Pantry par levels and inventory tracking',
      icon: 'admin_panel_settings',
      workflow: [
        'Menu editor with instant 1-click 86 item availability toggles',
        'Staff directory with role-based access control (Server, Chef, Manager, Owner)',
        'Pantry par shortfall alerts & 1-click automated supplier purchase orders',
        'Kitchen station routing matrix: assign items to primary & backup cook stations',
        'Company legal info, tax rate %, tip presets, and receipt Wi-Fi auto-print',
      ],
      engines: ['@culinaryos/shared (settings engine)', '@culinaryos/db (Supabase RLS)'],
      mcpTools: ['inventory-server (get_pantry_items, create_po)', 'culinaryops-server (update_settings)'],
    },
    {
      id: 'kitchenkit',
      name: 'KitchenKit (Prep & Recipes)',
      sourceRepo: 'Merged from KitchenKit',
      packagePath: 'apps/kitchenkit',
      port: '5175',
      badge: 'Culinary Prep Planner',
      summary: 'Professional culinary preparation planner, station checklists, batch yield projections, and perishable shelf-life tracking.',
      screenshot: '/screenshots/admin_menu_management.png',
      screenshotAlt: 'KitchenKit Recipe formula and batch preparation manager',
      icon: 'menu_book',
      workflow: [
        'Batch requirement forecasting based on expected shift cover volume',
        'Station-by-station prep task checklists with digital countdown timers',
        'Perishable ingredient expiration dates & FIFO shelf-life management',
        'Direct vendor directory with order minimums, contacts, and delivery days',
        'Synchronized with CulinaryOS event bus for automated pantry deduction',
      ],
      engines: ['@culinaryos/prep-engine (batch projection & task scheduling)'],
      mcpTools: ['prep-server (get_prep_tasks, complete_prep_task, calculate_shift_batch)'],
    },
    {
      id: 'ops',
      name: 'CulinaryOps (Diagnostics & Costing)',
      sourceRepo: 'Merged from CulinaryOps',
      packagePath: 'apps/ops',
      port: '5177',
      badge: 'Food Cost & Waste Analytics',
      summary: 'Real-time theoretical vs actual food costing, kitchen waste cost leakage tracking, and shift labor % calculations.',
      screenshot: '/screenshots/admin_waste_analytics.png',
      screenshotAlt: 'CulinaryOps Food cost variance and waste loss analytics',
      icon: 'analytics',
      workflow: [
        'Live food cost % variance tracking against benchmark targets',
        'Kitchen food waste logging categorized by trim, spoilage, overcook, or drop',
        'Top cost-leakage ingredient ranker with estimated annual loss in dollars',
        'Shift labor hours, hourly wage totals, and labor-to-sales ratio metrics',
        'Vendor price fluctuation audits and purchase order cost verification',
      ],
      engines: [
        '@culinaryos/food-cost-engine (cost variance)',
        '@culinaryos/waste-engine (loss rankings)',
        '@culinaryos/labor-engine (wages & labor %)',
      ],
      mcpTools: ['culinaryops-server (get_food_cost, log_waste, get_waste_summary, get_labor_summary)'],
    },
    {
      id: 'recipeos',
      name: 'RecipeOS (Scale & Vault)',
      sourceRepo: 'Merged from RecipeOS',
      packagePath: 'apps/recipeos',
      port: '5178',
      badge: 'Formula Scaling & Conversions',
      summary: 'Next.js App Router recipe vault with baker’s percentage ratio scaling and instant culinary unit conversions.',
      screenshot: '/screenshots/web_storefront_ordering.png',
      screenshotAlt: 'RecipeOS Formula scaling and ratio blueprints',
      icon: 'scale',
      workflow: [
        'Formula-based ingredient scaling (by guest count, batch yield, or key ingredient weight)',
        'Baker’s percentage ratio blueprints for doughs, batters, and culinary emulsions',
        'Imperial to metric mass & volume unit conversion engine (grams, oz, cups, tbsp, ml)',
        'Interactive step-by-step recipe procedures with culinary technique notes',
        'Aggregated prep and supplier shopping lists from active scaling sessions',
      ],
      engines: ['@culinaryos/ratio-engine (scaling formulas & unit conversion)'],
      mcpTools: ['recipe-server (scale_recipe, convert_units, calculate_plate_cost)'],
    },
    {
      id: 'web',
      name: 'Online Storefront & Allergen Hub',
      sourceRepo: 'CulinaryOS Core',
      packagePath: 'apps/web',
      port: '5176',
      badge: 'Customer Ordering',
      summary: 'Direct-to-consumer mobile-first storefront with FDA FASTER Act Top 9 allergen filtering and zero third-party commission.',
      screenshot: '/screenshots/web_store_ordering.png',
      screenshotAlt: 'CulinaryOS Customer Storefront with FDA allergen badges',
      icon: 'shopping_bag',
      workflow: [
        'FDA Top 9 major allergen filtering: Gluten, Dairy, Peanuts, Tree Nuts, Egg, Soy, Fish, Shellfish, Sesame',
        'Vegan & Vegetarian diet badges with cross-contact shared fryer warnings',
        'Customizable modifiers with real-time price and calorie adjustments',
        'Slide-out bag drawer with automated sales tax and tip calculation',
        'Live order status tracker with kitchen preparation milestone progress',
      ],
      engines: ['@culinaryos/shared (FDA allergen matrix & substitution engine)'],
      mcpTools: ['pos-server (submit_online_order, track_order_status)'],
    },
  ];

  const current = surfaces.find((s) => s.id === selectedSurface)!;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1f2937] font-sans antialiased selection:bg-[#0f172a] selection:text-white flex flex-col">
      {/* Universal CulinaryOS Header */}
      <CulinaryHeader activeModule="web" tenantName="CulinaryOS Platform Hub" />

      {/* Sub Header / Quick Navigation Bar */}
      <div className="bg-white border-b border-[#e5e7eb] px-6 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="bg-[#0f172a] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
            Open Source
          </span>
          <span className="text-xs font-bold text-[#0b1c30]">CulinaryOS Platform Overview & Live Demo Hub</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-[#6b7280]">
          <a href="#apps" className="hover:text-[#0b1c30] transition-colors">Merged Apps (7)</a>
          <a href="#demo" className="hover:text-[#0b1c30] transition-colors">Live Interactive Demo</a>
          <a href="#packages" className="hover:text-[#0b1c30] transition-colors">Shared Engines</a>
          <a href="#architecture" className="hover:text-[#0b1c30] transition-colors">Event Spine</a>
          <a href="#mcp" className="hover:text-[#0b1c30] transition-colors">9 MCP AI Servers</a>
          <a href="#pricing" className="hover:text-[#0b1c30] transition-colors">Pricing & Self-Host</a>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            <span>GitHub</span>
          </a>
          <Link
            to="/demo"
            className="px-3.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs"
          >
            <span>Storefront Demo</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-14 max-w-6xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0f172a0d] border border-[#0f172a26] text-[#0f172a] text-xs font-black uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>7 Merged Apps · 14 Shared Packages · 9 MCP AI Servers</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#0b1c30] leading-[1.1]">
          The Open Operating System <br />
          <span className="text-[#0f172a] underline decoration-amber-400 decoration-wavy decoration-2">
            for Modern Food Service
          </span>.
        </h1>

        <p className="max-w-3xl mx-auto text-base sm:text-lg text-[#4b5563] leading-relaxed">
          CulinaryOS is an AI-native, 100% open-source restaurant operating system. It consolidates Point-of-Sale, Kitchen Displays, Prep Scheduling, Food Cost Diagnostics, and Model Context Protocol AI agents into a unified, sovereign monorepo.
        </p>

        {/* 4 Feature Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-2">
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs text-left space-y-1">
            <span className="text-2xl font-black text-[#0f172a]">$0 / Mo</span>
            <h4 className="text-xs font-black text-[#0b1c30] uppercase tracking-wider">Zero Platform Cut</h4>
            <p className="text-[11px] text-[#6b7280]">100% MIT open source forever.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs text-left space-y-1">
            <span className="text-2xl font-black text-[#0f172a]">7 Surfaces</span>
            <h4 className="text-xs font-black text-[#0b1c30] uppercase tracking-wider">All Repos Merged</h4>
            <p className="text-[11px] text-[#6b7280]">KitchenKit, Ops, RecipeOS unified.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs text-left space-y-1">
            <span className="text-2xl font-black text-[#0f172a]">100% Offline</span>
            <h4 className="text-xs font-black text-[#0b1c30] uppercase tracking-wider">Zero Outage Risk</h4>
            <p className="text-[11px] text-[#6b7280]">Local delta sync buffer.</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#e5e7eb] shadow-xs text-left space-y-1">
            <span className="text-2xl font-black text-[#0f172a]">9 MCP Servers</span>
            <h4 className="text-xs font-black text-[#0b1c30] uppercase tracking-wider">Agent-Operable</h4>
            <p className="text-[11px] text-[#6b7280]">Claude & Cursor AI native tools.</p>
          </div>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to="/demo"
            className="px-7 py-3.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            <span>Launch Live Storefront Demo</span>
          </Link>
          <a
            href="#demo"
            className="px-7 py-3.5 rounded-xl bg-white hover:bg-[#f3f4f6] border border-[#e5e7eb] text-[#0b1c30] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">play_circle</span>
            <span>In-Browser Live Simulator</span>
          </a>
        </div>
      </section>

      {/* Merged Apps Showcase: Rich Visual Grid with Category Filters */}
      <section id="apps" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#e5e7eb]">
        <div className="text-center space-y-2 mb-10">
          <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
            Complete Application Ecosystem
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b1c30]">
            7 Integrated Applications. All In One Repository.
          </h2>
          <p className="text-[#6b7280] text-sm max-w-2xl mx-auto">
            Browse all 7 frontends below. Click any card to inspect its workflows, shared calculation engines, and live UI screenshots.
          </p>
        </div>

        {/* 7 Surfaces Visual Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surfaces.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-[#e5e7eb] rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-[#0f172a]"
            >
              {/* Card Screenshot Header */}
              <div
                onClick={() => setModalImage({ src: s.screenshot, title: s.name })}
                className="relative bg-[#f8f9fa] border-b border-[#e5e7eb] p-3 cursor-zoom-in group-hover:bg-[#f1f5f9] transition-colors"
              >
                <div className="flex items-center justify-between pb-2 text-[11px] font-mono text-[#6b7280]">
                  <span className="flex items-center gap-1.5 font-bold text-[#0b1c30]">
                    <span className="material-symbols-outlined text-sm">{s.icon}</span>
                    <span>Port :{s.port}</span>
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#e5e7eb] font-bold text-[#0f172a]">
                    {s.badge}
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden border border-[#e5e7eb] bg-white max-h-[200px] flex items-center justify-center">
                  <img
                    src={s.screenshot}
                    alt={s.screenshotAlt}
                    className="w-full h-auto object-cover max-h-[190px] group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute inset-0 bg-[#0f172a]/0 hover:bg-[#0f172a]/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <span className="bg-[#0f172a] text-white text-[11px] font-bold px-3 py-1 rounded-lg shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">zoom_in</span> Click to Enlarge
                  </span>
                </div>
              </div>

              {/* Card Content Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-[#0b1c30]">{s.name}</h3>
                    <span className="text-[9px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
                      {s.sourceRepo}
                    </span>
                  </div>
                  <p className="text-xs text-[#4b5563] leading-relaxed">{s.summary}</p>

                  {/* Bullet Highlights */}
                  <ul className="space-y-1.5 pt-2 text-xs text-[#374151]">
                    {s.workflow.slice(0, 3).map((w, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                        <span className="material-symbols-outlined text-emerald-600 text-[14px] shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Actions */}
                <div className="pt-4 border-t border-[#e5e7eb] flex items-center gap-2">
                  {s.id === 'web' ? (
                    <Link
                      to="/demo"
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-black text-xs uppercase tracking-wider text-center transition-all shadow-2xs flex items-center justify-center gap-1"
                    >
                      <span>Try Storefront</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </Link>
                  ) : (
                    <a
                      href={`http://localhost:${s.port}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-black text-xs uppercase tracking-wider text-center transition-all shadow-2xs flex items-center justify-center gap-1"
                    >
                      <span>Open Port :{s.port}</span>
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  )}
                  <button
                    onClick={() => setModalImage({ src: s.screenshot, title: s.name })}
                    className="p-2 rounded-xl bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#0b1c30] transition-colors cursor-pointer"
                    title="Enlarge Screenshot"
                  >
                    <span className="material-symbols-outlined text-sm">fullscreen</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dedicated Interactive Live Demo Section */}
      <section id="demo" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#e5e7eb]">
        <div className="text-center space-y-2 mb-10">
          <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
            Interactive Test Drive
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b1c30]">
            Try the CulinaryOS Simulator Live
          </h2>
          <p className="text-[#6b7280] text-sm max-w-2xl mx-auto">
            Test real operational logic right in your browser. Scale batch formulas, bump kitchen tickets, and launch the online ordering demo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Demo 1: Interactive RecipeOS Batch Scaler */}
          <div className="lg:col-span-6 bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0f172a]">scale</span>
                <h3 className="text-base font-black text-[#0b1c30]">RecipeOS Formula Scaler Simulator</h3>
              </div>
              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
                @culinaryos/ratio-engine
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4b5563] font-bold">Target Shift Covers / Servings:</span>
                <strong className="text-[#0f172a] font-mono text-base">{demoCovers} guests</strong>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="2"
                value={demoCovers}
                onChange={(e) => setDemoCovers(Number(e.target.value))}
                className="w-full accent-[#0f172a] bg-[#e5e7eb] rounded-lg cursor-pointer h-2"
              />

              {/* Scaled Ingredients Table */}
              <div className="bg-[#f8f9fa] rounded-2xl border border-[#e5e7eb] p-4 space-y-2 font-mono text-xs">
                <div className="text-[11px] text-[#0f172a] font-bold uppercase pb-1 border-b border-[#e5e7eb] flex justify-between">
                  <span>Recipe: Wood-Fired Neapolitan Pizza Dough</span>
                  <span>Yield: {demoCovers} Pies</span>
                </div>
                <div className="flex justify-between text-[#374151]">
                  <span>00 Caputo Flour (100%)</span>
                  <span className="font-bold text-[#0f172a]">{(demoCovers * 150).toFixed(0)} g</span>
                </div>
                <div className="flex justify-between text-[#374151]">
                  <span>Hydration Water (65%)</span>
                  <span className="font-bold text-[#0f172a]">{(demoCovers * 97.5).toFixed(1)} ml</span>
                </div>
                <div className="flex justify-between text-[#374151]">
                  <span>Fine Sea Salt (3%)</span>
                  <span className="font-bold text-[#0f172a]">{(demoCovers * 4.5).toFixed(1)} g</span>
                </div>
                <div className="flex justify-between text-[#374151]">
                  <span>Fresh Sourdough Starter (15%)</span>
                  <span className="font-bold text-[#0f172a]">{(demoCovers * 22.5).toFixed(1)} g</span>
                </div>
                <div className="pt-2 border-t border-[#e5e7eb] flex justify-between font-bold text-[#0b1c30]">
                  <span>Theoretical Batch Cost:</span>
                  <span className="text-emerald-600">${(demoCovers * 0.82).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Demo 2: Interactive KDS Kitchen Bump Simulator */}
          <div className="lg:col-span-6 bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0f172a]">soup_kitchen</span>
                <h3 className="text-base font-black text-[#0b1c30]">KDS Kitchen Ticket Simulator</h3>
              </div>
              <button
                onClick={handleResetTickets}
                className="text-[10px] font-mono text-[#6b7280] hover:text-[#0f172a] flex items-center gap-1 font-bold cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Reset Tickets</span>
              </button>
            </div>

            <div className="space-y-3">
              {simulatedTickets.length === 0 ? (
                <div className="p-8 text-center bg-[#f8f9fa] rounded-2xl border border-[#e5e7eb] space-y-2">
                  <span className="material-symbols-outlined text-3xl text-emerald-600">check_circle</span>
                  <p className="text-xs text-[#0b1c30] font-bold">Expo Line Clear! All orders bumped.</p>
                  <button
                    onClick={handleResetTickets}
                    className="px-3 py-1.5 bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Simulate New Tickets
                  </button>
                </div>
              ) : (
                simulatedTickets.map((t) => (
                  <div key={t.id} className="p-3.5 bg-[#f8f9fa] rounded-2xl border border-[#e5e7eb] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-[#0b1c30] font-mono font-black">{t.id} · {t.table}</strong>
                        <span className="text-[10px] text-[#6b7280]">({t.server})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${t.time.startsWith('8') ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                        ⏱️ {t.time}
                      </span>
                    </div>
                    <p className="text-[#374151] font-medium">{t.items.join(' · ')}</p>
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-[#6b7280] font-semibold">{t.station} · {t.course}</span>
                      <button
                        onClick={() => handleBumpTicket(t.id)}
                        className="px-3 py-1 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        ✓ Bump Ticket
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Live Storefront Demo Card */}
        <div className="mt-8 p-6 sm:p-8 bg-white border border-[#e5e7eb] rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1.5 text-center sm:text-left">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
              Live Demo Ready
            </span>
            <h3 className="text-xl font-black text-[#0b1c30]">Experience Customer Ordering with FDA Allergen Badges</h3>
            <p className="text-xs text-[#6b7280] max-w-xl">
              Launch our live guest ordering storefront demo for "The Golden Fork" bistro with real-time dietary filtering, cart calculations, and kitchen order status tracking.
            </p>
          </div>
          <Link
            to="/demo"
            className="px-6 py-3 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-black text-xs uppercase tracking-wider transition-all shadow-xs shrink-0 flex items-center gap-2"
          >
            <span>Open Storefront Demo</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* Shared Engines Section */}
      <section id="packages" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#e5e7eb]">
        <div className="text-center space-y-2 mb-10">
          <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
            Modular Monorepo Packages
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b1c30]">
            14 Shared TypeScript Engines
          </h2>
          <p className="text-[#6b7280] text-sm max-w-2xl mx-auto">
            Zero circular dependencies. Every pure calculation and shared data model is published cleanly in <code className="font-mono text-[#0f172a] bg-[#f3f4f6] px-1 py-0.5 rounded">packages/*</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
          <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
            <span className="font-mono text-xs text-[#0f172a] font-bold">@culinaryos/ratio-engine</span>
            <h4 className="text-sm font-black text-[#0b1c30]">Culinary Ratio Scaling</h4>
            <p className="text-xs text-[#6b7280]">Dynamic recipe scaling, baker's percentages, and metric/imperial mass and volume unit conversions.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
            <span className="font-mono text-xs text-[#0f172a] font-bold">@culinaryos/prep-engine</span>
            <h4 className="text-sm font-black text-[#0b1c30]">Prep Task Forecasting</h4>
            <p className="text-xs text-[#6b7280]">Generates morning and shift kitchen prep task checklists based on anticipated cover volume.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
            <span className="font-mono text-xs text-[#0f172a] font-bold">@culinaryos/food-cost-engine</span>
            <h4 className="text-sm font-black text-[#0b1c30]">Theoretical Food Costing</h4>
            <p className="text-xs text-[#6b7280]">Pure functions calculating theoretical ingredient usage against actual sales and price inflation.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
            <span className="font-mono text-xs text-[#0f172a] font-bold">@culinaryos/waste-engine</span>
            <h4 className="text-sm font-black text-[#0b1c30]">Waste Leakage Diagnostics</h4>
            <p className="text-xs text-[#6b7280]">Aggregates spoilage, trim, and drop loss logs to identify top annual cost-leakage ingredients.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
            <span className="font-mono text-xs text-[#0f172a] font-bold">@culinaryos/labor-engine</span>
            <h4 className="text-sm font-black text-[#0b1c30]">Labor & Wage Analytics</h4>
            <p className="text-xs text-[#6b7280]">Shift labor hours, wage summaries, and real-time labor cost percentage calculations.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
            <span className="font-mono text-xs text-[#0f172a] font-bold">@culinaryos/pdf-tools</span>
            <h4 className="text-sm font-black text-[#0b1c30]">Print-Ready PDF Menus</h4>
            <p className="text-xs text-[#6b7280]">High-resolution vector PDF menu exports, table QR codes, and guest receipts via jsPDF.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
            <span className="font-mono text-xs text-[#0f172a] font-bold">@culinaryos/shared</span>
            <h4 className="text-sm font-black text-[#0b1c30]">Settings & FDA Allergen Engine</h4>
            <p className="text-xs text-[#6b7280]">FDA FASTER Act Top 9 allergens, ESC/POS hardware printer driver, and offline delta sync queue.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
            <span className="font-mono text-xs text-[#0f172a] font-bold">@culinaryos/event-bus</span>
            <h4 className="text-sm font-black text-[#0b1c30]">Typed Event Envelope Broker</h4>
            <p className="text-xs text-[#6b7280]">Distributed domain event messaging for pos:order:created, kds:ticket:bumped, and pantry deducts.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#e5e7eb] space-y-2 shadow-xs">
            <span className="font-mono text-xs text-[#0f172a] font-bold">@culinaryos/ui</span>
            <h4 className="text-sm font-black text-[#0b1c30]">Design System & 3D Canvas</h4>
            <p className="text-xs text-[#6b7280]">Universal top navigation header, Three.js 3D spatial floor map canvas, and shadcn/ui components.</p>
          </div>
        </div>
      </section>

      {/* Interactive Architecture Explorer */}
      <section id="architecture" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#e5e7eb]">
        <div className="text-center space-y-2 mb-10">
          <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
            Event-Driven Spine
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b1c30]">
            How CulinaryOS Coordinates in Real-Time
          </h2>
          <p className="text-[#6b7280] text-sm max-w-2xl mx-auto">
            Click on any layer below to inspect the data contracts, event envelopes, and security boundaries.
          </p>
        </div>

        {/* Architecture Layer Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: 'clients', label: '1. Frontend Clients (7 Apps)' },
            { id: 'eventbus', label: '2. @culinaryos/event-bus Spine' },
            { id: 'server', label: '3. Hono API Server (:3000)' },
            { id: 'engines', label: '4. Pure Calculation Engines' },
            { id: 'mcp', label: '5. 9 MCP AI Servers' },
            { id: 'database', label: '6. Supabase PostgreSQL + RLS' },
          ].map((layer) => (
            <button
              key={layer.id}
              onClick={() => setActiveArchLayer(layer.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeArchLayer === layer.id
                  ? 'bg-[#0f172a] text-white shadow-xs'
                  : 'bg-white hover:bg-[#f3f4f6] text-[#4b5563] border border-[#e5e7eb]'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Architecture Detail Cards */}
        <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          {activeArchLayer === 'clients' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#0f172a] font-mono text-sm font-bold">
                <span className="material-symbols-outlined">devices</span>
                <span>Layer 1: Frontend Client Surfaces</span>
              </div>
              <h3 className="text-xl font-black text-[#0b1c30]">7 Isolated Micro-Frontends (Vite + React 18 / Next.js)</h3>
              <p className="text-sm text-[#4b5563] leading-relaxed">
                Each surface is completely decoupled. POS runs on tablets/touchscreens, KDS runs in 140% TV mode, KitchenKit handles morning prep, CulinaryOps audits food waste, RecipeOS scales formulas, Admin handles menu 86ing, and Online Storefront serves customers.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]"><strong>POS Terminal:</strong> :5172</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]"><strong>KDS Display:</strong> :5173</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]"><strong>Admin Portal:</strong> :5174</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]"><strong>KitchenKit:</strong> :5175</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]"><strong>Storefront:</strong> :5176</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]"><strong>CulinaryOps:</strong> :5177</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]"><strong>RecipeOS:</strong> :5178</div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800"><strong>Design System:</strong> @culinaryos/ui</div>
              </div>
            </div>
          )}

          {activeArchLayer === 'eventbus' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#0f172a] font-mono text-sm font-bold">
                <span className="material-symbols-outlined">sync_alt</span>
                <span>Layer 2: Event Envelope Spine (@culinaryos/event-bus)</span>
              </div>
              <h3 className="text-xl font-black text-[#0b1c30]">Closed-Loop Order Lifecycle Events</h3>
              <p className="text-sm text-[#4b5563] leading-relaxed">
                When a server taps "Send to Kitchen" on POS, it fires <code className="font-mono text-[#0f172a] bg-[#f3f4f6] px-1 py-0.5 rounded">PATCH /v1/orders/:id/send</code>, which emits <code className="font-mono text-[#0f172a] bg-[#f3f4f6] px-1 py-0.5 rounded">pos:order:created</code>. This atomically:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-[#374151] bg-[#f8f9fa] p-4 rounded-2xl border border-[#e5e7eb] font-mono">
                <li>Creates filtered kitchen tickets on the Grill, Fry, Cold, and Expo KDS boards.</li>
                <li>Deducts raw recipe ingredients from live pantry inventory (<code className="text-emerald-700">/v1/pantry/deduct</code>).</li>
                <li>Computes plate economics: theoretical food cost vs price and logs potential waste.</li>
                <li>Dispatches raw binary ESC/POS byte stream to station thermal receipt printers.</li>
              </ol>
            </div>
          )}

          {activeArchLayer === 'server' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#0f172a] font-mono text-sm font-bold">
                <span className="material-symbols-outlined">dns</span>
                <span>Layer 3: Unified Hono Server (apps/server on :3000)</span>
              </div>
              <h3 className="text-xl font-black text-[#0b1c30]">Ultra-Fast TypeScript REST API</h3>
              <p className="text-sm text-[#4b5563] leading-relaxed">
                A single lightweight Hono backend running on Node.js / Bun. Serves PIN authentication, order routing, kitchen ticket streaming, pantry par alerts, settings management, and MCP AI endpoints with zero external microservice overhead.
              </p>
            </div>
          )}

          {activeArchLayer === 'engines' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#0f172a] font-mono text-sm font-bold">
                <span className="material-symbols-outlined">functions</span>
                <span>Layer 4: Pure Mathematical & Scaling Engines (packages/*)</span>
              </div>
              <h3 className="text-xl font-black text-[#0b1c30]">Zero-Side-Effect Calculation Packages</h3>
              <p className="text-xs text-[#6b7280]">All calculation engines are decoupled from databases and UI frameworks, enabling fast deterministic unit testing.</p>
            </div>
          )}

          {activeArchLayer === 'mcp' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#0f172a] font-mono text-sm font-bold">
                <span className="material-symbols-outlined">smart_toy</span>
                <span>Layer 5: Model Context Protocol (MCP) AI Server</span>
              </div>
              <h3 className="text-xl font-black text-[#0b1c30]">Unified Master MCP Server</h3>
              <p className="text-sm text-[#4b5563] leading-relaxed">
                Connect Claude Desktop, Cursor, or autonomous agent frameworks directly to live restaurant tools via <code className="font-mono text-[#0f172a] bg-[#f3f4f6] px-1 py-0.5 rounded">pnpm mcp</code>:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs text-[#374151]">
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]">1. Recipe Scaling & Ratios</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]">2. Kitchen Prep & Batching</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]">3. Food Cost & Waste Logs</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]">4. POS Orders & Checks</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]">5. KDS Kitchen Tickets</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]">6. Inventory Par Levels</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]">7. System Settings & Routing</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]">8. Post-Pilot Loyalty Postcards</div>
                <div className="p-2.5 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb]">9. Live Shift Diagnostics</div>
              </div>
            </div>
          )}

          {activeArchLayer === 'database' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#0f172a] font-mono text-sm font-bold">
                <span className="material-symbols-outlined">storage</span>
                <span>Layer 6: Supabase PostgreSQL & Row Level Security (RLS)</span>
              </div>
              <h3 className="text-xl font-black text-[#0b1c30]">Strict Multi-Tenant Isolation & Sovereign Data</h3>
              <p className="text-sm text-[#4b5563] leading-relaxed">
                Every table query is securely scoped by <code className="font-mono text-[#0f172a] bg-[#f3f4f6] px-1 py-0.5 rounded">tenant_id</code> via PostgreSQL Row Level Security. Data never bleeds between restaurant locations. Operators retain 100% data sovereignty.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* AI & MCP Agent Layer Section */}
      <section id="mcp" className="py-16 px-6 max-w-7xl mx-auto border-t border-[#e5e7eb]">
        <div className="text-center space-y-2 mb-10">
          <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
            AI-Native Operations
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b1c30]">
            Unified Master MCP AI Server
          </h2>
          <p className="text-[#6b7280] text-sm max-w-2xl mx-auto">
            Connect Claude Desktop, Cursor, or autonomous AI agents directly to your live restaurant state with 1 single command.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-[#e5e7eb] space-y-3 font-mono text-xs shadow-xs">
            <span className="text-[#0f172a] font-bold uppercase block font-sans">⚡ 1-Command Startup</span>
            <p className="text-[#4b5563] font-sans text-xs">Start the all-in-one MCP server on stdio from the monorepo root:</p>
            <div className="bg-[#0f172a] p-3 rounded-xl text-emerald-400 font-mono">
              $ pnpm mcp
            </div>
            <p className="text-[#6b7280] text-[11px] font-sans">Automatically loads all 40+ operational tools for RecipeOS, KitchenKit, CulinaryOps, POS, and KDS.</p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#e5e7eb] space-y-3 font-mono text-xs shadow-xs">
            <span className="text-[#0f172a] font-bold uppercase block font-sans">🤖 Claude Desktop Integration</span>
            <p className="text-[#4b5563] font-sans text-xs">Add to your claude_desktop_config.json:</p>
            <pre className="bg-[#0f172a] p-3 rounded-xl text-slate-200 overflow-x-auto text-[11px]">
{`{
  "mcpServers": {
    "culinaryos": {
      "command": "node",
      "args": ["dist/src/unified-server.js"],
      "env": { "CULINARY_API_URL": "http://localhost:3000" }
    }
  }
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Transparent Pricing & Comparison */}
      <section id="pricing" className="py-16 px-6 max-w-6xl mx-auto border-t border-[#e5e7eb]">
        <div className="text-center space-y-2 mb-10">
          <span className="text-[#0f172a] text-xs font-black uppercase tracking-widest bg-[#0f172a0d] px-3 py-1 rounded-full border border-[#0f172a26]">
            Zero Vendor Lock-In
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0b1c30]">
            Transparent Pricing. No Hidden Fees.
          </h2>
          <p className="text-[#6b7280] text-sm max-w-2xl mx-auto">
            Traditional restaurant POS vendors lock you into costly hardware leases and extract 2–3% of every transaction. CulinaryOS is 100% open source.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Free Self-Hosted */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e5e7eb] space-y-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-3">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider border border-emerald-200">
                Community / Self-Hosted
              </span>
              <div className="space-y-0.5">
                <span className="text-3xl font-black text-[#0b1c30]">$0</span>
                <span className="text-xs text-[#6b7280] block">Free forever under MIT license</span>
              </div>
              <ul className="space-y-2 text-xs text-[#374151] pt-1">
                <li className="flex items-center gap-2">✓ All 7 applications included</li>
                <li className="flex items-center gap-2">✓ Unlimited POS & KDS terminals</li>
                <li className="flex items-center gap-2">✓ 100% offline local mode</li>
                <li className="flex items-center gap-2">✓ Self-host on Docker / Mac / Linux</li>
                <li className="flex items-center gap-2">✓ 0% platform revenue cut</li>
              </ul>
            </div>
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 text-center rounded-xl bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#0b1c30] font-black text-xs uppercase tracking-wider transition-all"
            >
              Clone on GitHub
            </a>
          </div>

          {/* Managed Cloud */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0f172a] text-white space-y-5 flex flex-col justify-between shadow-md">
            <div className="space-y-3">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider">
                Managed Cloud Deploy
              </span>
              <div className="space-y-0.5">
                <span className="text-3xl font-black text-white">$0</span>
                <span className="text-xs text-slate-300 block">Deploy to Vercel / Render / Supabase</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-200 pt-1">
                <li className="flex items-center gap-2">✓ 1-click Vercel / Render Blueprint</li>
                <li className="flex items-center gap-2">✓ Managed Supabase PostgreSQL with RLS</li>
                <li className="flex items-center gap-2">✓ Real-time cross-device sync</li>
                <li className="flex items-center gap-2">✓ Free SSL & Custom Domains</li>
                <li className="flex items-center gap-2">✓ 0% platform take-rate</li>
              </ul>
            </div>
            <Link
              to="/demo"
              className="w-full py-2.5 text-center rounded-xl bg-white text-[#0f172a] hover:bg-slate-100 font-black text-xs uppercase tracking-wider transition-all shadow-xs"
            >
              Test Live Storefront
            </Link>
          </div>

          {/* Legacy Comparison */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e5e7eb] space-y-5 opacity-75 flex flex-col justify-between shadow-xs">
            <div className="space-y-3">
              <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-black uppercase tracking-wider border border-red-200">
                Legacy Proprietary POS
              </span>
              <div className="space-y-0.5">
                <span className="text-3xl font-bold text-[#6b7280]">$150–$400+</span>
                <span className="text-xs text-[#9ca3af] block">per month + per terminal fees</span>
              </div>
              <ul className="space-y-2 text-xs text-[#6b7280] pt-1">
                <li className="flex items-center gap-2">✗ Closed-source vendor lock-in</li>
                <li className="flex items-center gap-2">✗ Expensive hardware leases</li>
                <li className="flex items-center gap-2">✗ 1%–3% added transaction cuts</li>
                <li className="flex items-center gap-2">✗ Total crash during internet outages</li>
                <li className="flex items-center gap-2">✗ Proprietary database access</li>
              </ul>
            </div>
            <span className="w-full py-2.5 text-center rounded-xl bg-[#f3f4f6] text-[#9ca3af] font-bold text-xs uppercase">
              Avoid Vendor Lock-In
            </span>
          </div>
        </div>
      </section>

      {/* Image Modal Preview */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="max-w-5xl w-full bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between text-xs text-[#0b1c30] border-b border-[#e5e7eb] pb-2 font-bold">
              <span>{modalImage.title} (Live UI Screenshot)</span>
              <span className="text-[#6b7280] font-normal">Click anywhere to close</span>
            </div>
            <img
              src={modalImage.src}
              alt={modalImage.title}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[#e5e7eb] py-10 px-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#0f172a] text-white rounded-lg flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-base">skillet</span>
            </div>
            <span className="font-black text-sm text-[#0b1c30] tracking-wider uppercase">CulinaryOS</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#6b7280] font-semibold">
            <a href="https://github.com/ShadowWalkerNC/CulinaryOS" className="hover:text-[#0b1c30]">GitHub Repository</a>
            <Link to="/demo" className="hover:text-[#0b1c30]">Live Storefront Demo</Link>
            <a href="https://github.com/ShadowWalkerNC/CulinaryOS/blob/main/docs/SETTINGS.md" className="hover:text-[#0b1c30]">Settings Guide</a>
            <a href="https://github.com/ShadowWalkerNC/CulinaryOS/blob/main/LICENSE" className="hover:text-[#0b1c30]">MIT License</a>
          </div>
        </div>

        <div className="text-center sm:text-left text-xs text-[#9ca3af] pt-4 border-t border-[#e5e7eb] flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 CulinaryOS Contributors. Free and open-source under the MIT License.</p>
          <p className="font-mono text-[11px]">release: v0.3.0 · build: dc931a9</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
