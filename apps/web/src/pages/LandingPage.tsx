import { useState } from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  const [activeSurface, setActiveSurface] = useState<'pos' | 'kds' | 'admin' | 'kitchenkit' | 'ops' | 'recipeos' | 'storefront'>('pos');
  const [demoPin, setDemoPin] = useState('1234');

  const surfaces = [
    {
      id: 'pos',
      name: 'POS Terminal',
      badge: 'Table & Quick Service',
      port: '5172',
      url: 'http://localhost:5172',
      tagline: 'High-speed order entry with 2D/3D spatial floor mapping and ESC/POS thermal printing.',
      features: [
        'Interactive 3D table floor map editor (custom booth shapes & seat counts)',
        'Multi-seat guest ordering with FDA Top 9 allergy modifiers',
        'Universal ESC/POS hardware printer hub (WebUSB, Bluetooth, Serial, Network IP)',
        'Cash drawer kick pulse & offline transaction delta sync queue',
        'Demo PIN: 1234 (Server John Doe) or 5678 (Manager Jane Smith)',
      ],
      previewImg: 'pos_menu_modern_cards.png',
      screenshotTitle: 'POS Terminal Menu & Modifiers',
    },
    {
      id: 'kds',
      name: 'Kitchen Display (KDS)',
      badge: 'Real-Time Expediter',
      port: '5173',
      url: 'http://localhost:5173',
      tagline: 'Zero-latency kitchen tickets with 1-second aging timers, station routing, and 140% TV mode.',
      features: [
        'Multi-station filtering: Expo Master Pass, Hot Grill, Fryer, Cold Prep, Bar, Pizza, Pastry',
        'Course hold & fire automation (Course 1 Starters, Course 2 Mains)',
        'Color-coded ticket aging alerts (<5m green, 5-10m amber, >10m flashing red)',
        'High-contrast OLED dark mode for hot/steamy kitchen environments',
        'Audible arrival chimes and one-tap bump bar actions',
      ],
      previewImg: 'kds_station_routing.png',
      screenshotTitle: 'KDS Kitchen Station Board',
    },
    {
      id: 'admin',
      name: 'Back-Office Admin',
      badge: 'Management & Routing',
      port: '5174',
      url: 'http://localhost:5174',
      tagline: 'Unified control of restaurant catalog, staff PINs, auto-PO par levels, and station routing.',
      features: [
        'Menu editor with instant 1-click 86 item availability toggles',
        'Staff directory with role-based access control (Server, Chef, Manager, Owner)',
        'Pantry par shortfall alerts & 1-click automated supplier purchase orders',
        'Comprehensive station routing matrix & course holding timers',
        'Full company legal branding, tax rates %, and receipt customization',
      ],
      previewImg: 'admin_pantry_inventory.png',
      screenshotTitle: 'Admin Inventory & Auto-PO',
    },
    {
      id: 'kitchenkit',
      name: 'KitchenKit',
      badge: 'Prep & Recipes',
      port: '5175',
      url: 'http://localhost:5175',
      tagline: 'Professional culinary preparation planner, station checklists, and ingredient shelf-life.',
      features: [
        'Batch requirement forecasting based on expected shift cover volume',
        'Station-by-station prep task checklists with timer tracking',
        'Ingredient shelf-life & perishable expiration monitoring',
        'Vendor directory with direct order contacts and delivery schedules',
        'Unified with CulinaryOS event bus for automated pantry deduction',
      ],
      previewImg: 'admin_menu_management.png',
      screenshotTitle: 'KitchenKit Prep & Recipe Engine',
    },
    {
      id: 'ops',
      name: 'CulinaryOps',
      badge: 'Food Cost & Waste',
      port: '5177',
      url: 'http://localhost:5177',
      tagline: 'Real-time actual vs theoretical food costing, kitchen waste diagnostics, and labor % metrics.',
      features: [
        'Live food cost % variance tracking against benchmark targets',
        'Kitchen food waste logging categorized by trim, spoilage, overcook, or drop',
        'Top cost-leakage ingredient ranker with estimated annual loss',
        'Shift labor hours, hourly wage totals, and labor-to-sales ratios',
        'Vendor price fluctuation audit and open purchase order tracking',
      ],
      previewImg: 'admin_waste_analytics.png',
      screenshotTitle: 'CulinaryOps Diagnostics & Analytics',
    },
    {
      id: 'recipeos',
      name: 'RecipeOS',
      badge: 'Scaling & Ratios',
      port: '5178',
      url: 'http://localhost:5178',
      tagline: 'Next.js recipe vault with baker’s percentage ratio scaling and instant unit conversions.',
      features: [
        'Formula-based ingredient scaling (scale by guest count, yield, or single ingredient)',
        'Baker’s percentage ratio blueprints for doughs, batters, and emulsions',
        'Imperial to metric mass & volume unit conversion engine (grams, oz, cups, tbsp)',
        'Interactive recipe steps with culinary technique tips',
        'Auto-generated aggregated shopping and prep lists',
      ],
      previewImg: 'web_storefront_ordering.png',
      screenshotTitle: 'RecipeOS Scaling & Recipe Vault',
    },
    {
      id: 'storefront',
      name: 'Online Storefront',
      badge: 'Customer Ordering',
      port: '5176',
      url: 'http://localhost:5176/menu/demo',
      tagline: 'Mobile-first guest storefront with FDA FASTER Act Top 9 allergen filtering and instant checkout.',
      features: [
        'FDA Top 9 major allergen filtering (Gluten, Dairy, Peanuts, Tree Nuts, Egg, Soy, Fish, Shellfish, Sesame)',
        'Vegan & Vegetarian diet badges with cross-contact frying alerts',
        'Customizable modifiers with real-time price updates',
        'Slide-out bag drawer with automated sales tax and tip calculation',
        'Live order status tracker with kitchen preparation progress',
      ],
      previewImg: 'web_storefront_ordering.png',
      screenshotTitle: 'Online Ordering Storefront',
    },
  ] as const;

  const current = surfaces.find((s) => s.id === activeSurface)!;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* Top Marketing Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#0b0f19]/90 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="material-symbols-outlined text-black font-black text-xl">skillet</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-wider uppercase bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                CulinaryOS
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Open Source · v0.3
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">The Linux of Restaurant Tech</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-gray-300">
          <a href="#demo" className="hover:text-amber-400 transition-colors">Interactive Demo</a>
          <a href="#features" className="hover:text-amber-400 transition-colors">Features</a>
          <a href="#architecture" className="hover:text-amber-400 transition-colors">Architecture</a>
          <a href="#mcp" className="hover:text-amber-400 transition-colors">MCP AI Agents</a>
          <Link to="/menu/demo" className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
            <span>Customer Storefront</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all flex items-center gap-2 border border-white/10"
          >
            <span className="material-symbols-outlined text-sm">code</span>
            <span>GitHub</span>
          </a>
          <a
            href="#demo"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-500/25 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm font-black">play_arrow</span>
            <span>Launch Demo</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 max-w-6xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Complete Modular Restaurant Operating System</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-white">
          The <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">Linux of Restaurant Tech</span>.
        </h1>

        <p className="max-w-3xl mx-auto text-base sm:text-xl text-gray-300 font-normal leading-relaxed">
          CulinaryOS is an AI-native, 100% open-source restaurant operating system. It consolidates Point-of-Sale, Kitchen Displays, Recipe Scaling, Food Cost Diagnostics, and Model Context Protocol AI agents into a unified, zero-dependency monorepo.
        </p>

        {/* Hero Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">$0 / Mo</span>
            <p className="text-xs text-gray-400 font-semibold mt-1">MIT Open-Source</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">7 Surfaces</span>
            <p className="text-xs text-gray-400 font-semibold mt-1">POS, KDS, Admin & Ops</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">100% Offline</span>
            <p className="text-xs text-gray-400 font-semibold mt-1">Zero-Cloud Outage Risk</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">9 MCP Servers</span>
            <p className="text-xs text-gray-400 font-semibold mt-1">Autonomous AI Agents</p>
          </div>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <a
            href="#demo"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined font-black">desktop_windows</span>
            <span>Explore Interactive Demo</span>
          </a>
          <Link
            to="/menu/demo"
            className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            <span>Try Online Customer Storefront</span>
          </Link>
        </div>
      </section>

      {/* Interactive Live Demo Suite Section */}
      <section id="demo" className="py-20 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-10">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            Hands-On Experience
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Explore All 7 Application Surfaces
          </h2>
          <p className="text-gray-400 text-sm max-w-2xl mx-auto">
            Switch between modules below to preview real workflows. Launch them locally or test in the browser.
          </p>
        </div>

        {/* Surface Tabs */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-8">
          {surfaces.map((s) => {
            const isSelected = activeSurface === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSurface(s.id as any)}
                className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-[1.02]'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                <span>{s.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-400'}`}>
                  :{s.port}
                </span>
              </button>
            );
          })}
        </div>

        {/* Surface Interactive Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
          {/* Details Column */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  {current.badge}
                </span>
                <span className="text-xs font-mono text-gray-400">Port {current.port}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white">{current.name}</h3>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">{current.tagline}</p>

              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
                  Core Capabilities:
                </span>
                <ul className="space-y-2">
                  {current.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                      <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Launch Buttons */}
            <div className="pt-6 border-t border-white/10 space-y-3">
              <div className="flex flex-wrap gap-3">
                {current.id === 'storefront' ? (
                  <Link
                    to="/menu/demo"
                    className="flex-1 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Open Customer Storefront</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                ) : (
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Launch on Port :{current.port}</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                )}
              </div>
              <p className="text-[11px] text-gray-400 italic">
                {current.id === 'pos' && 'Use PIN 1234 (John Doe) to unlock terminal.'}
                {current.id === 'kds' && 'Real-time 1-second aging timers and station filtering.'}
                {current.id === 'admin' && 'Access Menu Editor, Staff PINs, and Settings.'}
                {current.id === 'ops' && 'View food cost variance and kitchen waste trends.'}
              </p>
            </div>
          </div>

          {/* Visual Preview Column */}
          <div className="lg:col-span-7 bg-[#0f1422] rounded-2xl border border-white/10 p-6 flex flex-col justify-center items-center relative overflow-hidden group min-h-[380px]">
            <div className="w-full text-left space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-[11px] font-mono text-gray-400 ml-2">{current.name} live simulator</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  :{current.port}
                </span>
              </div>

              {/* Module Feature Box */}
              <div className="p-6 rounded-xl bg-white/5 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-400">Interactive Features</span>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Operational
                  </span>
                </div>
                <p className="text-xs text-gray-300">{current.tagline}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {current.features.slice(0, 4).map((f, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-gray-300">
                      • {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Grid */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <span className="text-amber-400 text-xs font-black uppercase tracking-widest">
            Architecture Highlights
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Built for Modern Food Service
          </h2>
          <p className="text-gray-400 text-sm max-w-2xl mx-auto">
            Everything an independent operator or multi-unit hospitality group needs without vendor lock-in.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">print</span>
            </div>
            <h3 className="text-lg font-black text-white">Universal ESC/POS Hardware Hub</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Direct binary streaming to thermal receipt printers via WebUSB, Bluetooth BLE, Serial COM, and Network IP. Configurable 80mm & 58mm widths with cash drawer pulse.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">health_and_safety</span>
            </div>
            <h3 className="text-lg font-black text-white">FDA Top 9 Allergen Engine</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Built-in FASTER Act allergen classification (sesame, milk, eggs, peanuts, tree nuts, wheat, soy, fish, crustacean) with shared fryer cross-contact warnings and safe substitution suggestions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">wifi_off</span>
            </div>
            <h3 className="text-lg font-black text-white">Zero-Cloud Outage Resilience</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Never miss a table check. POS terminals buffer transactions in a cryptographic delta queue during internet outages, auto-replaying upon reconnection.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">robot_2</span>
            </div>
            <h3 className="text-lg font-black text-white">9 Model Context Protocol Servers</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Connect Claude Desktop, Cursor, or autonomous AI agents directly to live restaurant tools—automated purchase orders, food cost variance audits, recipe scaling, and loyalty campaigns.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">calculate</span>
            </div>
            <h3 className="text-lg font-black text-white">Real-Time Plate Economics</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Every dish fired on POS immediately calculates theoretical ingredient cost, actual food cost percentage, and alerts kitchen managers on cost-leakage items.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/40 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined">format_size</span>
            </div>
            <h3 className="text-lg font-black text-white">Customization & 140% TV Mode</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Live text sizing slider (Compact 100%, Standard 110%, Large 125%, X-Large 140%), high-contrast OLED kitchen dark mode, and station routing rules.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 max-w-7xl mx-auto text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black font-black">
            <span className="material-symbols-outlined text-lg">skillet</span>
          </div>
          <span className="font-black text-lg text-white">CulinaryOS</span>
        </div>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          MIT Open-Source Restaurant Operating System. Built with TypeScript, Vite, Hono, Supabase, and Tailwind CSS.
        </p>
        <div className="flex items-center justify-center gap-6 text-xs text-gray-400 pt-2 font-semibold">
          <a href="https://github.com/ShadowWalkerNC/CulinaryOS" className="hover:text-amber-400">GitHub</a>
          <Link to="/menu/demo" className="hover:text-amber-400">Online Storefront</Link>
          <a href="https://github.com/ShadowWalkerNC/CulinaryOS/blob/main/LICENSE" className="hover:text-amber-400">MIT License</a>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
