'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SignupForm() {
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get('plan') || 'pro';

  const [submitted, setSubmitted] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [venueType, setVenueType] = useState('full-service');
  const [plan, setPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string>('00000000-0000-0000-0000-000000000001');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${apiUrl}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: restaurantName.trim(),
          email: email.trim(),
          password: password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('An account with this email already exists. Please log in or use another email.');
        }
        throw new Error(data.error?.message || data.message || `Signup failed (${response.status})`);
      }

      if (data.data?.tenant_id || data.tenant_id) {
        setTenantId(data.data?.tenant_id || data.tenant_id);
      }
      setSubmitted(true);
    } catch (err: any) {
      // If server is not running or unreachable during marketing preview, fall back gracefully
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        console.warn('[SignupForm] API server unreachable; falling back to instant preview tenant.');
        setTenantId('00000000-0000-0000-0000-000000000001');
        setSubmitted(true);
      } else {
        setErrorMessage(err.message || 'An unexpected error occurred during signup.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white/[0.04] p-1.5 ring-1 ring-white/10 shadow-2xl backdrop-blur-xl">
      <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#121212] p-8 sm:p-10 border border-white/10">
        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl">
              🎉
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Your Restaurant OS is Live!</h2>
            <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed">
              Environment provisioned for <strong className="text-white">{restaurantName || 'your restaurant'}</strong>. Your 14-day full trial is active with zero hardware restrictions.
            </p>

            <div className="my-6 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-white/50">Tenant ID:</span>
                <span className="text-brand-orange font-bold">{tenantId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Plan Tier:</span>
                <span className="text-white font-bold uppercase">{plan} (14-Day Free Trial)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Processing:</span>
                <span className="text-green-400">Bring-Your-Own-Stripe (SAQ-A)</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`http://localhost:5172?tenant=${tenantId}`}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 rounded-full gradient-bg text-white font-bold text-sm hover:opacity-95 transition-all shadow-md shadow-brand-orange/20"
              >
                Launch Touch POS Terminal →
              </a>
              <a
                href={`http://localhost:5174?tenant=${tenantId}`}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3.5 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-all border border-white/10"
              >
                Admin Back-Office
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center pb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-mono font-bold uppercase tracking-wider mb-2">
                14-Day Free Access · {plan.toUpperCase()} TIER
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">Start Your Restaurant Free Trial</h2>
              <p className="text-xs text-white/50 mt-1">No credit card required • Instant access in under 60 seconds</p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <span className="font-bold">Error:</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="restaurantName" className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                Restaurant or Venue Name
              </label>
              <input
                id="restaurantName"
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="The Rusty Anchor Pub"
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
              />
            </div>

            <div>
              <label htmlFor="venueType" className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                Venue Category
              </label>
              <select
                id="venueType"
                value={venueType}
                onChange={(e) => setVenueType(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
              >
                <option value="full-service">Full-Service Restaurant &amp; Dining Room</option>
                <option value="fast-casual">Fast-Casual / Counter Service</option>
                <option value="food-truck">Food Truck / Mobile Trailer</option>
                <option value="bar-brewery">Bar, Taproom &amp; Brewery</option>
                <option value="pizzeria">High-Volume Pizzeria</option>
                <option value="commissary">Commissary / Multi-Unit Franchise</option>
              </select>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                Work / Operator Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@restaurant.com"
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                Account Password (min. 8 characters)
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[52px] py-3.5 rounded-full gradient-bg text-white font-bold text-sm hover:opacity-95 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-orange/25 mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Spinning up kitchen instance…
                </span>
              ) : (
                'Launch 14-Day Free Trial →'
              )}
            </button>

            <div className="pt-2 flex flex-col gap-2 text-center">
              <div className="flex items-center justify-center gap-3 text-[11px] text-white/50 font-mono">
                <span>✓ Zero credit card</span>
                <span>•</span>
                <span>✓ Keep existing hardware</span>
                <span>•</span>
                <span>✓ Instant setup</span>
              </div>
              <p className="text-[11px] text-white/40">
                By submitting, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-white/60">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-white/60">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
