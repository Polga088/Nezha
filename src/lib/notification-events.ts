import { prisma } from '@/lib/prisma';

/**
 * Accueil : un patient entre physiquement en salle d’attente → le médecin concerné est alerté.
 */
export async function notifyDoctorPatientInWaitingRoom(input: {
  doctorUserId: string;
  patientPrenom: string;
  patientNom: string;
}): Promise<void> {
  const nomComplet = `${input.patientPrenom} ${input.patientNom}`.trim();
  await prisma.notification.create({
    data: {
      userId: input.doctorUserId,
      type: 'URGENT',
      title: 'Patient en salle d’attente',
      message:
        nomComplet.length > 0
          ? `${nomComplet} est en salle d’attente.`
          : 'Un patient est en salle d’attente.',
    },
  });
}

/**
 * Clôture consultation : accueil + admin actifs — même périmètre que `triggerPaymentPending`.
 * Retourne l’id de notification par utilisateur (pour marquer lu depuis le toast temps réel).
 */
export async function notifyAssistantsReadyForBilling(input: {
  patientPrenom: string;
  patientNom: string;
}): Promise<Map<string, string>> {
  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ['ASSISTANT', 'ADMIN'] },
    },
    select: { id: true },
  });
  if (recipients.length === 0) return new Map();

  const nomComplet = `${input.patientPrenom} ${input.patientNom}`.trim();
  const message =
    nomComplet.length > 0
      ? `${nomComplet} — consultation terminée. Patient prêt pour facturation.`
      : 'Consultation terminée — patient prêt pour facturation.';

  const created = await Promise.all(
    recipients.map((u) =>
      prisma.notification.create({
        data: {
          userId: u.id,
          type: 'SUCCESS',
          title: 'Patient prêt pour facturation',
          message,
        },
      })
    )
  );

  const byUser = new Map<string, string>();
  for (const row of created) {
    byUser.set(row.userId, row.id);
  }
  return byUser;
}
