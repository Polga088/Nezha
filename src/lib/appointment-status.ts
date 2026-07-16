/** Libellés UI pour les statuts de rendez-vous (workflow médical + encaissement). */
export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  WAITING: 'En attente',
  IN_PROGRESS: 'En consultation',
  FINISHED: 'À encaisser',
  PAID: 'Réglé',
  CANCELED: 'Annulé',
};

export type PublicAppointmentState = {
  statut: string;
  reservationSource?: string | null;
  publicValidatedAt?: string | Date | null;
};

export function isPublicReservationPending(appointment: PublicAppointmentState): boolean {
  return (
    appointment.reservationSource === 'RESERVATION_PUBLIC' &&
    appointment.statut !== 'CANCELED' &&
    !appointment.publicValidatedAt
  );
}

export function getAppointmentWorkflowLabel(appointment: PublicAppointmentState): string {
  if (appointment.reservationSource === 'RESERVATION_PUBLIC' && appointment.statut !== 'CANCELED') {
    return appointment.publicValidatedAt ? 'Validé' : 'En attente de validation';
  }
  return APPOINTMENT_STATUS_LABEL[appointment.statut] ?? appointment.statut;
}
