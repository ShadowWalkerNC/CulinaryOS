import type { Metadata } from 'next';
import { contact, repository } from '@/lib/product';

export const metadata: Metadata = { title: 'About CulinaryOS' };

export default function TeamPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-4xl font-bold sm:text-5xl">About CulinaryOS</h1>
      <p className="mt-6 text-lg leading-relaxed text-white/75">
        CulinaryOS is a company building an open-source technology platform to make hospitality
        and foodservice easier to run and more affordable.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-white/75">
        We develop connected software and equipment for orders, kitchens, inventory, staff,
        and digital menus. We start with restaurants and food trucks. Our roadmap extends
        to hotels, institutional dining, hospital foodservice, and nursing-home dining.
      </p>
      <div className="mt-5 flex flex-wrap gap-6">
        <a href={contact} className="inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">Contact us</a>
        <a href={repository} className="inline-flex min-h-12 items-center font-semibold text-orange-300 hover:underline">Contribute on GitHub</a>
      </div>
    </section>
  );
}
