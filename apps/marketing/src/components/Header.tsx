import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b border-white/15">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-5 py-2 sm:px-8">
        <Link href="/" className="inline-flex min-h-12 items-center text-xl font-bold hover:text-orange-300">CulinaryOS</Link>
        <div className="flex flex-wrap gap-x-4 text-sm font-medium text-white/80 sm:gap-x-7">
          <Link href="/features" className="inline-flex min-h-12 items-center hover:text-orange-300">Product status</Link>
          <Link href="/pricing" className="inline-flex min-h-12 items-center hover:text-orange-300">Pricing</Link>
          <Link href="/download" className="inline-flex min-h-12 items-center hover:text-orange-300">Source and builds</Link>
        </div>
      </nav>
    </header>
  );
}
