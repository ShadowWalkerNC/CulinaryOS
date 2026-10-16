import React from 'react';
import {
  MarketingHeader,
  ChefHat,
  Users,
  ShieldCheck,
  CreditCard,
  WifiOff,
  Code2,
  ExternalLink,
  Scale,
  Sparkles,
  ArrowRight,
  Terminal,
} from '@culinaryos/ui';

interface LeadershipMember {
  name: string;
  handle: string;
  role: string;
  bio: string;
  focus: string[];
  github: string;
}

const leadership: LeadershipMember[] = [
  {
    name: 'Nathaniel',
    handle: '@ShadowWalkerNC',
    role: 'Founder, CEO & Principal Architect',
    bio: 'Systems engineer, former restaurant operator, and security lead. Passionate about eliminating proprietary hardware vendor lock-ins and building offline-first systems for the hospitality industry.',
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
      'We believe restaurants are the backbone of local communities and should never be extorted with 3% processing spreads, $69/terminal monthly taxes, or 30% delivery kickbacks. We build bring-your-own-Stripe so you keep 100% of your margins.',
    icon: CreditCard,
    color: 'text-emerald-500 bg-emerald-50 border-emerald-200',
  },
  {
    title: 'Zero-Cloud Failure Mode',
    description:
      'Saturday night dinner rush cannot depend on an AWS data center in Virginia. CulinaryOS executes orders, fires courses, and prints thermal chits locally with sub-millisecond latency. Cloud is a replication sink, never a single point of failure.',
    icon: WifiOff,
    color: 'text-amber-500 bg-amber-50 border-amber-200',
  },
  {
    title: 'Open Source Core (RecipeOS)',
    description:
      'Fundamental culinary formulas, ratio scaling, and baker’s percentages should be public goods. We open-sourced RecipeOS under the MIT license so every cook on Earth has free access forever.',
    icon: ChefHat,
    color: 'text-violet-500 bg-violet-50 border-violet-200',
  },
  {
    title: 'Code-Enforced FLSA Ethics',
    description:
      'We hardcode Fair Labor Standards Act compliance into our labor engines. Managers and supervisors are barred from taking tip pool shares by cryptographic database invariants, protecting operators from federal DOL audits.',
    icon: Scale,
    color: 'text-sky-500 bg-sky-50 border-sky-200',
  },
];

