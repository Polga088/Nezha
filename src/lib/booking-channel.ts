import type { BookingChannel } from '@/generated/prisma/client';

export function parseBookingChannel(raw: unknown): BookingChannel | null {
  if (raw === 'PHONE' || raw === 'ON_SITE') return raw;
  return null;
}

export const BOOKING_CHANNEL_LABEL: Record<BookingChannel, string> = {
  PHONE: 'Téléphone',
  ON_SITE: 'Sur place',
};
