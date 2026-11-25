import Link from 'next/link';
import { contact, repository } from '@/lib/product';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <section className="py-20 sm:py-28">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-orange-400">CulinaryOS</p>
        <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl">Run your operation on your terms.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
          CulinaryOS is building one open-source platform for orders, kitchen displays, inventory,
          staff workflows, and digital menus. We are starting with restaurants and food trucks.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/features" className="inline-flex min-h-12 items-center rounded-xl bg-orange-300 px-5 font-semibold text-black hover:bg-orange-200">See what works today</Link>
          <a href={repository} className="inline-flex min-h-12 items-center rounded-xl border border-white/25 px-5 font-semibold hover:bg-white/10">Explore the source</a>
        </div>
      </section>
      <section className="border-t border-white/15 py-14" aria-labelledby="ownership">
        <h2 id="ownership" className="text-3xl font-bold">Your choice of software and equipment</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            ['Run the software yourself', 'Use or modify the open-source core and run it on your infrastructure.'],
            ['Choose your equipment', 'Use compatible equipment you own. We plan to offer supported COS equipment and publish designs and build instructions.'],
            ['Get help when you need it', 'We plan to offer affordable hosting, setup, and technical support as optional paid services.'],
          ].map(([title, detail]) => (
            <article key={title} className="glass rounded-2xl p-6">
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-3 leading-relaxed text-white/70">{detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-t border-white/15 py-14">
        <h2 className="text-3xl font-bold">Built for foodservice. Designed to grow.</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-white/75">
          Our goal is to make hospitality easier to run and more affordable, without mandatory long-term contracts or
          proprietary equipment lock-in. We plan to expand into hotels and resorts, institutional dining,
          hospital foodservice, and nursing-home dining.
        </p>
        <a href={contact} className="mt-4 inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">Talk to CulinaryOS</a>
      </section>
    </div>
  );
}
