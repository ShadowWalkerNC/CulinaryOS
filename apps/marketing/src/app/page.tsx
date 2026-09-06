import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CulinaryOS — AI-Native Restaurant Operating System',
  description:
    'One platform. Every surface. Any kitchen. POS, KDS, Online Ordering, KitchenKit, and CulinaryOps — powered by AI.',
};

const features = [
  {
    icon: '🖥️',
    title: 'Point of Sale',
    description:
      'Lightning-fast POS with offline mode, split checks, daypart pricing, and ESC/POS thermal printer support.',
  },
  {
    icon: '📺',
    title: 'Kitchen Display (KDS)',
    description:
      'Real-time tickets with 12m/15m course pacing alerts, sub-second polling efficiency, dual-language support, 86 countdowns, and TV mode.',
  },
  {
    icon: '🛒',
    title: 'Online Ordering & Tableside QR',
    description:
      'Branded storefront with instant tableside buzzer requests, bill splitting, and direct-to-kitchen ticket routing. Zero commission.',
  },
  {
    icon: '🔪',
    title: 'KitchenKit (Prep)',
    description:
      'Recipe scaling, prep planning, par levels, and vendor management — all synced to your live menu.',
  },
  {
    icon: '📊',
    title: 'CulinaryOps (Food Cost & Coaching)',
    description:
      'Daily operations consultant audits, actual vs theoretical food cost, scrap waste, labor %, and FLSA tip pooling.',
  },
  {
    icon: '🤖',
    title: 'AI Layer',
    description:
      'Claude-powered demand forecasting, waste prediction, and ops coaching — strictly additive and off by default.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Sign Up',
    description: 'Create your account and set up your restaurant in minutes — no hardware required to start.',
  },
  {
    step: '02',
    title: 'Configure Menu & Templates',
    description: 'Bootstrap from Food Truck or Full-Service presets, or import custom modifiers, categories, and allergens.',
  },
  {
    step: '03',
    title: 'Go Live',
    description: 'Connect POS hardware, launch your KDS, and start taking online orders immediately.',
  },
];

const platformFeatures = [
  { label: 'REST API', description: 'Full v1 API — every operation accessible programmatically.' },
  { label: 'TypeScript SDK', description: 'Type-safe client for custom integrations and extensions.' },
  { label: '9 MCP Servers', description: 'Model Context Protocol servers for AI-native operator tools.' },
  { label: 'Universal CLI', description: '100% terminal parity across all 15 operational subsystems.' },
];

export default function HomePage() {
  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-orange/10 blur-[120px]" />
        </div>

        <div className="relative text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-white/10 text-sm text-white/60 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Now in active development — v1 coming soon
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
            The{' '}
            <span className="gradient-text">AI-Native</span>
            <br />
            Restaurant Operating System
          </h1>

          <p className="text-xl sm:text-2xl text-white/60 mb-10 font-light">
            One platform. Every surface. Any kitchen.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl gradient-bg text-white font-semibold text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-orange/20"
            >
              Start Free Trial
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl glass border border-white/10 text-white font-semibold text-lg hover:bg-white/10 active:scale-95 transition-all"
            >
              Watch Demo ▶
            </a>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF TICKER ───────────────────────────────── */}
      <section className="py-6 border-y border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-white/40 tracking-widest uppercase font-mono">
            Trusted by independent restaurants across{' '}
            <span className="text-white/70 font-semibold">6 countries</span>
            {' '}· 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇩🇪 🇧🇷
          </p>
        </div>
      </section>

      {/* ─── FEATURES GRID ─────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything a restaurant needs.{' '}
              <span className="gradient-text">All in one OS.</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              From the moment a guest walks in to the time the books close — CulinaryOS runs every surface.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors group"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2 group-hover:gradient-text transition-all">
                  {f.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-white/50 text-lg">Up and running in under an hour.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+3rem)] right-0 h-px bg-white/10" />
                )}
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl gradient-bg flex items-center justify-center text-xl font-bold shadow-lg shadow-brand-orange/20">
                  {s.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLATFORM CALLOUT ──────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for developers.{' '}
              <span className="gradient-text">Loved by operators.</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              CulinaryOS is an open platform. Extend it, automate it, white-label it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {platformFeatures.map((p) => (
              <div key={p.label} className="glass rounded-2xl p-5 border border-white/10">
                <div className="text-xs font-mono text-brand-orange uppercase tracking-widest mb-2">{p.label}</div>
                <p className="text-sm text-white/60">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RECIPEOS CALLOUT ──────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-2xl border border-white/10 p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-green-500/10 blur-[80px]" />
            </div>
            <div className="relative">
              <span className="inline-block px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold uppercase tracking-widest mb-4">
                Always Free · MIT License
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                RecipeOS is free. Forever.
              </h2>
              <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
                Open source. Community-driven. The recipe vault, pantry sync, and scale engine that powers the CulinaryOS platform.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/recipeos"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl glass border border-green-500/30 text-green-400 font-semibold hover:bg-green-500/10 transition-colors"
                >
                  Learn about RecipeOS
                </Link>
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl gradient-bg text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  See Full Platform →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Ready to run a smarter kitchen?
          </h2>
          <p className="text-white/50 text-lg mb-10">
            14-day free trial. No credit card required. Set up in under an hour.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-10 py-4 rounded-2xl gradient-bg text-white font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-brand-orange/20"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-10 py-4 rounded-2xl glass border border-white/10 text-white font-semibold text-lg hover:bg-white/10 transition-all"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
