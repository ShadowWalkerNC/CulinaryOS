import Link from 'next/link';
import type { Metadata } from 'next';
import DemoSection from '@/components/DemoSection';
import SavingsCalculator from '@/components/SavingsCalculator';

export const metadata: Metadata = {
  title: 'CulinaryOS — Industrial Restaurant Operating System',
  description:
    'Native Rust Desktop Workstation (POS, KDS, Back-Office Admin, MRP Purchasing, FLSA Tip Engine) paired with optional Cloud Bridge replication and direct Stripe Connect.',
};

const trustHighlights = [
  {
    code: '01 / NATIVE RUST WORKSTATION',
    title: 'Installed Desktop Application',
    desc: 'Single native binary (culinaryos-desktop.exe) serving POS (:5172), KDS (:5173), Admin (:5174), and embedded SHA-256 local database.',
  },
  {
    code: '02 / SAAS CLOUD BRIDGE',
    title: 'Signed Entitlement Add-Ons',
    desc: 'Connect your local Rust workstation to unlock Cloud Storage Sync, Online Ordering Bridge, and AI Autopilot while retaining 24h offline grace.',
  },
  {
    code: '03 / DIRECT STRIPE CONNECT',
    title: 'Bring Your Own Stripe (SAQ-A)',
    desc: 'Restaurants connect their own Stripe Standard account. Zero processor rate markups and zero PAN/CVV card data touching local servers.',
  },
  {
    code: '04 / FLSA WAGE COMPLIANCE',
    title: 'Hardcoded Tip Pool Gates',
    desc: 'Enforces 29 U.S.C. 203(m)(2)(B) in Rust: owners, managers, and supervisors are strictly excluded from every tip pool with exact cent conservation.',
  },
];

const painPoints = [
  {
    category: '01 / HARDWARE ARCHITECTURE',
    legacy: 'Proprietary $899+ terminals that lock you into a single payment processor and become unusable if you switch.',
    culinary: 'Runs on any Windows workstation, iPad, or Android tablet with standard Epson and Star Micronics ESC/POS printers.',
    stat: '$2,700+ CAP-EX SAVED ON 3 TERMINALS',
  },
  {
    category: '02 / PAYMENT PROCESSING',
    legacy: 'Non-negotiable 2.99% + $0.15 card rates with opaque monthly statement markups and multi-year contracts.',
    culinary: 'Bring your own Stripe Connect Standard account. Keep your direct interchange rates with SAQ-A compliance.',
    stat: '$6,000–$14,000/YR SAVED IN SPREADS',
  },
  {
    category: '03 / DINNER RUSH RELIABILITY',
    legacy: 'Cloud-dependent POS terminals freeze or drop kitchen chits when the restaurant internet connection stutters.',
    culinary: 'Local Rust event bus executes orders, fires courses, and prints chits over LAN with 0ms internet dependency.',
    stat: '100% LOCAL LAN UPTIME',
  },
  {
    category: '04 / DOL & FLSA AUDITS',
    legacy: 'Manual spreadsheet tip-outs risk severe Department of Labor penalties when supervisors are accidentally included.',
    culinary: 'Compile-time FLSA gates block managers and supervisors from tip allocations and export payroll-ready CSVs.',
    stat: '29 U.S.C. 203(M)(2)(B) ENFORCED',
  },
];

const bentoFeatures = [
  {
    code: 'SURFACE :5172',
    tag: 'FRONT OF HOUSE',
    title: 'Point of Sale (POS)',
    description: 'High-speed touch terminal with 3D floor map, seat and course check splitting, bar tabs, and 24V printer-driven cash drawer kick.',
    bullets: ['48x48px physical touch targets', 'Idempotent cash and Stripe Terminal settlement', 'Pre-send vs post-send void inventory tracking'],
  },
  {
    code: 'SURFACE :5173',
    tag: 'BACK OF HOUSE',
    title: 'Kitchen Display System (KDS)',
    description: 'Station-filtered kitchen rail (Hot, Grill, Cold, Fry, Bar) with live elapsed timers, course hold/fire banners, and 1-tap bump.',
    bullets: ['Automatic station routing from POS', 'Course 1 fire / Course 2 hold pacing', '140% commercial wallboard typography'],
  },
  {
    code: 'SURFACE :5174',
    tag: 'BACK OFFICE',
    title: 'Admin & Split MRP Purchasing',
    description: 'Centralized menu engineering, staff PIN permissions, pantry par tracking, and multi-distributor lowest-cost split purchasing.',
    bullets: ['Sysco, US Foods & broadline CSV comparison', 'Automated par shortfall purchase orders', 'Guided restaurant onboarding wizard'],
  },
  {
    code: 'SURFACE :5175',
    tag: 'PREP & YIELD',
    title: 'KitchenKit Prep Scaling',
    description: 'Scale doughs and sub-recipes by cover forecast, calculate baker percentages, and print 2x2 thermal shelf-life labels.',
    bullets: ['Yield multiplier & unit conversion engine', 'FDA Top 9 allergen matrix enforcement', 'AM shift pull list generation'],
  },
  {
    code: 'SURFACE :5176',
    tag: 'GUEST ORDERING',
    title: 'Storefront & Tableside QR',
    description: 'Commission-free online ordering and QR tableside menus relayed into your on-premise Rust KDS via the SaaS Online Ordering Bridge.',
    bullets: ['HMAC-SHA256 verified order relay', 'Direct-to-station kitchen ticket creation', 'Zero third-party marketplace commissions'],
  },
  {
    code: 'SURFACE :5177',
    tag: 'FINANCIAL CONTROL',
    title: 'CulinaryOps & EOD Z-Report',
    description: 'Daily cash drawer close-out with expected vs counted variance, food cost variance tracking, and FLSA tip pool payroll export.',
    bullets: ['Hours, role-point, sales-% & keep-your-own pools', 'BOH minimum-wage tip credit validation', 'Sealed EOD Z-Report reconciliation'],
  },
];

