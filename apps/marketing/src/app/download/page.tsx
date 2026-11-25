import type { Metadata } from 'next';
import { repository } from '@/lib/product';

export const metadata: Metadata = { title: 'Source and builds' };

export default function DownloadPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-4xl font-bold sm:text-5xl">Source and builds</h1>
      <p className="mt-5 leading-relaxed text-white/75">
        Browse the open-source code, development instructions, and tagged builds. Supported self-host
        packages are in development. Check each release for its contents and test coverage.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <a href={repository} className="inline-flex min-h-12 items-center rounded-xl bg-orange-300 px-5 font-semibold text-black hover:bg-orange-200">Browse the repository</a>
        <a href={`${repository}/releases`} className="inline-flex min-h-12 items-center rounded-xl border border-white/25 px-5 hover:bg-white/10">View GitHub releases</a>
      </div>
    </section>
  );
}
