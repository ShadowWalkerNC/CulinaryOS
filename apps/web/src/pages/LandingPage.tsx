import { Link } from 'react-router-dom';

const companyWebsite = import.meta.env.VITE_COMPANY_WEBSITE_URL || 'https://culinaryos.io';
const repository = 'https://github.com/ShadowWalkerNC/CulinaryOS';

export function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <p className="mb-4 text-sm font-bold uppercase tracking-widest">CulinaryOS</p>
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Explore the CulinaryOS guest storefront</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed">
        View a sample restaurant menu and try the ordering interface using fictional contact details.
        To order from a real restaurant, use the menu link or QR code the restaurant provides.
      </p>
      <Link to="/demo" className="mt-6 inline-flex min-h-12 items-center rounded-xl border border-current px-5 font-semibold hover:underline">
        Open the demo menu
      </Link>

      <section className="mt-12 border-t border-current pt-8" aria-labelledby="about-cos">
        <h2 id="about-cos" className="text-2xl font-bold">About CulinaryOS</h2>
        <p className="mt-3 max-w-2xl leading-relaxed">
          CulinaryOS builds open-source software and equipment for hospitality and foodservice.
          We are starting with restaurants and food trucks. The public source is available
          while supported installations and hosted services are in development.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6">
          <a href={companyWebsite} className="inline-flex min-h-12 items-center font-semibold underline">Company website</a>
          <a href={`${repository}/blob/main/docs/PRODUCT_STATUS.md`} className="inline-flex min-h-12 items-center font-semibold underline">Product status on GitHub</a>
        </div>
      </section>
    </main>
  );
}
