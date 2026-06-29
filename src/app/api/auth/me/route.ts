import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDoctorStatusPayload } from '@/lib/doctor-status-helpers';
import type { UserStatusType } from '@/lib/user-status';

// GET /api/auth/me — JWT + champs à jour en base (ex. userStatus)
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const payload = await verifyJwt(token);
  if (!payload) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
  }

  const id = String(payload.id);
  const role = String(payload.role ?? '').toUpperCase();

  if (role === 'DOCTOR') {
    const doctor = await getDoctorStatusPayload(id);
    if (!doctor) {
      return NextResponse.json({ error: 'Médecin introuvable' }, { status: 404 });
    }

    const row = await prisma.user.findUnique({
      where: { id },
      select: { isActive: true },
    });

    return NextResponse.json({
      id,
      email: payload.email,
      role: payload.role,
      nom: payload.nom,
      userStatus: doctor.userStatus,
      effectiveStatus: doctor.effectiveStatus,
      userStatusChangedAt: doctor.userStatusChangedAt,
      effectiveStatusChangedAt: doctor.effectiveStatusChangedAt,
      isActive: row?.isActive ?? true,
    });
  }

  const row = await prisma.user.findUnique({
    where: { id },
    select: { userStatus: true, userStatusChangedAt: true, isActive: true },
  });

  const status = (row?.userStatus ?? 'OFFLINE') as UserStatusType;

  return NextResponse.json({
    id,
    email: payload.email,
    role: payload.role,
    nom: payload.nom,
    userStatus: status,
    effectiveStatus: status,
    userStatusChangedAt: row?.userStatusChangedAt?.toISOString() ?? null,
    effectiveStatusChangedAt: row?.userStatusChangedAt?.toISOString() ?? null,
    isActive: row?.isActive ?? true,
  });
}
