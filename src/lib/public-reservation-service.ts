import { randomBytes } from 'node:crypto';

import { endOfDay, format, startOfDay } from 'date-fns';
import { Prisma, type AppointmentType } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import { ensureGlobalSettings } from '@/lib/global-settings';
import { mergePublicCabinetBranding } from '@/lib/cabinet-branding';
import { weeklyFromDb } from '@/lib/doctor-availability';
import {
  buildPublicReservationSlots,
  normalizePublicCin,
  normalizePublicEmail,
  normalizePublicName,
  normalizePublicPhone,
  normalizePublicSexe,
  normalizePublicText,
  parsePublicDateOnly,
  parsePublicDateTime,
  type PublicReservationConfig,
  type PublicReservationSlot,
} from '@/lib/public-reservation';
import { colorForAppointmentType, parseAppointmentType } from '@/lib/appointment-types';

export type PublicReservationDoctorsRow = {
  id: string;
  nom: string;
  specialite: string | null;
  doctorAvailability: {
    weekly: unknown;
    updatedAt: Date;
  } | null;
};

export async function getPublicReservationConfigData(): Promise<PublicReservationConfig> {
  const settings = await ensureGlobalSettings();
  const branding = mergePublicCabinetBranding({
    cabinetName: settings.cabinetName,
    doctorDisplayName: settings.doctorDisplayName,
    logoUrl: settings.logoUrl,
    cabinetPhone: settings.cabinetPhone,
    cabinetEmail: settings.cabinetEmail,
    cabinetAddress: settings.cabinetAddress,
    cabinetCityLine: settings.cabinetCityLine,
    mapEmbedUrl: settings.mapEmbedUrl,
    openingHours: settings.openingHours,
  });

  const doctors = (await prisma.user.findMany({
    where: { role: 'DOCTOR', isActive: true },
    select: {
      id: true,
      nom: true,
      specialite: true,
      doctorAvailability: {
        select: {
          weekly: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ nom: 'asc' }, { id: 'asc' }],
  })) as PublicReservationDoctorsRow[];

  const insuranceTypes = await prisma.insuranceType.findMany({
    where: { isActive: true },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  return {
    branding,
    doctors: doctors.map((doctor) => ({
      doctorId: doctor.id,
      nom: doctor.nom,
      specialite: doctor.specialite?.trim() || null,
      weekly: weeklyFromDb(doctor.doctorAvailability?.weekly ?? null),
      updatedAt: doctor.doctorAvailability?.updatedAt?.toISOString() ?? null,
    })),
    insuranceTypes: insuranceTypes.map((type) => ({
      id: type.id,
      code: type.code,
      label: type.name?.trim() || type.code,
    })),
    cndp: {
      text:
        settings.publicReservationCndpText?.trim() ||
        'J’accepte que mes données personnelles soient traitées par le cabinet médical afin de gérer ma demande de rendez-vous et mon dossier patient.',
      version: settings.publicReservationCndpVersion?.trim() || null,
      privacyUrl: settings.publicReservationPrivacyUrl?.trim() || null,
    },
  };
}

export type PublicReservationConfirmationData = {
  reference: string;
  confirmationStatus: string;
  bookingSourceLabel: string;
  date: string;
  time: string;
  doctor: {
    id: string;
    nom: string;
    specialite: string | null;
  };
  cabinet: {
    name: string;
    phone: string;
    email: string;
    address: string;
    cityLine: string;
  };
};

export async function getPublicReservationSlotsData(doctorId: string, dateRaw: string): Promise<PublicReservationSlot[]> {
  const targetDate = parsePublicDateOnly(dateRaw);
  if (!targetDate) return [];

  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, role: 'DOCTOR', isActive: true },
    select: {
      id: true,
      doctorAvailability: {
        select: {
          weekly: true,
        },
      },
    },
  });

  if (!doctor) return [];

  const dayStart = startOfDay(targetDate);
  const dayEnd = endOfDay(targetDate);

  const appointments = await prisma.appointment.findMany({
    where: {
      doctor_id: doctorId,
      date_heure: {
        gte: dayStart,
        lte: dayEnd,
      },
      statut: {
        not: 'CANCELED',
      },
    },
    select: {
      date_heure: true,
    },
    orderBy: { date_heure: 'asc' },
  });

  return buildPublicReservationSlots(
    weeklyFromDb(doctor.doctorAvailability?.weekly ?? null),
    targetDate,
    appointments
  );
}