export function TeamPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#090d16] font-sans antialiased selection:bg-[#090d16] selection:text-white flex flex-col">
      {/* 1. INDUSTRIAL TELEMETRY STRIP */}
      <div className="bg-[#090d16] text-slate-300 text-[11px] font-mono border-b border-slate-800 py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CULINARYOS ENGINE v1.3.0</span>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-slate-400">ORGANIZATION: SHADOWWALKERNC</span>
            <span className="hidden lg:inline text-slate-600">|</span>
            <span className="hidden lg:inline text-slate-400">LEADERSHIP &amp; ENGINEERING GUILD</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="text-emerald-400 font-semibold">SOVEREIGN TECH</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="text-slate-200">MIT LICENSE</span>
          </div>
        </div>
      </div>

      {/* 2. UNIVERSAL MARKETING HEADER */}
      <MarketingHeader currentPath="/team" />

      {/* 3. HERO SECTION */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-6">
            <Users className="w-4 h-4 text-amber-600" />
            <span>The People Behind CulinaryOS</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-950 mb-6 leading-tight">
            Built by Operators, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-800 to-amber-600">
              Engineered for Sovereign Kitchens.
            </span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed font-normal">
            We are a tight-knit team of systems engineers, product strategists, and kitchen veterans dedicated to freeing independent restaurateurs from proprietary software taxes, hardware lock-in, and cloud outages.
          </p>
        </div>

        {/* 4. LEADERSHIP CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 max-w-5xl mx-auto">
          {leadership.map((member) => (
            <div
              key={member.name}
              className="rounded-2xl bg-white border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-amber-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                      {member.name}
                    </h3>
                    <p className="text-sm font-mono text-amber-700 font-semibold">{member.role}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {member.handle}
                  </span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 font-normal">
                  {member.bio}
                </p>
              </div>

              <div>
                <div className="mb-6">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2 font-bold">
                    Key Focus Areas
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {member.focus.map((item) => (
                      <span
                        key={item}
                        className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-900 hover:text-amber-600 transition-colors"
                >
                  <Code2 className="w-4 h-4" />
                  <span>View GitHub Profile &amp; Contributions</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* 5. CORE ARCHITECTURAL PRINCIPLES */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mb-3">
              Our Non-Negotiable Engineering Principles
            </h2>
            <p className="text-sm text-slate-600">
              Every pull request, hardware driver, and financial calculation is benchmarked against four foundational laws.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {corePrinciples.map((principle) => {
              const Icon = principle.icon;
              return (
                <div
                  key={principle.title}
                  className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm hover:border-slate-300 transition-all flex items-start gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${principle.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-slate-950 tracking-tight">
                      {principle.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {principle.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. CALL TO ACTION & GUILD RECRUITING */}
        <div className="rounded-3xl bg-[#090d16] text-white p-8 sm:p-12 text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white font-mono text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Join the Culinary Engineering Guild</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Ready to build the future of restaurant technology?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              We are always looking for passionate line cooks turned software engineers, Rust systems hackers, and hospitality operations veterans. Explore open roles or contribute to the open monorepo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <a
                href="/jobs"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>View Hospitality Careers</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Code2 className="w-4 h-4" />
                <span>Fork on GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-[#090d16] text-white border-t border-slate-800 pt-12 pb-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                <ChefHat className="w-4 h-4" />
              </div>
              <span className="font-bold text-white tracking-tight text-sm">CulinaryOS</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              The Sovereign Restaurant Operating System. High-speed tableside POS, kitchen display rails, and back-office economics.
            </p>
            <p className="font-mono text-[11px] text-slate-500">MIT License · Open Source Forever</p>
          </div>

          <div className="space-y-2">
            <h5 className="font-mono text-slate-200 uppercase font-bold text-[11px]">Stations &amp; Ports</h5>
            <ul className="space-y-1.5 text-slate-400 font-mono text-[11px]">
              <li>POS Terminal (:5172)</li>
              <li>Kitchen Display KDS (:5173)</li>
              <li>Back-Office Admin (:5174)</li>
              <li>KitchenKit Prep (:5175)</li>
              <li>Online Storefront (:5176)</li>
              <li>CulinaryOps Analytics (:5177)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-mono text-slate-200 uppercase font-bold text-[11px]">Hardware Standards</h5>
            <ul className="space-y-1.5 text-slate-400 font-mono text-[11px]">
              <li>Star TSP100 / TSP143IV</li>
              <li>Epson TM-m30 / TM-T20</li>
              <li>RJ11 / RJ12 24V Cash Drawers</li>
              <li>Stripe WisePOS E &amp; S700</li>
              <li>USB Kitchen Bump Bars</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-mono text-slate-200 uppercase font-bold text-[11px]">Open Ecosystem</h5>
            <ul className="space-y-1.5 text-slate-400 font-mono text-[11px]">
              <li>
                <a href="https://github.com/ShadowWalkerNC/CulinaryOS" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  GitHub Monorepo
                </a>
              </li>
              <li>
                <a href="/team" className="hover:text-white transition-colors">
                  Leadership &amp; Team Guild
                </a>
              </li>
              <li>
                <a href="/jobs" className="hover:text-white transition-colors">
                  Restaurant Careers Board
                </a>
              </li>
              <li>
                <a href="/menu/demo" className="hover:text-white transition-colors">
                  Guest Storefront Demo
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
          <p>© 2026 CulinaryOS Contributors. Free and open source under the MIT License.</p>
          <p>Engineered for high-volume commercial food &amp; beverage operations.</p>
        </div>
      </footer>
    </div>
  );
}

export default TeamPage;
