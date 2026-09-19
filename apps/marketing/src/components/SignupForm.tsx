'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';

export default function SignupForm() {
  const [submitted, setSubmitted] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [venueType, setVenueType] = useState('full-service');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  }

  return (
    <div className="rounded-3xl bg-white/[0.04] p-1.5 ring-1 ring-white/10 shadow-2xl backdrop-blur-xl">
      <div className="rounded-[calc(1.5rem-0.25rem)] bg-[#121212] p-8 sm:p-10 border border-white/10">
        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl">
              🎉
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Your Kitchen Environment is Ready!</h2>
            <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed">
              We&apos;ve sent an activation link and temporary demo credentials for <strong className="text-white">{restaurantName || 'your restaurant'}</strong> to <strong className="text-white font-mono">{email}</strong>.
            </p>
            <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/#demo"
                className="px-6 py-3 rounded-full gradient-bg text-white font-bold text-sm hover:opacity-95 transition-all shadow-md shadow-brand-orange/20"
              >
                Explore Live POS Demo →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center pb-2">
              <span className="inline-block px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-mono font-bold uppercase tracking-wider mb-2">
                14-Day Free Access
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">Start Your Restaurant Free Trial</h2>
              <p className="text-xs text-white/50 mt-1">No credit card required • Instant access in under 60 seconds</p>
            </div>

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
