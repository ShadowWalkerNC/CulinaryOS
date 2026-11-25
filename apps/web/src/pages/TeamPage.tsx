import { Link } from 'react-router-dom';

export function TeamPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="inline-flex min-h-12 items-center font-semibold underline">Back to the storefront</Link>
      <h1 className="mt-3 text-4xl font-bold">About CulinaryOS</h1>
      <p className="mt-5 max-w-2xl leading-relaxed">
        CulinaryOS is a company building an open-source platform to make hospitality
        and foodservice easier to run and more affordable. We are starting with
        restaurants and food trucks.
      </p>
      <a href="https://github.com/ShadowWalkerNC/CulinaryOS" className="mt-3 inline-flex min-h-12 items-center font-semibold underline">Explore the project on GitHub</a>
    </main>
  );
}
