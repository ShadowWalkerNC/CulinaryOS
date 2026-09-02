'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Stub — real Supabase Auth will be wired in a later phase.
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  }

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

        <div className="glass rounded-2xl border border-white/10 p-8">
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-5">🎉</div>
              <h2 className="text-2xl font-bold mb-3">We&apos;ll be in touch!</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Thanks for signing up for early access to CulinaryOS. We&apos;ll email{' '}
                <strong className="text-white">{email}</strong> when your account is ready.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-orange/50 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-orange/50 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl gradient-bg text-white font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-brand-orange/20"
              >
                {loading ? 'Creating account…' : 'Start Free Trial'}
              </button>

              <p className="text-xs text-center text-white/30">
                By signing up you agree to our{' '}
                <a href="/terms" className="underline hover:text-white/60 transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="underline hover:text-white/60 transition-colors">
                  Privacy Policy
                </a>
                .
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          Already have an account?{' '}
          <a href="#" className="text-brand-orange hover:text-white transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </section>
  );
}
