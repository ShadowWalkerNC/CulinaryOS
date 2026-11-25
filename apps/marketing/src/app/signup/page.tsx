import type { Metadata } from 'next';
import Link from 'next/link';
import { contact } from '@/lib/product';

export const metadata: Metadata = { title: 'Hosted access' };

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-4xl font-bold">Hosted access</h1>
      <p className="mt-4 leading-relaxed text-white/75">
        Hosted onboarding is in development. If you run a restaurant or food truck,
        you can tell us about your operation and ask about future pilot availability.
      </p>
      <div className="mt-4 flex flex-wrap gap-6">
        <a href={`${contact}?subject=CulinaryOS%20pilot`} className="inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">Ask about the pilot</a>
        <Link href="/features" className="inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">See product status</Link>
      </div>
    </section>
  );
}
