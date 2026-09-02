import Link from 'next/link';

const footerLinks = {
  Product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'RecipeOS', href: '/recipeos' },
    { label: 'Blog', href: '/blog' },
    { label: 'Changelog', href: '/blog' },
  ],
  Company: [
    { label: 'About', href: '/#about' },
    { label: 'Docs', href: 'https://docs.culinaryos.io', external: true },
    { label: 'GitHub', href: 'https://github.com/ShadowWalkerNC/CulinaryOS', external: true },
    { label: 'Discord', href: '#', external: true },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'MIT License', href: 'https://github.com/ShadowWalkerNC/CulinaryOS/blob/main/LICENSE', external: true },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-2xl font-bold gradient-text">CulinaryOS</Link>
            <p className="mt-3 text-sm text-white/50 leading-relaxed">
              The AI-native restaurant operating system. Open source, battle-tested, built for independent operators.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors text-sm"
              >
                GitHub ↗
              </a>
              <a
                href="#"
                className="text-white/40 hover:text-white transition-colors text-sm"
              >
                Twitter/X ↗
              </a>
              <a
                href="#"
                className="text-white/40 hover:text-white transition-colors text-sm"
              >
                Discord ↗
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">{group}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {'external' in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/60 hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} CulinaryOS. Open source under MIT License.
          </p>
          <p className="text-xs text-white/30">
            Built for the world&apos;s independent restaurants. 🍽️
          </p>
        </div>
      </div>
    </footer>
  );
}
