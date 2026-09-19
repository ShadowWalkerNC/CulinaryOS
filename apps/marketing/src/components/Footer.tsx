import Link from 'next/link';

const footerLinks = {
  Product: [
    { label: 'Point of Sale (POS)', href: '/features#foh' },
    { label: 'Kitchen Display (KDS)', href: '/features#boh' },
    { label: 'Lowest-Cost Split MRP', href: '/features#ops' },
    { label: 'Tableside QR & Pay', href: '/features#foh' },
    { label: 'Pricing & Calculator', href: '/pricing' },
    { label: 'RecipeOS Vault (MIT)', href: '/recipeos' },
  ],
  Platform: [
    { label: 'REST API v1', href: 'https://docs.culinaryos.io', external: true },
    { label: 'Universal CLI', href: 'https://docs.culinaryos.io/cli', external: true },
    { label: '9 MCP Servers', href: 'https://docs.culinaryos.io/mcp', external: true },
    { label: 'TypeScript SDK', href: 'https://docs.culinaryos.io/sdk', external: true },
    { label: 'GitHub Repository', href: 'https://github.com/ShadowWalkerNC/CulinaryOS', external: true },
    { label: 'Release Notes', href: 'https://github.com/ShadowWalkerNC/CulinaryOS/releases', external: true },
  ],
  Compliance: [
    { label: 'FLSA Tip Pool Standard', href: '/features#ops' },
    { label: 'Bring Your Own Stripe (SAQ-A)', href: '/pricing' },
    { label: 'Offline Event Bus SLA', href: '/features#platform' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Security & Bug Bounty', href: 'mailto:security@culinaryos.io', external: true },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a] relative overflow-hidden">
      {/* Top Trust Banner */}
      <div className="border-b border-white/5 py-8 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-brand-orange font-bold block mb-1">
                Zero Hardware Lock-In
              </span>
              <p className="text-xs text-white/50">Runs on any standard tablet or PC workstation</p>
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-brand-orange font-bold block mb-1">
                Bring Your Own Stripe
              </span>
              <p className="text-xs text-white/50">Direct wholesale interchange • SAQ-A compliant</p>
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-brand-orange font-bold block mb-1">
                100% Offline-First
              </span>
              <p className="text-xs text-white/50">Local LAN sync never drops tickets during outages</p>
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-brand-orange font-bold block mb-1">
                Hardcoded FLSA Protection
              </span>
              <p className="text-xs text-white/50">Code-enforced manager exclusions from tip pools</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center font-bold text-white shadow-md shadow-brand-orange/20">
                <span>🍽️</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                Culinary<span className="text-brand-orange">OS</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-white/60 leading-relaxed max-w-sm">
              The AI-native restaurant operating system. Point of Sale, Smart Kitchen Display, Lowest-Cost Split MRP, and Back-Office Accounting — with zero hardware markups.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/70 hover:text-white transition-colors"
              >
                <span>GitHub</span>
                <span className="text-white/40">↗</span>
              </a>
              <a
                href="mailto:hello@culinaryos.io"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/70 hover:text-white transition-colors"
              >
                <span>Operator Support</span>
                <span className="text-white/40">↗</span>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest mb-4">
                {group}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {'external' in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/60 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <span>{link.label}</span>
                        <span className="text-[10px] text-white/30">↗</span>
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-white/60 hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Legal bar */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/45">
          <p>
            © {new Date().getFullYear()} CulinaryOS Inc. All rights reserved. RecipeOS is MIT-licensed.
          </p>
          <div className="flex items-center gap-6">
            <span>SOC2 Type II Aligned</span>
            <span>•</span>
            <span>SAQ-A Out-of-Scope</span>
            <span>•</span>
            <span>FLSA Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
