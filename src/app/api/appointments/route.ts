import { endOfDay, startOfDay } from 'date-fns';
import { NextResponse } from 'next/server';
import type { AppointmentStatus, AppointmentType } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { colorForAppointmentType, parseAppointmentType } from '@/lib/appointment-types';
import { parseBookingChannel } from '@/lib/booking-channel';
import { verifyJwt } from '@/lib/auth';
import type { NextRequest } from 'next/server';

const STATUTS: AppointmentStatus[] = [
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

// GET: Liste des rendez-vous
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date'); // format YYYY-MM-DD (compat)
  const fromStr = searchParams.get('from'); // ISO — plage agenda / dashboard
  const toStr = searchParams.get('to');
  const doctorIdParam = searchParams.get('doctor_id');
  const statutRaw = searchParams.get('statut');
  const queueMode = searchParams.get('queue') === '1';
  /** File physique : en salle (arrivalTime renseigné). Compat : statut=WAITING_ROOM → WAITING + inRoom. */
  const inRoomOnly =
    searchParams.get('inRoom') === '1' ||
    statutRaw === 'WAITING_ROOM';
  const statutFilter =
    statutRaw === 'WAITING_ROOM' ? 'WAITING' : statutRaw;

  try {
    const requesterRole = String(user.role ?? '').toUpperCase();
    const requesterId = user.id != null && String(user.id).trim() !== '' ? String(user.id) : null;

    /** Médecin : toujours restreindre à son propre ID (ignore tout `doctor_id` client). */
    let doctorIdFilter: string | undefined;
    if (requesterRole === 'DOCTOR') {
      if (!requesterId) {
        return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
      }
      doctorIdFilter = requesterId;
    } else if (doctorIdParam && doctorIdParam.trim()) {
      doctorIdFilter = doctorIdParam.trim();
    }

    let dateFilter: { date_heure?: { gte: Date; lte: Date } } = {};
    if (fromStr && toStr) {
      dateFilter = {
        date_heure: {
          gte: new Date(fromStr),
          lte: new Date(toStr),
        },
      };
    } else if (dateStr) {
      const dayStart = new Date(dateStr);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateStr);
      dayEnd.setHours(23, 59, 59, 999);
      dateFilter = {
        date_heure: {
          gte: dayStart,
          lte: dayEnd,
        },
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        ...dateFilter,
        ...(doctorIdFilter && { doctor_id: doctorIdFilter }),
        ...(statutFilter &&
          STATUTS.includes(statutFilter as AppointmentStatus) && {
            statut: statutFilter as AppointmentStatus,
            ...(statutFilter === 'WAITING' && inRoomOnly
              ? { arrivalTime: { not: null } }
              : {}),
          }),
      },
      include: {
        patient: { select: { nom: true, prenom: true, tel: true } },
        doctor: { select: { nom: true } },
      },
      orderBy:
        queueMode && statutFilter === 'WAITING'
          ? [
              { appointmentType: 'asc' },
              { waitingRoomOrder: 'asc' },
              { arrivalTime: 'asc' },
              { date_heure: 'asc' },
            ]
          : { date_heure: 'asc' },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('[GET /api/appointments]', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des rendez-vous' }, { status: 500 });
  }
}

// POST: Créer un rendez-vous (Optionnellement créer le patient s'il est nouveau)
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      date_heure,
      motif,
      doctor_id: doctor_id_snake,
      doctorId: doctor_id_camel,
      patient_id,
      new_patient,
      appointmentType,
      appointment_type,
      initialPresence,
      initial_presence,
      bookingChannel: bookingChannelRaw,
      booking_channel,
    } = body;

    const rawDoctor = doctor_id_snake ?? doctor_id_camel;
    const doctor_id =
      typeof rawDoctor === 'string' && rawDoctor.trim().length > 0 ? rawDoctor.trim() : null;

    if (!date_heure || !motif) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    if (!doctor_id) {
      return NextResponse.json(
        { error: 'doctorId est requis (médecin traitant)' },
        { status: 400 }
      );
    }

    const requesterRole = String(user.role ?? '').toUpperCase();
    if (requesterRole === 'DOCTOR' && doctor_id !== String(user.id)) {
      return NextResponse.json(
        { error: 'Vous ne pouvez créer un rendez-vous que pour votre propre agenda' },
        { status: 403 }
      );
    }

    const doctorUser = await prisma.user.findFirst({
      where: { id: doctor_id, role: 'DOCTOR', isActive: true },
      select: { id: true },
    });
    if (!doctorUser) {
      return NextResponse.json(
        { error: 'Médecin invalide ou compte inactif' },
        { status: 400 }
      );
    }

    let finalPatientId = patient_id;

    // Création rapide d'un patient
    if (new_patient) {
      const { nom, prenom, tel, date_naissance } = new_patient;
      const telTrimmed =
        tel === undefined || tel === null ? '' : String(tel).trim();
      const telNormalized = telTrimmed === '' ? null : telTrimmed;
      const createdPatient = await prisma.patient.create({
        data: {
          nom,
          prenom,
          tel: telNormalized,
          date_naissance: new Date(date_naissance || new Date())
        }
      });
      finalPatientId = createdPatient.id;
    }

    if (!finalPatientId) {
      return NextResponse.json({ error: 'Patient requis' }, { status: 400 });
    }

    const rawType = appointmentType ?? appointment_type;
    const typeParsed: AppointmentType = parseAppointmentType(rawType) ?? 'FOLLOW_UP';
    const colorStr = colorForAppointmentType(typeParsed);
    const bookingChannel =
      parseBookingChannel(bookingChannelRaw ?? booking_channel) ?? 'PHONE';

    const presence = initialPresence ?? initial_presence;
    const patientInRoomNow = presence === 'in_room';

    const apptDate = new Date(date_heure);
    const dayStart = startOfDay(apptDate);
    const dayEnd = endOfDay(apptDate);

    let arrivalTime: Date | null = null;
    let waitingRoomOrder = 0;
    if (patientInRoomNow) {
      arrivalTime = new Date();
      const maxRow = await prisma.appointment.aggregate({
        where: {
          doctor_id,
          statut: 'WAITING',
          arrivalTime: { not: null },
          date_heure: { gte: dayStart, lte: dayEnd },
        },
        _max: { waitingRoomOrder: true },
      });
      waitingRoomOrder = (maxRow._max.waitingRoomOrder ?? -1) + 1;
    }

    const appointment = await prisma.appointment.create({
      data: {
        date_heure: apptDate,
        motif,
        doctor_id,
        patient_id: finalPatientId,
        statut: 'WAITING',
        appointmentType: typeParsed,
        color: colorStr,
        bookingChannel,
        arrivalTime,
        waitingRoomOrder,
      },
      include: { patient: true },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la création du rendez-vous' }, { status: 500 });
  }
}
