import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features',
  description:
    'Full feature breakdown of CulinaryOS: FOH (POS, QR, reservations, loyalty), BOH (KDS, course pacing), Ops (food cost, waste, labor), and Platform (API, CLI, MCP).',
};

const categories = [
  {
    id: 'foh',
    label: 'Front of House (FOH)',
    icon: '🍽️',
    features: [
      {
        title: 'Point of Sale',
        desc: 'Full-featured POS terminal with offline mode, item modifiers, split checks, voids, comps, and ESC/POS thermal printer support.',
      },
      {
        title: 'Floor Map & Table Management',
        desc: 'Visual floor map with drag-and-drop table layouts, real-time occupancy, and server section assignment.',
      },
      {
        title: 'QR Code Ordering',
        desc: 'Guest-facing QR menus that route directly to the kitchen. No app download required.',
      },
      {
        title: 'Daypart Pricing',
        desc: 'Automatic price rule switching across breakfast, lunch, dinner, happy hour, and late-night windows.',
      },
      {
        title: 'Reservations',
        desc: 'Built-in reservation module with waitlist management, SMS confirmations, and floor map integration.',
      },
      {
        title: 'Loyalty & Rewards',
        desc: 'Points-based loyalty system with redemption rules, tiers, and Post-Pilot AI loyalty agent integration.',
      },
    ],
  },
  {
    id: 'boh',
    label: 'Back of House (BOH)',
    icon: '👨‍🍳',
    features: [
      {
        title: 'Kitchen Display System (KDS)',
        desc: 'Real-time ticket board with live aging timers, color-coded urgency states, and one-touch BUMP/FIRE actions.',
      },
      {
        title: 'Dual-Language Tickets',
        desc: 'Display ticket items in English and a second language simultaneously for multilingual kitchen teams.',
      },
      {
        title: 'Course Pacing',
        desc: 'Smart hold-and-release logic for courses — fire appetizers when mains are 8 minutes out.',
      },
      {
        title: '86 Countdown',
        desc: 'When a menu item runs out, KDS automatically surfaces an 86 alert and POSs stop accepting orders for that item.',
      },
      {
        title: 'Prep Scaling (KitchenKit)',
        desc: 'Scale any recipe by yield count, link prep sheets to live par levels, and auto-generate pull lists.',
      },
      {
        title: '140% TV Mode',
        desc: 'Oversized KDS view optimized for wall-mounted TVs and commercial kitchen environments.',
      },
    ],
  },
  {
    id: 'ops',
    label: 'Operations (Ops)',
    icon: '📊',
    features: [
      {
        title: 'Food Cost Tracking',
        desc: 'Automatic cost-of-goods calculation per menu item, linked to live pantry deductions and vendor invoices.',
      },
      {
        title: 'Waste Logging',
        desc: 'Log waste events by item, quantity, and reason. AI-powered waste prediction helps reduce over-prep.',
      },
      {
        title: 'Z-Report & EOD',
        desc: 'End-of-day report with gross sales, voids, comps, tax breakdown, and payment method split.',
      },
      {
        title: 'Tip Pooling',
        desc: 'Configurable tip distribution rules by role, hours worked, or sales percentage with export for payroll.',
      },
      {
        title: 'Labor Analytics',
        desc: 'Track labor hours, clock-in/out, overtime alerts, and labor-to-revenue ratio in real time.',
      },
      {
        title: 'Vendor Management',
        desc: 'Manage supplier contacts, purchase orders, and invoice reconciliation in one place.',
      },
    ],
  },
  {
    id: 'platform',
    label: 'Platform & Developer',
    icon: '⚙️',
    features: [
      {
        title: 'REST API (v1)',
        desc: 'Every operation in CulinaryOS is API-accessible. Orders, menus, tickets, pantry, staff, reports — all exposed.',
      },
      {
        title: 'CLI',
        desc: 'Operator command-line tool for migrations, seeding, health checks, and scripted automation.',
      },
      {
        title: '9 MCP Servers',
        desc: 'Model Context Protocol servers covering orders, recipes, pantry, waste, ops analytics, and more — wired for AI agents.',
      },
      {
        title: 'TypeScript SDK',
        desc: 'Type-safe client library for building custom integrations, dashboards, and extensions.',
      },
      {
        title: 'Extension Marketplace',
        desc: 'Public extension template for third-party developers. Build and publish integrations for any restaurant vertical.',
      },
      {
        title: 'Multi-Tenant Ready',
        desc: 'Row-level security on every table. Full tenant isolation for restaurant groups, franchises, and SaaS deployments.',
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-5">
            Every feature your restaurant needs,{' '}
            <span className="gradient-text">in one platform</span>
          </h1>
          <p className="text-white/50 text-lg">
            CulinaryOS covers the full operational stack — from the first order of the day to the final Z-report.
          </p>
        </div>
      </section>

      {categories.map((cat) => (
        <section key={cat.id} id={cat.id} className="pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-10">
              <span className="text-3xl">{cat.icon}</span>
              <h2 className="text-2xl sm:text-3xl font-bold">{cat.label}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cat.features.map((f) => (
                <div
                  key={f.title}
                  className="glass rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-colors"
                >
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Bottom CTA */}
      <section className="py-20 px-4 border-t border-white/10 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-5">See it in action</h2>
          <p className="text-white/50 mb-8">Start your 14-day free trial and explore every feature hands-on.</p>
          <a
            href="/signup"
            className="inline-block px-10 py-4 rounded-2xl gradient-bg text-white font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-brand-orange/20"
          >
            Start Free Trial
          </a>
        </div>
      </section>
    </>
  );
}
