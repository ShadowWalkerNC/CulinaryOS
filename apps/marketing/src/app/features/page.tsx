import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Features — CulinaryOS',
  description:
    'Full feature breakdown of CulinaryOS: FOH (POS, QR, reservations, loyalty), BOH (KDS, course pacing), Ops (food cost, waste, labor), and Platform (API, CLI, MCP).',
};

const categories = [
  {
    id: 'foh',
    code: '01 / FOH :5172',
    label: 'Front of House (FOH)',
    features: [
      {
        title: 'Point of Sale Terminal',
        desc: 'High-speed touch POS terminal with offline mode, item modifiers, seat and course split checks, voids, comps, and ESC/POS thermal printer support.',
      },
      {
        title: 'Floor Map & Table Management',
        desc: 'Visual floor map with table layouts, real-time occupancy states, and server section ownership.',
      },
      {
        title: 'QR Code Ordering',
        desc: 'Guest-facing QR menus that route directly to kitchen stations with zero third-party commission fees.',
      },
      {
        title: 'Daypart Pricing',
        desc: 'Automatic price rule switching across breakfast, lunch, dinner, happy hour, and late-night windows.',
      },
      {
        title: 'Reservations & Waitlist',
        desc: 'Built-in reservation module with waitlist management, table turn tracking, and floor map integration.',
      },
      {
        title: 'Bar Tabs & Fast Cash',
        desc: 'One-tap bar tab pre-authorization and idempotent cash drawer settlement with 24V RJ11/RJ12 pulse.',
      },
    ],
  },
  {
    id: 'boh',
    code: '02 / BOH :5173',
    label: 'Back of House (BOH)',
    features: [
      {
        title: 'Kitchen Display System (KDS)',
        desc: 'Real-time station ticket board with live aging timers, color-coded SLA states, and one-touch BUMP/FIRE actions.',
      },
      {
        title: 'Dual-Language Tickets',
        desc: 'Display ticket items in English and Spanish/French simultaneously for multilingual kitchen teams.',
      },
      {
        title: 'Course Pacing',
        desc: 'Hold-and-fire course orchestration across Hot, Grill, Cold, Fry, and Bar stations.',
      },
      {
        title: '86 Countdown',
        desc: 'When a menu item runs out, KDS surfaces an immediate 86 lock across all POS terminals and web menus.',
      },
      {
        title: 'Prep Scaling (KitchenKit :5175)',
        desc: 'Scale recipes by cover forecast, link prep sheets to live par levels, and generate AM pull lists.',
      },
      {
        title: '140% Wallboard Mode (:5178)',
        desc: 'High-contrast view engineered for wall-mounted kitchen TVs and expo pass monitors.',
      },
    ],
  },
  {
    id: 'ops',
    code: '03 / OPS :5177',
    label: 'Operations & Finance (Ops)',
    features: [
      {
        title: 'Food Cost & Recipe Margin',
        desc: 'Automatic cost-of-goods calculation per dish linked to live pantry deductions and purveyor invoices.',
      },
      {
        title: 'Waste Logging',
        desc: 'Log pre-send and post-send waste events by item, quantity, and reason code.',
      },
      {
        title: 'EOD Z-Report & Drawer Audit',
        desc: 'End-of-day reconciliation with opening float, cash sales, counted cash, and exact variance tracking.',
      },
      {
        title: 'FLSA Tip Pool Engine',
        desc: 'Enforces 29 U.S.C. 203(m)(2)(B) manager exclusion in Rust across hours-weighted, role-point, and sales-% pools.',
      },
      {
        title: 'Lowest-Cost Split MRP (:5174)',
        desc: 'Compare Sysco, US Foods, and regional broadline catalogs to split purchase orders for lowest unit cost.',
      },
      {
        title: 'Multi-Unit Commissary',
        desc: 'Cross-location commissary transfer orders and organization-level financial rollups.',
      },
    ],
  },
  {
    id: 'platform',
    code: '04 / ENGINE :3000',
    label: 'Rust Engine & Cloud Bridge',
    features: [
      {
        title: 'Embedded SHA-256 Store',
        desc: 'Atomic temp-file + fsync local persistence verified by SHA-256 envelope checksums on every boot.',
      },
      {
        title: 'HMAC-SHA256 Cloud Bridge',
        desc: 'Cryptographic SignedSaasGrant verification unlocking offsite backup and online order relay.',
      },
      {
        title: 'REST API (v1)',
        desc: 'Every operation in CulinaryOS is accessible over HTTP JSON with deterministic idempotency keys.',
      },
      {
        title: 'Operator CLI',
        desc: 'Terminal command suite for migrations, health diagnostics, and headless verification.',
      },
      {
        title: 'Row-Level Security (RLS)',
        desc: 'Strict tenant isolation on every cloud Postgres table with zero service_role exposure to clients.',
      },
      {
        title: 'Interagency Read Bridge',
        desc: 'Off-by-default OAuth 2.0 PKCE read-only projections with zero PII, zero card data, and zero payroll exposure.',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="max-w-3xl mb-16">
        <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-3">
          SYSTEM SPECIFICATION
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Full-Stack Restaurant Operating System.
        </h1>
        <p className="text-slate-400 text-base">
          CulinaryOS unifies front-of-house ordering, back-of-house kitchen pacing, purchasing MRP, and FLSA wage compliance in a single native workstation.
        </p>
      </div>

      <div className="space-y-16">
        {categories.map((cat) => (
          <section key={cat.id} id={cat.id} className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[#232832]">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35]">
                {cat.code}
              </span>
              <h2 className="text-2xl font-bold text-white">{cat.label}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cat.features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl bg-[#12151b] border border-[#232832] p-6"
                >
                  <h3 className="font-bold text-white text-base mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-20 pt-16 border-t border-[#232832] text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Deploy the Workstation</h2>
          <p className="text-slate-400 text-sm mb-8">Install the local Rust binary or provision a Cloud Bridge account.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/download"
              className="min-h-[48px] inline-flex items-center justify-center px-8 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Download Rust Workstation
            </Link>
            <Link
              href="/signup"
              className="min-h-[48px] inline-flex items-center justify-center px-8 rounded-lg bg-[#141820] border border-[#2a303c] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1c222d] active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Create Cloud Bridge Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
