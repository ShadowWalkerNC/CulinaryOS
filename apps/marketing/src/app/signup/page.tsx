import type { Metadata } from 'next';
import { Suspense } from 'react';
import SignupForm from '@/components/SignupForm';

export const metadata: Metadata = {
  title: 'Sign Up — Free CulinaryOS Beta',
  description:
    'Create a CulinaryOS beta account when registration is available. Email verification is required; no credit card is required.',
};

export default function SignupPage() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">
            Create your{' '}
            <span className="gradient-text">CulinaryOS</span> account
          </h1>
          <p className="text-white/50 text-sm">
            Free beta · Email verification required
          </p>
        </div>

        <Suspense fallback={<div className="p-12 text-center text-white/50 text-sm">Loading signup...</div>}>
          <SignupForm />
        </Suspense>

        <p className="text-center text-sm text-white/50 mt-6">
          Questions?{' '}
          <a href="mailto:hello@culinaryos.io" className="text-brand-orange hover:text-white transition-colors">
            Email us at hello@culinaryos.io
          </a>
        </p>
      </div>
    </section>
  );
}