export async function getPublicReservationConfirmationData(token: string): Promise<PublicReservationConfirmationData | null> {
  const appointment = await prisma.appointment.findFirst({
    where: { publicBookingToken: token },
    select: {
      publicBookingToken: true,
      statut: true,
      date_heure: true,
      reservationSource: true,
      doctor: {
        select: {
          id: true,
          nom: true,
          specialite: true,
        },
      },
    },
  });

  if (!appointment) return null;

  const settings = await ensureGlobalSettings();
  const branding = mergePublicCabinetBranding({
    cabinetName: settings.cabinetName,
    doctorDisplayName: settings.doctorDisplayName,
    logoUrl: settings.logoUrl,
    cabinetPhone: settings.cabinetPhone,
    cabinetEmail: settings.cabinetEmail,
    cabinetAddress: settings.cabinetAddress,
    cabinetCityLine: settings.cabinetCityLine,
    mapEmbedUrl: settings.mapEmbedUrl,
    openingHours: settings.openingHours,
  });

  return {
    reference: appointment.publicBookingToken?.slice(0, 10).toUpperCase() ?? '',
    confirmationStatus: appointment.statut,
    bookingSourceLabel:
      appointment.reservationSource === 'RESERVATION_PUBLIC' ? 'Réservation en ligne' : 'Interne',
    date: format(appointment.date_heure, 'yyyy-MM-dd'),
    time: format(appointment.date_heure, 'HH:mm'),
    doctor: {
      id: appointment.doctor.id,
      nom: appointment.doctor.nom,
      specialite: appointment.doctor.specialite?.trim() || null,
    },
    cabinet: {
      name: branding.cabinetName,
      phone: branding.phone,
      email: branding.email,
      address: branding.address,
      cityLine: branding.cityLine,
    },
  };
}

type PatientMatchInput = {
  nom: string;
  prenom: string;
  date_naissance: Date;
  tel: string | null;
  email: string | null;
  cin: string | null;
  adresse: string | null;
  sexe: 'MASCULIN' | 'FEMININ' | null;
  insuranceTypeId?: string | null;
};

type PatientMatchResult =
  | { ok: true; patientId: string; created: false }
  | { ok: true; patientId: string; created: true }
  | { ok: false; message: string };

async function resolvePublicPatientMatch(
  tx: Prisma.TransactionClient,
  input: PatientMatchInput
): Promise<PatientMatchResult> {
  const cinPatient = input.cin
    ? await tx.patient.findUnique({
        where: { cin: input.cin },
        select: { id: true },
      })
    : null;

  const emailPatients =
    input.email && input.date_naissance
      ? await tx.patient.findMany({
          where: {
            email: input.email,
            date_naissance: input.date_naissance,
          },
          select: { id: true },
        })
      : [];

  const phonePatients =
    input.tel && input.date_naissance
      ? await tx.patient.findMany({
          where: {
            tel: input.tel,
            date_naissance: input.date_naissance,
          },
          select: { id: true },
        })
      : [];

  const candidates = [
    cinPatient ? cinPatient.id : null,
    emailPatients[0]?.id ?? null,
    phonePatients[0]?.id ?? null,
  ].filter((value): value is string => Boolean(value));

  const uniqueCandidates = Array.from(new Set(candidates));
  if (cinPatient && emailPatients.length > 0 && cinPatient.id !== emailPatients[0].id) {
    return {
      ok: false,
      message: 'Conflit d’identité : le CIN correspond à un patient différent de celui correspondant à l’email.',
    };
  }

  if (cinPatient && phonePatients.length > 0 && cinPatient.id !== phonePatients[0].id) {
    return { ok: false, message: 'Demande de réservation non confirmable automatiquement.' };
  }

  if (uniqueCandidates.length > 1) {
    return { ok: false, message: 'Demande de réservation non confirmable automatiquement.' };
  }

  if (emailPatients.length > 1 || phonePatients.length > 1) {
    return { ok: false, message: 'Demande de réservation non confirmable automatiquement.' };
  }

  if (cinPatient) return { ok: true, patientId: cinPatient.id, created: false };
  if (emailPatients[0]) return { ok: true, patientId: emailPatients[0].id, created: false };
  if (phonePatients[0]) return { ok: true, patientId: phonePatients[0].id, created: false };

  const created = await tx.patient.create({
    data: {
      nom: input.nom,
      prenom: input.prenom,
      date_naissance: input.date_naissance,
      tel: input.tel ?? undefined,
      email: input.email ?? undefined,
      cin: input.cin ?? undefined,
      adresse: input.adresse ?? undefined,
      sexe: input.sexe ?? undefined,
      insuranceTypeId: input.insuranceTypeId ?? undefined,
    },
    select: { id: true },
  });

  return { ok: true, patientId: created.id, created: true };
}

