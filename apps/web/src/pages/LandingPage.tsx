import { useState } from 'react';
import { Link } from 'react-router-dom';

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
}

export function LandingPage() {
  const [selectedSurface, setSelectedSurface] = useState<string>('pos');
  const [activeArchLayer, setActiveArchLayer] = useState<'clients' | 'eventbus' | 'server' | 'database' | 'mcp' | 'engines'>('clients');
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);

  // Interactive Live Demo Playground State
  const [demoCovers, setDemoCovers] = useState<number>(12);
  const [demoStation, setDemoStation] = useState<'all' | 'grill' | 'fry' | 'cold' | 'pizza' | 'bar'>('all');
  const [simulatedTickets, setSimulatedTickets] = useState([
    { id: 'T-101', table: 'Table 4', server: 'John D.', items: ['2x Prime Burger (Med-Rare)', '1x Truffle Fries'], station: 'grill', course: 'Course 1 (Starters)', time: '3:45', status: 'cooking' },
    { id: 'T-102', table: 'Table 7', server: 'Jane S.', items: ['1x Wood-Fired Margherita', '1x Burrata Salad'], station: 'pizza', course: 'Course 1 (Starters)', time: '8:20', status: 'held' },
    { id: 'T-103', table: 'Bar 2', server: 'Alex M.', items: ['2x Smoked Old Fashioned', '1x Draft IPA'], station: 'bar', course: 'Immediate (Drinks)', time: '1:10', status: 'ready' },
  ]);

  const handleBumpTicket = (id: string) => {
    setSimulatedTickets((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetTickets = () => {
    setSimulatedTickets([
      { id: 'T-101', table: 'Table 4', server: 'John D.', items: ['2x Prime Burger (Med-Rare)', '1x Truffle Fries'], station: 'grill', course: 'Course 1 (Starters)', time: '3:45', status: 'cooking' },
      { id: 'T-102', table: 'Table 7', server: 'Jane S.', items: ['1x Wood-Fired Margherita', '1x Burrata Salad'], station: 'pizza', course: 'Course 1 (Starters)', time: '8:20', status: 'held' },
      { id: 'T-103', table: 'Bar 2', server: 'Alex M.', items: ['2x Smoked Old Fashioned', '1x Draft IPA'], station: 'bar', course: 'Immediate (Drinks)', time: '1:10', status: 'ready' },
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
    <div className="min-h-screen bg-[#07090e] text-[#f1f5f9] font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#07090e]/95 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="material-symbols-outlined text-black font-black text-2xl">skillet</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider uppercase bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CulinaryOS
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                v0.3 · MIT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">The Open-Source Restaurant Operating System</p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-300">
          <a href="#apps" className="hover:text-amber-400 transition-colors">Merged Apps (7)</a>
          <a href="#demo" className="hover:text-amber-400 transition-colors">Live Interactive Demo</a>
          <a href="#packages" className="hover:text-amber-400 transition-colors">Shared Engines</a>
          <a href="#architecture" className="hover:text-amber-400 transition-colors">Event Spine</a>
          <a href="#mcp" className="hover:text-amber-400 transition-colors">9 MCP AI Servers</a>
          <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing & Self-Host</a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-all flex items-center gap-2 text-slate-200"
          >
            <span className="material-symbols-outlined text-base">code</span>
            <span>GitHub</span>
          </a>
          <Link
            to="/demo"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
          >
            <span>Live Demo Storefront</span>
            <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 max-w-6xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Complete Monorepo Consolidation · 7 Apps + 14 Packages + 9 MCPs</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-white">
          The <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">Linux of Restaurant Tech</span>.
        </h1>

        <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 font-normal leading-relaxed">
          Not another closed-source SaaS with 3% revenue cuts. CulinaryOS is a sovereign, protocol-driven restaurant operating system uniting Point-of-Sale, Kitchen Displays, Prep Scheduling, Food Cost Diagnostics, and Model Context Protocol AI agents.
        </p>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-2">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-1">
            <span className="text-2xl font-black text-amber-400">$0 / Mo</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero Platform Cut</h4>
            <p className="text-[11px] text-slate-400">100% MIT open-source forever.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-1">
            <span className="text-2xl font-black text-amber-400">7 Surfaces</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">All Repos Merged</h4>
            <p className="text-[11px] text-slate-400">KitchenKit, Ops, RecipeOS unified.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-1">
            <span className="text-2xl font-black text-amber-400">100% Offline</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero Cloud Outage</h4>
            <p className="text-[11px] text-slate-400">Local SQLite/localStorage buffer.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-1">
            <span className="text-2xl font-black text-amber-400">9 MCP Servers</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Agent-Operable</h4>
            <p className="text-[11px] text-slate-400">Claude & Cursor AI native tools.</p>
          </div>
        </div>

        {/* Hero Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link
            to="/demo"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined font-black">shopping_cart</span>
            <span>Launch Live Storefront Demo</span>
          </Link>
          <a
            href="#demo"
            className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">play_circle</span>
            <span>Test In-Browser Interactive Demo</span>
          </a>
        </div>
      </section>

      {/* Merged Apps Showcase with Real Screenshots */}
      <section id="apps" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-12">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            Merged Monorepo Applications
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            7 Complete Surfaces. Real Live Workflows.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            All satellite repositories (KitchenKit, CulinaryOps, RecipeOS, Post-Pilot, Plated) are unified into <code className="text-amber-400 font-mono">apps/*</code> and <code className="text-amber-400 font-mono">packages/*</code>.
          </p>
        </div>

        {/* Application Navigation Selector */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8">
          {surfaces.map((s) => {
            const isSelected = selectedSurface === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSurface(s.id)}
                className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-[1.03]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                <span>{s.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-400'}`}>
                  :{s.port}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Application Detail Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/15 rounded-3xl p-6 sm:p-10 backdrop-blur-xl">
          {/* Left Column: Metadata & Features */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  {current.badge}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                  {current.sourceRepo}
                </span>
                <span className="text-xs font-mono text-slate-400">{current.packagePath} (Port :{current.port})</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white">{current.name}</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-medium">{current.summary}</p>

              {/* Workflow Checklist */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
                  Core Live Workflows:
                </span>
                <ul className="space-y-2">
                  {current.workflow.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shared Packages & MCP Tools */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-[11px] text-slate-400">
                  <strong className="text-white">Engines:</strong> {current.engines.join(', ')}
                </div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-amber-400">AI MCP:</strong> {current.mcpTools.join(', ')}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-3">
              {current.id === 'web' ? (
                <Link
                  to="/demo"
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>Launch Live Customer Storefront</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              ) : (
                <a
                  href={`http://localhost:${current.port}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>Launch on Local Port :{current.port}</span>
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              )}
            </div>
          </div>

          {/* Right Column: Real Visual Screenshot with Zoom */}
          <div className="lg:col-span-7 flex flex-col justify-center items-center bg-[#0a0e1a] rounded-2xl border border-white/10 p-4 relative group">
            <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Live UI Screenshot: {current.name}
              </span>
              <button
                onClick={() => setModalImage({ src: current.screenshot, title: current.name })}
                className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">zoom_in</span>
                <span>Enlarge</span>
              </button>
            </div>

            <div
              onClick={() => setModalImage({ src: current.screenshot, title: current.name })}
              className="w-full mt-3 rounded-xl overflow-hidden cursor-zoom-in border border-white/10 hover:border-amber-500/50 transition-all shadow-xl bg-slate-900 flex items-center justify-center"
            >
              <img
                src={current.screenshot}
                alt={current.screenshotAlt}
                className="w-full h-auto object-contain max-h-[460px] group-hover:scale-[1.01] transition-transform duration-200"
              />
            </div>
            <p className="text-[11px] text-slate-400 italic pt-2">{current.screenshotAlt}</p>
          </div>
        </div>
      </section>

      {/* Dedicated Interactive Live Demo Section */}
      <section id="demo" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            Interactive Test Drive
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Try the CulinaryOS Simulator Live
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Test real operational logic right in your browser. Scale batch formulas, bump kitchen tickets, and launch the online ordering demo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Demo 1: Interactive RecipeOS Batch Scaler */}
          <div className="lg:col-span-6 bg-[#0b101d] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">scale</span>
                <h3 className="text-lg font-black text-white">RecipeOS Formula Scaler Simulator</h3>
              </div>
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                @culinaryos/ratio-engine
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Target Shift Covers / Servings:</span>
                <strong className="text-amber-400 font-mono text-base">{demoCovers} guests</strong>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="2"
                value={demoCovers}
                onChange={(e) => setDemoCovers(Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer"
              />

              {/* Scaled Ingredients Table */}
              <div className="bg-black/40 rounded-2xl border border-white/10 p-4 space-y-2 font-mono text-xs">
                <div className="text-[11px] text-amber-400 font-bold uppercase pb-1 border-b border-white/10 flex justify-between">
                  <span>Recipe: Wood-Fired Neapolitan Pizza Dough</span>
                  <span>Yield: {demoCovers} Pies</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>00 Caputo Flour (100%)</span>
                  <span className="text-amber-300">{(demoCovers * 150).toFixed(0)} g</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Hydration Water (65%)</span>
                  <span className="text-amber-300">{(demoCovers * 97.5).toFixed(1)} ml</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Fine Sea Salt (3%)</span>
                  <span className="text-amber-300">{(demoCovers * 4.5).toFixed(1)} g</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Fresh Sourdough Starter (15%)</span>
                  <span className="text-amber-300">{(demoCovers * 22.5).toFixed(1)} g</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white">
                  <span>Theoretical Batch Ingredient Cost:</span>
                  <span className="text-emerald-400">${(demoCovers * 0.82).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Demo 2: Interactive KDS Kitchen Bump Simulator */}
          <div className="lg:col-span-6 bg-[#0b101d] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">soup_kitchen</span>
                <h3 className="text-lg font-black text-white">KDS Kitchen Ticket Simulator</h3>
              </div>
              <button
                onClick={handleResetTickets}
                className="text-[10px] font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Reset Tickets</span>
              </button>
            </div>

            <div className="space-y-3">
              {simulatedTickets.length === 0 ? (
                <div className="p-8 text-center bg-black/40 rounded-2xl border border-white/10 space-y-2">
                  <span className="material-symbols-outlined text-3xl text-emerald-400">check_circle</span>
                  <p className="text-xs text-white font-bold">Expo Line Clear! All orders bumped.</p>
                  <button
                    onClick={handleResetTickets}
                    className="px-3 py-1.5 bg-amber-500 text-black text-xs font-bold rounded-lg"
                  >
                    Simulate New Tickets
                  </button>
                </div>
              ) : (
                simulatedTickets.map((t) => (
                  <div key={t.id} className="p-3.5 bg-black/40 rounded-2xl border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-amber-400 font-mono">{t.id} · {t.table}</strong>
                        <span className="text-[10px] text-slate-400">({t.server})</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${t.time.startsWith('8') ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse' : 'bg-emerald-500/20 text-emerald-300'}`}>
                        ⏱️ {t.time}
                      </span>
                    </div>
                    <p className="text-slate-300 font-medium">{t.items.join(' · ')}</p>
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-400">{t.course}</span>
                      <button
                        onClick={() => handleBumpTicket(t.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-300 border border-emerald-500/30 font-bold transition-all"
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
        <div className="mt-8 p-8 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border-2 border-amber-500/40 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
              Live Demo Ready
            </span>
            <h3 className="text-2xl font-black text-white">Experience Customer Ordering with FDA Allergen Badges</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Launch our live guest ordering storefront demo for "The Golden Fork" bistro with real-time dietary filtering, cart calculations, and kitchen order status tracking.
            </p>
          </div>
          <Link
            to="/demo"
            className="px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 shrink-0 flex items-center gap-2"
          >
            <span>Open Storefront Demo</span>
            <span className="material-symbols-outlined text-base font-black">arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* Shared Engines Section */}
      <section id="packages" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            Modular Monorepo Packages
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            14 Shared TypeScript Engines
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Zero circular dependencies. Every pure calculation and shared data model is published cleanly in <code className="font-mono text-amber-400">packages/*</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="font-mono text-xs text-amber-400 font-bold">@culinaryos/ratio-engine</span>
            <h4 className="text-base font-black text-white">Culinary Ratio Scaling</h4>
            <p className="text-xs text-slate-400">Dynamic recipe scaling, baker's percentages, and metric/imperial mass and volume unit conversions.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="font-mono text-xs text-amber-400 font-bold">@culinaryos/prep-engine</span>
            <h4 className="text-base font-black text-white">Prep Task Forecasting</h4>
            <p className="text-xs text-slate-400">Generates morning and shift kitchen prep task checklists based on anticipated cover volume.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="font-mono text-xs text-amber-400 font-bold">@culinaryos/food-cost-engine</span>
            <h4 className="text-base font-black text-white">Theoretical Food Costing</h4>
            <p className="text-xs text-slate-400">Pure functions calculating theoretical ingredient usage against actual sales and price inflation.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="font-mono text-xs text-amber-400 font-bold">@culinaryos/waste-engine</span>
            <h4 className="text-base font-black text-white">Waste Leakage Diagnostics</h4>
            <p className="text-xs text-slate-400">Aggregates spoilage, trim, and drop loss logs to identify top annual cost-leakage ingredients.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="font-mono text-xs text-amber-400 font-bold">@culinaryos/labor-engine</span>
            <h4 className="text-base font-black text-white">Labor & Wage Analytics</h4>
            <p className="text-xs text-slate-400">Shift labor hours, wage summaries, and real-time labor cost percentage calculations.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="font-mono text-xs text-amber-400 font-bold">@culinaryos/pdf-tools</span>
            <h4 className="text-base font-black text-white">Print-Ready PDF Menus</h4>
            <p className="text-xs text-slate-400">High-resolution vector PDF menu exports, table QR codes, and guest receipts via jsPDF.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="font-mono text-xs text-amber-400 font-bold">@culinaryos/shared</span>
            <h4 className="text-base font-black text-white">Settings & FDA Allergen Engine</h4>
            <p className="text-xs text-slate-400">FDA FASTER Act Top 9 allergens, ESC/POS hardware printer driver, and offline delta sync queue.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="font-mono text-xs text-amber-400 font-bold">@culinaryos/event-bus</span>
            <h4 className="text-base font-black text-white">Typed Event Envelope Broker</h4>
            <p className="text-xs text-slate-400">Distributed domain event messaging for pos:order:created, kds:ticket:bumped, and pantry deducts.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="font-mono text-xs text-amber-400 font-bold">@culinaryos/ui</span>
            <h4 className="text-base font-black text-white">Design System & 3D Canvas</h4>
            <p className="text-xs text-slate-400">Universal top navigation header, Three.js 3D spatial floor map canvas, and shadcn/ui components.</p>
          </div>
        </div>
      </section>

      {/* Interactive Architecture Explorer */}
      <section id="architecture" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            Event-Driven Spine
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            How CulinaryOS Coordinates in Real-Time
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Click on any layer below to inspect the data contracts, event envelopes, and security boundaries.
          </p>
        </div>

        {/* Architecture Layer Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
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
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeArchLayer === layer.id
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Architecture Detail Cards */}
        <div className="bg-[#0b101d] border border-white/15 rounded-3xl p-8 sm:p-12 space-y-6">
          {activeArchLayer === 'clients' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold">
                <span className="material-symbols-outlined">devices</span>
                <span>Layer 1: Frontend Client Surfaces</span>
              </div>
              <h3 className="text-2xl font-black text-white">7 Isolated Micro-Frontends (Vite + React 18 / Next.js)</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Each surface is completely decoupled. POS runs on tablets/touchscreens, KDS runs in 140% TV mode, KitchenKit handles morning prep, CulinaryOps audits food waste, RecipeOS scales formulas, Admin handles menu 86ing, and Online Storefront serves customers.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10"><strong>POS Terminal:</strong> :5172</div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10"><strong>KDS Display:</strong> :5173</div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10"><strong>Admin Portal:</strong> :5174</div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10"><strong>KitchenKit:</strong> :5175</div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10"><strong>Storefront:</strong> :5176</div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10"><strong>CulinaryOps:</strong> :5177</div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10"><strong>RecipeOS:</strong> :5178</div>
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-300"><strong>Design System:</strong> @culinaryos/ui</div>
              </div>
            </div>
          )}

          {activeArchLayer === 'eventbus' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold">
                <span className="material-symbols-outlined">sync_alt</span>
                <span>Layer 2: Event Envelope Spine (@culinaryos/event-bus)</span>
              </div>
              <h3 className="text-2xl font-black text-white">Closed-Loop Order Lifecycle Events</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                When a server taps "Send to Kitchen" on POS, it fires <code className="font-mono text-amber-300">PATCH /v1/orders/:id/send</code>, which emits <code className="font-mono text-amber-300">pos:order:created</code>. This atomically:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 bg-black/40 p-4 rounded-2xl border border-white/10 font-mono">
                <li>Creates filtered kitchen tickets on the Grill, Fry, Cold, and Expo KDS boards.</li>
                <li>Deducts raw recipe ingredients from live pantry inventory (<code className="text-emerald-400">/v1/pantry/deduct</code>).</li>
                <li>Computes plate economics: theoretical food cost vs price and logs potential waste.</li>
                <li>Dispatches raw binary ESC/POS byte stream to station thermal receipt printers.</li>
              </ol>
            </div>
          )}

          {activeArchLayer === 'server' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold">
                <span className="material-symbols-outlined">dns</span>
                <span>Layer 3: Unified Hono Server (apps/server on :3000)</span>
              </div>
              <h3 className="text-2xl font-black text-white">Ultra-Fast TypeScript REST API</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                A single lightweight Hono backend running on Node.js / Bun. Serves PIN authentication, order routing, kitchen ticket streaming, pantry par alerts, settings management, and MCP AI endpoints with zero external microservice overhead.
              </p>
            </div>
          )}

          {activeArchLayer === 'engines' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold">
                <span className="material-symbols-outlined">functions</span>
                <span>Layer 4: Pure Mathematical & Scaling Engines (packages/*)</span>
              </div>
              <h3 className="text-2xl font-black text-white">Zero-Side-Effect Calculation Packages</h3>
              <p className="text-xs text-slate-400">All calculation engines are decoupled from databases and UI frameworks, enabling fast deterministic unit testing.</p>
            </div>
          )}

          {activeArchLayer === 'mcp' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold">
                <span className="material-symbols-outlined">smart_toy</span>
                <span>Layer 5: Model Context Protocol (MCP) AI Server</span>
              </div>
              <h3 className="text-2xl font-black text-white">Unified Master MCP Server</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Connect Claude Desktop, Cursor, or autonomous agent frameworks directly to live restaurant tools via <code className="font-mono text-amber-300">pnpm mcp</code>:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs text-slate-300">
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">1. Recipe Scaling & Ratios</div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">2. Kitchen Prep & Batching</div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">3. Food Cost & Waste Logs</div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">4. POS Orders & Checks</div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">5. KDS Kitchen Tickets</div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">6. Inventory Par Levels</div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">7. System Settings & Routing</div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">8. Post-Pilot Loyalty Postcards</div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/10">9. Live Shift Diagnostics</div>
              </div>
            </div>
          )}

          {activeArchLayer === 'database' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold">
                <span className="material-symbols-outlined">storage</span>
                <span>Layer 6: Supabase PostgreSQL & Row Level Security (RLS)</span>
              </div>
              <h3 className="text-2xl font-black text-white">Strict Multi-Tenant Isolation & Sovereign Data</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Every table query is securely scoped by <code className="font-mono text-amber-300">tenant_id</code> via PostgreSQL Row Level Security. Data never bleeds between restaurant locations. Operators retain 100% data sovereignty.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* AI & MCP Agent Layer Section */}
      <section id="mcp" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            AI-Native Operations
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Unified Master MCP AI Server
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Connect Claude Desktop, Cursor, or autonomous AI agents directly to your live restaurant state with 1 single command.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4 font-mono text-xs">
            <span className="text-amber-400 font-bold uppercase block">⚡ 1-Command Startup</span>
            <p className="text-slate-300 font-sans text-xs">Start the all-in-one MCP server on stdio from the monorepo root:</p>
            <div className="bg-black/60 p-4 rounded-xl border border-white/10 text-emerald-400">
              $ pnpm mcp
            </div>
            <p className="text-slate-400 text-[11px] font-sans">Automatically loads all 40+ operational tools for RecipeOS, KitchenKit, CulinaryOps, POS, and KDS.</p>
          </div>

          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4 font-mono text-xs">
            <span className="text-amber-400 font-bold uppercase block">🤖 Claude Desktop Integration</span>
            <p className="text-slate-300 font-sans text-xs">Add to your claude_desktop_config.json:</p>
            <pre className="bg-black/60 p-4 rounded-xl border border-white/10 text-slate-300 overflow-x-auto text-[11px]">
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
      <section id="pricing" className="py-24 px-6 max-w-6xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            Zero Vendor Lock-In
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Transparent Pricing. No Hidden Fees.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Traditional restaurant POS vendors lock you into costly hardware leases and extract 2–3% of every transaction. CulinaryOS is 100% open source.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Free Self-Hosted */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider">
                Community / Self-Hosted
              </span>
              <div className="space-y-1">
                <span className="text-3xl font-black text-white">$0</span>
                <span className="text-xs text-slate-400 block">Free forever under MIT license</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-2">
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
              className="w-full py-3 text-center rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider transition-all"
            >
              Clone on GitHub
            </a>
          </div>

          {/* Managed Cloud */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-500/20 to-transparent border-2 border-amber-500/50 space-y-6 flex flex-col justify-between shadow-xl shadow-amber-500/10">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider">
                Managed Cloud Deploy
              </span>
              <div className="space-y-1">
                <span className="text-3xl font-black text-white">$0</span>
                <span className="text-xs text-slate-400 block">Deploy to Vercel / Render / Supabase</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-200 pt-2">
                <li className="flex items-center gap-2">✓ 1-click Vercel / Render Blueprint</li>
                <li className="flex items-center gap-2">✓ Managed Supabase PostgreSQL with RLS</li>
                <li className="flex items-center gap-2">✓ Real-time cross-device sync</li>
                <li className="flex items-center gap-2">✓ Free SSL & Custom Domains</li>
                <li className="flex items-center gap-2">✓ 0% platform take-rate</li>
              </ul>
            </div>
            <Link
              to="/demo"
              className="w-full py-3 text-center rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md"
            >
              Test Live Storefront
            </Link>
          </div>

          {/* Legacy Comparison */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6 opacity-75 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-black uppercase tracking-wider">
                Legacy Proprietary POS
              </span>
              <div className="space-y-1">
                <span className="text-3xl font-bold text-slate-400">$150–$400+</span>
                <span className="text-xs text-slate-400 block">per month + per terminal fees</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400 pt-2">
                <li className="flex items-center gap-2">✗ Closed-source vendor lock-in</li>
                <li className="flex items-center gap-2">✗ Expensive hardware leases</li>
                <li className="flex items-center gap-2">✗ 1%–3% added transaction cuts</li>
                <li className="flex items-center gap-2">✗ Total crash during internet outages</li>
                <li className="flex items-center gap-2">✗ Proprietary database access</li>
              </ul>
            </div>
            <span className="w-full py-3 text-center rounded-xl bg-white/5 text-slate-500 font-bold text-xs uppercase">
              Avoid Vendor Lock-In
            </span>
          </div>
        </div>
      </section>

      {/* Image Modal Preview */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="max-w-5xl w-full bg-[#0a0e1a] border border-white/20 rounded-2xl overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 border-b border-white/10 pb-2">
              <strong className="text-amber-400 font-bold">{modalImage.title} (Live Screenshot)</strong>
              <span>Click anywhere to close (ESC)</span>
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
      <footer className="border-t border-white/10 py-16 px-6 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black font-black">
              <span className="material-symbols-outlined text-lg">skillet</span>
            </div>
            <span className="font-black text-lg text-white tracking-wider">CulinaryOS</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400 font-semibold">
            <a href="https://github.com/ShadowWalkerNC/CulinaryOS" className="hover:text-amber-400">GitHub Repository</a>
            <Link to="/demo" className="hover:text-amber-400">Customer Storefront Demo</Link>
            <a href="https://github.com/ShadowWalkerNC/CulinaryOS/blob/main/docs/SETTINGS.md" className="hover:text-amber-400">Settings Guide</a>
            <a href="https://github.com/ShadowWalkerNC/CulinaryOS/blob/main/LICENSE" className="hover:text-amber-400">MIT License</a>
          </div>
        </div>

        <div className="text-center sm:text-left text-xs text-slate-500 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 CulinaryOS Contributors. Complete modular restaurant operating system under the MIT License.</p>
          <p className="font-mono text-[11px]">release: v0.3.0 · build: dc931a9</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
