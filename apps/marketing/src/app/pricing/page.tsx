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
    name: 'Open-Source Core',
    price: '$0',
    period: '/forever (MIT License)',
    badge: 'FREE OUT OF THE BOX',
    description: 'Complete local-first POS, KDS, Back-Office, and deterministic Chef\'s Intelligence math. Zero cloud lock-in.',
    cta: 'Download Free Workstation',
    ctaHref: '/download',
    featured: false,
    features: [
      'Standalone Native Rust Workstation on Port 3000 (embedded local DB)',
      'Unlimited POS terminals, 2D floor plan, multi-course hold/fire, split checks & bar tabs',
      'Unlimited KDS kitchen screens (Hot, Cold, Grill, Fry, Pastry, Bar, Expo) & bilingual chits',
      'Direct LAN TCP :9100 & USB ESC/POS printing with automatic backup printer failover + 24V drawer kick',
      'Hardcoded FLSA 29 U.S.C. 203(m)(2)(B) tip pool engine, payroll CSV & automated EOD Z-Reports',
      'Unlimited staff PIN accounts, RBAC roles & Bring-Your-Own Stripe Connect (0% platform markup)',
      '39 deterministic Chef\'s Intelligence calculators (72% GP dish costing, 14-allergen matrix, WTR 11h rota audit, Baker\'s %)',
      'Full CLI (culinary) & TypeScript SDK (@culinaryos/sdk)',
    ],
  },
  {
    name: 'Cloud Pro & AI Autopilot',
    price: '$49',
    period: '/month flat per location',
    badge: 'MOST POPULAR SAAS',
    description: 'Connects your local workstation to encrypted Cloud Backup, Commission-Free Online Ordering, and Beta AI Autopilot.',
    cta: 'Start Cloud Pro Trial',
    ctaHref: '/signup?plan=pro',
    featured: true,
    features: [
      'Everything in Open-Source Core ($0 per-terminal fee for unlimited screens)',
      'cloud_storage: Encrypted SHA-256 offsite backup replication & remote owner web dashboard',
      'online_ordering: Hosted commission-free online storefront & QR table ordering relayed to local KDS',
      'ai_autopilot (Beta, off-by-default): Full 121-skill Chef\'s Intelligence generative workflows & predictive 86-ing',
      'Weather & daypart prep demand forecasting + OCR menu & invoice ingestion',
      'Campaign Studio (Post-Pilot): Automated social media scheduling & brand voice guard',
      'Per-tenant ai_prompt_log token cost & budget dashboard',
      '72-hour offline entitlement grace window (local POS/KDS never locks out)',
    ],
  },
  {
    name: 'Enterprise & Commissary',
    price: '$149',
    period: '/month per location',
    badge: 'MULTI-UNIT & MRP',
    description: 'Multi-location organization rollups, central commissary production aggregation, and multi-distributor MRP split ordering.',
    cta: 'Start Enterprise Setup',
    ctaHref: '/signup?plan=enterprise',
    featured: false,
    features: [
      'Everything in Cloud Pro & AI Autopilot across multi-unit groups',
      'multi_unit_commissary: Central commissary production aggregation & inter-store transfer orders',
      'Parent organization hierarchy (V17) with strict per-location PostgreSQL RLS isolation',
      'Multi-Distributor Lowest-Cost Split MRP Optimizer (Sysco, US Foods, Dennis Food Service)',
      'Electronic Invoice Price Variance (IPV) auditing & prime cost anomaly alerts',
      'Custom ERP integrations (QuickBooks, NetSuite, Xero) & priority 24/7 SLA',
    ],
  },
];

const faqs = [
  {
    q: 'Do you charge per terminal or per screen like Toast?',
    a: 'No. CulinaryOS charges a single flat rate per physical location. Whether you run 1 terminal on a food truck or 8 terminals across a large patio and dining room, your software cost remains the exact same flat monthly fee.',
  },
  {
    q: 'Can I keep my existing iPads, Android tablets, and thermal printers?',
    a: 'Yes. CulinaryOS runs in modern web browsers and desktop shells across standard commercial hardware. It communicates with standard Epson and Star Micronics thermal printers over LAN, Wi-Fi, or USB via ESC/POS.',
  },
  {
    q: 'How does Bring Your Own Stripe work?',
    a: 'You link your own Stripe Connect Standard account. All card-present funds flow directly into your merchant bank account without CulinaryOS taking a cut of your processing margin. You pay direct interchange rates.',
  },
  {
    q: 'Is the local Rust Workstation required even with a SaaS plan?',
    a: 'Yes. Every restaurant installs culinaryos-desktop.exe (or culinaryos-site.exe) locally so POS, KDS, printers, and cash drawers execute over LAN with zero internet dependency. Your SaaS plan issues a cryptographic SignedSaasGrant that unlocks cloud backup, online order relay, and multi-unit sync.',
  },
];

export default function PricingPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="max-w-3xl mb-14">
        <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-3">
          CLOUD BRIDGE LICENSING
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Flat Per-Location SaaS.{' '}
          <span className="text-[#ff6b35]">Zero Per-Screen Tax.</span>
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          The standalone Rust Workstation is free and open-source forever. Add a SaaS Cloud Bridge subscription to connect your installed workstation to offsite SHA-256 replication, online ordering, and AI Autopilot.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-xl p-7 border flex flex-col justify-between ${
              t.featured
                ? 'bg-[#12151b] border-[#ff6b35]'
                : 'bg-[#12151b] border-[#232832]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1c2029]">
                <h2 className="text-lg font-bold text-white">{t.name}</h2>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                    t.featured
                      ? 'bg-[#ff6b35] text-white'
                      : 'bg-[#181c24] text-slate-300 border border-[#2a303c]'
                  }`}
                >
                  {t.badge}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 mb-4">
                <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono">{t.price}</span>
                <span className="text-xs font-mono text-slate-400">{t.period}</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-6 pb-6 border-b border-[#1c2029]">
                {t.description}
              </p>

              <ul className="space-y-3 mb-8">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed font-mono">
                    <span className="text-[#ff6b35] font-bold">+</span>
                    <span className="font-sans">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Link
                href={t.ctaHref}
                className={`w-full min-h-[48px] flex items-center justify-center rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-75 ease-out active:scale-[0.97] ${
                  t.featured
                    ? 'bg-[#ff6b35] hover:bg-[#e85d2a] text-white'
                    : 'bg-[#181c24] hover:bg-[#222834] text-white border border-[#2a303c]'
                }`}
              >
                {t.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-20">
        <SavingsCalculator />
      </div>

      <div className="max-w-3xl mx-auto mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Licensing &amp; Architecture FAQ</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-xl bg-[#12151b] border border-[#232832] p-6">
              <h3 className="font-bold text-white text-sm mb-2">{faq.q}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
