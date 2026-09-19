import Link from 'next/link';
import type { Metadata } from 'next';
import SavingsCalculator from '@/components/SavingsCalculator';

export const metadata: Metadata = {
  title: 'Pricing — CulinaryOS',
  description:
    'Transparent, flat per-location pricing. No per-terminal multipliers, no payment processing markups, no hidden commissions. Bring your own Stripe.',
};

const tiers = [
  {
    name: 'Starter',
    price: '$99',
    period: '/month per location',
    badge: 'Food Trucks & Cafes',
    description: 'Everything you need to run high-volume counter service with zero hardware lock-in.',
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/signup',
    featured: false,
    features: [
      'Full Point of Sale (POS) on any tablet/PC',
      'Kitchen Display System (KDS) with station routing',
      'Universal ESC/POS thermal receipt & kitchen printing',
      '24V cash drawer pulse support',
      'Bring-your-own-Stripe (Interchange pass-through)',
      '100% Offline-first local LAN event bus',
      'Basic sales & payment reporting',
      'Standard email & community support',
    ],
  },
  {
    name: 'Pro',
    price: '$199',
    period: '/month per location',
    badge: 'Most Popular for Full-Service',
    description: 'The complete restaurant operating system for dining rooms, bars, and multi-station kitchens.',
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/signup',
    featured: true,
    features: [
      'Everything in Starter',
      'Multi-course pacing & 12m/15m hold/fire line staging',
      'Dual-language KDS (English + Spanish / French subtitles)',
      'Lowest-Cost Split MRP purchasing (Dennis, Sysco, US Foods)',
      '3-mode tableside QR (View, Pay-at-table, Self-order)',
      'Hardcoded FLSA-compliant tip pooling engine',
      'Automated EOD Z-Report with cash float audit',
      'Batch prep scaling with Baker’s percentages & 2"x2" labels',
      'Unlimited staff PIN accounts & role permissions',
      'Priority 24/7 emergency phone & chat support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'annual billing',
    badge: 'Franchises & Groups',
    description: 'Dedicated multi-unit architecture with brand-wide commissaries, royalties, and white-labeling.',
    cta: 'Talk to Engineering',
    ctaHref: 'mailto:enterprise@culinaryos.io',
    featured: false,
    features: [
      'Everything in Pro',
      'Multi-unit organization parent architecture',
      'Commissary transfers, lot tracking & brand franchise royalties',
      'AI Autopilot demand forecasting & scrap waste prediction',
      'Custom ERP integrations (QuickBooks, NetSuite, Xero)',
      'Custom SLA guarantees (99.99% uptime)',
      'Dedicated migration engineer & custom hardware provisioning',
      'Optional private cloud or on-premise deployment',
    ],
  },
];

const faqs = [
  {
    q: 'Do you charge per terminal or per screen like Toast?',
    a: 'No. CulinaryOS charges a single flat rate per physical location. Whether you run 1 terminal on a food truck or 8 terminals across a large patio and dining room, your software cost remains the exact same flat monthly fee.',
  },
  {
    q: 'Can I really keep my existing iPads, Android tablets, and thermal printers?',
    a: 'Yes. CulinaryOS runs in modern web browsers and desktop shells across standard commercial hardware. It communicates with standard Epson and Star Micronics thermal printers over LAN, Wi-Fi, or USB via ESC/POS.',
  },
  {
    q: 'How does Bring Your Own Stripe work?',
    a: 'You link your own Stripe Connect Standard account. All card-present funds flow directly into your merchant bank account without CulinaryOS taking a cut of your processing margin. You pay direct interchange rates.',
  },
  {
    q: 'Is there a contract or termination fee?',
    a: 'Never. Subscriptions are month-to-month. You can cancel at any time with 1 click from your admin console, and export all your menu, sales, and recipe data instantly.',
  },
];

export default function PricingPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-xs font-semibold text-brand-orange uppercase tracking-wider mb-4">
          <span>Honest, Transparent Pricing</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6">
          Flat Per-Location SaaS.{' '}
          <span className="gradient-text">Zero Per-Screen Tax.</span>
        </h1>
        <p className="text-lg text-white/60 leading-relaxed">
          No hardware markups. No payment processing rake. No per-ticket commissions. Try free for 14 days with zero risk.
        </p>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-3xl p-1.5 ring-1 transition-all flex flex-col justify-between ${
              t.featured
                ? 'bg-gradient-to-b from-brand-orange/20 via-brand-orange/5 to-transparent ring-brand-orange/50 shadow-2xl shadow-brand-orange/10'
                : 'bg-white/[0.03] ring-white/10 hover:ring-white/20'
            }`}
          >
            <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#121212] p-8 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">{t.name}</h2>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold ${
                      t.featured
                        ? 'bg-brand-orange text-white'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {t.badge}
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono">{t.price}</span>
                  <span className="text-xs text-white/50">{t.period}</span>
                </div>

                <p className="text-xs text-white/60 leading-relaxed mb-6 pb-6 border-b border-white/10">
                  {t.description}
                </p>

                <ul className="space-y-3 mb-8">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-white/80 leading-relaxed">
                      <span className="text-brand-orange font-bold mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Link
                  href={t.ctaHref}
                  className={`w-full min-h-[48px] flex items-center justify-center rounded-full font-bold text-sm transition-all active:scale-[0.97] ${
                    t.featured
                      ? 'gradient-bg text-white hover:opacity-95 shadow-lg shadow-brand-orange/25'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {t.cta} →
                </Link>
                <span className="block text-center text-[10px] text-white/40 mt-2 font-mono">
                  14 days free • No card required
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Embedded Interactive Calculator */}
      <div className="mb-24">
        <SavingsCalculator />
      </div>

      {/* FAQs */}
      <div className="max-w-3xl mx-auto mb-20">
        <h2 className="text-3xl font-bold text-white text-center mb-10">Pricing FAQ</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-2xl bg-[#121212] border border-white/10 p-6">
              <h3 className="font-bold text-white text-base mb-2">{faq.q}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
