import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, authCookieSecure } from '@/lib/auth-cookie';

function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: authCookieSecure(),
    maxAge: 0,
    expires: new Date(0),
  });
}

/** Lien natif <a href="/api/auth/logout"> → suppression cookie + redirect */
export async function GET(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl);
  clearSessionCookie(response);
  return response;
}

/** Déconnexion depuis le client (fetch POST) */
export async function POST() {
  const response = NextResponse.json({ ok: true, message: 'Déconnexion réussie' });
  clearSessionCookie(response);
  return response;
}
