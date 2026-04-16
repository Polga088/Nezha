import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from './lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // ============================================================
  // ROUTES PUBLIQUES : login et racine
  // ============================================================
  if (pathname === '/login') {
    // Si déjà connecté, on redirige vers son dashboard
    if (token) {
      const payload = await verifyJwt(token);
      if (payload) {
        const role = String(payload.role).toUpperCase();
        const dest = role === 'ADMIN' ? '/dashboard/admin'
                   : role === 'DOCTOR' ? '/dashboard/doctor'
                   : '/dashboard/assistant';
        url.pathname = dest;
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // ============================================================
  // ROUTES PROTÉGÉES : /dashboard/*
  // ============================================================
  if (pathname.startsWith('/dashboard')) {

    // Pas de token → login
    if (!token) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const payload = await verifyJwt(token);

    // Token expiré ou invalide → login
    if (!payload) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Extraction sûre du rôle depuis le JWT
    const role = String(payload.role).toUpperCase(); // 'ADMIN' | 'DOCTOR' | 'ASSISTANT'

    // Dashboard propre de l'utilisateur (cible autorisée)
    const ownDashboard =
      role === 'ADMIN'     ? '/dashboard/admin'
    : role === 'DOCTOR'    ? '/dashboard/doctor'
    :                        '/dashboard/assistant';

    // /dashboard tout seul → redirige vers son dashboard
    if (pathname === '/dashboard') {
      url.pathname = ownDashboard;
      return NextResponse.redirect(url);
    }

    // Routes partagées (agenda + patients) : tous les rôles connectés y accèdent
    const isShared =
      pathname.startsWith('/dashboard/agenda') ||
      pathname.startsWith('/dashboard/patients');

    if (isShared) {
      return NextResponse.next();
    }

    // ┌─────────────────────────────────────────────────────────┐
    // │   RBAC STRICT                                           │
    // │   Chaque rôle ne peut visiter QUE son propre espace     │
    // └─────────────────────────────────────────────────────────┘
    const isAdminRoute     = pathname.startsWith('/dashboard/admin');
    const isDoctorRoute    = pathname.startsWith('/dashboard/doctor');
    const isAssistantRoute = pathname.startsWith('/dashboard/assistant');

    if (isAdminRoute && role !== 'ADMIN') {
      url.pathname = ownDashboard;
      return NextResponse.redirect(url);
    }
    if (isDoctorRoute && role !== 'DOCTOR') {
      url.pathname = ownDashboard;
      return NextResponse.redirect(url);
    }
    if (isAssistantRoute && role !== 'ASSISTANT') {
      url.pathname = ownDashboard;
      return NextResponse.redirect(url);
    }

    // L'utilisateur a le droit → on laisse passer
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
