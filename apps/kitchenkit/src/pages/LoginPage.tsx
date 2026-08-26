import { useState } from 'react';
import { ChefHat, Loader2, MailCheck } from 'lucide-react';
import { signInWithMagicLink } from '@/lib/auth';

type Stage = 'idle' | 'loading' | 'sent' | 'error';

export default function LoginPage() {
  const [email, setEmail]   = useState('');
  const [stage, setStage]   = useState<Stage>('idle');
  const [errMsg, setErrMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStage('loading');
    setErrMsg('');

    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setErrMsg(error);
      setStage('error');
    } else {
      setStage('sent');
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-600/30 flex items-center justify-center mb-4">
            <ChefHat size={28} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">KitchenKit</h1>
          <p className="text-sm text-zinc-500 mt-1">Recipe Manager · Shift Prep Planner</p>
        </div>

        {stage === 'sent' ? (
          /* ── Sent state ── */
          <div className="card text-center space-y-3">
            <MailCheck size={36} className="text-brand-400 mx-auto" />
            <h2 className="font-semibold text-zinc-100">Check your inbox</h2>
            <p className="text-sm text-zinc-400">
              We sent a magic link to <span className="text-zinc-200 font-medium">{email}</span>.
              Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => { setStage('idle'); setEmail(''); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="chef@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                disabled={stage === 'loading'}
              />
            </div>

            {stage === 'error' && errMsg && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {errMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={stage === 'loading' || !email.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stage === 'loading' ? (
                <><Loader2 size={16} className="animate-spin" /> Sending...</>
              ) : (
                'Send magic link'
              )}
            </button>

            <p className="text-xs text-zinc-600 text-center">
              No password required. We'll email you a one-click sign-in link.
            </p>
          </form>
        )}

        <p className="text-center mt-6 text-xs text-zinc-700">
          Part of the{' '}
          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:text-brand-400 transition-colors"
          >
            CulinaryOS Ecosystem
          </a>
        </p>
      </div>
    </div>
  );
}
