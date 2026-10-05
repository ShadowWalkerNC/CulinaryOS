import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL('/vault', request.url);
  const response = NextResponse.redirect(url);
  response.cookies.set('recipeos_demo_session', 'true', {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
  });
  return response;
}

