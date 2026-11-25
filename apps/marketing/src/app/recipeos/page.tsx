import type { Metadata } from 'next';
import Link from 'next/link';
import { repository } from '@/lib/product';

export const metadata: Metadata = { title: 'RecipeOS' };

export default function RecipeOSPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-4xl font-bold">RecipeOS</h1>
      <p className="mt-4 leading-relaxed text-white/75">
        RecipeOS is the open-source recipe and prep workspace within CulinaryOS.
        Explore its recipe, scaling, and prep tools in the repository.
      </p>
      <div className="mt-4 flex flex-wrap gap-6">
        <a href={`${repository}/tree/main/apps/recipeos`} className="inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">View RecipeOS source</a>
        <Link href="/features" className="inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">See product status</Link>
      </div>
    </section>
  );
}
