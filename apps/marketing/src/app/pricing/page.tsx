import type { Metadata } from 'next';
import { contact, repository } from '@/lib/product';

export const metadata: Metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-7 px-5 py-16 sm:px-8">
      <h1 className="text-4xl font-bold sm:text-5xl">Software, equipment, and services</h1>
      <div>
        <h2 className="text-2xl font-semibold">Open-source core</h2>
        <p className="mt-2 text-white/75">There is no software license fee for the MIT-licensed core. If you run it yourself, you cover your own infrastructure and equipment costs.</p>
        <a href={repository} className="inline-flex min-h-12 items-center text-orange-300 hover:underline">View the source and license</a>
      </div>
      <div>
        <h2 className="text-2xl font-semibold">Optional paid services</h2>
        <p className="mt-2 text-white/75">We plan to offer hosting, equipment, setup, and technical support. Availability and prices will be published when these offerings are ready.</p>
        <a href={contact} className="inline-flex min-h-12 items-center text-orange-300 hover:underline">Ask about your setup</a>
      </div>
    </section>
  );
}
