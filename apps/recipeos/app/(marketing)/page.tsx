import Link from 'next/link';

const FEATURES = [
  {
    icon: '🗂️',
    title: 'Recipe Vault',
    description: 'Store and organize all your recipes in one place. Tag, categorize, and find anything instantly.',
  },
  {
    icon: '⚖️',
    title: 'Smart Scaling',
    description: 'Scale any recipe up or down in real time. Ratio-based engine handles fractions and unit conversions automatically.',
  },
  {
    icon: '🥦',
    title: 'Pantry Tracker',
    description: 'Track what you have on hand. Get low-stock alerts before you run out of key ingredients.',
  },
  {
    icon: '📋',
    title: 'Prep Lists',
    description: 'Break recipes into timed prep tasks by station. Check off tasks as you go — solo or with a team.',
  },
  {
    icon: '🤖',
    title: 'MCP Server',
    description: 'Expose your recipe data to any AI tool via the Model Context Protocol. Build custom automations.',
  },
  {
    icon: '📱',
    title: 'Mobile App',
    description: 'Native iOS and Android app with offline support, barcode scanning, and OCR recipe import. Coming in Phase 5.',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <span className="font-bold text-lg tracking-tight">RecipeOS</span>
        <Link
          href="/auth/login"
          className="rounded-lg bg-black text-white text-sm px-4 py-2 hover:bg-gray-800 transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-8 py-28">
        <span className="inline-block mb-4 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">
          Open-source culinary toolkit
        </span>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight max-w-2xl">
          Your recipes,<br />fully under control.
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-xl">
          RecipeOS is a web-first recipe management platform built for home cooks and professionals.
          Scale recipes, track your pantry, manage prep lists, and connect your kitchen to AI tools.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg bg-black text-white text-sm font-medium px-6 py-3 hover:bg-gray-800 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/api/demo"
            className="rounded-lg border border-gray-200 text-sm font-medium px-6 py-3 hover:border-gray-400 transition-colors"
          >
            Try the demo
          </Link>
          <a
            href="https://github.com/ShadowWalkerNC/RecipeOS"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-200 text-sm font-medium px-6 py-3 hover:border-gray-400 transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need in the kitchen</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl bg-white border border-gray-100 p-6 shadow-sm">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center justify-center text-center px-8 py-24">
        <h2 className="text-3xl font-bold mb-4">Ready to organize your kitchen?</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Sign in with a magic link — no password required.
        </p>
        <Link
          href="/auth/login"
          className="rounded-lg bg-black text-white text-sm font-medium px-8 py-3 hover:bg-gray-800 transition-colors"
        >
          Sign in with email
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-8 py-6 flex items-center justify-between text-xs text-gray-400">
        <span>RecipeOS — open source</span>
        <a
          href="https://github.com/ShadowWalkerNC/RecipeOS"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-600"
        >
          GitHub
        </a>
      </footer>
    </main>
  );
}
