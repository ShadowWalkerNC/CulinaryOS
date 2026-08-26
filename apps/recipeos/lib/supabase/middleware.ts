import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from './database.types';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export async function updateSession(request: NextRequest) {
  // Guard: if env vars missing, pass through without auth
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const isAppRoute =
    request.nextUrl.pathname.startsWith('/vault') ||
    request.nextUrl.pathname.startsWith('/pantry') ||
    request.nextUrl.pathname.startsWith('/prep') ||
    request.nextUrl.pathname.startsWith('/scale');

  if (isAppRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
