import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Work on CulinaryOS: we are a tiny team in active development and are not hiring right now — but we would still love to hear from you.',
};

export default function CareersPage() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-semibold uppercase tracking-widest mb-6">
          Careers
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">
          We&apos;re not hiring <span className="gradient-text">right now</span>
        </h1>
        <p className="text-white/60 text-lg leading-relaxed mb-4">
          CulinaryOS is being built by a tiny team in active development. We don&apos;t have
          open roles today — and we&apos;d rather say that plainly than post a job board
          full of roles that don&apos;t exist.
        </p>
        <p className="text-white/50 leading-relaxed mb-10">
          If you&apos;re a restaurant operator with strong opinions about POS software, or an
          engineer who wants to contribute, the best way in is through the open-source
          side: RecipeOS is MIT-licensed and takes contributions today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="mailto:hello@culinaryos.io?subject=Hello%20from%20a%20future%20teammate"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl gradient-bg text-white font-semibold text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-brand-orange/20"
          >
            Say hello — hello@culinaryos.io
          </a>
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl glass border border-white/10 text-white font-semibold text-lg hover:bg-white/10 active:scale-95 transition-all"
          >
            Contribute on GitHub ↗
          </a>
        </div>

        <p className="mt-10 text-sm text-white/50">
          When we do open roles, they&apos;ll be listed here — for real this time.
        </p>
      </div>
    </section>
  );
}
