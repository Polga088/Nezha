import { addMinutes, format, parseISO, startOfDay } from 'date-fns';

import { weeklyFromDb, type WeeklyAvailability } from '@/lib/doctor-availability';

export const PUBLIC_RESERVATION_SLOT_MINUTES = 30;

export const PUBLIC_RESERVATION_FIELD_LIMITS = {
  nom: 80,
  prenom: 80,
  email: 120,
  tel: 40,
  cin: 40,
  adresse: 200,
  motif: 500,
  cndpVersion: 40,
  cndpTextSnapshot: 5000,
} as const;

export type PublicReservationDoctorAvailability = {
  doctorId: string;
  nom: string;
  specialite: string | null;
  weekly: WeeklyAvailability;
  updatedAt: string | null;
};

export type PublicReservationSlot = {
  start: string;
  end: string;
  label: string;
};

export type PublicReservationConfig = {
  branding: {
    cabinetName: string;
    doctorDisplayName: string;
    logoUrl: string | null;
    phone: string;
    email: string;
    address: string;
    cityLine: string;
    openingHours: Array<{ jour: string; plage: string }>;
  };
  doctors: PublicReservationDoctorAvailability[];
  cndp: {
    text: string;
    version: string | null;
    privacyUrl: string | null;
  };
};

export function normalizePublicText(raw: unknown, maxLength: number): string | null {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (text === '') return null;
  return text.slice(0, maxLength);
}

export function normalizePublicName(raw: unknown, maxLength: number): string | null {
  const text = normalizePublicText(raw, maxLength);
  return text ? text : null;
}

export function normalizePublicEmail(raw: unknown): string | null {
  const text = normalizePublicText(raw, PUBLIC_RESERVATION_FIELD_LIMITS.email);
  return text ? text.toLowerCase() : null;
}

export function normalizePublicPhone(raw: unknown): string | null {
  const text = normalizePublicText(raw, PUBLIC_RESERVATION_FIELD_LIMITS.tel);
  if (!text) return null;
  const digits = text.replace(/[^\d+]/g, '');
  return digits || null;
}

export function normalizePublicCin(raw: unknown): string | null {
  const text = normalizePublicText(raw, PUBLIC_RESERVATION_FIELD_LIMITS.cin);
  return text ? text.toUpperCase().replace(/\s+/g, '') : null;
}

export function normalizePublicSexe(raw: unknown): 'MASCULIN' | 'FEMININ' | null {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim().toUpperCase();
  if (value === 'M' || value === 'MASCULIN') return 'MASCULIN';
  if (value === 'F' || value === 'FEMININ') return 'FEMININ';
  return null;
}

export function parsePublicDateOnly(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const parsed = parseISO(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parsePublicDateTime(dateRaw: unknown, timeRaw: unknown): Date | null {
  if (typeof dateRaw !== 'string' || typeof timeRaw !== 'string') return null;
  const date = parseISO(dateRaw);
  if (Number.isNaN(date.getTime())) return null;
  const [hours, minutes] = timeRaw.split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function formatPublicSlotLabel(date: Date): string {
  return format(date, 'HH:mm');
}

export function slotOverlapsAppointment(slotStart: Date, appointmentStart: Date): boolean {
  return appointmentStart.getTime() >= slotStart.getTime() &&
    appointmentStart.getTime() < addMinutes(slotStart, PUBLIC_RESERVATION_SLOT_MINUTES).getTime();
}

export function buildPublicReservationSlots(
  weekly: WeeklyAvailability | null | undefined,
  date: Date,
  appointments: Array<{ date_heure: Date }>
): PublicReservationSlot[] {
  const schedule = weeklyFromDb(weekly ?? null);
  const dayKey = String(date.getDay()) as keyof WeeklyAvailability;
  const day = schedule[dayKey];
  if (!day.enabled) return [];

  const [startHours, startMinutes] = day.start.split(':').map((part) => Number.parseInt(part, 10));
  const [endHours, endMinutes] = day.end.split(':').map((part) => Number.parseInt(part, 10));
  const start = startOfDay(date);
  start.setHours(startHours, startMinutes, 0, 0);
  const end = startOfDay(date);
  end.setHours(endHours, endMinutes, 0, 0);

  const blocked = new Set(
    appointments.map((appointment) => new Date(appointment.date_heure).getTime())
  );
  const slots: PublicReservationSlot[] = [];
  for (let cursor = new Date(start); cursor.getTime() + PUBLIC_RESERVATION_SLOT_MINUTES * 60000 <= end.getTime(); cursor = addMinutes(cursor, PUBLIC_RESERVATION_SLOT_MINUTES)) {
    if (cursor.getTime() < Date.now()) continue;
    if (blocked.has(cursor.getTime())) continue;
    slots.push({
      start: cursor.toISOString(),
      end: addMinutes(cursor, PUBLIC_RESERVATION_SLOT_MINUTES).toISOString(),
      label: formatPublicSlotLabel(cursor),
    });
  }
  return slots;
}

