import { NextRequest, NextResponse } from 'next/server';

import type { AppointmentType } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

/** PATCH — réordonne la file d’attente (assistant / admin). Body : `{ orderedIds: string[] }` */
export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const user = await verifyJwt(token);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const role = String(user.role).toUpperCase();
  if (role !== 'ASSISTANT' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  let body: { orderedIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON attendu' }, { status: 400 });
  }

  const orderedIds = body.orderedIds;
  if (!Array.isArray(orderedIds) || orderedIds.some((x) => typeof x !== 'string')) {
    return NextResponse.json({ error: 'orderedIds : tableau de string requis' }, { status: 400 });
  }

  try {
    const rows = await prisma.appointment.findMany({
      where: { id: { in: orderedIds }, statut: 'WAITING' },
      select: { id: true, appointmentType: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    if (rows.length !== orderedIds.length) {
      return NextResponse.json(
        { error: 'Liste invalide : RDV absent ou pas au statut « en attente »' },
        { status: 400 }
      );
    }

    /** Ordre relatif conservé dans la liste glissée, par type (cohérent avec tri GET par type puis ordre). */
    const nextOrder: Record<AppointmentType, number> = {
      URGENT: 0,
      FIRST_VISIT: 0,
      FOLLOW_UP: 0,
    };

    await prisma.$transaction(
      orderedIds.map((id) => {
        const row = byId.get(id)!;
        const t = row.appointmentType ?? 'FOLLOW_UP';
        const idx = nextOrder[t]++;
        return prisma.appointment.update({
          where: { id },
          data: { waitingRoomOrder: idx },
        });
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /api/appointments/waiting-room/reorder]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
