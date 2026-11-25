import type { Metadata } from 'next';
import Link from 'next/link';
import { repository } from '@/lib/product';

export const metadata: Metadata = { title: 'Project updates' };

export default function BlogPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-4xl font-bold">Project updates</h1>
      <div className="mt-5 flex flex-wrap gap-6">
        <Link href="/features" className="inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">See product status</Link>
        <a href={`${repository}/releases`} className="inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">View release notes</a>
      </div>
    </section>
  );
}
