import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RecipeOS — Free & Open Source Recipe Platform',
  description:
    'RecipeOS is always free, MIT-licensed, and community-driven. The recipe vault, pantry integration, scale engine, and prep planner that powers CulinaryOS.',
};

const features = [
  {
    icon: '📖',
    title: 'Recipe Vault',
    description:
      'Store, organize, and version-control your entire recipe library. Rich ingredient lists, instructions, yield definitions, and allergen tags.',
  },
  {
    icon: '🥫',
    title: 'Pantry Integration',
    description:
      'Live two-way sync with CulinaryOS pantry. When an order fires, RecipeOS automatically deducts ingredient quantities from your on-hand stock.',
  },
  {
    icon: '⚖️',
    title: 'Scale Engine',
    description:
      'Instantly scale any recipe to any yield — from a single serving to 200 covers. Unit conversions and yield percentages handled automatically.',
  },
  {
    icon: '📋',
    title: 'Prep Planner',
    description:
      'Generate prep lists based on forecasted covers, par levels, and current pantry. Pull lists ready for your AM prep team every morning.',
  },
];

const stats = [
  { value: 'MIT', label: 'License — free forever' },
  { value: '100%', label: 'Open source codebase' },
  { value: '∞', label: 'Recipes, no limits' },
  { value: '0', label: 'Cost to self-host' },
];

export default function RecipeOSPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-28 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-green-500/10 blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full bg-green-500/10 text-green-400 text-sm font-semibold mb-6">
            MIT License · Free Forever
          </span>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            <span className="text-green-400">RecipeOS</span>
          </h1>
          <p className="text-xl sm:text-2xl text-white/60 mb-4 font-light">
            The open-source recipe platform at the heart of CulinaryOS.
          </p>
          <p className="text-white/40 text-base max-w-xl mx-auto mb-10">
            Recipe Vault, Pantry Integration, Scale Engine, and Prep Planner — free for every cook,
            restaurateur, and developer on the planet. Forever.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 font-semibold text-lg hover:bg-green-500/20 active:scale-95 transition-all"
            >
              ⭐ Use RecipeOS Free (GitHub)
            </a>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl gradient-bg text-white font-semibold text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-orange/20"
            >
              Upgrade to CulinaryOS →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-bold text-green-400 mb-1">{s.value}</div>
              <div className="text-sm text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything in RecipeOS is{' '}
              <span className="text-green-400">free</span>
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              No feature gating. No free tier limitations. The full platform, yours forever.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass rounded-2xl border border-green-500/10 hover:border-green-500/20 p-7 transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community callout */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto glass rounded-2xl border border-white/10 p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                The community driver for CulinaryOS
              </h2>
              <p className="text-white/60 leading-relaxed mb-5">
                RecipeOS is not just a free product — it is the open-source engine that CulinaryOS is built on.
                Community contributions to RecipeOS flow directly into the CulinaryOS platform.
              </p>
              <p className="text-white/50 text-sm leading-relaxed">
                When you contribute a recipe integration, improve the scale engine, or add a new allergen tag system,
                you&apos;re improving the platform for thousands of restaurants around the world.
              </p>
            </div>
            <div className="glass rounded-2xl border border-white/10 p-6 bg-white/[0.02] font-mono text-sm">
              <div className="text-green-400 mb-1"># Clone and run RecipeOS</div>
              <div className="text-white/50">git clone</div>
              <div className="text-white/70 break-all">
                github.com/ShadowWalkerNC/CulinaryOS
              </div>
              <div className="text-white/50 mt-2">cd CulinaryOS</div>
              <div className="text-white/50">pnpm install</div>
              <div className="text-white/70">pnpm --filter @culinaryos/app-recipeos dev</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 border-t border-white/10 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-5">
            Ready for the full platform?
          </h2>
          <p className="text-white/50 mb-8">
            RecipeOS is always free. Upgrade to CulinaryOS for POS, KDS, online ordering, and AI ops tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-400 font-semibold hover:bg-green-500/20 transition-colors"
            >
              View on GitHub
            </a>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl gradient-bg text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-brand-orange/20"
            >
              See CulinaryOS Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
