import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';

export type AdminContext = {
  id: string;
  email: string;
  nom: string;
};

export async function requireAdmin(
  request: NextRequest
): Promise<{ ok: true; admin: AdminContext } | { ok: false; response: NextResponse }> {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }),
    };
  }
  const payload = await verifyJwt(token);
  if (!payload || String(payload.role).toUpperCase() !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }),
    };
  }
  return {
    ok: true,
    admin: {
      id: String(payload.id),
      email: String(payload.email),
      nom: String(payload.nom ?? ''),
    },
  };
}

/** Pilotage financier (analytics, dépenses) : ADMIN ou DOCTOR. */
export async function requireAdminOrDoctor(
  request: NextRequest
): Promise<
  | {
      ok: true;
      user: { id: string; email: string; nom: string; role: 'ADMIN' | 'DOCTOR' };
    }
  | { ok: false; response: NextResponse }
> {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }),
    };
  }
  const payload = await verifyJwt(token);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }),
    };
  }
  const role = String(payload.role).toUpperCase();
  if (role !== 'ADMIN' && role !== 'DOCTOR') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Réservé aux administrateurs et aux médecins' },
        { status: 403 }
      ),
    };
  }
  return {
    ok: true,
    user: {
      id: String(payload.id),
      email: String(payload.email),
      nom: String(payload.nom ?? ''),
      role: role === 'ADMIN' ? 'ADMIN' : 'DOCTOR',
    },
  };
}
