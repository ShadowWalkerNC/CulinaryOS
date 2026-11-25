import type { Metadata } from 'next';
import DemoSection from '@/components/DemoSection';
import { productStatus, statusEvidence } from '@/lib/product';

export const metadata: Metadata = { title: 'Product status' };

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <h1 className="text-4xl font-bold sm:text-5xl">Product status</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-white/75">The public source is available. Commercial release and supported installations are in development.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {productStatus.map(({ label, title, detail }) => (
          <article key={label} className="glass rounded-2xl p-6">
            <p className="text-sm font-semibold text-orange-300">{label}</p>
            <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
            <p className="mt-3 leading-relaxed text-white/75">{detail}</p>
          </article>
        ))}
      </div>
      <a href={statusEvidence} className="mt-4 inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">Read the test evidence and release gates</a>
      <section className="mt-12 border-t border-white/15 pt-10" aria-labelledby="simulator">
        <h2 id="simulator" className="text-3xl font-bold">Try the order simulator</h2>
        <p className="mt-3 text-white/75">This interactive example uses sample data and runs in your browser.</p>
        <DemoSection />
      </section>
    </div>
  );
}
