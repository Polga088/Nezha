import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';

export type StaffRole = 'ADMIN' | 'DOCTOR' | 'ASSISTANT';

export type StaffContext = {
  id: string;
  email: string;
  nom: string;
  role: StaffRole;
};

const STAFF_ROLES: StaffRole[] = ['ADMIN', 'DOCTOR', 'ASSISTANT'];

export function isStaffRole(r: string): r is StaffRole {
  return STAFF_ROLES.includes(r as StaffRole);
}

/** JWT valide + rôle équipe (messagerie / statut). */
export async function requireStaff(
  request: NextRequest
): Promise<{ ok: true; staff: StaffContext } | { ok: false; response: NextResponse }> {
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
      response: NextResponse.json({ error: 'Token invalide' }, { status: 401 }),
    };
  }
  const role = String(payload.role).toUpperCase();
  if (!isStaffRole(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }),
    };
  }
  return {
    ok: true,
    staff: {
      id: String(payload.id),
      email: String(payload.email),
      nom: String(payload.nom ?? ''),
      role,
    },
  };
}
