'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client created inside handler — not at module scope
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="mt-3 text-gray-500">
            We sent a magic link to <strong>{email}</strong>. Click it to sign in.
          </p>
          <button
            onClick={() => { setSubmitted(false); setEmail(''); }}
            className="mt-6 text-sm text-gray-400 underline"
          >
            Use a different email
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-center">Sign in to RecipeOS</h1>
        <p className="mt-2 text-center text-gray-500 text-sm">
          Culinary Ratio Blueprint & Recipe Vault
        </p>

        {/* 1-Click Demo Mode Button */}
        <div className="mt-6 mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1">Local Development & Demo</p>
          <p className="text-xs text-amber-700 mb-3">Bypass email magic link with 1-click Recipe Developer access.</p>
          <a
            href="/api/demo"
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-colors shadow flex items-center justify-center gap-2"
          >
            <span>⚡ Enter Demo Mode (Recipe Vault)</span>
          </a>
        </div>

        <div className="relative flex py-1 items-center mb-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">Or Magic Link</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
      </div>
    </main>
  );
}
