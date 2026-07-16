import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const role = String(user.role ?? '').toUpperCase();
  if (!['ADMIN', 'DOCTOR', 'ASSISTANT'].includes(role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      statut: true,
      reservationSource: true,
      publicValidatedAt: true,
    },
  });

  if (!appt) {
    return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
  }

  if (appt.reservationSource !== 'RESERVATION_PUBLIC') {
    return NextResponse.json({ error: 'Cette demande ne provient pas d’une réservation publique' }, { status: 400 });
  }

  if (appt.statut === 'CANCELED' || appt.publicValidatedAt) {
    return NextResponse.json({ error: 'La demande a déjà été traitée' }, { status: 409 });
  }

  if (appt.statut !== 'WAITING') {
    return NextResponse.json({ error: 'La demande a déjà été traitée' }, { status: 409 });
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      statut: 'CANCELED',
      publicValidatedAt: null,
      publicValidatedById: null,
      arrivalTime: null,
      waitingRoomOrder: 0,
    },
    include: {
      patient: { select: { nom: true, prenom: true, tel: true } },
      doctor: { select: { nom: true } },
    },
  });

  return NextResponse.json({ ok: true, appointment: updated });
}
