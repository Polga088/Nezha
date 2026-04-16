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

  const id = String(payload.id);
  const row = await prisma.user.findUnique({
    where: { id },
    select: { userStatus: true, isActive: true },
  });

  return NextResponse.json({
    id,
    email: payload.email,
    role: payload.role,
    nom: payload.nom,
    userStatus: row?.userStatus ?? 'OFFLINE',
    isActive: row?.isActive ?? true,
  });
}
