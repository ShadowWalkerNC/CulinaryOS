import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, transparent pricing for CulinaryOS. Start free, scale as you grow. Starter, Pro, and Enterprise plans for every restaurant.',
};

const tiers = [
  {
    name: 'Starter',
    price: '$99',
    period: '/mo per location',
    trial: '14-day free trial',
    description: 'Everything you need to launch a modern restaurant.',
    cta: 'Start Free Trial',
    ctaHref: '/signup',
    featured: false,
    features: [
      'Point of Sale (POS)',
      'Kitchen Display System (KDS)',
      'Online Ordering storefront',
      'Thermal printer support (ESC/POS)',
      '1 Manager account',
      'Basic reporting',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: '$199',
    period: '/mo per location',
    trial: 'Most popular',
    description: 'Full-stack operations for growing restaurants.',
    cta: 'Start Free Trial',
    ctaHref: '/signup',
    featured: true,
    features: [
      'Everything in Starter',
      'KitchenKit (prep planning, par levels)',
      'CulinaryOps (food cost, waste, labor)',
      'Multi-course pacing & 12m/15m line staging',
      'Daily Operations Consultant & Coaching audit',
      'Multi-location management',
      'Advanced reporting & analytics',
      'Reservations module',
      'Loyalty & rewards',
      'Unlimited staff accounts',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    trial: 'Contact us',
    description: 'White-glove deployment for large operators and groups.',
    cta: 'Contact Sales',
    ctaHref: 'mailto:hello@culinaryos.io',
    featured: false,
    features: [
      'Everything in Pro',
      'AI add-ons (Demand Forecasting, Waste Prediction)',
      'Custom extensions & integrations',
      'Dedicated support engineer',
      'SLA guarantee',
      'White-label option',
      'On-site onboarding',
      'Custom contract & invoicing',
    ],
  },
];

const faqs = [
  {
    q: 'Is there really a free trial?',
    a: 'Yes — every new account gets a full 14-day free trial of the Pro plan. No credit card required to start.',
  },
  {
    q: 'What does "per location" mean?',
    a: 'Pricing is per physical location. If you have 3 restaurants, you pay for 3 seats. Multi-location management is included on Pro.',
  },
  {
    q: 'Can I use RecipeOS for free?',
    a: 'Absolutely. RecipeOS is MIT-licensed and free forever. It is also deeply integrated with CulinaryOS Starter, Pro, and Enterprise plans.',
  },
  {
    q: 'What AI add-ons are available?',
    a: 'Recipe AI, Waste Prediction, and Demand Forecasting are available as premium add-ons on any plan. They require the Anthropic API key and are priced per-use.',
  },
  {
    q: 'Do you support offline mode?',
    a: 'Yes. The POS terminal operates fully offline and replays orders through the send/event path upon reconnect.',
  },
  {
    q: 'Is CulinaryOS open source?',
    a: 'CulinaryOS is open-core. The core platform is source-available under a commercial license. RecipeOS (the recipe and pantry layer) is fully MIT-licensed and free forever.',
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-5">
            Simple, honest{' '}
            <span className="gradient-text">pricing</span>
          </h1>
          <p className="text-white/50 text-lg">
            Start free. Scale when you&apos;re ready. No hidden fees, no per-ticket commissions.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 border flex flex-col ${
                tier.featured
                  ? 'border-brand-orange/50 bg-brand-orange/5'
                  : 'border-white/10 glass'
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-white text-xs font-bold">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">{tier.name}</h2>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-white/40 text-sm">{tier.period}</span>
                </div>
                <span className="text-xs text-green-400 font-semibold">{tier.trial}</span>
                <p className="text-sm text-white/50 mt-3">{tier.description}</p>
              </div>

              <ul className="flex-1 space-y-2.5 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-brand-orange mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaHref}
                className={`block w-full text-center py-3 rounded-xl font-semibold transition-all ${
                  tier.featured
                    ? 'gradient-bg text-white hover:opacity-90 shadow-lg shadow-brand-orange/20'
                    : 'glass border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* AI Add-ons callout */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto glass rounded-2xl border border-white/10 p-8 text-center">
          <div className="text-2xl mb-3">🤖</div>
          <h2 className="text-2xl font-bold mb-3">AI Add-ons</h2>
          <p className="text-white/60 max-w-xl mx-auto">
            <strong className="text-white">Recipe AI, Waste Prediction, Demand Forecasting</strong> — available as
            premium add-ons on any plan. Powered by Anthropic Claude. Pay only for what you use.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-5">
            {faqs.map((faq) => (
              <div key={faq.q} className="glass rounded-2xl border border-white/10 p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 border-t border-white/10 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-5">Start your free trial today</h2>
          <p className="text-white/50 mb-8">14 days free · No credit card · Cancel anytime</p>
          <Link
            href="/signup"
            className="inline-block px-10 py-4 rounded-2xl gradient-bg text-white font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-brand-orange/20"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
