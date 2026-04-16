/** Payload Pusher `payment-pending` — encaissement attendu à l’accueil. */
export type PaymentPendingPayload = {
  appointmentId: string;
  patientPrenom: string;
  patientNom: string;
  doctorNom: string;
  montantSuggestion: number | null;
  closedAt: string;
  /** Centre de notifications — marquer lue au clic sur le toast (par destinataire). */
  notificationId?: string;
};
