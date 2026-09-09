import type { Metadata } from 'next';
import SignupForm from '@/components/SignupForm';

export const metadata: Metadata = {
  title: 'Sign Up — Start Your Free Trial',
  description:
    'Join the CulinaryOS early-access waitlist. 14-day free trial, no credit card required. Be first in line when your restaurant goes live.',
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
            14-day free trial · No credit card required
          </p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-white/30 mt-6">
          Questions?{' '}
          <a href="mailto:hello@culinaryos.io" className="text-brand-orange hover:text-white transition-colors">
            Email us at hello@culinaryos.io
          </a>
        </p>
      </div>
    </section>
  );
}
