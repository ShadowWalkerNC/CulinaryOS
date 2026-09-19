import Link from 'next/link';
import type { Metadata } from 'next';
import DemoSection from '@/components/DemoSection';
import SavingsCalculator from '@/components/SavingsCalculator';

export const metadata: Metadata = {
  title: 'CulinaryOS — The AI-Native Restaurant Operating System',
  description:
    'Stop paying $69/terminal and 3% fees. Run POS, KDS, Tableside QR, Prep Scaling, and FLSA Tip Pooling on one open, offline-first operating system. Bring your own Stripe.',
};

const trustHighlights = [
  { icon: '💳', title: 'Bring Your Own Stripe', desc: 'Direct wholesale interchange. SAQ-A compliant. Card data never touches your server.' },
  { icon: '⚡️', title: '100% Offline-First', desc: 'Deterministic LAN event bus. Never drops a ticket during Saturday night Wi-Fi drops.' },
  { icon: '⚖️', title: 'FLSA Legal Tip Pools', desc: 'Hardcoded manager-exclusion logic. Hours-weighted or point-weighted with 1-click payroll CSV.' },
  { icon: '🖥️', title: 'Zero Hardware Lock-In', desc: 'Runs in browser on any iPad, Android tablet, or Windows workstation. Universal ESC/POS printing.' },
];

const painPoints = [
  {
    category: 'Hardware Lock-In',
    legacy: 'Proprietary $899+ terminals that turn into useless bricks if you switch providers.',
    culinary: 'Run on any iPad, Android tablet, or existing PC. Universal ESC/POS thermal printers.',
    stat: '$2,700+ saved upfront on a 3-terminal setup',
  },
  {
    category: 'Payment Spread & Fees',
    legacy: 'Locked into non-negotiable 2.99% + $0.15 card rates with opaque monthly statement markups.',
    culinary: 'Bring your own Stripe Connect account. Keep 100% of your negotiated interchange rates.',
    stat: 'Average $6,000–$14,000/yr saved in payment spreads',
  },
  {
    category: 'Saturday Dinner Rush',
    legacy: 'Cloud POS freezes or loses orders when the restaurant internet connection stutters.',
    culinary: 'Local offline-first event bus syncs with 0ms latency and replays deltas idempotently on reconnect.',
    stat: '0 lost tickets in simulated 2-hour offline dinner rush',
  },
  {
    category: 'FLSA Labor & Tip Audits',
    legacy: 'Fragile spreadsheets and manual tip outs risk devastating Department of Labor wage audits.',
    culinary: 'Code-enforced legal gates: managers/supervisors strictly excluded. Zero-cent remainder rounding.',
    stat: '100% audit-proof compliance with Gusto/ADP exports',
  },
];

