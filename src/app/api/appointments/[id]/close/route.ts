import { NextRequest, NextResponse } from 'next/server';

import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { notifyAssistantsReadyForBilling } from '@/lib/notification-events';
import { triggerPaymentPending } from '@/lib/pusher-server';

/** Message exploitable côté client / logs (Prisma renvoie code + meta utiles). */
const formatPrismaCloseError = (e: unknown): string => {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const meta =
      e.meta && typeof e.meta === 'object'
        ? ` — ${JSON.stringify(e.meta)}`
        : '';
    return `[Prisma ${e.code}] ${e.message}${meta}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
};

/**
 * POST — clôture médicale : statut FINISHED (consultation clôturée), puis archive / notifications en meilleur effort.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const user = await verifyJwt(token);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const role = String(user.role).toUpperCase();
  if (role !== 'DOCTOR' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, nom: true, prenom: true } },
        doctor: { select: { id: true, nom: true } },
        consultation: true,
      },
    });

    if (!appt) {
      return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
    }

    if (role === 'DOCTOR' && appt.doctor_id !== String(user.id)) {
      return NextResponse.json({ error: 'Ce rendez-vous n’est pas à votre agenda' }, { status: 403 });
    }

    if (appt.statut === 'CANCELED') {
      return NextResponse.json({ error: 'Rendez-vous annulé' }, { status: 400 });
    }

    if (appt.statut === 'PAID' || appt.statut === 'FINISHED') {
      return NextResponse.json({
        ok: true,
        statut: appt.statut,
        dejaCloture: true,
      });
    }

    const notes = appt.consultation?.notes_medecin ?? '';
    const diagnostic = appt.consultation?.diagnostic ?? '';

    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        statut: 'FINISHED',
        arrivalTime: null,
      },
    });

    try {
      await prisma.consultationArchive.upsert({
        where: { appointment_id: appt.id },
        create: {
          appointment_id: appt.id,
          patient_id: appt.patient_id,
          doctor_id: appt.doctor_id,
          notes_medecin: notes || null,
          diagnostic: diagnostic || null,
        },
        update: {},
      });
    } catch (archiveErr) {
      console.error('[POST /api/appointments/:id/close] archive', archiveErr);
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { id: 'default' },
      select: { defaultConsultationPrice: true },
    });

    let notificationIdByUserId = new Map<string, string>();
    try {
      notificationIdByUserId = await notifyAssistantsReadyForBilling({
        patientPrenom: appt.patient.prenom,
        patientNom: appt.patient.nom,
      });
    } catch (notifyErr) {
      console.error('[POST /api/appointments/:id/close] notification', notifyErr);
    }

    try {
      await triggerPaymentPending(
        {
          appointmentId: appt.id,
          patientPrenom: appt.patient.prenom,
          patientNom: appt.patient.nom,
          doctorNom: appt.doctor.nom,
          montantSuggestion: settings?.defaultConsultationPrice ?? null,
          closedAt: new Date().toISOString(),
        },
        notificationIdByUserId
      );
    } catch (pusherErr) {
      console.error('[POST /api/appointments/:id/close] pusher', pusherErr);
    }

    return NextResponse.json({
      ok: true,
      statut: 'FINISHED' as const,
    });
  } catch (e) {
    console.error('[POST /api/appointments/:id/close]', e);
    const detail = formatPrismaCloseError(e);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
