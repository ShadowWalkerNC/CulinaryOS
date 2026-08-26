import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const DEMO_EMAIL = 'demo@recipeos.app';

export async function GET() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: DEMO_EMAIL,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://recipeos.onrender.com'}/auth/callback?next=/vault`,
      shouldCreateUser: false, // demo user must already exist
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Redirect to a holding page — user clicks the magic link in their inbox
  return NextResponse.redirect(
    new URL('/demo/check-email', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://recipeos.onrender.com')
  );
}
