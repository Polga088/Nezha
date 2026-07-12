import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

/** JWT valide + rôle équipe actif relu en base (messagerie / statut). */
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
  const userId = payload.id != null ? String(payload.id) : '';
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Token invalide' }, { status: 401 }),
    };
  }

  const staff = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nom: true,
      role: true,
      isActive: true,
    },
  });

  const role = String(staff?.role ?? '').toUpperCase();
  if (!staff || !staff.isActive || !isStaffRole(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }),
    };
  }
  return {
    ok: true,
    staff: {
      id: staff.id,
      email: staff.email,
      nom: staff.nom,
      role,
    },
  };
}
