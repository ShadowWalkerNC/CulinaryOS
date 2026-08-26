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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center">Sign in to RecipeOS</h1>
        <p className="mt-2 text-center text-gray-500 text-sm">
          Enter your email and we&apos;ll send you a magic link.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
            className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
      </div>
    </main>
  );
}
