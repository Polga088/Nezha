import { z } from 'zod';

/** Jour calendaire JavaScript : 0 = dimanche … 6 = samedi */
export const JS_DAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'] as const;
export type JsDayKey = (typeof JS_DAY_KEYS)[number];

export type DayAvailabilitySlot = {
  enabled: boolean;
  /** HH:mm 24 h */
  start: string;
  /** HH:mm 24 h */
  end: string;
};

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const daySlotSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(HH_MM, 'Heure début invalide (HH:mm)'),
  end: z.string().regex(HH_MM, 'Heure fin invalide (HH:mm)'),
});

export const weeklyAvailabilitySchema = z
  .object({
    '0': daySlotSchema,
    '1': daySlotSchema,
    '2': daySlotSchema,
    '3': daySlotSchema,
    '4': daySlotSchema,
    '5': daySlotSchema,
    '6': daySlotSchema,
  })
  .superRefine((w, ctx) => {
    for (const k of JS_DAY_KEYS) {
      const s = w[k];
      if (!s.enabled) continue;
      const [sh, sm] = s.start.split(':').map(Number);
      const [eh, em] = s.end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      if (endMin <= startMin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Jour ${k} : l'heure de fin doit être après le début`,
          path: [k, 'end'],
        });
      }
    }
  });

export type WeeklyAvailability = z.infer<typeof weeklyAvailabilitySchema>;

/** Défaut : lun–ven 09:00–18:00, week-end fermé */
export function defaultWeeklyAvailability(): WeeklyAvailability {
  const closed: DayAvailabilitySlot = { enabled: false, start: '09:00', end: '18:00' };
  const open: DayAvailabilitySlot = { enabled: true, start: '09:00', end: '18:00' };
  return {
    '0': { ...closed },
    '1': { ...open },
    '2': { ...open },
    '3': { ...open },
    '4': { ...open },
    '5': { ...open },
    '6': { ...closed },
  };
}

function isDaySlot(v: unknown): v is DayAvailabilitySlot {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.enabled === 'boolean' &&
    typeof o.start === 'string' &&
    typeof o.end === 'string'
  );
}

/** Fusionne une valeur JSON base avec les défauts (clés manquantes / invalides). */
export function weeklyFromDb(raw: unknown): WeeklyAvailability {
  const base = defaultWeeklyAvailability();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  for (const k of JS_DAY_KEYS) {
    const slot = o[k];
    if (isDaySlot(slot)) {
      const parsed = daySlotSchema.safeParse(slot);
      if (parsed.success) base[k] = parsed.data;
    }
  }
  const full = weeklyAvailabilitySchema.safeParse(base);
  return full.success ? full.data : defaultWeeklyAvailability();
}

/** Affichage : lundi d’abord */
export const WEEKDAY_LABEL_MON_FIRST: { key: JsDayKey; label: string }[] = [
  { key: '1', label: 'Lundi' },
  { key: '2', label: 'Mardi' },
  { key: '3', label: 'Mercredi' },
  { key: '4', label: 'Jeudi' },
  { key: '5', label: 'Vendredi' },
  { key: '6', label: 'Samedi' },
  { key: '0', label: 'Dimanche' },
];
