import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '@culinaryos/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = () => {
    localStorage.setItem('culinaryos_ops_demo_session', 'true');
    navigate('/', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
      if (err) { setError(err.message); return; }
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication service unavailable';
      setError(`${message}. You can use Demo Mode below.`);
    }
  };

  return (
    <div className="dark flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <div className="w-full max-w-sm px-8 py-10 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl">
        <h1 className="text-2xl font-bold mb-1">CulinaryOps</h1>
        <p className="text-sm text-zinc-400 mb-6">Sign in to your operations dashboard</p>

        {/* 1-Click Demo Mode Button */}
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Local Development & Demo</p>
          <p className="text-xs text-zinc-400 mb-3">Bypass Supabase email magic link with 1-click GM / Ops Director access.</p>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-colors shadow flex items-center justify-center gap-2"
          >
            <span>⚡ Enter Demo Mode (Operations GM)</span>
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink mx-4 text-xs uppercase tracking-widest text-zinc-500 font-semibold">Or Supabase Magic Link</span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        {sent ? (
          <p className="text-green-400 text-sm">Magic link sent — check your email.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              aria-label="Email address"
              autoComplete="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-100"
            />
            {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
            <Button
              type="submit"
              variant="ghost"
              className="w-full rounded-lg bg-zinc-800 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
            >
              Send Magic Link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