export type PublicReservationCreateInput = {
  doctorId: string;
  date: string;
  time: string;
  appointmentType?: unknown;
  nom: unknown;
  prenom: unknown;
  date_naissance: unknown;
  sexe?: unknown;
  tel: unknown;
  email?: unknown;
  cin?: unknown;
  adresse?: unknown;
  motif: unknown;
  consentAccepted: unknown;
  consentVersion?: unknown;
  consentTextSnapshot?: unknown;
  honeypot?: unknown;
  reservationSource?: unknown;
  insuranceTypeId?: unknown;
};

export async function createPublicReservation(input: PublicReservationCreateInput, cndpVersion: string | null, cndpText: string) {
  const appointmentDate = parsePublicDateTime(input.date, input.time);
  if (!appointmentDate) {
    return { ok: false as const, status: 400, message: 'Date ou heure invalide' };
  }

  if (appointmentDate.getTime() <= Date.now()) {
    return { ok: false as const, status: 400, message: 'Date passée interdite' };
  }

  const appointmentType = parseAppointmentType(input.appointmentType) ?? 'FOLLOW_UP';
  const cleanNom = normalizePublicName(input.nom, 80);
  const cleanPrenom = normalizePublicName(input.prenom, 80);
  const cleanMotif = normalizePublicText(input.motif, 500);
  const cleanTel = normalizePublicPhone(input.tel);
  const cleanEmail = normalizePublicEmail(input.email);
  const cleanCin = normalizePublicCin(input.cin);
  const cleanAdresse = normalizePublicText(input.adresse, 200);
  const cleanSexe = normalizePublicSexe(input.sexe);
  const cleanDateNaissance = parsePublicDateOnly(input.date_naissance);
  const cleanInsuranceTypeId =
    typeof input.insuranceTypeId === 'string' && input.insuranceTypeId.trim() !== ''
      ? input.insuranceTypeId.trim()
      : null;
  const consentAccepted = input.consentAccepted === true || input.consentAccepted === 'true';
  const honeypot = normalizePublicText(input.honeypot, 60);
  const reservationSource =
    input.reservationSource === 'RESERVATION_PUBLIC' ? 'RESERVATION_PUBLIC' : 'INTERNAL';

  if (honeypot) {
    return { ok: false as const, status: 400, message: 'Demande invalide' };
  }

  if (reservationSource !== 'RESERVATION_PUBLIC') {
    return { ok: false as const, status: 400, message: 'Demande invalide' };
  }

  if (!cleanNom || !cleanPrenom || !cleanMotif || !cleanDateNaissance || !cleanTel || !cleanEmail || !cleanSexe || !consentAccepted) {
    return { ok: false as const, status: 400, message: 'Demande de réservation incomplète' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false as const, status: 400, message: 'Adresse email invalide' };
  }

  if (cleanTel.replace(/[^\d]/g, '').length < 6) {
    return { ok: false as const, status: 400, message: 'Numéro de téléphone invalide' };
  }

  if (cleanDateNaissance.getTime() > Date.now()) {
    return { ok: false as const, status: 400, message: 'Date de naissance invalide' };
  }

  if (cleanInsuranceTypeId) {
    const insuranceType = await prisma.insuranceType.findFirst({
      where: { id: cleanInsuranceTypeId, isActive: true },
      select: { id: true },
    });
    if (!insuranceType) {
      return { ok: false as const, status: 400, message: 'Assurance invalide' };
    }
  }

  const targetDoctor = await prisma.user.findFirst({
    where: { id: input.doctorId, role: 'DOCTOR', isActive: true },
    select: {
      id: true,
      doctorAvailability: {
        select: {
          weekly: true,
        },
      },
    },
  });
  if (!targetDoctor) {
    return { ok: false as const, status: 400, message: 'Demande de réservation invalide' };
  }

  const slots = buildPublicReservationSlots(
    weeklyFromDb(targetDoctor.doctorAvailability?.weekly ?? null),
    appointmentDate,
    []
  );
  const slotStartIso = appointmentDate.toISOString();
  const requestedSlot = slots.find((slot) => slot.start === slotStartIso);
  if (!requestedSlot) {
    return { ok: false as const, status: 409, message: 'Ce créneau vient d’être réservé. Veuillez choisir un autre horaire.' };
  }

  try {
    const appointment = await prisma.$transaction(
      async (tx) => {
        const existingCollision = await tx.appointment.findFirst({
          where: {
            doctor_id: input.doctorId,
            date_heure: appointmentDate,
            statut: {
              not: 'CANCELED',
            },
          },
          select: { id: true },
        });

        if (existingCollision) {
          throw new Error('SLOT_CONFLICT');
        }

        const resolvedPatient = await resolvePublicPatientMatch(tx, {
          nom: cleanNom,
          prenom: cleanPrenom,
          date_naissance: cleanDateNaissance,
          tel: cleanTel,
          email: cleanEmail,
          cin: cleanCin,
          adresse: cleanAdresse,
          sexe: cleanSexe,
          insuranceTypeId: cleanInsuranceTypeId,
        });

        if (!resolvedPatient.ok) {
          throw new Error(resolvedPatient.message);
        }

        if (!resolvedPatient.created && cleanInsuranceTypeId) {
          const existingPatient = await tx.patient.findUnique({
            where: { id: resolvedPatient.patientId },
            select: { insuranceTypeId: true },
          });
          if (existingPatient && existingPatient.insuranceTypeId === null) {
            await tx.patient.update({
              where: { id: resolvedPatient.patientId },
              data: { insuranceTypeId: cleanInsuranceTypeId },
            });
          }
        }

        const publicBookingToken = randomBytes(24).toString('hex');
        const created = await tx.appointment.create({
          data: {
            date_heure: appointmentDate,
            motif: cleanMotif,
            doctor_id: input.doctorId,
            patient_id: resolvedPatient.patientId,
            statut: 'WAITING',
            appointmentType,
            color: colorForAppointmentType(appointmentType),
            reservationSource: 'RESERVATION_PUBLIC',
            publicBookingToken,
            publicConsentAcceptedAt: new Date(),
            publicConsentVersion: normalizePublicText(input.consentVersion, 40) ?? cndpVersion,
            publicConsentTextSnapshot:
              normalizePublicText(input.consentTextSnapshot, 5000) ?? cndpText,
          },
          include: {
            patient: {
              select: { id: true, nom: true, prenom: true },
            },
            doctor: {
              select: { id: true, nom: true, specialite: true },
            },
          },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return {
      ok: true as const,
      appointment,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'SLOT_CONFLICT') {
      return { ok: false as const, status: 409, message: 'Ce créneau vient d’être réservé. Veuillez choisir un autre horaire.' };
    }
    if (error instanceof Error && error.message === 'Demande de réservation non confirmable automatiquement.') {
      return { ok: false as const, status: 409, message: error.message };
    }
    if (error instanceof Error && error.message.startsWith('Demande de réservation')) {
      return { ok: false as const, status: 400, message: error.message };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    ) {
      return { ok: false as const, status: 409, message: 'Ce créneau vient d’être réservé. Veuillez choisir un autre horaire.' };
    }
    throw error;
  }
}
