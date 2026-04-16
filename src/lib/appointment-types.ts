import type { AppointmentType } from '@/generated/prisma/client';

/** Pastel discret : lavande (urgence), menthe (1ʳᵉ visite), bleu ciel (suivi) */
export function colorForAppointmentType(
  t: AppointmentType | null | undefined
): string {
  switch (t) {
    case 'URGENT':
      return '#a78bfa';
    case 'FIRST_VISIT':
      return '#34d399';
    case 'FOLLOW_UP':
    default:
      return '#38bdf8';
  }
}

export function parseAppointmentType(raw: unknown): AppointmentType | null {
  if (raw === 'URGENT' || raw === 'FIRST_VISIT' || raw === 'FOLLOW_UP') {
    return raw;
  }
  return null;
}