const competitorMatrix = [
  { feature: 'Standalone Native Rust Workstation Binary', culinary: 'INCLUDED', toast: 'NO', square: 'NO', clover: 'NO' },
  { feature: 'Bring Your Own Stripe Connect (SAQ-A)', culinary: 'INCLUDED', toast: 'NO', square: 'NO', clover: 'NO' },
  { feature: 'Zero Hardware Lock-In (Any PC / Tablet / ESC-POS)', culinary: 'INCLUDED', toast: 'NO', square: 'PARTIAL', clover: 'NO' },
  { feature: '100% Offline Local LAN POS -> KDS Execution', culinary: 'INCLUDED', toast: 'LIMITED', square: 'LIMITED', clover: 'LIMITED' },
  { feature: 'Flat Location Pricing (Zero Per-Screen Fees)', culinary: 'INCLUDED', toast: 'NO', square: 'NO', clover: 'NO' },
  { feature: 'Hardcoded FLSA 203(m)(2)(B) Manager Exclusion', culinary: 'INCLUDED', toast: 'MANUAL', square: 'MANUAL', clover: 'MANUAL' },
  { feature: 'Multi-Distributor Lowest-Cost Split MRP', culinary: 'INCLUDED', toast: 'ADD-ON', square: 'NO', clover: 'NO' },
  { feature: 'Open-Source MIT RecipeOS Core', culinary: 'INCLUDED', toast: 'NO', square: 'NO', clover: 'NO' },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden selection:bg-[#ff6b35] selection:text-white">
      <aside aria-label="Quick mobile signup" className="fixed bottom-0 left-0 right-0 p-3 bg-[#0b0d10]/95 backdrop-blur-md border-t border-[#232832] md:hidden z-40 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-400 font-mono uppercase">RUST WORKSTATION + SAAS</span>
          <span className="text-xs font-bold text-white">Free Local App • 14-Day Cloud Trial</span>
        </div>
        <Link
          href="/download"
          className="min-h-[48px] px-4 rounded-lg bg-[#ff6b35] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center active:scale-[0.97] transition-all duration-75 ease-out"
        >
          Install App
        </Link>
      </aside>

      {/* HERO SECTION */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#232832]">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded bg-[#141820] border border-[#2a303c] text-xs font-mono text-slate-300 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>CULINARYOS RUST ENGINE v1.3.1</span>
              <span className="text-slate-600">|</span>
              <span className="text-[#ff6b35] font-bold">ON-PREMISE WORKSTATION + CLOUD BRIDGE</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-6">
              Commercial Restaurant OS.{' '}
              <span className="text-[#ff6b35]">Built in Native Rust.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mb-10 leading-relaxed">
              Eliminate $69/month per-terminal fees, proprietary hardware lock-in, and processor rate markups. Every restaurant runs the open-source CulinaryOS Rust Workstation locally on-premise, with optional SaaS Cloud Bridge subscriptions for offsite replication, online ordering, and multi-unit control.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-12">
              <Link
                href="/download"
                className="min-h-[52px] px-7 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center active:scale-[0.97] transition-all duration-75 ease-out"
              >
                Download Rust Workstation (.exe)
              </Link>

              <Link
                href="/signup"
                className="min-h-[52px] px-7 rounded-lg bg-[#141820] hover:bg-[#1c222d] border border-[#2a303c] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center active:scale-[0.97] transition-all duration-75 ease-out"
              >
                Connect SaaS Cloud Bridge
              </Link>

              <a
                href="#demo"
                className="min-h-[52px] px-6 rounded-lg bg-transparent hover:bg-[#141820] border border-[#232832] text-slate-300 hover:text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center active:scale-[0.97] transition-all duration-75 ease-out"
              >
                Inspect POS -&gt; KDS Telemetry
              </a>
            </div>
          </div>

          {/* 4 Architectural Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {trustHighlights.map((t) => (
              <div
                key={t.title}
                className="rounded-xl bg-[#12151b] border border-[#232832] p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-mono font-bold text-[#ff6b35] uppercase tracking-wider mb-2">
                    {t.code}
                  </div>
                  <h2 className="text-base font-bold text-white mb-2">
                    {t.title}
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Live Workstation Surface Map */}
          <div className="mt-8 rounded-xl bg-[#12151b] border border-[#232832] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232832]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs font-bold text-white uppercase tracking-widest">
                  WORKSTATION ARCHITECTURE • 8 INTEGRATED SURFACES + AXUM GATEWAY (:3000)
                </span>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                SHA-256 EMBEDDED DB + HMAC CLOUD BRIDGE
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-5">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-mono block">POS &amp; KDS LATENCY</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">&lt; 1.0 ms LAN</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-mono block">MONEY ARITHMETIC</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">64-Bit Integer Cents</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-mono block">OFFLINE GRACE WINDOW</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">24 Hours Autonomous</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-mono block">PCI-DSS POSTURE</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">SAQ-A Out-of-Scope</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE POS -> KDS DEMO */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#232832] bg-[#0e1116] scroll-mt-16">
        <DemoSection />
      </section>

      {/* 6-SURFACE WORKSTATION GRID */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-12">
          <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-3">
            UNIFIED WORKSTATION SURFACES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Every Station Included in the Desktop Binary.
          </h2>
          <p className="text-slate-400 text-base max-w-2xl">
            Switch surfaces instantly via function keys (F1–F7) inside the Master Workstation shell or open individual station ports on dedicated tablets and kitchen displays across your LAN.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bentoFeatures.map((b) => (
            <div
              key={b.title}
              className="rounded-xl bg-[#12151b] border border-[#232832] hover:border-[#ff6b35]/50 transition-colors p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1c2029]">
                  <span className="text-xs font-mono font-bold text-[#ff6b35]">
                    {b.code}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300 bg-[#181c24] px-2.5 py-1 rounded border border-[#2a303c]">
                    {b.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">
                  {b.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  {b.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#1c2029] space-y-2">
                {b.bullets.map((bullet) => (
                  <div key={bullet} className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                    <span className="text-[#ff6b35] font-bold">+</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SAVINGS CALCULATOR */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-[#232832] bg-[#0e1116]">
        <SavingsCalculator />
      </section>

      {/* ARCHITECTURAL COMPARISON */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-12">
          <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-3">
            OPERATIONAL ECONOMICS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Why Operators Replace Legacy Cloud POS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {painPoints.map((p) => (
            <div
              key={p.category}
              className="rounded-xl bg-[#12151b] border border-[#232832] p-6 flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#ff6b35] font-bold block mb-4">
                  {p.category}
                </span>

                <div className="space-y-3 mb-6">
                  <div className="rounded-lg bg-[#0e1116] border border-[#232832] p-4">
                    <div className="text-[11px] font-mono font-bold text-slate-400 uppercase mb-1">
                      LEGACY VENDOR LOCK-IN (TOAST / SQUARE / CLOVER)
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{p.legacy}</p>
                  </div>

                  <div className="rounded-lg bg-[#0e1116] border border-emerald-500/30 p-4">
                    <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase mb-1">
                      CULINARYOS ARCHITECTURE
                    </div>
                    <p className="text-xs text-white leading-relaxed">{p.culinary}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1c2029] flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">VERIFIED IMPACT</span>
                <span className="font-bold text-emerald-400">{p.stat}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-[#232832] bg-[#12151b]">
          <table className="w-full text-left text-xs font-mono">
            <caption className="sr-only">Feature comparison of CulinaryOS against Toast, Square, and Clover</caption>
            <thead className="border-b border-[#232832] bg-[#0e1116] uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="p-4">System Capability</th>
                <th scope="col" className="p-4 text-[#ff6b35] font-bold text-center bg-[#ff6b35]/10">CulinaryOS</th>
                <th scope="col" className="p-4 text-center">Toast</th>
                <th scope="col" className="p-4 text-center">Square</th>
                <th scope="col" className="p-4 text-center">Clover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2029]">
              {competitorMatrix.map((row) => (
                <tr key={row.feature} className="hover:bg-[#161a22]">
                  <td className="p-4 text-white font-sans font-medium text-sm">{row.feature}</td>
                  <td className="p-4 text-center bg-[#ff6b35]/5 font-bold text-emerald-400">
                    {row.culinary}
                  </td>
                  <td className="p-4 text-center text-slate-400">{row.toast}</td>
                  <td className="p-4 text-center text-slate-400">{row.square}</td>
                  <td className="p-4 text-center text-slate-400">{row.clover}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#232832] bg-[#0e1116]">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-4">
            STEP 1: INSTALL LOCAL WORKSTATION • STEP 2: CONNECT CLOUD BRIDGE
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Deploy CulinaryOS in Your Kitchen Today.
          </h2>
          <p className="text-base text-slate-400 mb-8 max-w-xl mx-auto">
            Download the standalone Rust Workstation binary for free, or provision a SaaS Cloud Bridge grant for offsite backup and online ordering.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/download"
              className="w-full sm:w-auto min-h-[52px] px-8 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Download Rust Workstation
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto min-h-[52px] px-8 rounded-lg bg-[#141820] hover:bg-[#1c222d] border border-[#2a303c] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center active:scale-[0.97] transition-all duration-75 ease-out"
            >
              View Cloud Bridge Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
