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
    bio: 'Systems engineer, former restaurant operator, and security lead. Dedicated to eliminating proprietary hardware lock-in and building deterministic, offline-first systems for hospitality.',
    focus: ['Distributed Systems', 'Native Rust (#![forbid(unsafe_code)])', 'FLSA Wage Integrity', 'Sovereign Postgres'],
    github: 'https://github.com/ShadowWalkerNC',
  },
  {
    name: 'Culinary Engineering Guild',
    handle: 'Core Monorepo Contributors',
    role: 'Full-Stack, BOH & Systems Team',
    bio: 'Line cooks, back-office accountants, and systems engineers building POS, KDS, MRP purchasing, and ESC/POS edge hardware daemons.',
    focus: ['ESC/POS Hardware Drivers', '100% Offline-First LAN Sync', '140% Wallboard UI', 'MRP Split Purchasing'],
    github: 'https://github.com/ShadowWalkerNC/CulinaryOS',
  },
];

const corePrinciples = [
  {
    code: '01 / ECONOMICS',
    title: 'Operator-First Economics',
    description:
      'Restaurants should never be taxed with 3% processing spreads, $69/terminal fees, or 30% delivery commissions. Bring your own Stripe Connect Standard account and keep your margins.',
  },
  {
    code: '02 / RELIABILITY',
    title: 'Zero-Cloud Failure Mode',
    description:
      'Saturday dinner rush cannot depend on external internet connectivity. CulinaryOS executes orders, fires courses, and prints thermal chits locally over LAN.',
  },
  {
    code: '03 / OPEN CORE',
    title: 'Open Source Core (RecipeOS)',
    description:
      'Fundamental culinary formulas, ratio scaling, and baker percentages are public goods released under the MIT license.',
  },
  {
    code: '04 / COMPLIANCE',
    title: 'Code-Enforced FLSA Ethics',
    description:
      'Fair Labor Standards Act compliance is compiled directly into the Rust labor engine. Managers and supervisors are barred from tip pool shares by code.',
  },
];

export default function TeamPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="max-w-3xl mb-16">
        <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-3">
          ENGINEERING &amp; LEADERSHIP
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
          Built by Operators. Engineered for Sovereign Kitchens.
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          Systems engineers, product strategists, and kitchen veterans freeing independent restaurants from proprietary POS lock-in.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {leadership.map((member) => (
          <div
            key={member.name}
            className="rounded-xl bg-[#12151b] border border-[#232832] p-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1c2029]">
                <div>
                  <h2 className="text-xl font-bold text-white">{member.name}</h2>
                  <p className="text-xs font-mono text-[#ff6b35] font-bold">{member.role}</p>
                </div>
                <span className="text-xs font-mono text-slate-300 bg-[#181c24] px-2.5 py-1 rounded border border-[#2a303c]">
                  {member.handle}
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed mb-6">{member.bio}</p>
            </div>

            <div>
              <div className="mb-6">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                  ARCHITECTURAL FOCUS
                </span>
                <div className="flex flex-wrap gap-2">
                  {member.focus.map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2.5 py-1 rounded bg-[#0e1116] border border-[#232832] text-slate-300 font-mono"
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
                className="min-h-[48px] inline-flex items-center px-4 rounded-lg bg-[#181c24] border border-[#2a303c] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#222834]"
              >
                Inspect GitHub Profile
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
        {corePrinciples.map((p) => (
          <div
            key={p.title}
            className="p-6 rounded-xl bg-[#12151b] border border-[#232832]"
          >
            <div className="text-xs font-mono font-bold text-[#ff6b35] mb-2">{p.code}</div>
            <h3 className="text-base font-bold text-white mb-2">{p.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-[#12151b] border border-[#232832] p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">
          Collaborate on the Open-Source Rust Core
        </h2>
        <p className="text-slate-400 text-xs max-w-xl mx-auto mb-6">
          Inspect our Cargo workspace, embedded database invariants, and ESC/POS hardware drivers on GitHub.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/careers"
            className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
          >
            Explore Engineering Guild
          </Link>
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-[#141820] border border-[#2a303c] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1c222d] active:scale-[0.97] transition-all duration-75 ease-out"
          >
            Contribute on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
