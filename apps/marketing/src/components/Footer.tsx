import Link from 'next/link';

const footerLinks = {
  HardwareAndOS: [
    { label: 'Point of Sale (POS :5172)', href: '/features#foh' },
    { label: 'Kitchen Display (KDS :5173)', href: '/features#boh' },
    { label: 'Lowest-Cost Split MRP', href: '/features#ops' },
    { label: 'Tableside QR & Pay', href: '/features#foh' },
    { label: 'Pricing & Margin Audit', href: '/pricing' },
    { label: 'RecipeOS Vault (MIT)', href: '/recipeos' },
  ],
  Architecture: [
    { label: 'Rust Workstation Binary', href: '/download' },
    { label: 'REST API v1 Contract', href: 'https://github.com/ShadowWalkerNC/CulinaryOS', external: true },
    { label: 'Universal Operator CLI', href: 'https://github.com/ShadowWalkerNC/CulinaryOS', external: true },
    { label: 'GitHub Repository', href: 'https://github.com/ShadowWalkerNC/CulinaryOS', external: true },
    { label: 'Release Binaries', href: 'https://github.com/ShadowWalkerNC/CulinaryOS/releases', external: true },
  ],
  Company: [
    { label: 'Engineering & Leadership', href: '/team' },
    { label: 'Careers & Guild', href: '/careers' },
    { label: 'Engineering Dispatches', href: '/blog' },
    { label: 'Campaign Studio', href: '/studio' },
  ],
  Compliance: [
    { label: 'FLSA 29 U.S.C. 203(m)(2)(B)', href: '/features#ops' },
    { label: 'Bring Your Own Stripe (SAQ-A)', href: '/pricing' },
    { label: 'Offline Event Bus SLA', href: '/features#platform' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-[#232832] bg-[#090b0e]">
      <div className="border-b border-[#1c2029] py-8 bg-[#0e1116]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border-l-2 border-[#ff6b35] pl-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#ff6b35] font-bold block mb-1">
                01 / ZERO HARDWARE LOCK-IN
              </span>
              <p className="text-xs text-slate-400">Runs on standard Windows workstations, iPads, Android tablets, and ESC/POS printers.</p>
            </div>
            <div className="border-l-2 border-[#ff6b35] pl-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#ff6b35] font-bold block mb-1">
                02 / DIRECT STRIPE INTERCHANGE
              </span>
              <p className="text-xs text-slate-400">Connect your own Stripe Standard account. Zero processor rate spread.</p>
            </div>
            <div className="border-l-2 border-[#ff6b35] pl-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#ff6b35] font-bold block mb-1">
                03 / 100% LOCAL LAN EXECUTION
              </span>
              <p className="text-xs text-slate-400">Embedded SHA-256 Rust engine never drops tickets when internet fails.</p>
            </div>
            <div className="border-l-2 border-[#ff6b35] pl-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#ff6b35] font-bold block mb-1">
                04 / HARDCODED FLSA GATES
              </span>
              <p className="text-xs text-slate-400">Code-enforced manager and supervisor exclusion from all tip pools.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#ff6b35] flex items-center justify-center font-bold text-white">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                CULINARY<span className="text-[#ff6b35]">OS</span>
              </span>
            </Link>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed max-w-sm">
              Industrial restaurant operating system. Native Rust Desktop Workstation (POS, KDS, Back-Office Admin, KitchenKit, CulinaryOps) paired with optional Cloud Bridge replication.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] inline-flex items-center px-4 rounded-lg bg-[#141820] border border-[#2a303c] text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white transition-colors"
              >
                GitHub Monorepo
              </a>
              <a
                href="mailto:hello@culinaryos.io"
                className="min-h-[48px] inline-flex items-center px-4 rounded-lg bg-[#141820] border border-[#2a303c] text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white transition-colors"
              >
                Engineering Desk
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-widest mb-4">
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
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
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

        <div className="mt-14 pt-8 border-t border-[#1c2029] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <p>
            © {new Date().getFullYear()} CulinaryOS Inc. Native Rust Core &amp; RecipeOS MIT-Licensed.
          </p>
          <div className="flex items-center gap-6">
            <span>RUST #![FORBID(UNSAFE_CODE)]</span>
            <span>|</span>
            <span>SAQ-A OUT-OF-SCOPE</span>
            <span>|</span>
            <span>FLSA 203(M)(2)(B)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