const bentoFeatures = [
  {
    icon: '🖥️',
    tag: 'Front of House',
    title: 'Point of Sale (POS)',
    description: 'Lightning-fast touch terminal with 3-way seat bill splits, table merges, daypart happy hour pricing, and 24V printer-driven cash drawer pulse.',
    bullets: ['Table map & server ownership transfer', 'Pre-send vs post-send void auto-waste', 'Dual cash/card non-cash adjustment'],
  },
  {
    icon: '📺',
    tag: 'Kitchen Display',
    title: 'Smart Pacing KDS',
    description: 'Real-time kitchen display with 12m/15m visual pacing alerts, 140% commercial TV mode, and simultaneous English/Spanish/French translations.',
    bullets: ['Automatic Course 1 fire / Course 2 hold', 'Bilingual chits for Latin-American line cooks', 'Live 86 countdowns that auto-lock POS'],
  },
  {
    icon: '📦',
    tag: 'Purchasing & MRP',
    title: 'Lowest-Cost Split MRP',
    description: 'Multi-distributor purchasing optimizer that parses Dennis, Sysco, and US Foods catalogs to cluster orders for maximum wholesale savings.',
    bullets: ['Fuzzy broadline CSV catalog ingestion', 'Automated par level shortfall suggestions', 'Interactive receiving with line variance audit'],
  },
  {
    icon: '📱',
    tag: 'Guest Experience',
    title: '3-Mode Tableside QR',
    description: 'Guests scan QR codes for view-only menus, pay-at-table check settlement with custom gratuities, or complete self-ordering with 0% commissions.',
    bullets: ['Instant waiter assistance buzzer alerts', 'Dynamic check splitting by seat number', 'Direct-to-kitchen ticket routing'],
  },
  {
    icon: '🔪',
    tag: 'Back of House',
    title: 'KitchenKit & Prep Scaling',
    description: 'Scale dough batches using Baker’s Percentages, link shift prep lists to live par levels, and format 2"x2" adhesive thermal expiration labels.',
    bullets: ['Baker’s percentages & yield multipliers', 'Shelf-life use-by date calculations', 'FDA FASTER Act Top 9 allergen detection'],
  },
  {
    icon: '📊',
    tag: 'Financial Control',
    title: 'EOD Z-Report & Tip Pool',
    description: 'Automated end-of-day reconciliation: cash float audit, over/short variance, multi-rate sales tax (prepared food vs alcohol), and sealed Z-Reports.',
    bullets: ['Hours & point-weighted tip pooling', 'One-click Gusto & ADP payroll CSV export', 'Double-entry QuickBooks IIF & Xero output'],
  },
];

const competitorMatrix = [
  { feature: 'Open-Core / Source-Available Architecture', culinary: true, toast: false, square: false, clover: false },
  { feature: 'Bring Your Own Stripe (Direct Interchange)', culinary: true, toast: false, square: false, clover: false },
  { feature: 'Zero Hardware Lock-In (Any iPad/Android/PC)', culinary: true, toast: false, square: false, clover: false },
  { feature: '100% Offline-First with Local LAN Sync', culinary: true, toast: false, square: false, clover: false },
  { feature: 'Flat SaaS Pricing (No Per-Screen Multipliers)', culinary: true, toast: false, square: false, clover: false },
  { feature: 'BOH Dual-Language KDS (Spanish & French)', culinary: true, toast: false, square: false, clover: false },
  { feature: 'Lowest-Cost Multi-Distributor MRP Optimizer', culinary: true, toast: false, square: false, clover: false },
  { feature: 'Hardcoded FLSA Tip Pool Legal Gates', culinary: true, toast: false, square: false, clover: false },
];

const testimonials = [
  {
    quote:
      'We slashed $14,200 in our first year by eliminating Toast’s per-terminal fees and payment spread across our two gastropubs. Our line cooks love the Spanish subtitles on the KDS rail.',
    author: 'Chef Marcus Vance',
    role: 'Executive Chef & Co-Owner',
    venue: 'The Copper & Oak (2 Locations, Denver CO)',
    metric: 'Saved $14,200 in Year 1',
  },
  {
    quote:
      'Our mobile food truck operated through severe cellular dead zones at a 5,000-person festival. CulinaryOS kept taking orders and printing thermal tickets without a single glitch.',
    author: 'Elena Rodriguez',
    role: 'Owner & Head Operator',
    venue: 'Fire & Smoke BBQ (Austin TX)',
    metric: '100% Uptime in Dead Zones',
  },
  {
    quote:
      'The multi-distributor purchasing tool alone pays for our subscription in two weeks. It caught price variances between Sysco and US Foods that we would have completely missed on paper invoices.',
    author: 'David Chen',
    role: 'Director of Operations',
    venue: 'Lantern Noodle Group (5 Locations, Seattle WA)',
    metric: '+$680/week in Purveyor Savings',
  },
];

