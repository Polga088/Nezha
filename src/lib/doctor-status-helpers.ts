import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import {
  canReceivePatient,
  isManualDoctorStatus,
  resolveEffectiveStatus,
  type UserStatusType,
} from '@/lib/user-status';

export type DoctorStatusSource = 'MANUAL' | 'CONSULTATION';

type DoctorStatusRow = {
  id: string;
  nom: string;
  email: string;
  userStatus: UserStatusType;
  manualStatus: UserStatusType | null;
  statusSource: DoctorStatusSource;
  userStatusChangedAt: Date;
};

export type DoctorStatusSnapshot = Pick<
  DoctorStatusRow,
  'userStatus' | 'manualStatus' | 'statusSource'
>;

export type DoctorStatusPayload = {
  id: string;
  nom: string;
  email: string;
  userStatus: UserStatusType;
  manualStatus: UserStatusType | null;
  statusSource: DoctorStatusSource;
  effectiveStatus: UserStatusType;
  userStatusChangedAt: string;
  canReceivePatient: boolean;
  inConsultation: boolean;
  inConsultationPatient?: { id: string; prenom: string; nom: string } | null;
};

function manualStatusFallback(row: DoctorStatusSnapshot): UserStatusType {
  if (row.manualStatus && isManualDoctorStatus(row.manualStatus)) {
    return row.manualStatus;
  }
  if (isManualDoctorStatus(row.userStatus)) {
    return row.userStatus;
  }
  return 'AVAILABLE';
}

async function loadDoctorStatusRow(doctorId: string): Promise<DoctorStatusRow | null> {
  return prisma.user.findFirst({
    where: { id: doctorId, role: 'DOCTOR', isActive: true },
    select: {
      id: true,
      nom: true,
      email: true,
      userStatus: true,
      manualStatus: true,
      statusSource: true,
      userStatusChangedAt: true,
    },
  });
}

async function loadInProgressConsultation(doctorId: string) {
  return prisma.appointment.findFirst({
    where: {
      doctor_id: doctorId,
      statut: 'IN_PROGRESS',
    },
    select: {
      patient: { select: { id: true, prenom: true, nom: true } },
    },
    orderBy: { date_heure: 'desc' },
  });
}

export function resolveDoctorEffectiveStatus(
  userStatus: UserStatusType,
  hasInProgressConsultation: boolean
): UserStatusType {
  return resolveEffectiveStatus(userStatus, hasInProgressConsultation);
}

/** Charge le statut médecin + consultation en cours pour l’accueil / dashboard. */
export async function getDoctorStatusPayload(
  doctorId: string
): Promise<DoctorStatusPayload | null> {
  const doctor = await loadDoctorStatusRow(doctorId);
  if (!doctor) return null;

  const inProgress = await loadInProgressConsultation(doctorId);
  const hasInProgressConsultation = Boolean(inProgress);
  const effectiveStatus = resolveDoctorEffectiveStatus(doctor.userStatus, hasInProgressConsultation);
  const manualStatus = manualStatusFallback(doctor);

  return {
    id: doctor.id,
    nom: doctor.nom,
    email: doctor.email,
    userStatus: doctor.userStatus,
    manualStatus,
    statusSource: doctor.statusSource,
    effectiveStatus,
    userStatusChangedAt: doctor.userStatusChangedAt.toISOString(),
    canReceivePatient: canReceivePatient(effectiveStatus),
    inConsultation: hasInProgressConsultation,
    inConsultationPatient: inProgress?.patient ?? null,
  };
}

type StatusTransition =
  | { kind: 'manual'; requestedStatus: UserStatusType }
  | { kind: 'consultation'; phase: 'start' | 'close' };

/**
 * Transition unique de disponibilité médecin.
 * - `manual` : mémorise le statut manuel, sans casser une consultation en cours.
 * - `consultation` : impose/retire `IN_CONSULTATION` puis restaure le statut manuel.
 */
export async function transitionDoctorStatus(doctorId: string, transition: StatusTransition) {
  const current = await loadDoctorStatusRow(doctorId);
  if (!current) return null;

  const now = new Date();

  if (transition.kind === 'manual') {
    const requestedStatus = transition.requestedStatus;
    const hasInProgressConsultation = Boolean(await loadInProgressConsultation(doctorId));
    const data = planDoctorStatusTransition(
      current,
      { kind: 'manual', requestedStatus },
      hasInProgressConsultation,
      now
    );
    return prisma.user.update({
      where: { id: doctorId },
      data,
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        userStatus: true,
        manualStatus: true,
        statusSource: true,
        userStatusChangedAt: true,
      },
    });
  }

  const data = planDoctorStatusTransition(current, transition, false, now);

  return prisma.user.update({
    where: { id: doctorId },
    data,
    select: {
      id: true,
      nom: true,
      email: true,
      role: true,
      userStatus: true,
      manualStatus: true,
      statusSource: true,
      userStatusChangedAt: true,
    },
  });
}

export async function syncDoctorStatusOnConsultation(doctorId: string, phase: 'start' | 'close') {
  return transitionDoctorStatus(doctorId, { kind: 'consultation', phase });
}

export async function applyManualDoctorStatus(doctorId: string, requestedStatus: UserStatusType) {
  return transitionDoctorStatus(doctorId, { kind: 'manual', requestedStatus });
}

export function planDoctorStatusTransition(
  current: DoctorStatusSnapshot,
  transition: StatusTransition,
  hasInProgressConsultation: boolean,
  now = new Date()
): Prisma.UserUpdateInput {
  if (transition.kind === 'manual') {
    const requestedStatus = transition.requestedStatus;
    if (hasInProgressConsultation) {
      const manualStatus = isManualDoctorStatus(requestedStatus)
        ? requestedStatus
        : manualStatusFallback(current);
      return {
        manualStatus,
        statusSource: 'CONSULTATION',
      };
    }

    const manualStatus = isManualDoctorStatus(requestedStatus) ? requestedStatus : 'AVAILABLE';
    return {
      userStatus: manualStatus,
      manualStatus,
      statusSource: 'MANUAL',
      userStatusChangedAt: now,
    };
  }

  const manualStatus = manualStatusFallback(current);
  const nextStatus = transition.phase === 'start' ? 'IN_CONSULTATION' : manualStatus;
  return {
    userStatus: nextStatus,
    manualStatus,
    statusSource: transition.phase === 'start' ? 'CONSULTATION' : 'MANUAL',
    userStatusChangedAt: now,
  };
}
