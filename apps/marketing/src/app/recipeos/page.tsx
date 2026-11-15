import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RecipeOS — Free & Open Source Recipe Platform',
  description:
    'RecipeOS is always free, MIT-licensed, and community-driven. The recipe vault, pantry integration, scale engine, and prep planner that powers CulinaryOS.',
};

const features = [
  {
    code: '01 / VAULT',
    title: 'Recipe Vault',
    description:
      'Store, organize, and version-control your entire recipe library. Rich ingredient lists, instructions, yield definitions, and allergen tags.',
  },
  {
    code: '02 / PANTRY',
    title: 'Pantry Integration',
    description:
      'Live two-way sync with CulinaryOS pantry. When an order fires, RecipeOS automatically deducts ingredient quantities from your on-hand stock.',
  },
  {
    code: '03 / SCALING',
    title: 'Scale Engine',
    description:
      'Instantly scale any recipe to any yield — from a single serving to 200 covers. Unit conversions and yield percentages handled automatically.',
  },
  {
    code: '04 / PREP',
    title: 'Prep Planner',
    description:
      'Generate prep lists based on forecasted covers, par levels, and current pantry. Pull lists ready for your AM prep team every morning.',
  },
];

const stats = [
  { value: 'MIT', label: 'License — free forever' },
  { value: '100%', label: 'Open source codebase' },
  { value: 'UNLIMITED', label: 'Recipes, no limits' },
  { value: '$0', label: 'Cost to self-host' },
];

export default function RecipeOSPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <section className="py-12 border-b border-[#232832]">
        <div className="max-w-3xl">
          <span className="inline-block px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest mb-4">
            MIT LICENSE • FREE FOREVER
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-4">
            Recipe<span className="text-emerald-400">OS</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            The open-source recipe vault, baker&apos;s percentage scaling engine, and pantry par calculator at the core of CulinaryOS. Free for every chef and kitchen forever.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Clone RecipeOS on GitHub
            </a>
            <Link
              href="/pricing"
              className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-[#141820] border border-[#2a303c] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1c222d] active:scale-[0.97] transition-all duration-75 ease-out"
            >
              View CulinaryOS Cloud Bridge
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-[#232832]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-[#12151b] border border-[#232832] p-6">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 mb-1">{s.value}</div>
              <div className="text-xs text-slate-400 font-mono">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl bg-[#12151b] border border-[#232832] p-6"
            >
              <div className="text-xs font-mono font-bold text-emerald-400 mb-2">{f.code}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
