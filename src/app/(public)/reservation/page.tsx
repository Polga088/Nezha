import type { Metadata } from 'next';

import { PublicReservationForm } from '@/components/reservation/PublicReservationForm';
import { getPublicReservationConfigData } from '@/lib/public-reservation-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Réservation en ligne',
  description: 'Prendre rendez-vous en ligne avec le cabinet médical.',
};

export default async function ReservationPage() {
  const config = await getPublicReservationConfigData();

  return <PublicReservationForm initialConfig={config} />;
}
