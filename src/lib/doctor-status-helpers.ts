import { prisma } from '@/lib/prisma';
import {
  canReceivePatient,
  normalizeDoctorManualStatus,
  resolveEffectiveStatus,
  type UserStatusType,
} from '@/lib/user-status';

export type DoctorStatusPayload = {
  id: string;
  nom: string;
  email: string;
  userStatus: UserStatusType;
  effectiveStatus: UserStatusType;
  userStatusChangedAt: string;
  effectiveStatusChangedAt: string;
  canReceivePatient: boolean;
  inConsultation: boolean;
  inConsultationPatient?: { id: string; prenom: string; nom: string } | null;
};

/** Charge le statut médecin + consultation en cours pour l’accueil / dashboard. */
export async function getDoctorStatusPayload(
  doctorId: string
): Promise<DoctorStatusPayload | null> {
  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, role: 'DOCTOR', isActive: true },
    select: {
      id: true,
      nom: true,
      email: true,
      userStatus: true,
      userStatusChangedAt: true,
    },
  });

  if (!doctor) return null;

  const inProgress = await prisma.appointment.findFirst({
    where: {
      doctor_id: doctorId,
      statut: 'IN_PROGRESS',
    },
    select: {
      updatedAt: true,
      patient: { select: { id: true, prenom: true, nom: true } },
    },
    orderBy: [{ updatedAt: 'desc' }, { date_heure: 'desc' }],
  });

  const manual = normalizeDoctorManualStatus(
    (doctor.userStatus ?? 'OFFLINE') as UserStatusType
  );
  const inConsultation = Boolean(inProgress);
  const effectiveStatus = resolveEffectiveStatus(manual, inConsultation);
  const effectiveStatusChangedAt = inProgress
    ? inProgress.updatedAt.toISOString()
    : doctor.userStatusChangedAt.toISOString();

  return {
    id: doctor.id,
    nom: doctor.nom,
    email: doctor.email,
    userStatus: manual,
    effectiveStatus,
    userStatusChangedAt: doctor.userStatusChangedAt.toISOString(),
    effectiveStatusChangedAt,
    canReceivePatient: canReceivePatient(effectiveStatus),
    inConsultation,
    inConsultationPatient: inProgress?.patient ?? null,
  };
}

export async function resolveAssistantVisibleDoctorId(): Promise<string | null> {
  const preferredEmail = process.env.ASSISTANT_VISIBILITY_DOCTOR_EMAIL?.trim();

  if (preferredEmail) {
    const preferredDoctor = await prisma.user.findFirst({
      where: {
        role: 'DOCTOR',
        isActive: true,
        email: { equals: preferredEmail, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (preferredDoctor) return preferredDoctor.id;
  }

  const doctors = await prisma.user.findMany({
    where: { role: 'DOCTOR', isActive: true },
    select: {
      id: true,
      email: true,
      userStatus: true,
      userStatusChangedAt: true,
      createdAt: true,
    },
  });

  if (doctors.length === 0) return null;
  if (doctors.length === 1) return doctors[0].id;

  const doctorIds = doctors.map((doctor) => doctor.id);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: {
      doctor_id: { in: doctorIds },
      OR: [
        { statut: 'IN_PROGRESS' },
        {
          date_heure: { gte: todayStart },
          statut: { in: ['WAITING', 'IN_PROGRESS', 'FINISHED', 'PAID'] },
        },
      ],
    },
    select: {
      doctor_id: true,
      statut: true,
      date_heure: true,
    },
  });

  const activityByDoctor = new Map<
    string,
    { inProgress: number; activeToday: number }
  >();

  for (const appointment of appointments) {
    const current = activityByDoctor.get(appointment.doctor_id) ?? {
      inProgress: 0,
      activeToday: 0,
    };

    if (appointment.statut === 'IN_PROGRESS') {
      current.inProgress += 1;
    }
    if (appointment.date_heure >= todayStart) {
      current.activeToday += 1;
    }

    activityByDoctor.set(appointment.doctor_id, current);
  }

  doctors.sort((left, right) => {
    const leftActivity = activityByDoctor.get(left.id) ?? { inProgress: 0, activeToday: 0 };
    const rightActivity = activityByDoctor.get(right.id) ?? { inProgress: 0, activeToday: 0 };

    if (leftActivity.inProgress !== rightActivity.inProgress) {
      return rightActivity.inProgress - leftActivity.inProgress;
    }
    if (leftActivity.activeToday !== rightActivity.activeToday) {
      return rightActivity.activeToday - leftActivity.activeToday;
    }

    const leftManual = normalizeDoctorManualStatus(
      (left.userStatus ?? 'OFFLINE') as UserStatusType
    );
    const rightManual = normalizeDoctorManualStatus(
      (right.userStatus ?? 'OFFLINE') as UserStatusType
    );

    if (leftManual === 'OFFLINE' && rightManual !== 'OFFLINE') return 1;
    if (rightManual === 'OFFLINE' && leftManual !== 'OFFLINE') return -1;

    const changedDelta =
      right.userStatusChangedAt.getTime() - left.userStatusChangedAt.getTime();
    if (changedDelta !== 0) return changedDelta;

    const createdDelta = right.createdAt.getTime() - left.createdAt.getTime();
    if (createdDelta !== 0) return createdDelta;

    const emailCompare = left.email.localeCompare(right.email);
    if (emailCompare !== 0) return emailCompare;

    return left.id.localeCompare(right.id);
  });

  return doctors[0]?.id ?? null;
}

export async function getUserStatusBroadcastPayload(userId: string): Promise<{
  userId: string;
  userStatus: UserStatusType;
  userStatusChangedAt: string;
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      userStatus: true,
      userStatusChangedAt: true,
    },
  });

  if (!user || !user.isActive) return null;

  if (user.role === 'DOCTOR') {
    const doctor = await getDoctorStatusPayload(user.id);
    if (!doctor) return null;
    return {
      userId: doctor.id,
      userStatus: doctor.effectiveStatus,
      userStatusChangedAt: doctor.effectiveStatusChangedAt,
    };
  }

  return {
    userId: user.id,
    userStatus: (user.userStatus ?? 'OFFLINE') as UserStatusType,
    userStatusChangedAt: user.userStatusChangedAt.toISOString(),
  };
}

/** Réactive le statut manuel du médecin à la fin d’une consultation. */
export async function syncDoctorStatusOnConsultation(
  doctorId: string,
  phase: 'start' | 'close'
) {
  if (phase === 'start') return;

  const remainingInProgress = await prisma.appointment.count({
    where: { doctor_id: doctorId, statut: 'IN_PROGRESS' },
  });

  if (remainingInProgress > 0) return;

  const doctor = await prisma.user.findUnique({
    where: { id: doctorId },
    select: { userStatus: true },
  });

  if (!doctor) return;

  const now = new Date();
  await prisma.user.update({
    where: { id: doctorId },
    data: {
      userStatus: normalizeDoctorManualStatus(
        (doctor.userStatus ?? 'OFFLINE') as UserStatusType
      ),
      userStatusChangedAt: now,
    },
  });
}
