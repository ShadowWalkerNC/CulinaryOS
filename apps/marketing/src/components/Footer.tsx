import Link from 'next/link';
import { contact, repository } from '@/lib/product';

export default function Footer() {
  return (
    <footer className="border-t border-white/15">
      <nav aria-label="Footer navigation" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-5 py-4 text-sm text-white/75 sm:px-8">
        <Link href="/team" className="inline-flex min-h-12 items-center hover:text-orange-300">About</Link>
        <a href={repository} className="inline-flex min-h-12 items-center hover:text-orange-300">GitHub</a>
        <a href={contact} className="inline-flex min-h-12 items-center hover:text-orange-300">Contact</a>
        <Link href="/privacy" className="inline-flex min-h-12 items-center hover:text-orange-300">Privacy</Link>
        <Link href="/terms" className="inline-flex min-h-12 items-center hover:text-orange-300">Terms</Link>
      </nav>
    </footer>
  );
}
