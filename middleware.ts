import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

import {
  isDashboardAdminDoctorPath,
  isDashboardFinancePath,
} from '@/lib/auth-checks';
import { getJwtSecretBytes } from '@/lib/jwt-env';
import { runLicenseGate } from '@/lib/license-check';

const JWT_SECRET = getJwtSecretBytes();

/** Valide signature + claim `exp` : pas de redirection /login tant que le JWT est dans sa fenêtre (ex. 12 h). */
async function getPayload(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const licenseResponse = await runLicenseGate(request);
  if (licenseResponse) {
    return licenseResponse;
  }

  const token = request.cookies.get('auth_token')?.value;
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // ============================================================
  // API ADMIN — réservé au rôle ADMIN (JSON), sauf analytics / dépenses admin aussi pour DOCTOR.
  // Encaissement accueil : POST /api/invoices + routes assistant (auth dans les handlers).
  // Exception : GET /api/admin/settings — lecture paramètres cabinet pour tout le staff
  // ============================================================
  // ============================================================
  // API IA — staff authentifié (dictée, etc.) — JSON, pas de redirect
  // ============================================================
  if (pathname.startsWith('/api/ai')) {
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const payload = await getPayload(token);
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const role = String(payload.role).toUpperCase();
    if (role !== 'ADMIN' && role !== 'DOCTOR' && role !== 'ASSISTANT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ============================================================
  // API DOCTORS — alias GET liste médecins (même accès que GET /api/users/doctors).
  // ============================================================
  if (pathname === '/api/doctors' && request.method === 'GET') {
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const payload = await getPayload(token);
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const role = String(payload.role).toUpperCase();
    const isStaffRole = role === 'ADMIN' || role === 'DOCTOR' || role === 'ASSISTANT';
    if (!isStaffRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ============================================================
  // API EXPENSES — dépenses cabinet (ADMIN ou DOCTOR, aligné sur /api/admin/expenses).
  // ============================================================
  if (pathname.startsWith('/api/expenses')) {
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const payload = await getPayload(token);
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const role = String(payload.role).toUpperCase();
    if (role !== 'ADMIN' && role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ============================================================
  // API USERS — gestion comptes (ADMIN) ; exception : liste médecins pour le staff.
  // ============================================================
  if (pathname.startsWith('/api/users')) {
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const payload = await getPayload(token);
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const role = String(payload.role).toUpperCase();
    const isStaffRole = role === 'ADMIN' || role === 'DOCTOR' || role === 'ASSISTANT';
    const isDoctorsList = pathname === '/api/users/doctors' && request.method === 'GET';
    if (isDoctorsList && isStaffRole) {
      return NextResponse.next();
    }
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ============================================================
  // API ADMIN — même règle (voir bloc ci-dessus).
  // ============================================================
  if (pathname.startsWith('/api/admin')) {
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const payload = await getPayload(token);
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const role = String(payload.role).toUpperCase();
    const isStaffRole = role === 'ADMIN' || role === 'DOCTOR' || role === 'ASSISTANT';
    if (
      pathname === '/api/admin/settings' &&
      request.method === 'GET' &&
      isStaffRole
    ) {
      return NextResponse.next();
    }
    const isDoctorFinancialApi =
      role === 'DOCTOR' &&
      (pathname.startsWith('/api/admin/analytics') ||
        pathname.startsWith('/api/admin/expenses'));
    if (isDoctorFinancialApi) {
      return NextResponse.next();
    }
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ============================================================
  // ROUTES PUBLIQUES : login
  // ============================================================
  if (pathname === '/login') {
    if (token) {
      const payload = await getPayload(token);
      if (payload) {
        const role = String(payload.role).toUpperCase();
        url.pathname = role === 'ADMIN' ? '/dashboard/admin'
                     : role === 'DOCTOR' ? '/dashboard/doctor'
                     : '/dashboard/assistant';
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // ============================================================
  // ROUTES PROTÉGÉES : /dashboard/*
  // ============================================================
  if (pathname.startsWith('/dashboard')) {

    if (!token) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const payload = await getPayload(token);
    if (!payload) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const role = String(payload.role).toUpperCase(); // 'ADMIN' | 'DOCTOR' | 'ASSISTANT'

    const ownDashboard =
      role === 'ADMIN'  ? '/dashboard/admin'
    : role === 'DOCTOR' ? '/dashboard/doctor'
    :                     '/dashboard/assistant';

    // /dashboard exact → redirige vers son espace
    if (pathname === '/dashboard') {
      url.pathname = ownDashboard;
      return NextResponse.redirect(url);
    }

    // Alias « dépenses » + ancienne route comptabilité → charges cabinet (unique écran)
    if (
      pathname === '/dashboard/expenses' ||
      pathname.startsWith('/dashboard/expenses/') ||
      pathname === '/dashboard/accounting' ||
      pathname.startsWith('/dashboard/accounting/')
    ) {
      url.pathname = '/dashboard/admin/expenses';
      url.search = request.nextUrl.search;
      return NextResponse.redirect(url);
    }

    // Routes partagées (tous les rôles connectés y ont accès)
    const isShared =
      pathname.startsWith('/dashboard/agenda') ||
      pathname.startsWith('/dashboard/patients') ||
      pathname.startsWith('/dashboard/todos');

    if (isShared) return NextResponse.next();

    if (isDashboardFinancePath(pathname)) {
      if (role !== 'ADMIN' && role !== 'DOCTOR') {
        url.pathname = ownDashboard;
        return NextResponse.redirect(url);
      }
      const res = NextResponse.next();
      res.headers.set('Cache-Control', 'no-store, max-age=0');
      return res;
    }

    const isDoctorFinancialAdmin =
      role === 'DOCTOR' && isDashboardAdminDoctorPath(pathname);

    // ── RBAC STRICT : règles explicites par rôle ──────────────
    if (pathname.startsWith('/dashboard/admin') && role !== 'ADMIN') {
      if (!isDoctorFinancialAdmin) {
        url.pathname = ownDashboard;
        return NextResponse.redirect(url);
      }
    }
    if (pathname.startsWith('/dashboard/doctor') && role !== 'DOCTOR') {
      url.pathname = ownDashboard;
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/dashboard/assistant') && role !== 'ASSISTANT') {
      url.pathname = ownDashboard;
      return NextResponse.redirect(url);
    }

    // L'utilisateur a le droit → on laisse passer ✅
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Presque toutes les routes : la licence est vérifiée en premier.
     * Exclut les assets Next.js et fichiers statiques courants.
     */
    '/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)$).*)',
  ],
};
