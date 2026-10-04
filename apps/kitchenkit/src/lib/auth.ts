import { supabase, configuredSupabase } from './supabase';

export async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
  if (!configuredSupabase) return { error: 'Sign-in is unavailable: authentication is not configured.' };
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error?.message ?? null };
  } catch {
    return { error: 'The sign-in link could not be sent. Please try again.' };
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
