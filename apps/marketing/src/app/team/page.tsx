import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Team & Leadership — CulinaryOS',
  description:
    'Meet the engineering, product, and culinary operators behind CulinaryOS — building open-core, sovereign restaurant technology.',
};

const leadership = [
  {
    name: 'Nathaniel',
    handle: '@ShadowWalkerNC',
    role: 'Founder, CEO & Principal Architect',
    bio: 'Systems engineer, former restaurant operator, and security lead. Passionate about eliminating legacy proprietary hardware vendor locks and building offline-first systems for the hospitality industry.',
    focus: ['Distributed Systems', 'POSIX / Native Rust', 'FLSA Wage Integrity', 'Sovereign Postgres'],
    github: 'https://github.com/ShadowWalkerNC',
  },
  {
    name: 'Culinary Engineering Guild',
    handle: 'Core Monorepo Contributors',
    role: 'Full-Stack, BOH & Systems Team',
    bio: 'Experienced line cooks, back-office accountants, and distributed systems engineers building POS, KDS, MRP purchasing, and edge daemons.',
    focus: ['ESC/POS Hardware Drivers', '100% Offline-First LAN Sync', 'High-Heat 140% TV UI', 'MRP Split Purchasing'],
    github: 'https://github.com/ShadowWalkerNC/CulinaryOS',
  },
];

const corePrinciples = [
  {
    title: 'Operator-First Economics',
    description:
      'We believe restaurants are the backbone of local communities and should never be extorted with 3% processing spreads, $69/terminal taxes, or 30% delivery kickbacks. We build bring-your-own-Stripe so you keep 100% of your margins.',
    icon: '💳',
  },
  {
    title: 'Zero-Cloud Failure Mode',
    description:
      'Saturday night dinner rush cannot depend on an AWS data center in Virginia. CulinaryOS executes orders, fires courses, and prints thermal chits locally with sub-millisecond latency. Cloud is a replication sink, never a single point of failure.',
    icon: '⚡',
  },
  {
    title: 'Open Source Core (RecipeOS)',
    description:
      'Fundamental culinary formulas, ratio scaling, and baker’s percentages should be public goods. We open-sourced RecipeOS under the MIT license so every cook on Earth has free access forever.',
    icon: '📖',
  },
  {
    title: 'Code-Enforced FLSA Ethics',
    description:
      'We hardcode Fair Labor Standards Act compliance into our labor engines. Managers and supervisors are barred from taking tip pool shares by cryptographic database invariants, protecting operators from federal DOL audits.',
    icon: '⚖️',
  },
];

export default function TeamPage() {
  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-20">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-xs font-semibold text-brand-orange uppercase tracking-wider mb-6">
          <span>👥 The People Behind the Platform</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6">
          Built by Operators, <br />
          <span className="gradient-text">Engineered for Sovereign Kitchens.</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/70 leading-relaxed font-light">
          We are a tight-knit team of systems engineers, product strategists, and kitchen veterans dedicated to freeing independent restaurateurs from proprietary software lock-in.
        </p>
      </div>

      {/* Leadership & Core Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 max-w-5xl mx-auto">
        {leadership.map((member) => (
          <div
            key={member.name}
            className="rounded-3xl bg-white/[0.03] border border-white/10 p-8 flex flex-col justify-between hover:border-brand-orange/40 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-brand-orange transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-sm font-mono text-brand-orange/90 font-medium">{member.role}</p>
                </div>
                <span className="text-xs font-mono text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                  {member.handle}
                </span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-6">{member.bio}</p>
            </div>

            <div>
              <div className="mb-6">
                <span className="text-xs font-mono uppercase tracking-wider text-white/40 block mb-2">
                  Key Focus Areas
                </span>
                <div className="flex flex-wrap gap-2">
                  {member.focus.map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 font-mono"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition-colors"
              >
                <span>View GitHub Profile</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Guiding Principles */}
      <div className="mb-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Our Core Philosophy</h2>
          <p className="text-white/60 text-sm sm:text-base">
            Every architectural decision, data invariant, and UI interaction follows four non-negotiable pillars.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {corePrinciples.map((p) => (
            <div
              key={p.title}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="text-3xl mb-4">{p.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Join the Mission CTA */}
      <div className="rounded-3xl bg-gradient-to-r from-brand-orange/20 via-brand-red/10 to-transparent border border-brand-orange/30 p-8 sm:p-12 text-center max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Want to build the future of food service technology?
        </h2>
        <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto mb-8">
          Whether you run a 3-star kitchen, operate a food truck fleet, or write native edge code, we’d love to collaborate.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/careers"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full gradient-bg text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-orange/20"
          >
            Explore Careers &amp; Guild
          </Link>
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/5 border border-white/15 text-white font-semibold text-sm hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            Contribute on GitHub ↗
          </a>
        </div>
      </div>
    </div>
  );
}
