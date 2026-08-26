import { useState } from 'react';
import { Link } from 'react-router-dom';

interface ProductSuiteItem {
  id: 'pos' | 'kds' | 'admin' | 'kitchenkit' | 'ops' | 'recipeos' | 'storefront';
  title: string;
  category: string;
  badge: string;
  headline: string;
  description: string;
  highlights: string[];
  icon: string;
}

export function LandingPage() {
  const [activeTab, setActiveTab] = useState<'pos' | 'kds' | 'admin' | 'kitchenkit' | 'ops' | 'recipeos' | 'storefront'>('pos');

  const products: ProductSuiteItem[] = [
    {
      id: 'pos',
      title: 'POS Terminal',
      category: 'Front of House & Table Service',
      badge: 'Point of Sale',
      headline: 'Lightning-fast order entry with 2D/3D floor planning and ESC/POS hardware hub.',
      description: 'Ergonomic touch terminal engineered for tablets, counter stations, and mobile handhelds. Features custom booth and table floor editing, multi-seat ordering, course holds, and universal thermal receipt printing.',
      highlights: [
        'Interactive 3D table floor map editor (drag, resize, and custom room themes)',
        'Multi-seat guest ordering with FDA Top 9 allergen cross-contact alerts',
        'Universal ESC/POS hardware printer hub (WebUSB, Bluetooth, Serial, Network IP)',
        'Cash drawer pulse, 80mm/58mm tape width, and offline delta sync queue',
        'Built-in quick PIN login (1234 Server, 5678 Manager)',
      ],
      icon: 'point_of_sale',
    },
    {
      id: 'kds',
      title: 'Kitchen Display (KDS)',
      category: 'Back of House & Expediter',
      badge: 'Kitchen Display',
      headline: 'Zero-latency kitchen tickets with 1-second aging timers and 140% TV wall mode.',
      description: 'Replaces noisy kitchen printers with clear digital tickets. Aggregates multi-course meals, provides automated hold-and-fire timers, and features station filtering for hot line, cold line, bar, and expo.',
      highlights: [
        'Dedicated station routing: Expo Pass, Hot Grill, Fryer, Cold Prep, Pizza, Bar, Pastry',
        'Course hold & fire automation with delay timers for appetizers vs mains',
        'Color-coded ticket aging alerts (<5m green, 5-10m amber, >10m flashing red)',
        'High-contrast OLED dark mode for hot/steamy kitchen environments',
        'Audible arrival chimes and one-tap bump bar gestures',
      ],
      icon: 'soup_kitchen',
    },
    {
      id: 'admin',
      title: 'Back-Office Admin',
      category: 'Management & System Settings',
      badge: 'Management & Routing',
      headline: 'Centralized control of menu catalogs, staff PINs, auto-POs, and station routing.',
      description: 'The administrative command center for restaurant operators. Manage recipes, adjust par stock thresholds, toggle 86 item availability in 1 click, configure kitchen routing rules, and audit shift labor.',
      highlights: [
        'Menu editor with instant 1-click 86 item availability toggles',
        'Staff directory with role-based access control (Server, Chef, Manager, Owner)',
        'Pantry par shortfall alerts & 1-click automated supplier purchase orders',
        'Station routing matrix & course holding timers configuration',
        'Company legal identity, tax rates %, and receipt customization',
      ],
      icon: 'admin_panel_settings',
    },
    {
      id: 'kitchenkit',
      title: 'KitchenKit',
      category: 'Prep Forecasting & Recipes',
      badge: 'Prep & Recipes',
      headline: 'Professional culinary preparation planner, station checklists, and ingredient shelf-life.',
      description: 'Streamline morning and afternoon prep shifts. Automatically computes batch requirements based on forecasted covers, tracks station prep timers, and monitors perishable ingredient shelf-life.',
      highlights: [
        'Batch requirement forecasting based on expected shift cover volume',
        'Station-by-station prep task checklists with timer tracking',
        'Ingredient shelf-life & perishable expiration monitoring',
        'Vendor directory with direct order contacts and delivery schedules',
        'Unified with CulinaryOS event bus for automated pantry deduction',
      ],
      icon: 'menu_book',
    },
    {
      id: 'ops',
      title: 'CulinaryOps',
      category: 'Food Cost & Waste Diagnostics',
      badge: 'Food Cost & Waste',
      headline: 'Real-time theoretical vs actual food costing, waste diagnostics, and labor % metrics.',
      description: 'Eliminate food cost leakage. Tracks plate economics on every order fired, categorizes kitchen waste into actionable cost logs, and calculates labor percentage against real-time sales.',
      highlights: [
        'Live food cost % variance tracking against benchmark targets',
        'Kitchen food waste logging categorized by trim, spoilage, overcook, or drop',
        'Top cost-leakage ingredient ranker with estimated annual loss',
        'Shift labor hours, hourly wage totals, and labor-to-sales ratios',
        'Vendor price fluctuation audit and open purchase order tracking',
      ],
      icon: 'analytics',
    },
    {
      id: 'recipeos',
      title: 'RecipeOS',
      category: 'Formula Vault & Ratio Scaling',
      badge: 'Scaling & Ratios',
      headline: 'Next.js recipe vault with baker’s percentage ratio scaling and instant unit conversions.',
      description: 'Culinary formula precision for pastry chefs, bakers, and line cooks. Scale recipes dynamically by guest count, target batch yield, or specific ingredient weight with automatic unit conversion.',
      highlights: [
        'Formula-based ingredient scaling (scale by guest count, yield, or single ingredient)',
        'Baker’s percentage ratio blueprints for doughs, batters, and emulsions',
        'Imperial to metric mass & volume unit conversion engine (grams, oz, cups, tbsp)',
        'Interactive recipe steps with culinary technique tips',
        'Auto-generated aggregated shopping and prep lists',
      ],
      icon: 'scale',
    },
    {
      id: 'storefront',
      title: 'Online Storefront',
      category: 'Guest Ordering & Allergen Intelligence',
      badge: 'Customer Ordering',
      headline: 'Mobile-first guest storefront with FDA FASTER Act Top 9 allergen filtering.',
      description: 'Direct-to-consumer online ordering with zero third-party commission fees. Features comprehensive dietary filter chips, allergen cross-contact warnings, item modifier customizers, and live order tracking.',
      highlights: [
        'FDA Top 9 major allergen filtering (Gluten, Dairy, Peanuts, Tree Nuts, Egg, Soy, Fish, Shellfish, Sesame)',
        'Vegan & Vegetarian diet badges with cross-contact frying alerts',
        'Customizable modifiers with real-time price updates',
        'Slide-out bag drawer with automated sales tax and tip calculation',
        'Live order status tracker with kitchen preparation progress',
      ],
      icon: 'shopping_bag',
    },
  ];

  const currentProduct = products.find((p) => p.id === activeTab)!;

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f1f5f9] font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* Top Marketing Navigation */}
      <header className="sticky top-0 z-50 bg-[#07090e]/90 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="material-symbols-outlined text-black font-black text-2xl">skillet</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider uppercase bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CulinaryOS
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                MIT Open Source
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">AI-Native Restaurant Operating System</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-300">
          <a href="#product" className="hover:text-amber-400 transition-colors">Platform Suite</a>
          <a href="#solutions" className="hover:text-amber-400 transition-colors">Solutions</a>
          <a href="#architecture" className="hover:text-amber-400 transition-colors">Architecture</a>
          <a href="#ai" className="hover:text-amber-400 transition-colors">AI & MCP</a>
          <a href="#pricing" className="hover:text-amber-400 transition-colors">Open Source</a>
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
            to="/menu/demo"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
          >
            <span>Live Storefront Demo</span>
            <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-20 max-w-6xl mx-auto text-center space-y-8">
        {/* Glow effect */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>The Linux of Restaurant Technology</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-white">
          Reinventing Restaurant Tech with <br />
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
            Open Standards & AI
          </span>.
        </h1>

        <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 font-normal leading-relaxed">
          CulinaryOS is an AI-native, 100% open-source restaurant operating system. It consolidates Point-of-Sale, Kitchen Displays, Recipe Scaling, Food Cost Diagnostics, and Model Context Protocol AI agents into a unified, zero-dependency monorepo.
        </p>

        {/* Hero Quick Value Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-4">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-left space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">$0 / Mo</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero Platform Cut</h4>
            <p className="text-[11px] text-slate-400">Keep 100% of your restaurant revenue.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-left space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">7 Surfaces</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Unified Monorepo</h4>
            <p className="text-[11px] text-slate-400">POS, KDS, Admin, Ops, Prep & Web.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-left space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">100% Offline</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Zero Outage Risk</h4>
            <p className="text-[11px] text-slate-400">Cryptographic delta queue buffer.</p>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-left space-y-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">9 MCP Servers</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Autonomous AI</h4>
            <p className="text-[11px] text-slate-400">Native Claude & agent tools.</p>
          </div>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined font-black">rocket_launch</span>
            <span>Get Started on GitHub</span>
          </a>
          <a
            href="#product"
            className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">widgets</span>
            <span>Explore Platform Suite</span>
          </a>
        </div>
      </section>

      {/* Platform Suite Showcase Section */}
      <section id="product" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-14">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            The Complete Suite
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            7 Modular Applications. One Unified Core.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Every surface communicates over an ultra-low latency event spine with real-time pantry deductions, plate economics, and hardware printing.
          </p>
        </div>

        {/* Product Navigation Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-10">
          {products.map((p) => {
            const isSelected = activeTab === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id as any)}
                className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25 scale-[1.03]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{p.icon}</span>
                <span>{p.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Product Feature Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/15 rounded-3xl p-8 sm:p-12 backdrop-blur-xl">
          {/* Details Column */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  {currentProduct.badge}
                </span>
                <span className="text-xs font-semibold text-slate-400">{currentProduct.category}</span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-black text-white">{currentProduct.title}</h3>
              <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
                {currentProduct.headline}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {currentProduct.description}
              </p>

              <div className="space-y-2.5 pt-3">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
                  Key Capabilities:
                </span>
                <ul className="space-y-2">
                  {currentProduct.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center gap-4">
              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
              >
                <span>View {currentProduct.title} Docs</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
              {currentProduct.id === 'storefront' && (
                <Link
                  to="/menu/demo"
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Launch Storefront Demo
                </Link>
              )}
            </div>
          </div>

          {/* Interactive Feature Blueprint Column */}
          <div className="lg:col-span-6 bg-[#0a0e1a] rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-[11px] font-mono text-slate-400 ml-2">module: {currentProduct.id}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Ready
                </span>
              </div>

              <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-3">
                <span className="text-xs font-black uppercase text-amber-400">Architecture & Spine Integration</span>
                <p className="text-xs text-slate-300">
                  Runs directly through the Hono API (<code className="font-mono text-amber-300">apps/server</code>) and emits typed domain envelopes via <code className="font-mono text-amber-300">@culinaryos/event-bus</code>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 pt-2">
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    • Event: <span className="font-mono text-amber-300">pos:order:created</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    • Route: <span className="font-mono text-amber-300">PATCH /v1/orders/:id/send</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    • Security: <span className="font-mono text-amber-300">Tenant RLS Policy</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    • Offline: <span className="font-mono text-amber-300">LocalStorage Delta Sync</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              💡 <strong>Self-Host or Cloud:</strong> Run locally with <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-white">pnpm dev</code> or deploy to any cloud provider in 1 click.
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section id="solutions" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            Tailored For Modern Hospitality
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Built For Every Food Service Concept
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            From single-station food trucks to high-volume multi-unit restaurant groups.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">restaurant</span>
            </div>
            <h3 className="text-lg font-black text-white">Full-Service Bistros & Fine Dining</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Spatial 3D table maps, multi-course holding (Starters ➔ Mains ➔ Desserts), automatic gratuity rules for large parties, and seat-by-seat guest checks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">fastfood</span>
            </div>
            <h3 className="text-lg font-black text-white">Quick-Service & Fast Casual</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ultra-fast touchscreen order entry, quick cash change calculator, instant bump bar operations, and high-contrast kitchen TV display modes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">local_shipping</span>
            </div>
            <h3 className="text-lg font-black text-white">Food Trucks & Pop-Up Stands</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              100% offline-first reliability. Take orders and print receipts with zero Wi-Fi required, buffering transactions until cellular connectivity returns.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">bakery_dining</span>
            </div>
            <h3 className="text-lg font-black text-white">Bakeries, Pâtisseries & Cafes</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              RecipeOS ratio blueprints, baker’s percentage dough calculations, ingredient mass unit conversions, and morning batch prep forecasting.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">storefront</span>
            </div>
            <h3 className="text-lg font-black text-white">Ghost Kitchens & Virtual Brands</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Multi-tenant station routing matrix, automatic ticket dispatch to dedicated prep stations, and real-time food cost leakage audits.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">hub</span>
            </div>
            <h3 className="text-lg font-black text-white">Hospitality Tech Developers</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Forkable codebase with clean package boundaries, full TypeScript typing, standard REST endpoints, and 9 Model Context Protocol AI tools.
            </p>
          </div>
        </div>
      </section>

      {/* AI & MCP Agent Layer */}
      <section id="ai" className="py-24 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            AI-Native Operations
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            9 Built-In Model Context Protocol Servers
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Connect Claude Desktop, Cursor, or autonomous AI agents directly to your restaurant operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-amber-400 font-mono text-xs font-bold">mcp/culinaryops-server</span>
            <h4 className="text-base font-black text-white">Operations & Settings Agent</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Query food cost variance, analyze top waste leakage ingredients, calculate labor %, configure prep station routing rules, and generate automated purchase orders.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-amber-400 font-mono text-xs font-bold">mcp/recipe-server</span>
            <h4 className="text-base font-black text-white">Culinary Ratio & Costing Agent</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Scale recipes dynamically by yield, compute theoretical plate costs from live pantry ingredient prices, and calculate baker’s percentages.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <span className="text-amber-400 font-mono text-xs font-bold">mcp/post-pilot-server</span>
            <h4 className="text-base font-black text-white">Loyalty & Direct Mail Agent</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Autonomous Python loyalty engine for customer birthday rewards, automated physical postcard dispatch, and repeat guest marketing.
            </p>
          </div>
        </div>
      </section>

      {/* Open Source / Pricing Comparison */}
      <section id="pricing" className="py-24 px-6 max-w-6xl mx-auto border-t border-white/10 text-center space-y-12">
        <div className="space-y-3">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            Radically Transparent
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            100% Free & Open Source Forever
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Say goodbye to proprietary vendor lock-in, forced hardware leases, and monthly subscription tiers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
          {/* CulinaryOS Card */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-amber-500/15 to-transparent border-2 border-amber-500/40 space-y-6">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider">
                CulinaryOS
              </span>
              <span className="text-2xl font-black text-white">$0 / month</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-200">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">check</span>
                <span><strong>100% MIT Licensed:</strong> Self-host anywhere on your own servers</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">check</span>
                <span><strong>Zero Platform Take:</strong> Pay only your standard payment processor</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">check</span>
                <span><strong>Bring Any Hardware:</strong> Standard ESC/POS printers, iPads, Android, PCs</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">check</span>
                <span><strong>Complete Data Ownership:</strong> Full PostgreSQL schema with RLS security</span>
              </li>
            </ul>
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/20"
            >
              Deploy Your Own Instance
            </a>
          </div>

          {/* Legacy POS Card */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6 opacity-70">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-wider">
                Legacy Proprietary POS
              </span>
              <span className="text-xl font-bold text-slate-400">$150–$400+ / mo</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400 text-base">close</span>
                <span>Proprietary closed-source lock-in</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400 text-base">close</span>
                <span>Forced high-margin hardware lease fees</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400 text-base">close</span>
                <span>1% to 3% additional platform take-rates</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400 text-base">close</span>
                <span>Total outage failure during internet drops</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

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
            <Link to="/menu/demo" className="hover:text-amber-400">Demo Storefront</Link>
            <a href="https://github.com/ShadowWalkerNC/CulinaryOS/blob/main/LICENSE" className="hover:text-amber-400">MIT License</a>
          </div>
        </div>

        <div className="text-center sm:text-left text-xs text-slate-500 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 CulinaryOS Contributors. Free and open-source under the MIT License.</p>
          <p className="font-mono text-[11px]">release: v0.3.0 · build: 7a5d412</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
