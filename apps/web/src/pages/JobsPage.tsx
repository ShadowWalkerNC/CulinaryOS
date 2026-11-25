import { MarketingHeader } from '@culinaryos/ui';

export function JobsPage() {
  return (
    <>
      <MarketingHeader currentPath="/jobs" />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold">Foodservice job board</h1>
        <p className="mt-5 max-w-2xl leading-relaxed">
          The job board and employer application tools are in development.
          Contact the employer directly for open positions and application instructions.
        </p>
      </main>
    </>
  );
}
