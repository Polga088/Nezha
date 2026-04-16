import { endOfDay, startOfDay } from 'date-fns';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { colorForAppointmentType, parseAppointmentType } from '@/lib/appointment-types';
import { parseBookingChannel } from '@/lib/booking-channel';
import { verifyJwt } from '@/lib/auth';
import { notifyDoctorPatientInWaitingRoom } from '@/lib/notification-events';
import type { NextRequest } from 'next/server';
import type { AppointmentStatus } from '@/generated/prisma/client';

const VALID_STATUTS: AppointmentStatus[] = [
  'WAITING',
  'IN_PROGRESS',
  'FINISHED',
  'PAID',
  'CANCELED',
];

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

// GET: Détail d'un rendez-vous
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { id } = await params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        consultation: true,
        invoice: true
      }
    });

    if (!appointment) return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });

    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

// PUT: Modifier le statut d'un rendez-vous
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const {
      statut,
      inWaitingRoom,
      date_heure,
      motif,
      color,
      appointmentType,
      appointment_type,
      bookingChannel: bookingChannelRaw,
      booking_channel,
    } = body as {
      statut?: string;
      inWaitingRoom?: boolean;
      date_heure?: string;
      motif?: string;
      color?: unknown;
      appointmentType?: unknown;
      appointment_type?: unknown;
      bookingChannel?: unknown;
      booking_channel?: unknown;
    };

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
    }

    const data: {
      statut?: AppointmentStatus;
      date_heure?: Date;
      motif?: string;
      color?: string | null;
      appointmentType?: 'URGENT' | 'FIRST_VISIT' | 'FOLLOW_UP';
      arrivalTime?: Date | null;
      waitingRoomOrder?: number;
      bookingChannel?: 'PHONE' | 'ON_SITE';
    } = {};

    const bookingParsed = parseBookingChannel(bookingChannelRaw ?? booking_channel);
    if (bookingParsed) {
      data.bookingChannel = bookingParsed;
    }

    if (typeof statut === 'string' && statut) {
      const raw = statut === 'WAITING_ROOM' ? 'WAITING' : statut;
      if (!VALID_STATUTS.includes(raw as AppointmentStatus)) {
        return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
      }
      const target = raw as AppointmentStatus;
      data.statut = target;

      if (target === 'WAITING' && existing.statut !== 'WAITING') {
        const fromCanceled = existing.statut === 'CANCELED';
        const explicitNoPhysical = inWaitingRoom === false;
        const explicitPhysical = statut === 'WAITING_ROOM' || inWaitingRoom === true;
        const shouldSetArrival =
          explicitPhysical || (!explicitNoPhysical && !fromCanceled);

        if (shouldSetArrival) {
          data.arrivalTime = new Date();
          const dayStart = startOfDay(new Date(existing.date_heure));
          const dayEnd = endOfDay(new Date(existing.date_heure));
          const maxRow = await prisma.appointment.aggregate({
            where: {
              doctor_id: existing.doctor_id,
              statut: 'WAITING',
              arrivalTime: { not: null },
              id: { not: id },
              date_heure: { gte: dayStart, lte: dayEnd },
            },
            _max: { waitingRoomOrder: true },
          });
          data.waitingRoomOrder = (maxRow._max.waitingRoomOrder ?? -1) + 1;
        } else {
          data.arrivalTime = null;
          data.waitingRoomOrder = 0;
        }
      } else if (
        target === 'WAITING' &&
        existing.statut === 'WAITING' &&
        (statut === 'WAITING_ROOM' || inWaitingRoom === true) &&
        !existing.arrivalTime
      ) {
        data.arrivalTime = new Date();
        const dayStart = startOfDay(new Date(existing.date_heure));
        const dayEnd = endOfDay(new Date(existing.date_heure));
        const maxRow = await prisma.appointment.aggregate({
          where: {
            doctor_id: existing.doctor_id,
            statut: 'WAITING',
            arrivalTime: { not: null },
            id: { not: id },
            date_heure: { gte: dayStart, lte: dayEnd },
          },
          _max: { waitingRoomOrder: true },
        });
        data.waitingRoomOrder = (maxRow._max.waitingRoomOrder ?? -1) + 1;
      } else if (existing.arrivalTime && target !== 'WAITING') {
        data.arrivalTime = null;
      }
    }
    if (date_heure) {
      data.date_heure = new Date(date_heure);
    }
    if (typeof motif === 'string' && motif) {
      data.motif = motif;
    }
    const typeFromBody = parseAppointmentType(appointmentType ?? appointment_type);
    if (typeFromBody) {
      data.appointmentType = typeFromBody;
      data.color = colorForAppointmentType(typeFromBody);
    } else if (color !== undefined) {
      if (color === null || color === '') {
        data.color = null;
      } else if (typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color.trim())) {
        data.color = color.trim();
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: { select: { nom: true, prenom: true, tel: true } },
        doctor: { select: { nom: true } },
      },
    });

    const actorRole = String(user.role).toUpperCase();
    const arrivalNewlySet = !existing.arrivalTime && updated.arrivalTime != null;
    if (
      arrivalNewlySet &&
      (actorRole === 'ASSISTANT' || actorRole === 'ADMIN') &&
      String(user.id) !== updated.doctor_id
    ) {
      try {
        await notifyDoctorPatientInWaitingRoom({
          doctorUserId: updated.doctor_id,
          patientPrenom: updated.patient.prenom,
          patientNom: updated.patient.nom,
        });
      } catch (notifyErr) {
        console.error('[PUT /api/appointments/:id] notification', notifyErr);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

/** PATCH — notes / diagnostic de consultation (`ConsultationRecord` lié au RDV). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { notes_medecin, diagnostic } = body as {
      notes_medecin?: unknown;
      diagnostic?: unknown;
    };

    if (notes_medecin === undefined && diagnostic === undefined) {
      return NextResponse.json(
        { error: 'Au moins un champ notes_medecin ou diagnostic requis' },
        { status: 400 }
      );
    }

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
    }

    const n =
      notes_medecin !== undefined
        ? typeof notes_medecin === 'string'
          ? notes_medecin
          : null
        : undefined;
    const d =
      diagnostic !== undefined
        ? typeof diagnostic === 'string'
          ? diagnostic
          : null
        : undefined;

    await prisma.consultationRecord.upsert({
      where: { appointment_id: id },
      create: {
        appointment_id: id,
        notes_medecin: n ?? '',
        diagnostic: d ?? '',
      },
      update: {
        ...(n !== undefined && { notes_medecin: n }),
        ...(d !== undefined && { diagnostic: d }),
      },
    });

    const consultation = await prisma.consultationRecord.findUnique({
      where: { appointment_id: id },
    });

    return NextResponse.json({ ok: true, consultation });
  } catch (error) {
    console.error('[PATCH /api/appointments/:id]', error);
    return NextResponse.json({ error: 'Erreur lors de l’enregistrement des notes' }, { status: 500 });
  }
}

// DELETE: Annuler un rendez-vous (Soft delete ou status CANCELED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { id } = await params;
    // Plutôt qu'une suppression physique, on annule statut
    const cancelled = await prisma.appointment.update({
      where: { id },
      data: { statut: 'CANCELED', arrivalTime: null },
    });

    return NextResponse.json({ message: 'Rendez-vous annulé', appointment: cancelled });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de l\'annulation' }, { status: 500 });
  }
}