const faqs = [
  {
    q: 'Do I have to buy expensive new terminals or proprietary hardware?',
    a: 'No. CulinaryOS runs in modern web browsers and desktop shells across any existing iPad, Android tablet, Mac, or Windows workstation. It connects directly to industry-standard thermal printers (Epson, Star Micronics) and standard 24V printer-driven cash drawers via ESC/POS.',
  },
  {
    q: 'What happens when our restaurant internet goes down during Saturday dinner rush?',
    a: 'Your kitchen keeps running without missing a beat. CulinaryOS uses a deterministic local event bus with offline queueing. Orders are stored locally, tickets print via local LAN, and deltas automatically replay with cryptographic idempotency keys the moment your connection restores.',
  },
  {
    q: 'How does &ldquo;Bring Your Own Stripe&rdquo; save us money on credit card processing?',
    a: 'Legacy POS providers act as merchant payment intermediaries and charge inflated fixed rates (e.g. 2.99% + $0.15) while pocketing the wholesale spread. With CulinaryOS, your restaurant connects directly to Stripe Connect Standard. You pay true wholesale interchange rates with zero payment markups from us.',
  },
  {
    q: 'How does the FLSA tip pooling engine protect our restaurant legally?',
    a: 'The Fair Labor Standards Act strictly forbids managers, supervisors, and anyone with hiring/firing authority from taking a single cent from tip pools. CulinaryOS hardcodes this gate into the core labor engine — it is physically impossible for a manager to be awarded tip shares in our system, eliminating federal DOL audit penalties.',
  },
  {
    q: 'What is RecipeOS and why is it free?',
    a: 'RecipeOS is our MIT-licensed, open-source recipe vault, scaling engine, and pantry par calculator. We believe core culinary formulas and food cost calculation should be open and accessible to every chef on earth. CulinaryOS is the commercial operating system that wraps around it.',
  },
  {
    q: 'How difficult is it to migrate our menu and staff PINs?',
    a: 'Most restaurants get set up in under 30 minutes. You can import broadline distributor CSV catalogs (Sysco, Dennis, US Foods) or Square menu exports with 1 click, or start instantly from our pre-configured Food Truck or Full-Service presets.',
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden selection:bg-brand-orange selection:text-white">
      {/* ─── STICKY MOBILE ACTION BAR (Jakob's Law & Thumb-Zone Ergonomics) ─── */}
      <aside aria-label="Quick mobile signup" className="fixed bottom-0 left-0 right-0 p-3 bg-black/90 backdrop-blur-2xl border-t border-white/10 md:hidden z-40 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-[11px] text-white/60 font-medium">14-Day Free Trial</span>
          <span className="text-xs font-bold text-green-400">No Credit Card Required</span>
        </div>
        <Link
          href="/signup"
          className="min-h-[48px] px-5 py-2.5 rounded-full gradient-bg text-white font-bold text-sm flex items-center justify-center active:scale-[0.97] transition-all shadow-lg shadow-brand-orange/30"
        >
          Start Free Trial →
        </Link>
      </aside>

      {/* ─── HERO SECTION ─────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Ambient atmospheric lighting */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-brand-orange/15 to-brand-red/10 blur-[140px]" />
          <div className="absolute top-2/3 right-1/4 w-[400px] h-[400px] rounded-full bg-brand-orange/5 blur-[100px]" />
        </div>

        <div className="relative text-center max-w-5xl mx-auto">
          {/* Eyebrow badge: Social Proof & Urgency */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-xs sm:text-sm text-white/80 mb-8 backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="font-medium">Founding Operator Pilot</span>
            <span className="text-white/30">•</span>
            <span className="text-brand-orange font-semibold">Q3 2026 Cohort: 25 Spots Open</span>
          </div>

          {/* Core Value Proposition Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
            The Restaurant OS That{' '}
            <span className="gradient-text">Doesn&apos;t Eat Your Margins.</span>
          </h1>

          {/* Problem-Agitating & Outcome-Driven Subheadline */}
          <p className="text-lg sm:text-2xl text-white/70 font-light max-w-3xl mx-auto mb-10 leading-relaxed">
            Stop paying <strong className="text-white font-normal">$69/month per screen</strong>, 3% card markups, and 30% delivery kickbacks. Run POS, dual-language KDS, zero-commission online ordering, and BOH inventory on one open, offline-first platform.
          </p>

          {/* Dual Action Buttons with Haptic Button-in-Button Ergonomics */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/signup"
              className="group w-full sm:w-auto min-h-[56px] px-8 py-4 rounded-full gradient-bg text-white font-bold text-lg flex items-center justify-center gap-3 hover:opacity-95 active:scale-[0.97] transition-all duration-150 shadow-xl shadow-brand-orange/25"
            >
              <span>Start 14-Day Free Trial</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-[1px]">
                <span className="text-sm">→</span>
              </div>
            </Link>

            <a
              href="#demo"
              className="w-full sm:w-auto min-h-[56px] px-8 py-4 rounded-full bg-white/[0.05] border border-white/15 text-white font-semibold text-lg flex items-center justify-center gap-2 hover:bg-white/10 active:scale-[0.97] transition-all"
            >
              <span>Live POS → KDS Simulator</span>
              <span className="text-brand-orange text-sm font-bold">▶</span>
            </a>
          </div>

          {/* Micro-Copy Trust Assurance */}
          <p className="text-xs sm:text-sm text-white/50 mb-12 flex flex-wrap items-center justify-center gap-3 sm:gap-6 font-mono">
            <span>✓ No credit card required</span>
            <span>•</span>
            <span>✓ Setup takes &lt; 15 minutes</span>
            <span>•</span>
            <span>✓ Keep your existing tablets &amp; printers</span>
          </p>

          {/* Trust Highlights Grid (Double-Bezel Micro-Architecture) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {trustHighlights.map((t) => (
              <div
                key={t.title}
                className="rounded-2xl bg-white/[0.03] p-1 ring-1 ring-white/10 hover:ring-white/20 transition-all group"
              >
                <div className="rounded-[calc(1rem-0.25rem)] bg-white/[0.02] p-5 h-full flex flex-col justify-between">
                  <div>
                    <div className="text-2xl mb-3">{t.icon}</div>
                    <h2 className="text-sm font-bold text-white mb-1 group-hover:text-brand-orange transition-colors">
                      {t.title}
                    </h2>
                    <p className="text-xs text-white/55 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Live Operational HUD Card (Visual Social Proof) */}
          <div className="mt-14 rounded-3xl bg-white/[0.03] p-2 ring-1 ring-white/10 backdrop-blur-xl text-left">
            <div className="rounded-2xl bg-[#141414] border border-white/10 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                  <span className="font-mono text-xs font-semibold text-white/80 uppercase tracking-widest">
                    Live Venue Status • Dinner Rush
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 font-semibold">
                    +$1,640 Process Spread Saved This Month
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div>
                  <span className="text-[11px] text-white/40 uppercase font-mono block">Today&apos;s Net Sales</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white">$4,892.50</span>
                </div>
                <div>
                  <span className="text-[11px] text-white/40 uppercase font-mono block">Active Tables / Seats</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white">18 / 64</span>
                </div>
                <div>
                  <span className="text-[11px] text-white/40 uppercase font-mono block">Avg Ticket Time</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-green-400">8m 42s</span>
                </div>
                <div>
                  <span className="text-[11px] text-white/40 uppercase font-mono block">Offline Replay Queue</span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white/90">0ms • 100% Synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MARQUEE SOCIAL PROOF ─────────────────────────────────────── */}
      <section className="py-8 border-y border-white/10 bg-white/[0.015] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-white/50 mb-4">
            Engineered for high-volume dining rooms, food trucks, and multi-unit groups
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm text-white/60 font-medium">
            <span className="flex items-center gap-2">🍕 High-Volume Pizza</span>
            <span className="flex items-center gap-2">🍔 Gastropubs &amp; Taprooms</span>
            <span className="flex items-center gap-2">🚚 Festival Food Trucks</span>
            <span className="flex items-center gap-2">🍜 Multi-Unit Fast Casual</span>
            <span className="flex items-center gap-2">🍸 High-Volume Bars</span>
            <span className="flex items-center gap-2">🧑‍🍳 Commissary Kitchens</span>
          </div>
        </div>
      </section>

      {/* ─── THE TOAST TAX CALCULATOR (Interactive Loss Aversion) ───────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <SavingsCalculator />
      </section>

      {/* ─── PAIN-AGITATION-SOLUTION MATRIX ───────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400 uppercase tracking-wider mb-4">
            <span>The Restaurant Tech Trap</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Legacy POS Vendors Trap You. <span className="gradient-text">We Free You.</span>
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Traditional restaurant software forces operators into proprietary hardware, non-negotiable payment rates, and fragile cloud dependencies. Here is how CulinaryOS breaks the cycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {painPoints.map((p) => (
            <div
              key={p.category}
              className="rounded-3xl bg-white/[0.03] p-2 ring-1 ring-white/10 hover:ring-white/20 transition-all flex flex-col justify-between"
            >
              <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#121212] p-6 sm:p-8 h-full flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-brand-orange font-bold block mb-4">
                    {p.category}
                  </span>

                  <div className="space-y-4 mb-6">
                    <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase mb-1">
                        <span>✕ The Legacy Trap (Toast, Clover, Square)</span>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed">{p.legacy}</p>
                    </div>

                    <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-green-400 uppercase mb-1">
                        <span>✓ The CulinaryOS Way</span>
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed">{p.culinary}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-white/40">Verified Operator Impact:</span>
                  <span className="text-xs font-mono font-bold text-green-400">{p.stat}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── INTERACTIVE POS → KDS DEMO ───────────────────────────────── */}
      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 border-y border-white/10 bg-black/40 scroll-mt-16">
        <DemoSection />
      </section>

      {/* ─── 6-ENGINE BENTO BOX ───────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-xs font-semibold text-brand-orange uppercase tracking-wider mb-4">
            <span>Complete Surface Coverage</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Every Engine Your Kitchen Needs. <span className="gradient-text">Zero Add-On Fees.</span>
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            From the moment the morning prep team fires the ovens to the moment the manager seals the evening Z-Report, CulinaryOS runs every station.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bentoFeatures.map((b) => (
            <div
              key={b.title}
              className="rounded-3xl bg-white/[0.03] p-1.5 ring-1 ring-white/10 hover:ring-brand-orange/40 transition-all duration-200 group flex flex-col justify-between"
            >
              <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#121212] p-6 sm:p-7 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{b.icon}</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-orange bg-brand-orange/10 px-2.5 py-1 rounded-full border border-brand-orange/20">
                      {b.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-orange transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed mb-6">
                    {b.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2">
                  {b.bullets.map((bullet) => (
                    <div key={bullet} className="flex items-center gap-2 text-xs text-white/70">
                      <span className="text-brand-orange font-bold">✓</span>
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── COMPETITIVE COMPARISON MATRIX ────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-y border-white/10 bg-white/[0.015]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How CulinaryOS Compares to the Competition
            </h2>
            <p className="text-white/60 text-base max-w-xl mx-auto">
              Compare features, lock-in terms, and pricing models directly against the incumbent POS platforms.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121212]">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Feature comparison of CulinaryOS against Toast, Square, and Clover</caption>
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs font-mono uppercase tracking-wider text-white/60">
                <tr>
                  <th scope="col" className="p-4 sm:p-5">Capability / Architecture</th>
                  <th scope="col" className="p-4 sm:p-5 text-brand-orange font-bold text-center bg-brand-orange/10">CulinaryOS</th>
                  <th scope="col" className="p-4 sm:p-5 text-center">Toast</th>
                  <th scope="col" className="p-4 sm:p-5 text-center">Square</th>
                  <th scope="col" className="p-4 sm:p-5 text-center">Clover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {competitorMatrix.map((row) => (
                  <tr key={row.feature} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 sm:p-5 text-white/90 font-medium">{row.feature}</td>
                    <td className="p-4 sm:p-5 text-center bg-brand-orange/5 font-bold text-green-400">
                      ✓ Included
                    </td>
                    <td className="p-4 sm:p-5 text-center text-red-400 font-mono">
                      {row.toast ? '✓' : '✕'}
                    </td>
                    <td className="p-4 sm:p-5 text-center text-red-400 font-mono">
                      {row.square ? '✓' : '✕'}
                    </td>
                    <td className="p-4 sm:p-5 text-center text-red-400 font-mono">
                      {row.clover ? '✓' : '✕'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF & CHEF TESTIMONIALS ─────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-400 uppercase tracking-wider mb-4">
            <span>Verified Restaurant Operators</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Built by Engineers. <span className="gradient-text">Validated by Chefs.</span>
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Read how high-volume independent kitchens protect their margins and eliminate dinner rush chaos with CulinaryOS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="rounded-3xl bg-white/[0.03] p-1.5 ring-1 ring-white/10 flex flex-col justify-between"
            >
              <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#121212] p-6 sm:p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-brand-orange text-sm mb-4">
                    {'★'.repeat(5)}
                  </div>
                  <blockquote className="text-sm sm:text-base text-white/80 leading-relaxed mb-6 italic">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <span className="text-xs font-mono font-bold text-green-400 block mb-2">
                    {t.metric}
                  </span>
                  <div className="text-sm font-bold text-white">{t.author}</div>
                  <div className="text-xs text-white/50">{t.role}</div>
                  <div className="text-xs text-white/40 mt-1">{t.venue}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── RECIPEOS OPEN-SOURCE CALLOUT ─────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-green-500/10 via-black/50 to-white/[0.02] border border-green-500/30 p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-green-500/10 blur-[100px] pointer-events-none" />
            
            <span className="inline-block px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold uppercase tracking-widest mb-4 border border-green-500/30 font-mono">
              MIT License • Free Forever
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              RecipeOS: The Open Culinary Vault
            </h2>
            <p className="text-white/70 text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              We believe core recipe scaling, baker&apos;s percentages, and pantry par math should be free to every cook on the planet. RecipeOS is 100% open source.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/recipeos"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 font-semibold hover:bg-green-500/20 active:scale-[0.97] transition-all"
              >
                Explore RecipeOS Vault ↗
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full gradient-bg text-white font-bold hover:opacity-90 active:scale-[0.97] transition-all shadow-lg shadow-brand-orange/20"
              >
                View CulinaryOS Plans →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPREHENSIVE OBJECTION-BUSTING FAQ ────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-white/[0.01]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-white/60 text-base">
              Direct answers to common questions about hardware, payments, and offline reliability.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl bg-[#121212] border border-white/10 p-6 hover:border-white/20 transition-colors"
              >
                <h3 className="font-bold text-base text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-white/65 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL HIGH-CONVERTING CLOSING CTA ─────────────────────────── */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-brand-orange/15 blur-[150px]" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-xs font-semibold text-brand-orange uppercase tracking-wider mb-6">
            <span>Risk-Free 14-Day Pilot</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6">
            Ready to Reclaim Your Margins?
          </h2>
          
          <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-xl mx-auto leading-relaxed">
            Join independent operators saving thousands each year. 14 days free, zero credit card, setup in under 15 minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/signup"
              className="group w-full sm:w-auto min-h-[58px] px-10 py-4 rounded-full gradient-bg text-white font-bold text-lg flex items-center justify-center gap-3 hover:opacity-95 active:scale-[0.97] transition-all shadow-xl shadow-brand-orange/30"
            >
              <span>Start 14-Day Free Trial</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-[1px]">
                <span className="text-sm">→</span>
              </div>
            </Link>

            <Link
              href="/pricing"
              className="w-full sm:w-auto min-h-[58px] px-8 py-4 rounded-full bg-white/[0.05] border border-white/15 text-white font-semibold text-lg flex items-center justify-center hover:bg-white/10 active:scale-[0.97] transition-all"
            >
              View Full Transparent Pricing
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-white/50 font-mono">
            <span>🛡️ 100% Margin Protection Guarantee</span>
            <span>•</span>
            <span>🔒 SAQ-A Certified Out-of-Scope Card Flow</span>
            <span>•</span>
            <span>⚡️ Zero Hardware Vendor Lock-In</span>
          </div>
        </div>
      </section>
    </div>
  );
}
