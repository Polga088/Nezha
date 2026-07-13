import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  const id = payload.id != null ? String(payload.id) : '';
  if (!id) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
  }

  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      email: true,
      nom: true,
      role: true,
      userStatus: true,
      manualStatus: true,
      statusSource: true,
      isActive: true,
    },
  });

  if (!row || !row.isActive) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  return NextResponse.json({
    id,
    email: row.email,
    role: row.role,
    nom: row.nom,
    userStatus: row.userStatus,
    manualStatus: row.manualStatus,
    statusSource: row.statusSource,
    isActive: row.isActive,
  });
}
