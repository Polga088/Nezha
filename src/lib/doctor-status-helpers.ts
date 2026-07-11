import { prisma } from '@/lib/prisma';
import {
  canReceivePatient,
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
      date_heure: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
    select: {
      patient: { select: { id: true, prenom: true, nom: true } },
    },
    orderBy: { date_heure: 'desc' },
  });

  const manual = (doctor.userStatus ?? 'OFFLINE') as UserStatusType;
  const inConsultation = Boolean(inProgress);
  const effectiveStatus = resolveEffectiveStatus(manual, inConsultation);

  return {
    id: doctor.id,
    nom: doctor.nom,
    email: doctor.email,
    userStatus: manual,
    effectiveStatus,
    userStatusChangedAt: doctor.userStatusChangedAt.toISOString(),
    canReceivePatient: canReceivePatient(effectiveStatus),
    inConsultation,
    inConsultationPatient: inProgress?.patient ?? null,
  };
}

/** Met à jour le statut manuel du médecin lors du démarrage / clôture consultation. */
export async function syncDoctorStatusOnConsultation(
  doctorId: string,
  phase: 'start' | 'close'
) {
  const now = new Date();
  await prisma.user.update({
    where: { id: doctorId },
    data: {
      userStatus: phase === 'start' ? 'IN_CONSULTATION' : 'AVAILABLE',
      userStatusChangedAt: now,
    },
  });
}
