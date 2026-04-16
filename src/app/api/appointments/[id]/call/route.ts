import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { triggerPatientCalled } from '@/lib/pusher-server';

/**
 * POST — médecin ou admin notifie l’accueil qu’un patient en **WAITING** est appelé.
 * Déclenche Pusher `patient-called` vers accueil / admin (y compris si le RDV est sur le compte secrétariat).
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = _request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const user = await verifyJwt(token);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const role = String(user.role).toUpperCase();
  if (role !== 'DOCTOR' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { nom: true, prenom: true } },
        doctor: { select: { nom: true } },
      },
    });

    if (!appt) {
      return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
    }

    /** Tout médecin peut appeler un RDV en attente (le secrétariat peut l’avoir créé sur son compte). */
    if (appt.statut !== 'WAITING') {
      return NextResponse.json(
        { error: 'Seuls les rendez-vous au statut « en attente » peuvent être appelés' },
        { status: 400 }
      );
    }

    await triggerPatientCalled({
      appointmentId: appt.id,
      patientPrenom: appt.patient.prenom,
      patientNom: appt.patient.nom,
      doctorNom: appt.doctor.nom,
      calledAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/appointments/:id/call]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
