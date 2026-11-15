'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { requestSignup } from '@/lib/signup';

export default function SignupForm() {
  const [submitted, setSubmitted] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [venueType, setVenueType] = useState('full-service');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://culinaryos-api.up.railway.app';
      const result = await requestSignup(
        {
          restaurant_name: restaurantName.trim(),
          email: email.trim(),
          password: password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
        },
        apiUrl,
      );
      setTenantId(result.tenantId);
      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Signup is unavailable. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-[#12151b] p-8 sm:p-10 border border-[#232832]">
      {submitted ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
            OK
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Check your email</h2>
          <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
            Verify your email to continue setting up <strong className="text-white">{restaurantName || 'your restaurant'}</strong>. Your workspace is available after verification and onboarding.
          </p>

          <div className="my-6 p-4 rounded-lg bg-[#0e1116] border border-[#2a303c] text-left space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">TENANT ID:</span>
              <span className="text-[#ff6b35] font-bold">{tenantId ?? 'Pending verification'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ACCESS TIER:</span>
              <span className="text-white font-bold uppercase">FREE BETA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">STATUS:</span>
              <span className="text-slate-300">VERIFICATION PENDING</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/download"
              className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Download Rust Workstation
            </Link>
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] inline-flex items-center justify-center px-6 rounded-lg bg-[#141820] border border-[#2a303c] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1c222d] active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Read Setup Documentation
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="pb-2 border-b border-[#232832]">
            <span className="inline-block px-2.5 py-0.5 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
              CLOUD BRIDGE ENROLLMENT
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create your beta account</h2>
            <p className="text-xs text-slate-400 mt-1">No credit card required. Email verification is required.</p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              ERROR: {errorMessage}
            </div>
          )}

          <div>
            <label htmlFor="restaurantName" className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
              Restaurant or Venue Name
            </label>
            <input
              id="restaurantName"
              type="text"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Alley Katz Taproom"
              className="w-full min-h-[48px] px-4 py-3 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#ff6b35]"
            />
          </div>

          <div>
            <label htmlFor="venueType" className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
              Venue Category
            </label>
            <select
              id="venueType"
              value={venueType}
              onChange={(e) => setVenueType(e.target.value)}
              className="w-full min-h-[48px] px-4 py-3 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm focus:outline-none focus:border-[#ff6b35]"
            >
              <option value="full-service">Full-Service Restaurant &amp; Dining Room</option>
              <option value="fast-casual">Fast-Casual / Counter Service</option>
              <option value="food-truck">Food Truck / Mobile Trailer</option>
              <option value="bar-brewery">Bar, Taproom &amp; Brewery</option>
              <option value="pizzeria">High-Volume Pizzeria</option>
              <option value="commissary">Commissary / Multi-Unit Group</option>
            </select>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
              Operator Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@restaurant.com"
              className="w-full min-h-[48px] px-4 py-3 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#ff6b35]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
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
              className="w-full min-h-[48px] px-4 py-3 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#ff6b35]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[52px] py-3.5 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'PROVISIONING TENANT...' : 'CREATE FREE BETA ACCOUNT'}
          </button>

          <p className="text-[11px] text-slate-400 text-center pt-2">
            By submitting, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-white">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-white">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      )}
    </div>
  );
}
